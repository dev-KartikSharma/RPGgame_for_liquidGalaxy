import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { createPlayerAnimations } from '../animations/playeranimation';
import { createEnemyAnimations } from '../animations/enemyanimation';
import { Player } from '../entities/player';
import { Enemy } from '../entities/enemy';
import { MapManager } from '../managers/MapManager';
import { events } from '../managers/EventManager';

export default class MainScene extends Phaser.Scene {

    private player!: Player;
    private mapManager!: MapManager;

    private socket: any;
    private isMaster: boolean = true;
    private screenNum: number = 1;
    private lastEmitData: any = {};
    private enemies: Enemy[] = [];
    private enemiesLastEmitData: { [id: string]: any } = {};

    constructor() {
        super('Game');
    }

    create() {
        // =========================
        // LIQUID GALAXY SETUP
        // =========================
        const urlParams = new URLSearchParams(window.location.search);
        const screenParam = urlParams.get('screen');
        if (screenParam) {
            this.screenNum = parseInt(screenParam, 10);
            if (this.screenNum !== 1) {
                this.isMaster = false;
            }
        }

        // =========================
        // ANIMATIONS
        // =========================
        createPlayerAnimations(this);
        createEnemyAnimations(this);

        // =========================
        // MAP
        // =========================
        // Pass isMaster to MapManager so slave nodes can skip generating physics bodies!
        this.mapManager = new MapManager(this, this.isMaster);
        this.mapManager.buildMap();

        // =========================
        // WORLD BOUNDS
        // =========================
        // Only the master screen needs world bounds physics
        if (this.isMaster) {
            this.matter.world.setBounds(
                0,
                0,
                this.mapManager.widthInPixels,
                this.mapManager.heightInPixels
            );
        }

        // =========================
        // PLAYER
        // =========================
        const spawnPoint = this.mapManager.getPlayerSpawnPoint();
        this.player = new Player(
            this,
            spawnPoint.x,
            spawnPoint.y,
            'player'
        );
        this.player.setDepth(10);

        // =========================
        // ENEMIES
        // =========================
        if (this.isMaster) {
            /* 
            for (let i = 0; i < 8; i++) {
                // Spawn closely alongside the player for testing purposes
                const ex = spawnPoint.x + Phaser.Math.Between(-80, 80);
                const ey = spawnPoint.y + Phaser.Math.Between(-80, 80);
                const enemy = new Enemy(this, ex, ey, 'enemy_goblin_torch_blue');
                enemy.setDepth(9);
                enemy.setTarget(this.player);
                this.enemies.push(enemy);
            }
            */

            events.on('player-attack', (attackingPlayer: Player) => {
                const attackRange = 80;
                this.enemies.forEach(enemy => {
                    if (enemy.isDead) return;
                    const dist = Phaser.Math.Distance.Between(attackingPlayer.x, attackingPlayer.y, enemy.x, enemy.y);
                    if (dist <= attackRange) {
                        const facingRight = !attackingPlayer.flipX;
                        const isEnemyRight = enemy.x > attackingPlayer.x;
                        if (facingRight === isEnemyRight) {
                            enemy.takeDamage(20);
                        }
                    }
                });
            });
        }

        // Matter.js handles collisions automatically between all
        // bodies in the world — no manual collider pairing needed.

        // =========================
        // UI
        // =========================
        if (this.isMaster) {
            this.scene.launch('UIScene');
        }

        // =========================
        // CAMERA & LIQUID GALAXY
        // =========================

        const socketHost = window.location.hostname;
        this.socket = io(`http://${socketHost}:8128`);

        this.cameras.main.setBounds(
            0,
            0,
            this.mapManager.widthInPixels,
            this.mapManager.heightInPixels
        );

        // We removed camera lerp (0.1, 0.1) because in a pixel-art zoomed game, 
        // floating-point camera trailing causes the player sprite to look blurry or ghosted!
        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setZoom(2);

        // Custom LG Layout: lg4 -> lg5 -> lg1 -> lg2 -> lg3
        let screenMultiplier = 0;
        switch (this.screenNum) {
            case 4:
                screenMultiplier = -2; // Far Left
                break;
            case 5:
                screenMultiplier = -1; // Mid Left
                break;
            case 1:
                screenMultiplier = 0;  // Center (Master)
                break;
            case 2:
                screenMultiplier = 1;  // Mid Right
                break;
            case 3:
                screenMultiplier = 2;  // Far Right
                break;
            default:
                screenMultiplier = 0;
        }
        // this.game.set
        // Calculate the world-space offset needed per screen.
        // Since the camera is zoomed in, the actual visible world width is (width / zoom).
        // A positive screenMultiplier (like lg2) means the screen is to the right of the master.
        // To move the camera's center to the right, we must offset the target (player) to the left (negative).
        const calculateLGOffset = () => {
            const visibleWorldWidth = this.cameras.main.width / this.cameras.main.zoom;
            const lgOffsetX = -(screenMultiplier * visibleWorldWidth);
            this.cameras.main.setFollowOffset(lgOffsetX, 0);
        };

        calculateLGOffset();

        this.scale.on('resize', () => {
            calculateLGOffset();
        });

        if (!this.isMaster) {
            (this.player as any).isLGSlave = true;
            this.socket.on('player_update', (data: any) => {
                this.player.setPosition(data.x, data.y);
                if (data.anim) {
                    this.player.play(data.anim, true);
                }
                if (data.flipX !== undefined) {
                    this.player.setFlipX(data.flipX);
                }
            });

            this.socket.on('enemy_update', (data: any) => {
                let enemy = this.enemies.find(e => e.id === data.id);
                if (!enemy && !data.isDead) {
                    enemy = new Enemy(this, data.x, data.y, 'enemy_goblin_torch_blue');
                    (enemy as any).isLGSlave = true;
                    enemy.id = data.id;
                    enemy.setDepth(9);
                    this.enemies.push(enemy);
                }
                
                if (enemy) {
                    if (data.isDead && !enemy.isDead) {
                        enemy.isDead = true;
                        enemy.setTint(0x555555);
                        this.time.delayedCall(1000, () => enemy?.destroy());
                    } else if (!enemy.isDead) {
                        enemy.setPosition(data.x, data.y);
                        if (data.anim) {
                            enemy.play(data.anim, true);
                        }
                        if (data.flipX !== undefined) {
                            enemy.setFlipX(data.flipX);
                        }
                    }
                }
            });
        } else {
            // Pause menu listener
            this.input.keyboard!.on('keydown-ESC', () => {
                this.scene.pause();
                this.scene.launch('PauseMenuScene');
            });
        }
    }

