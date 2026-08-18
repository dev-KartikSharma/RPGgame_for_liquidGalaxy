import Phaser from "phaser";

export default class PauseMenuScene extends Phaser.Scene {
  private onKeyDownEsc = () => {
    this.resumeGame();
  };

  constructor() {
    super({ key: "PauseMenuScene" });
  }

  create() {
    const width = 1280;
    const height = 720;

    // Dark semi-transparent background
    const bgRect = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0);

    const menuContainer = this.add.container(0, 0);

    // Add PAUSED text
    const pausedText = this.add
      .text(width / 2, height / 2 - 80, "PAUSED", {
        fontSize: "64px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    menuContainer.add(pausedText);

    // Resume Button
    const resumeBg = this.add
      .rectangle(width / 2, height / 2 + 20, 240, 60, 0x0055aa, 1)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const resumeText = this.add
      .text(width / 2, height / 2 + 20, "Resume", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    menuContainer.add(resumeBg);
    menuContainer.add(resumeText);

    resumeBg.on("pointerover", () => {
      resumeBg.setFillStyle(0x0077dd, 1);
      this.tweens.add({
        targets: [resumeBg, resumeText],
        scale: 1.05,
        duration: 100,
      });
    });

    resumeBg.on("pointerout", () => {
      resumeBg.setFillStyle(0x0055aa, 1);
      this.tweens.add({
        targets: [resumeBg, resumeText],
        scale: 1.0,
        duration: 100,
      });
    });

    const originalResumeY = height / 2 + 20;
    resumeBg.on("pointerdown", () => {
      resumeBg.setY(originalResumeY + 4);
      resumeText.setY(originalResumeY + 4);
    });

    resumeBg.on("pointerup", () => {
      resumeBg.setY(originalResumeY);
      resumeText.setY(originalResumeY);
      this.resumeGame();
    });

    // Quit Button
    const quitBg = this.add
      .rectangle(width / 2, height / 2 + 100, 240, 60, 0x333333, 1)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const quitText = this.add
      .text(width / 2, height / 2 + 100, "Quit to Menu", {
        fontSize: "24px",
        color: "#ffffff",
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

    const originalQuitY = height / 2 + 100;
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

    // ESC key to also resume
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on("keydown-ESC", this.onKeyDownEsc);
    }

    // Clean up events on shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.input && this.input.keyboard) {
        this.input.keyboard.off("keydown-ESC", this.onKeyDownEsc);
      }
      this.scale.off("resize", resizeUI);
      this.tweens.killAll();
    });
  }

  private resumeGame() {
    this.scene.resume("Game");
    this.scene.stop();
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

