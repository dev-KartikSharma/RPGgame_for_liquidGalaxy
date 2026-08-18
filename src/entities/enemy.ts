import Phaser from "phaser";
import { Player } from "./player";
import { events } from "../managers/EventManager";
export class Enemy extends Phaser.Physics.Matter.Sprite {
  public maxHealth: number = 50;
  public health: number = 50;
  public isDead: boolean = false;
  private target: Player | null = null;
  private speed: number = 1.5;
  private lastAttackTime: number = 0;
  public id: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number,
  ) {
    super(scene.matter.world, x, y, texture, frame);

    this.id = Phaser.Math.RND.uuid();
    scene.add.existing(this);

    this.setScale(0.5);
    // hitbox
    this.setRectangle(35, 35);
    this.setFixedRotation();
    this.setFriction(0);
    this.setFrictionAir(0);
    this.setFrictionStatic(0);

    const animIdle = scene.anims.exists(texture + "_idle") ? texture + "_idle" : "enemy_idle";
    this.play(animIdle);
  }

  public setTarget(player: Player) {
    this.target = player;
  }

  update(time: number) {
    if ((this as any).isLGSlave) {
      // Slaves update position and animations via socket
      return;
    }

    if (this.isDead == true) {
      return;
    }

    const textureKey = this.texture.key;
    const animIdle = this.scene.anims.exists(`${textureKey}_idle`) ? `${textureKey}_idle` : "enemy_idle";
    const animRun = this.scene.anims.exists(`${textureKey}_run`) ? `${textureKey}_run` : "enemy_run";
    const animAttack = this.scene.anims.exists(`${textureKey}_attack`) ? `${textureKey}_attack` : "enemy_attack";

    const currentAnim = this.anims.currentAnim?.key;

    // attack animation lock
    if (currentAnim === animAttack) {
      if (!this.anims.isPlaying) {
        this.play(animIdle, true);
      }
      return;
    }

    if (!this.target || this.target.isDead == true) {
      this.setVelocity(0, 0);
      this.play(animIdle, true);
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );

    if (dist > 300) {
      this.setVelocity(0, 0);
      this.play(animIdle, true);
      return;
    }

    const isTnt = textureKey.includes("tnt");
    const attackRange = isTnt ? 220 : 40;

    if (dist <= attackRange) {
      this.setVelocity(0, 0);
      if (time > this.lastAttackTime + (isTnt ? 2500 : 1500)) {
        this.play(animAttack, true);
        this.lastAttackTime = time;

        if (isTnt) {
          // Dynamite throw timing (midway through throw animation)
          this.scene.time.delayedCall(400, () => {
            if (!this.active || this.isDead || !this.target || this.target.isDead) return;
            if (!(this as any).isLGSlave && (this.scene as any).spawnProjectile) {
              (this.scene as any).spawnProjectile(this.x, this.y, this.target.x, this.target.y);
            }
          });
        } else {
          // deal damage mid-anim
          this.scene.time.delayedCall(300, () => {
            if (
              this.active &&
              this.isDead == false &&
              this.target?.isDead == false &&
              Phaser.Math.Distance.Between(
                this.x,
                this.y,
                this.target!.x,
                this.target!.y,
              ) <=
                40 + 20
            ) {
              this.target!.takeDamage(5);
            }
          });
        }
      } else {
        if (currentAnim !== animAttack || !this.anims.isPlaying) {
          this.play(animIdle, true);
        }
      }
    } else {
      // chase
      const angle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        this.target.x,
        this.target.y,
      );
      const vx = Math.cos(angle) * this.speed;
      const vy = Math.sin(angle) * this.speed;

      this.setVelocity(vx, vy);
      this.play(animRun, true);

      // face direction
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
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    // knockback
    if (this.target) {
      const angle = Phaser.Math.Angle.Between(
        this.target.x,
        this.target.y,
        this.x,
        this.y,
      );
      this.setVelocity(Math.cos(angle) * 5, Math.sin(angle) * 5);
    }

    if (this.health <= 0) {
      this.isDead = true;
      this.setVelocity(0, 0);

      events.emit("enemy-died", this.x, this.y);

      // simple death fx
      this.setTint(0x555555);
      this.scene.time.delayedCall(1000, () => {
        if (this.active) {
          this.destroy();
        }
      });
    }
  }
}
