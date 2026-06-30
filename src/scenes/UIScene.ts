import Phaser from 'phaser';
import { events } from '../managers/EventManager';
import { DialogBox } from '../ui/DialogBox';
import { InventoryManager } from '../managers/InventoryManager';
import { InventoryUI } from '../ui/InventoryUI';

export default class UIScene extends Phaser.Scene {

    private healthFill!: Phaser.GameObjects.Rectangle;
    private manaFill!: Phaser.GameObjects.Rectangle;

    private dialogBox!: DialogBox;
    private inventoryManager!: InventoryManager;
    private inventoryUI!: InventoryUI;

    private healthFillMaxWidth: number = 207.75;
    private manaFillMaxWidth: number = 111.63;

    private containerLeft!: Phaser.GameObjects.Container;
    private containerRight!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'UIScene', active: false });
    }

    create() {
        // We use a fixed uiZoom so the pixel art scales up perfectly
        const uiZoom = 2;

        // Reset Main Camera
        this.cameras.main.setZoom(1);
        this.cameras.main.setScroll(0, 0);

        // --- HUD TILEMAP ---
        const map = this.make.tilemap({ key: 'ui_map' });
        
        const bigBarTileset = map.addTilesetImage('big_bar_base', 'big_bar_base');
        const smallBarTileset = map.addTilesetImage('small_bar_base', 'small_bar_base');
        const avatarsTileset = map.addTilesetImage('avatars_01', 'avatars_01');
        const ribbonsTileset = map.addTilesetImage('SmallRibbons', 'small_ribbons');

        const tilesets = [];
        if (bigBarTileset) tilesets.push(bigBarTileset);
        if (smallBarTileset) tilesets.push(smallBarTileset);
        if (avatarsTileset) tilesets.push(avatarsTileset);
        if (ribbonsTileset) tilesets.push(ribbonsTileset);

        // --- LEFT HUD ---
        this.containerLeft = this.add.container(0, 0);
        this.containerLeft.setScale(uiZoom);

        // Load HUD_Left layer (or fallback to HUD if the user hasn't split it yet in Tiled)
        let hudLayerLeft = null;
        if (map.getLayer('HUD_Left')) hudLayerLeft = map.createLayer('HUD_Left', tilesets, 0, 0);
        else if (map.getLayer('HUD')) hudLayerLeft = map.createLayer('HUD', tilesets, 0, 0);
        if (hudLayerLeft) this.containerLeft.add(hudLayerLeft);

        // Extract Health/Mana fill areas
        const objectLayer = map.getObjectLayer('Object Layer 1');
        if (objectLayer && objectLayer.objects) {
            objectLayer.objects.forEach(obj => {
                if (obj.name === 'HealthBarFill') {
                    this.healthFill = this.add.rectangle(obj.x!, obj.y!, obj.width!, obj.height!, 0xff0000).setOrigin(0, 0);
                    this.healthFillMaxWidth = obj.width!;
                    this.containerLeft.add(this.healthFill);
                } else if (obj.name === 'ManaBarFill') {
                    this.manaFill = this.add.rectangle(obj.x!, obj.y!, obj.width!, obj.height!, 0x0088ff).setOrigin(0, 0);
                    this.manaFillMaxWidth = obj.width!;
                    this.containerLeft.add(this.manaFill);
                }
            });
        }

        // --- RIGHT HUD ---
        this.containerRight = this.add.container(0, 0);
        this.containerRight.setScale(uiZoom);

        // Load HUD_Right layer (or fallback to HUD if the user hasn't split it yet in Tiled)
        let hudLayerRight = null;
        if (map.getLayer('HUD_Right')) hudLayerRight = map.createLayer('HUD_Right', tilesets, 0, 0);
        // We do NOT fallback to HUD here because HUD was already created in HUD_Left!
        if (hudLayerRight) this.containerRight.add(hudLayerRight);

        // --- DIALOG BOX ---
        this.dialogBox = new DialogBox(this);

        // --- INVENTORY ---
        this.inventoryManager = new InventoryManager();
        this.inventoryUI = new InventoryUI(this, this.inventoryManager);

        this.input.keyboard!.on('keydown-I', () => {
            this.inventoryUI.toggle();
        });

        // --- EVENTS ---
        events.on('player-health-changed', this.updateHealth, this);
        events.on('player-mana-changed', this.updateMana, this);
        events.on('show-dialog', (text: string) => this.dialogBox.show(text), this);

        // --- DYNAMIC POSITIONING ---
        const resizeUI = () => {
            const physicalWidth = this.scale.width;
            const physicalHeight = this.scale.height;
            
            // Dialog & Inventory handle their own resizing (they assume camera zoom is 1)
            this.dialogBox.resize(physicalWidth, physicalHeight);
            this.inventoryUI.resize(physicalWidth, physicalHeight);

            // Left HUD stays locked to top-left
            this.containerLeft.setPosition(0, 0);

            // Right HUD snaps the logical 1280 right-edge to the physical right-edge
            this.containerRight.setPosition(physicalWidth - 1280 * uiZoom, 0);
        };
        resizeUI();
        this.scale.on('resize', resizeUI);

        // Clean up
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off('player-health-changed', this.updateHealth, this);
            events.off('player-mana-changed', this.updateMana, this);
            events.off('show-dialog');
            this.scale.off('resize', resizeUI);
        });
    }

    private updateHealth(health: number, maxHealth: number) {
        const percent = Phaser.Math.Clamp(health / maxHealth, 0, 1);
        if (this.healthFill) {
            this.healthFill.geom.width = percent * this.healthFillMaxWidth;
            this.healthFill.updateDisplayOrigin();
            this.healthFill.width = percent * this.healthFillMaxWidth;
            // Best to just use displayWidth for scaling primitives to avoid geom update issues
            this.healthFill.displayWidth = percent * this.healthFillMaxWidth;
        }
    }

    private updateMana(mana: number, maxMana: number) {
        const percent = Phaser.Math.Clamp(mana / maxMana, 0, 1);
        if (this.manaFill) {
            this.manaFill.displayWidth = percent * this.manaFillMaxWidth;
        }
    }
}
