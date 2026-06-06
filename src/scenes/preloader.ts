import Phaser from 'phaser';
import { TILESETS, MAPS } from '../constants/assetsKeys';
import { IMAGES } from '../constants/assetsKeys';

export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {

        TILESETS.forEach(asset => {
            this.load.image(
                asset.key,
                asset.path
            );
        });
        
        IMAGES.forEach(asset => {
            if (asset.spritesheet) {
                this.load.spritesheet(
                    asset.key,
                    asset.path,
                    {
                        frameWidth: asset.frameWidth,
                        frameHeight: asset.frameHeight
                    }
                );
            } else {
                this.load.image(
                    asset.key,
                    asset.path
                );
            }
        });


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