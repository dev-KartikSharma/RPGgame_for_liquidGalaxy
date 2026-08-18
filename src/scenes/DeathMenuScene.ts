import Phaser from "phaser";

export default class DeathMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "DeathMenuScene" });
  }

  create() {
    const width = 1280;
    const height = 720;

    // Red-tinted semi-transparent background
    const bgRect = this.add
      .rectangle(0, 0, width, height, 0x880000, 0.7)
      .setOrigin(0, 0);

    const menuContainer = this.add.container(0, 0);

    // Add YOU DIED text
    const deathText = this.add
      .text(width / 2, height / 2 - 50, "YOU DIED", {
        fontSize: "80px",
        color: "#ff0000",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    menuContainer.add(deathText);

    // Add Restart button
    const restartBg = this.add
      .rectangle(width / 2, height / 2 + 80, 240, 60, 0x333333, 1)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const restartText = this.add
      .text(width / 2, height / 2 + 80, "Restart", {
        fontSize: "28px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    menuContainer.add(restartBg);
    menuContainer.add(restartText);

    restartBg.on("pointerover", () => {
      restartBg.setFillStyle(0x555555, 1);
      this.tweens.add({
        targets: [restartBg, restartText],
        scale: 1.05,
        duration: 100,
      });
    });

    restartBg.on("pointerout", () => {
      restartBg.setFillStyle(0x333333, 1);
      this.tweens.add({
        targets: [restartBg, restartText],
        scale: 1.0,
        duration: 100,
      });
    });

    const originalY = height / 2 + 80;
    restartBg.on("pointerdown", () => {
      restartBg.setY(originalY + 4);
      restartText.setY(originalY + 4);
    });

    restartBg.on("pointerup", () => {
      restartBg.setY(originalY);
      restartText.setY(originalY);
      this.restartGame();
    });

    // Add Quit button
    const quitBg = this.add
      .rectangle(width / 2, height / 2 + 160, 240, 60, 0x333333, 1)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const quitText = this.add
      .text(width / 2, height / 2 + 160, "Quit", {
        fontSize: "28px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    menuContainer.add(quitBg);
    menuContainer.add(quitText);

    quitBg.on("pointerover", () => {
      quitBg.setFillStyle(0x555555, 1);
      this.tweens.add({
        targets: [quitBg, quitText],
        scale: 1.05,
        duration: 100,
      });
    });

    quitBg.on("pointerout", () => {
      quitBg.setFillStyle(0x333333, 1);
      this.tweens.add({
        targets: [quitBg, quitText],
        scale: 1.0,
        duration: 100,
      });
    });

    const originalQuitY = height / 2 + 160;
    quitBg.on("pointerdown", () => {
      quitBg.setY(originalQuitY + 4);
      quitText.setY(originalQuitY + 4);
    });

    quitBg.on("pointerup", () => {
      quitBg.setY(originalQuitY);
      quitText.setY(originalQuitY);
      this.quitToMain();
    });

    // --- DYNAMIC UI CENTERING & SCALING ---
    const resizeUI = () => {
      const gameWidth = this.scale.width;
      const gameHeight = this.scale.height;

      bgRect.setSize(gameWidth, gameHeight);

      const scaleRatio = Math.min(gameWidth / 1280, gameHeight / 720);
      menuContainer.setScale(scaleRatio);
      menuContainer.setPosition(
        (gameWidth - 1280 * scaleRatio) / 2,
        (gameHeight - 720 * scaleRatio) / 2,
      );
    };
    resizeUI();
    this.scale.on("resize", resizeUI);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", resizeUI);
      this.tweens.killAll();
    });
  }

  private restartGame() {
    const gameScene = this.scene.get("Game") as any;
    if (gameScene && gameScene.socket) {
      gameScene.socket.emit("game_restart");
    }
    this.scene.stop("UIScene");
    this.scene.start("Game");
  }

  private quitToMain() {
    const gameScene = this.scene.get("Game") as any;
    if (gameScene && gameScene.socket) {
      gameScene.socket.emit("quit_to_main");
    }
    this.scene.stop("UIScene");
    this.scene.stop("Game");
    this.scene.start("MainMenuScene");
  }
}