    update(time: number, delta: number) {
        if (this.mapManager) {
            this.mapManager.update(delta);
        }

        if (this.isMaster) {
            this.player.update(time);
            
            const currentAnim = this.player.anims.currentAnim?.key;
            
            // Only emit network updates if the player has actually moved or changed state!
            if (
                this.player.x !== this.lastEmitData.x ||
                this.player.y !== this.lastEmitData.y ||
                currentAnim !== this.lastEmitData.anim ||
                this.player.flipX !== this.lastEmitData.flipX
            ) {
                const emitData = {
                    x: this.player.x,
                    y: this.player.y,
                    anim: currentAnim,
                    flipX: this.player.flipX
                };
                
                this.socket.emit('player_update', emitData);
                this.lastEmitData = emitData;
            }

            // Clean up dead enemies from array
            this.enemies = this.enemies.filter(enemy => !enemy.isDead || enemy.active);

            this.enemies.forEach(enemy => {
                if (enemy.active) {
                    enemy.update(time);
                }
                
                const enemyAnim = enemy.anims.currentAnim?.key;
                const lastData = this.enemiesLastEmitData[enemy.id] || {};
                
                if (
                    enemy.x !== lastData.x ||
                    enemy.y !== lastData.y ||
                    enemyAnim !== lastData.anim ||
                    enemy.flipX !== lastData.flipX ||
                    enemy.isDead !== lastData.isDead
                ) {
                    const enemyEmitData = {
                        id: enemy.id,
                        x: enemy.x,
                        y: enemy.y,
                        anim: enemyAnim,
                        flipX: enemy.flipX,
                        isDead: enemy.isDead
                    };
                    
                    this.socket.emit('enemy_update', enemyEmitData);
                    this.enemiesLastEmitData[enemy.id] = enemyEmitData;
                }
            });
        }
    }
}
