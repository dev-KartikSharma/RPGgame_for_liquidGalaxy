import Phaser from 'phaser';
import {
    TILESETS,
    MAPS,
    ASEPRITES
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
    }

    create() {

        this.scene.start('Game');

    }
}