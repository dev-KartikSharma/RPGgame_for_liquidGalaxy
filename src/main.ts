import Phaser from 'phaser';
import Preloader from './scenes/preloader';
import Game from './scenes/game';

new Phaser.Game({

    type: Phaser.AUTO,

    width: 1280,
    height: 720,

    pixelArt: true,

    physics: {
        default: 'arcade',
        arcade: {
            debug: true
        }
    },

    scene: [
        Preloader,
        Game
    ]

});