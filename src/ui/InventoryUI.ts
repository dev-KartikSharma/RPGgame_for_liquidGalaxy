import Phaser from "phaser";
import { InventoryManager } from "../managers/InventoryManager";

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
    const bg = scene.add.image(0, 0, "paper_bg").setScale(2);
    this.container.add(bg);

    // Title
    const title = scene.add
      .text(0, -150, "INVENTORY", {
        fontSize: "32px",
        color: "#000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container.add(title);

    // List View Layout (8 slots)
    const startX = 0;
    const startY = -80;
    const spacingY = 55;

    for (let i = 0; i < 8; i++) {
      const y = startY + i * spacingY;

      // Wide Slot bg for list item
      const slotBg = scene.add
        .rectangle(startX, y, 280, 50, 0xaaaaaa, 0.3)
        .setStrokeStyle(2, 0x000000);
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
      this.scene.scene.pause("Game");
    } else {
      // Resume game
      this.scene.scene.resume("Game");
    }
  }

  public resize(logicalWidth: number, logicalHeight: number) {
    this.container.setPosition(logicalWidth / 2, logicalHeight / 2);
  }

  private drawItems() {
    // Remove old item icons from container
    this.container.each((child: any) => {
      if (child.isItemIcon) {
        child.destroy();
      }
    });

    const startX = 0;
    const startY = -80;
    const spacingY = 55;

    this.manager.items.forEach((item, index) => {
      if (index >= 8) return; // Prevent overflow in UI

      const y = startY + index * spacingY;
      const iconX = startX - 110;

      const icon = this.scene.add.image(iconX, y, item.iconKey);
      // Scale icon so it fits nicely in the 50px high row
      icon.setScale(40 / Math.max(icon.width, icon.height));
      (icon as any).isItemIcon = true;
      this.container.add(icon);

      // Item Name
      const nameText = this.scene.add
        .text(iconX + 35, y, item.name, {
          fontSize: "20px",
          color: "#333",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);
      (nameText as any).isItemIcon = true;
      this.container.add(nameText);

      // Item Quantity
      const qtyText = this.scene.add
        .text(startX + 110, y, "x" + item.quantity, {
          fontSize: "22px",
          color: "#fff",
          stroke: "#000",
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0.5);
      (qtyText as any).isItemIcon = true;
      this.container.add(qtyText);
    });
  }
}
