import Phaser from "phaser";
import { events } from "../managers/EventManager";
import { DialogBox, type DialogPage } from "../ui/DialogBox";
import { InventoryManager, type Item } from "../managers/InventoryManager";
import { InventoryUI } from "../ui/InventoryUI";

export default class UIScene extends Phaser.Scene {
  private healthFill!: Phaser.GameObjects.Graphics;
  private manaFill!: Phaser.GameObjects.Graphics;

  private dialogBox!: DialogBox;
  private inventoryManager!: InventoryManager;
  private inventoryUI!: InventoryUI;

  private healthFillMaxWidth: number = 207.75;
  private manaFillMaxWidth: number = 111.63;

  private containerLeft!: Phaser.GameObjects.Container;
  private containerRight!: Phaser.GameObjects.Container;

  // Bound handler references for clean unregistration
  private onKeyDownI = () => {
    if (this.inventoryUI) {
      this.inventoryUI.toggle();
    }
  };

  private handleShowDialog = (text: string | string[] | DialogPage[]) => {
    if (this.dialogBox) {
      this.dialogBox.show(text);
    }
  };

  private handleAddInventoryItem = (item: Item) => {
    if (this.inventoryManager) {
      this.inventoryManager.addItem(item);
    }
  };

  private updateHealth = (health: number, maxHealth: number) => {
    const percent = Phaser.Math.Clamp(health / maxHealth, 0, 1);
    if (this.healthFill) {
      this.healthFill.clear();
      if (percent > 0) {
        this.healthFill.fillStyle(0xe53b3b, 1); // Premium warm red
        // X = 8, Y = 25, Width = 176 * percent, Height = 19
        this.healthFill.fillRect(8, 25, this.healthFillMaxWidth * percent, 19);
      }
    }
  };

  private updateMana = (mana: number, maxMana: number) => {
    const percent = Phaser.Math.Clamp(mana / maxMana, 0, 1);
    if (this.manaFill) {
      this.manaFill.clear();
      if (percent > 0) {
        this.manaFill.fillStyle(0x3182ce, 1); // Stamina blue
        // X = 8, Y = 78, Width = 80 * percent, Height = 6
        this.manaFill.fillRect(8, 78, this.manaFillMaxWidth * percent, 6);
      }
    }
  };

  constructor() {
    super({ key: "UIScene", active: false });
  }

  create() {
    // We use a fixed uiZoom so the pixel art scales up perfectly
    const uiZoom = 2;

    // Reset Main Camera
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);

    // --- HUD TILEMAP ---
    const map = this.make.tilemap({ key: "ui_map" });

    const bigBarTileset = map.addTilesetImage("BigBar_Base", "big_bar_base");
    const smallBarTileset = map.addTilesetImage(
      "SmallBar_Base",
      "small_bar_base",
    );
    const avatarsTileset = map.addTilesetImage("Avatars_01", "avatars_01");
    const ribbonsTileset = map.addTilesetImage("SmallRibbons", "small_ribbons");
    const bigBarFillTileset = map.addTilesetImage(
      "big_bar_fill",
      "big_bar_fill",
    );
    const icon10Tileset = map.addTilesetImage("icon_10", "icon_10");

    const tilesets = [];
    if (bigBarTileset) tilesets.push(bigBarTileset);
    if (smallBarTileset) tilesets.push(smallBarTileset);
    if (avatarsTileset) tilesets.push(avatarsTileset);
    if (ribbonsTileset) tilesets.push(ribbonsTileset);
    if (bigBarFillTileset) tilesets.push(bigBarFillTileset);
    if (icon10Tileset) tilesets.push(icon10Tileset);

    // --- LEFT HUD ---
    this.containerLeft = this.add.container(0, 0);
    this.containerLeft.setScale(uiZoom);

    // Load HUD_Left layer (or fallback to HUD if the user hasn't split it yet in Tiled)
    let hudLayerLeft = null;
    if (map.getLayer("HUD_Left"))
      hudLayerLeft = map.createLayer("HUD_Left", tilesets, 0, 0);
    else if (map.getLayer("HUD"))
      hudLayerLeft = map.createLayer("HUD", tilesets, 0, 0);
    if (hudLayerLeft) this.containerLeft.add(hudLayerLeft);

