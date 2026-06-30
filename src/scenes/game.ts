import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { createPlayerAnimations } from '../animations/playeranimation';
import { createEnemyAnimations } from '../animations/enemyanimation';
import { Player } from '../entities/player';
import { Enemy } from '../entities/enemy';
import { MapManager } from '../managers/MapManager';
import { ParticleManager } from '../managers/ParticleManager';
import { events } from '../managers/EventManager';

export default class MainScene extends Phaser.Scene {

    private player!: Player;
    private mapManager!: MapManager;
    private particleManager!: ParticleManager;

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
        // lg screen setup
        // TODO: test if this works on actual setup instead of localhost
        const urlParams = new URLSearchParams(window.location.search);
        const screenParam = urlParams.get('screen');
        if (screenParam) {
            this.screenNum = parseInt(screenParam, 10);
            if (this.screenNum !== 1) {
                this.isMaster = false;
            }
        }

        // animations
        createPlayerAnimations(this);
        createEnemyAnimations(this);

        // generate map (master handles physics)
        this.mapManager = new MapManager(this, this.isMaster);
        this.mapManager.buildMap();

        // set bounds for master screen only
        if (this.isMaster) {
            this.matter.world.setBounds(
                0,
                0,
                this.mapManager.widthInPixels,
                this.mapManager.heightInPixels
            );
            // console.log("bounds set for master");
        }

        // spawn player
        const spawnPoint = this.mapManager.getPlayerSpawnPoint();
        this.player = new Player(
            this,
            spawnPoint.x,
            spawnPoint.y,
            'player'
        );
        this.player.setDepth(10);
        
        // hide player during spawn intro (master only)
        if (this.isMaster) {
            this.player.setVisible(false);
        }

        // fx manager
        this.particleManager = new ParticleManager(this);

        // load enemies on master
        if (this.isMaster) {
            const enemySpawns = this.mapManager.getEnemySpawnPoints();
            
            enemySpawns.forEach(spawn => {
                const enemy = new Enemy(this, spawn.x, spawn.y, 'enemy_goblin_torch_blue');
                enemy.setDepth(9);
                enemy.setTarget(this.player);
                this.enemies.push(enemy);
            });

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
                            
                            // blood fx
                            this.particleManager.playBloodExplosion(enemy.x, enemy.y, 15);
                        }
                    }
                });
            });
        }

        // matter.js handles collisions

        // HUD
        if (this.isMaster) {
            this.scene.launch('UIScene');
        }

        // setup camera & network

        const socketHost = window.location.hostname;
        this.socket = io(`http://${socketHost}:8128`);

        this.cameras.main.setBounds(
            0,
            0,
            this.mapManager.widthInPixels,
            this.mapManager.heightInPixels
        );

        // follow player (no lerp to avoid pixel blur)
        // tried lerp 0.1 but it looked weird af
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
        // lg offsets
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

        // intro sequence
        // FIXME: find a way to skip this while testing
        if (this.isMaster) {
            // Fade in from black over 2 seconds
            this.cameras.main.fadeIn(2000, 0, 0, 0);

            // wait for fade then play dust
            this.time.delayedCall(500, () => {
                // play dust and show player
                this.particleManager.playSpawnDust(this.player.x, this.player.y);
                
                this.time.delayedCall(300, () => {
                    this.player.setVisible(true);
                });
            });

            // Show dialogue when fade completes
            this.time.delayedCall(2000, () => {
                events.emit('show-dialog', [
                    { speaker: 'The Awakened', text: "...Ugh. My head. How long have I been asleep?" },
                    { speaker: 'The Awakened', text: "The last thing I remember... the sky turning black, and the Great Castle falling. Then, nothing but darkness." },
                    { speaker: 'The Awakened', text: "My armor... the blue crest of the River-Folk. I must be miles away from the Domain." },
                    { speaker: 'The Awakened', text: "This forest feels... wrong. I can hear rustling in the bushes. I need to find a way out of these woods and figure out what happened to the kingdom." },
                    { speaker: 'System', text: "Use W, A, S, D to move and SPACE to attack. Beware of the feral Goblins lurking in the trees!" }
                ]);
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
            
            // send sync data if changed
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

            // remove dead enemies
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
                    
                    // emit it
                    this.socket.emit('enemy_update', enemyEmitData);
                    this.enemiesLastEmitData[enemy.id] = enemyEmitData;
                }
            });
        }
    }
}
