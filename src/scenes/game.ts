import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { createPlayerAnimations } from '../animations/playeranimation';
import { Player } from '../entities/player';
import { MapManager } from '../managers/MapManager';

export default class MainScene extends Phaser.Scene {

    private player!: Player;
    private mapManager!: MapManager;

    private socket: any;
    private isMaster: boolean = true;
    private screenNum: number = 1;

    constructor() {
        super('Game');
    }

    create() {
        // =========================
        // ANIMATIONS
        // =========================
        createPlayerAnimations(this);

        // =========================
        // MAP
        // =========================
        this.mapManager = new MapManager(this);
        this.mapManager.buildMap();

        // =========================
        // WORLD BOUNDS
        // =========================
        this.matter.world.setBounds(
            0,
            0,
            this.mapManager.widthInPixels,
            this.mapManager.heightInPixels
        );

        // =========================
        // PLAYER
        // =========================
        this.player = new Player(
            this,
            this.mapManager.widthInPixels / 2,
            this.mapManager.heightInPixels / 2
        );

        // Matter.js handles collisions automatically between all
        // bodies in the world — no manual collider pairing needed.

        // =========================
        // CAMERA & LIQUID GALAXY
        // =========================

        const urlParams = new URLSearchParams(window.location.search);
        const screenParam = urlParams.get('screen');
        if (screenParam) {
            this.screenNum = parseInt(screenParam, 10);
            if (this.screenNum !== 1) {
                this.isMaster = false;
            }
        }

        this.socket = io('http://localhost:8128');

        this.cameras.main.setBounds(
            0,
            0,
            this.mapManager.widthInPixels,
            this.mapManager.heightInPixels
        );

        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setZoom(1.5);

        // LG Camera Offset
        // Standard LG structure: 1 is Center. Evens go Right. Odds go Left.
        // 1 -> 0, 2 -> 1, 3 -> -1, 4 -> 2, 5 -> -2
        let screenMultiplier = 0;
        if (this.screenNum % 2 === 0) {
            screenMultiplier = this.screenNum / 2; // Right side
        } else {
            screenMultiplier = -((this.screenNum - 1) / 2); // Left side
        }

        const lgOffsetX = screenMultiplier * this.cameras.main.width;
        this.cameras.main.setFollowOffset(lgOffsetX, 0);

        if (!this.isMaster) {
            (this.player as any).isLGSlave = true;
            this.socket.on('player_update', (data: any) => {
                this.player.setPosition(data.x, data.y);
                if (data.anim) {
                    this.player.play(data.anim, true);
                }
            });
        }
    }

    update() {
        if (this.isMaster) {
            this.player.update();
            this.socket.emit('player_update', {
                x: this.player.x,
                y: this.player.y,
                anim: this.player.anims.currentAnim?.key
            });
        }
    }
}