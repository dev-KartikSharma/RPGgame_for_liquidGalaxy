import Phaser from 'phaser';
import { InventoryManager } from '../managers/InventoryManager';

export class InventoryUI {
    private scene: Phaser.Scene;
    private manager: InventoryManager;
    private container: Phaser.GameObjects.Container;
    
    public isVisible: boolean = false;

    constructor(scene: Phaser.Scene, manager: InventoryManager) {
        this.scene = scene;
        this.manager = manager;

        this.container = scene.add.container(0, 0).setVisible(false);

        this.resize(scene.scale.width / 2, scene.scale.height / 2); // Initial layout

        // Background
        const bg = scene.add.image(0, 0, 'paper_bg').setScale(2);
        this.container.add(bg);

        // Title
        const title = scene.add.text(0, -150, 'INVENTORY', {
            fontSize: '32px',
            color: '#000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        // Grid (4x4)
        const startX = -120;
        const startY = -80;
        const spacing = 80;

        for (let i = 0; i < 16; i++) {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const x = startX + col * spacing;
            const y = startY + row * spacing;

            // Slot bg
            const slotBg = scene.add.rectangle(x, y, 64, 64, 0xaaaaaa, 0.5).setStrokeStyle(2, 0x000000);
            this.container.add(slotBg);
        }

        this.drawItems();
    }

    public toggle() {
        this.isVisible = !this.isVisible;
        this.container.setVisible(this.isVisible);

        if (this.isVisible) {
            this.drawItems();
            // Pause game when inventory is open
            this.scene.scene.pause('Game');
        } else {
            // Resume game
            this.scene.scene.resume('Game');
        }
    }

    public resize(logicalWidth: number, logicalHeight: number) {
        this.container.setPosition(logicalWidth / 2, logicalHeight / 2);
    }

    private drawItems() {
        // Remove old item icons from container
        // We can tag them to easily find and remove them
        this.container.each((child: any) => {
            if (child.isItemIcon) {
                child.destroy();
            }
        });

        const startX = -120;
        const startY = -80;
        const spacing = 80;

        this.manager.items.forEach((item, index) => {
            const row = Math.floor(index / 4);
            const col = index % 4;
            const x = startX + col * spacing;
            const y = startY + row * spacing;

            const icon = this.scene.add.image(x, y, item.iconKey).setScale(1.5);
            (icon as any).isItemIcon = true;
            this.container.add(icon);

            if (item.quantity > 1) {
                const qtyText = this.scene.add.text(x + 10, y + 10, item.quantity.toString(), {
                    fontSize: '16px',
                    color: '#fff',
                    stroke: '#000',
                    strokeThickness: 3
                });
                (qtyText as any).isItemIcon = true;
                this.container.add(qtyText);
            }
        });
    }
}
