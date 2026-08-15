import Phaser from "phaser";
import { io } from "socket.io-client";

export default class MainMenuScene extends Phaser.Scene {
  private socket: any;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create() {
    const urlParams = new URLSearchParams(window.location.search);
    const screenParam = urlParams.get("screen");
    const isMaster = !screenParam || parseInt(screenParam, 10) === 1;

    const socketHost = window.location.hostname;
    this.socket = io(`http://${socketHost}:8128`);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Draw Background
    const bg = this.add.image(width / 2, height / 2, "start_screen");
    bg.setDisplaySize(width, height);

    if (isMaster) {
      // Title Text
      this.add
        .text(width / 2, height / 3, "RPG GAME", {
          fontSize: "64px",
          color: "#fff",
          fontStyle: "bold",
          stroke: "#000",
          strokeThickness: 6,
        })
        .setOrigin(0.5);



      // Start Button (Clean Native Rectangle to avoid 9-slice glitches)
      const buttonBg = this.add
        .rectangle(width / 2, height / 2 + 50, 240, 60, 0x0055aa, 0.9)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const startText = this.add
        .text(width / 2, height / 2 + 50, "Start Game", {
          fontSize: "28px",
          color: "#fff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      buttonBg.on("pointerover", () => {
        buttonBg.setFillStyle(0x0077ff, 1);
        this.tweens.add({
          targets: [buttonBg, startText],
          scale: 1.05,
          duration: 100,
        });
      });

      buttonBg.on("pointerout", () => {
        buttonBg.setFillStyle(0x0055aa, 0.9);
        this.tweens.add({
          targets: [buttonBg, startText],
          scale: 1.0,
          duration: 100,
        });
      });

      const originalY = height / 2 + 50;

      buttonBg.on("pointerdown", () => {
        buttonBg.setY(originalY + 4);
        startText.setY(originalY + 4);
      });

      buttonBg.on("pointerup", () => {
        buttonBg.setY(originalY);
        startText.setY(originalY);
        this.startGame();
      });

      // Settings Button
      const settingsBg = this.add
        .rectangle(width / 2, height / 2 + 130, 240, 60, 0x0055aa, 0.9)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const settingsText = this.add
        .text(width / 2, height / 2 + 130, "Settings", {
          fontSize: "28px",
          color: "#fff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      settingsBg.on("pointerover", () => {
        settingsBg.setFillStyle(0x0077ff, 1);
        this.tweens.add({
          targets: [settingsBg, settingsText],
          scale: 1.05,
          duration: 100,
        });
      });

      settingsBg.on("pointerout", () => {
        settingsBg.setFillStyle(0x0055aa, 0.9);
        this.tweens.add({
          targets: [settingsBg, settingsText],
          scale: 1.0,
          duration: 100,
        });
      });

      const settingsOriginalY = height / 2 + 130;

      settingsBg.on("pointerdown", () => {
        settingsBg.setY(settingsOriginalY + 4);
        settingsText.setY(settingsOriginalY + 4);
      });

      settingsBg.on("pointerup", () => {
        settingsBg.setY(settingsOriginalY);
        settingsText.setY(settingsOriginalY);
        this.scene.launch("PauseMenuScene");
      });
    } else {
      // Slave Screen Waiting State
      const waitText = this.add
        .text(width / 2, height / 2, "Waiting for Master...", {
          fontSize: "32px",
          color: "#aaaaaa",
          fontStyle: "italic",
          stroke: "#000",
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: waitText,
        alpha: 0.3,
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });

      this.socket.on("start_game", () => {
        this.startGame();
      });

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        if (this.socket) {
          this.socket.off("start_game");
        }
      });
    }
  }

  private startGame() {
    if (this.socket) {
      const urlParams = new URLSearchParams(window.location.search);
      const screenParam = urlParams.get("screen");
      const isMaster = !screenParam || parseInt(screenParam, 10) === 1;

      if (isMaster) {
        this.socket.emit("start_game");
      }

      this.socket.disconnect();
    }

    this.scene.start("Game");
  }
}
