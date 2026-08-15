import Phaser from "phaser";
import {
  TILESETS,
  MAPS,
  ASEPRITES,
  SPRITESHEETS,
  UI_ASSETS,
} from "../constants/assetsKeys";

export default class PreloaderScene extends Phaser.Scene {
  constructor() {
    super("Preloader");
  }

  preload() {
    // load tilesets

    TILESETS.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });

    // spritesheets

    SPRITESHEETS.forEach((asset) => {
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      });
    });

    // aseprite animations

    ASEPRITES.forEach((asset) => {
      this.load.atlas(asset.key, asset.textureURL, asset.atlasURL);
    });

    // maps

    MAPS.forEach((map) => {
      this.load.tilemapTiledJSON(map.key, map.path);
    });

    // ui assets
    this.load.tilemapTiledJSON("ui_map", "maps/ui_map.json");

    UI_ASSETS.forEach((asset) => {
      this.load.image(asset.key, asset.path);
    });
  }

  create() {
    this.scene.start("MainMenuScene");
  }
}
