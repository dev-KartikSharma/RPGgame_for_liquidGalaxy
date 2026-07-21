import Phaser from "phaser";
import Preloader from "./scenes/preloader";
import MainMenuScene from "./scenes/MainMenuScene";
import Game from "./scenes/game";
import UIScene from "./scenes/UIScene";
import PauseMenuScene from "./scenes/PauseMenuScene";

new Phaser.Game({
  type: Phaser.AUTO,

  width: 1280,
  height: 720,

  parent: "game-container",

  pixelArt: true,

  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    powerPreference: "high-performance", // Request dedicated GPU
    batchSize: 4096, // Optimize WebGL draw calls
  },

  fps: {
    target: 60,
    forceSetTimeOut: true, // Prevents browsers from killing requestAnimationFrame when VMs lose focus
  },

  scale: {
    mode: Phaser.Scale.RESIZE,
    min: {
      width: 800,
      height: 600,
    },
  },

  physics: {
    default: "matter",
    matter: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },

  scene: [Preloader, MainMenuScene, Game, UIScene, PauseMenuScene],
});
