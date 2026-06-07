import Phaser from 'phaser';
import Preloader from './scenes/preloader';
import Game from './scenes/game';

new Phaser.Game({

    type: Phaser.AUTO,

    width: 1280,
    height: 720,

    parent: 'game-container',

    pixelArt: true,
    
    render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true
    },


    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
        }
    },

    scene: [
        Preloader,
        Game
    ]
});