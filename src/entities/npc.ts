import Phaser from "phaser";

export class Npc extends Phaser.Physics.Matter.Sprite {
  public dialogText: string | any[];
  public id: string;
  public hasSpoken: boolean = false;
  private indicator: Phaser.GameObjects.Text;
  private showIndicator: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    dialogText: string | any[],
  ) {
    super(scene.matter.world, x, y, texture);

    this.dialogText = dialogText;
    this.id = "npc_" + Math.random().toString(36).substr(2, 9); // Simple unique ID

    scene.add.existing(this);

    this.setScale(0.5);
    this.setRectangle(20, 20);
    this.setFixedRotation();
    this.setStatic(true); // NPCs are static for now

    if (texture === "pawn_idle") {
      this.play("npc_idle");
    }

    // Interaction indicator
    this.indicator = scene.add
      .text(x, y - 40, "[E] Talk", {
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 4, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);
  }

  update() {
    if ((this as any).isLGSlave) {
      return;
    }

    // The visibility of the indicator is set by the game scene based on proximity
    this.indicator.setPosition(this.x, this.y - 40);
    this.indicator.setVisible(this.showIndicator);
  }

  setIndicatorVisible(visible: boolean) {
    this.showIndicator = visible;
  }

  destroy(fromScene?: boolean) {
    if (this.indicator) this.indicator.destroy();
    super.destroy(fromScene);
  }
}
