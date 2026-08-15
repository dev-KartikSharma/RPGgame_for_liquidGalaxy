import Phaser from "phaser";
import { events } from "../managers/EventManager";

export class Player extends Phaser.Physics.Matter.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: any;
  private attackKey: Phaser.Input.Keyboard.Key;
  private guardKey: Phaser.Input.Keyboard.Key;


  // player stats
  public maxHealth: number = 100;
  public health: number = 100;
  private mana: number = 100;
  private lastManaRegenTime: number = 0;
  public isDead: boolean = false;
  private inWaterCount: number = 0;
  private waterDeathTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number,
  ) {
    super(scene.matter.world, x, y, texture, frame);

    scene.add.existing(this);

    this.setScale(0.5);
    this.setRectangle(20, 20);
    this.setFixedRotation();
    this.setFriction(0);
    this.setFrictionAir(0);
    this.setFrictionStatic(0);

    this.play("Idle");

    // setup keys
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys("W,A,S,D"); // adding WASD because arrow keys suck
    this.attackKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.guardKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );

    // init hud
    events.emit("player-health-changed", this.health, 100);
    events.emit("player-mana-changed", this.mana, 100);

    // drown in water
    scene.matter.world.on(
      "collisionstart",
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
        if (this.isDead || (this as any).isLGSlave) return;

        for (const pair of event.pairs) {
          const bodyA = pair.bodyA as MatterJS.BodyType;
          const bodyB = pair.bodyB as MatterJS.BodyType;

          const isPlayer = bodyA === this.body || bodyB === this.body;
          const isWater = bodyA.label === "water" || bodyB.label === "water";

          if (isPlayer && isWater) {
            this.inWaterCount++;
            if (this.inWaterCount === 1) {
              this.takeDamage(20);
              this.waterDeathTimer = scene.time.addEvent({
                delay: 600,
                callback: () => {
                  if (!this.isDead && this.inWaterCount > 0) {
                    this.takeDamage(20);
                  }
                },
                loop: true
              });
            }
          }
        }
      },
    );

    scene.matter.world.on(
      "collisionend",
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
        if (this.isDead || (this as any).isLGSlave) return;

        for (const pair of event.pairs) {
          const bodyA = pair.bodyA as MatterJS.BodyType;
          const bodyB = pair.bodyB as MatterJS.BodyType;

          const isPlayer = bodyA === this.body || bodyB === this.body;
          const isWater = bodyA.label === "water" || bodyB.label === "water";

          if (isPlayer && isWater) {
            this.inWaterCount = Math.max(0, this.inWaterCount - 1);
            if (this.inWaterCount === 0 && this.waterDeathTimer) {
              this.waterDeathTimer.destroy();
              this.waterDeathTimer = null;
            }
          }
        }
      },
    );
  }

  update(time: number) {
    if ((this as any).isLGSlave) {
      // master controls slaves
      return;
    }

    if (this.isDead) return;

    // Mana regeneration
    if (time > this.lastManaRegenTime + 1000) {
      if (this.mana < 100) {
        this.mana = Math.min(this.mana + 5, 100);
        events.emit("player-mana-changed", this.mana, 100);
      }
      this.lastManaRegenTime = time;
    }

    const speed = 3;
    const currentAnim = this.anims.currentAnim?.key;

    // don't interrupt attacks
    if (currentAnim === "Attack 1" || currentAnim === "Attack 2") {
      if (!this.anims.isPlaying) {
        this.play("Idle", true);
      }
      return;
    }

    // Attack
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.setVelocity(0);
      const attack = Math.random() < 0.5 ? "Attack 1" : "Attack 2";
      this.play(attack, true);

      // attack logic
      events.emit("player-attack", this);
      return;
    }

    // Guard
    if (this.guardKey.isDown) {
      this.setVelocity(0);
      if (currentAnim !== "Guard") {
        this.play("Guard", true);
      }
      return;
    }

    // Movement
    let vx = 0;
    let vy = 0;

    const leftDown = this.cursors.left.isDown || this.wasd.A.isDown;
    const rightDown = this.cursors.right.isDown || this.wasd.D.isDown;
    const upDown = this.cursors.up.isDown || this.wasd.W.isDown;
    const downDown = this.cursors.down.isDown || this.wasd.S.isDown;

    // debug damage
    // used to be X but kept hitting it by accident
    if (
      Phaser.Input.Keyboard.JustDown(this.scene.input.keyboard!.addKey("K"))
    ) {
      this.takeDamage(10);
      // console.log("took 10 damage manually");
    }

    // Interaction removed from here to prevent consuming the JustDown flag before game.ts can check it

    if (leftDown) {
      vx = -1;
      this.setFlipX(true);
    } else if (rightDown) {
      vx = 1;
      this.setFlipX(false);
    }

    if (upDown) {
      vy = -1;
    } else if (downDown) {
      vy = 1;
    }

    let moving = false;
    if (vx !== 0 || vy !== 0) {
      moving = true;
      // Normalize the diagonal vector
      const length = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / length) * speed;
      vy = (vy / length) * speed;
    }

    this.setVelocity(vx, vy);

    // animations
    if (moving) {
      if (currentAnim !== "Run") {
        this.play("Run", true);
      }
    } else {
      if (currentAnim !== "Idle") {
        this.play("Idle", true);
      }
    }
  }

  takeDamage(amount: number) {
    if (this.isDead || (this.scene as any).transitioning) return;
    // console.log(`player took ${amount} damage, health is now ${this.health - amount}`);

    // block damage if guarding
    if (this.anims.currentAnim?.key === "Guard") {
      return;
    }

    this.health -= amount;
    events.emit("player-health-changed", this.health, 100);

    // damage flash
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });

    if (this.health <= 0) {
      if (this.inWaterCount > 0) {
        this.dieInWater();
      } else {
        this.isDead = true;
        events.emit("player-died", this);
      }
    }
  }

  consumeMana(amount: number): boolean {
    if (this.mana >= amount) {
      this.mana -= amount;
      events.emit("player-mana-changed", this.mana, 100);
      return true;
    }
    return false;
  }

  dieInWater() {
    if (this.isDead || (this.scene as any).transitioning) return;
    this.isDead = true;
    this.setVelocity(0, 0);
    this.setIgnoreGravity(true);
    this.setCollidesWith(0);
    this.setVisible(false);

    // splash fx
    const splash = this.scene.add.sprite(this.x, this.y, "water_splash");
    splash.setDepth(100);

    // create anim if missing
    // doing this here instead of preloader because i forgot lol
    if (!this.scene.anims.exists("play_water_splash")) {
      this.scene.anims.create({
        key: "play_water_splash",
        frames: this.scene.anims.generateFrameNumbers("water_splash", {
          start: 0,
          end: 8,
        }), // 9 frames total (0 to 8)
        frameRate: 8, // Slower frame rate so it's fully visible
        repeat: 0,
      });
    }

    splash.play("play_water_splash");

    splash.on("animationcomplete", () => {
      splash.destroy();
      events.emit("player-died", this);
    });
  }
}