    // --- RIGHT HUD ---
    this.containerRight = this.add.container(0, 0);
    this.containerRight.setScale(uiZoom);

    // Load HUD_Right layer (or fallback to HUD if the user hasn't split it yet in Tiled)
    let hudLayerRight = null;
    if (map.getLayer("HUD_Right"))
      hudLayerRight = map.createLayer("HUD_Right", tilesets, 0, 0);
    if (hudLayerRight) this.containerRight.add(hudLayerRight);

    // Extract Interactive Objects
    const objectLayer = map.getObjectLayer("Object Layer 1");
    if (objectLayer && objectLayer.objects) {
      objectLayer.objects.forEach((obj) => {
        if (obj.name === "HealthBarFill") {
          this.healthFillMaxWidth = 176; // Exact slot width
          this.healthFill = this.add.graphics();
          this.containerLeft.add(this.healthFill);
          // Initial full health draw
          this.updateHealth(100, 100);
        } else if (obj.name === "ManaBarFill") {
          this.manaFillMaxWidth = 80; // Exact slot width
          this.manaFill = this.add.graphics();
          this.containerLeft.add(this.manaFill);
          // Initial full stamina/mana draw
          this.updateMana(100, 100);
        } else if (obj.name === "Settings") {
          // Manually render the Settings gear icon so it anchors correctly to the right side of the screen
          const settingsImg = this.add
            .image(obj.x!, obj.y!, "icon_10")
            .setOrigin(0, 0);

          const zone = this.add
            .zone(obj.x!, obj.y!, obj.width!, obj.height!)
            .setOrigin(0, 0);
          zone.setInteractive({ useHandCursor: true });
          zone.on("pointerup", () => {
            this.scene.pause("Game");
            this.scene.launch("PauseMenuScene");
          });

          this.containerRight.add(settingsImg);
          this.containerRight.add(zone);
        }
      });
    }

    // --- DIALOG BOX ---
    this.dialogBox = new DialogBox(this);

    // --- INVENTORY ---
    this.inventoryManager = new InventoryManager();
    this.inventoryUI = new InventoryUI(this, this.inventoryManager);

    // Register Keyboard Listener
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on("keydown-I", this.onKeyDownI);
    }

    // --- EVENTS ---
    events.on("player-health-changed", this.updateHealth);
    events.on("player-mana-changed", this.updateMana);
    events.on("show-dialog", this.handleShowDialog);
    events.on("add-inventory-item", this.handleAddInventoryItem);

    // --- DYNAMIC POSITIONING ---
    const resizeUI = () => {
      const physicalWidth = this.scale.width;
      const physicalHeight = this.scale.height;

      // Dialog & Inventory handle their own resizing (they assume camera zoom is 1)
      if (this.dialogBox) this.dialogBox.resize(physicalWidth, physicalHeight);
      if (this.inventoryUI)
        this.inventoryUI.resize(physicalWidth, physicalHeight);

      // Left HUD stays locked to top-left
      if (this.containerLeft) this.containerLeft.setPosition(0, 0);

      // Right HUD snaps the logical 1280 right-edge to the physical right-edge
      if (this.containerRight)
        this.containerRight.setPosition(physicalWidth - 1280 * uiZoom, 0);
    };
    resizeUI();
    this.scale.on("resize", resizeUI);

    // Clean up all resources on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.input && this.input.keyboard) {
        this.input.keyboard.off("keydown-I", this.onKeyDownI);
      }

      events.off("player-health-changed", this.updateHealth);
      events.off("player-mana-changed", this.updateMana);
      events.off("show-dialog", this.handleShowDialog);
      events.off("add-inventory-item", this.handleAddInventoryItem);
      this.scale.off("resize", resizeUI);

      if (this.dialogBox) {
        this.dialogBox.destroy();
      }
      if (this.inventoryUI) {
        this.inventoryUI.destroy();
      }
    });
  }
}

