import Phaser from 'phaser';
import { Player } from './player';
import { events } from '../managers/EventManager';

export class Enemy extends Phaser.Physics.Matter.Sprite {
    public maxHealth: number = 50;
    public health: number = 50;
    public isDead: boolean = false;
    private target: Player | null = null;
    private speed: number = 1.5;
    private attackRange: number = 40;
    private aggroRange: number = 300;
    private lastAttackTime: number = 0;
    private attackCooldown: number = 1500;
    private attackDamage: number = 5;
    public id: string;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
        super(scene.matter.world, x, y, texture, frame);

        this.id = Phaser.Math.RND.uuid();
        scene.add.existing(this);

        this.setScale(0.5);
        // Adjust the hitbox size if necessary
        this.setRectangle(35, 35);
        this.setFixedRotation();
        this.setFriction(0);
        this.setFrictionAir(0);
        this.setFrictionStatic(0);

        this.play('enemy_idle');
    }

    public setTarget(player: Player) {
        this.target = player;
    }

    update(time: number) {
        if ((this as any).isLGSlave) {
            // Slaves update position and animations via socket
            return;
        }

        if (this.isDead) return;

        const currentAnim = this.anims.currentAnim?.key;

        // If attack is playing no interruption
        if (currentAnim === 'enemy_attack') {
            if (!this.anims.isPlaying) {
                this.play('enemy_idle', true);
            }
            return;
        }

        if (!this.target || this.target.isDead) {
            this.setVelocity(0, 0);
            this.play('enemy_idle', true);
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (dist > this.aggroRange) {
            this.setVelocity(0, 0);
            this.play('enemy_idle', true);
            return;
        }

        if (dist <= this.attackRange) {
            this.setVelocity(0, 0);
            if (time > this.lastAttackTime + this.attackCooldown) {
                this.play('enemy_attack', true);
                this.lastAttackTime = time;
                
                // Deal damage to player roughly halfway through the animation (simplified)
                this.scene.time.delayedCall(300, () => {
                    if (!this.isDead && !this.target?.isDead && Phaser.Math.Distance.Between(this.x, this.y, this.target!.x, this.target!.y) <= this.attackRange + 20) {
                        this.target!.takeDamage(this.attackDamage);
                    }
                });
            } else {
                this.play('enemy_idle', true);
            }
        } else {
            // Move towards target
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            const vx = Math.cos(angle) * this.speed;
            const vy = Math.sin(angle) * this.speed;

            this.setVelocity(vx, vy);
            this.play('enemy_run', true);

            // Flip sprite based on direction
            if (vx < 0) {
                this.setFlipX(true);
            } else if (vx > 0) {
                this.setFlipX(false);
            }
        }
    }

    takeDamage(amount: number) {
        if (this.isDead || (this as any).isLGSlave) return;

        this.health -= amount;

        // Flash red when hit
        this.setTintFill(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.clearTint();
        });

        // Knockback effect
        if (this.target) {
            const angle = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
            this.setVelocity(Math.cos(angle) * 5, Math.sin(angle) * 5);
        }

        if (this.health <= 0) {
            this.isDead = true;
            this.setVelocity(0, 0);
            
            // Just tint grey or disappear for now
            this.setTint(0x555555);
            this.scene.time.delayedCall(1000, () => {
                this.destroy();
            });
        }
    }
}
