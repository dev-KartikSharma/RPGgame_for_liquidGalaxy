import Phaser from 'phaser';
import {
    TILESETS,
    MAPS,
    ASEPRITES,
    UI_ASSETS
} from '../constants/assetsKeys';

export default class PreloaderScene extends Phaser.Scene {

    constructor() {
        super('Preloader');
    }

    preload() {

        // =========================
        // TILESETS
        // =========================

        TILESETS.forEach(asset => {

            this.load.image(
                asset.key,
                asset.path
            );

        });

        // =========================
        // ASEPRITE ANIMATIONS
        // =========================

        ASEPRITES.forEach(asset => {

            this.load.atlas(
                asset.key,
                asset.textureURL,
                asset.atlasURL
            );

        });

        // =========================
        // MAPS
        // =========================

        MAPS.forEach(map => {

            this.load.tilemapTiledJSON(
                map.key,
                map.path
            );

        });

        // =========================
        // UI ASSETS
        // =========================
        this.load.tilemapTiledJSON('ui_map', 'maps/ui_map.json');
        this.load.tilemapTiledJSON('PauseMenu', 'maps/PauseMenu.json');

        UI_ASSETS.forEach(asset => {
            this.load.image(
                asset.key,
                asset.path
            );
        });
    }

    create() {

        this.scene.start('MainMenuScene');

    }
}