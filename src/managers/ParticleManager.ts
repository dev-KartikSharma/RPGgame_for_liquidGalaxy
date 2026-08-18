import Phaser from "phaser";

export class ParticleManager {
  private scene: Phaser.Scene;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private debrisEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createTextures();
    this.createEmitters();
    this.createAnimations();
  }

  private createAnimations() {
    if (!this.scene.anims.exists("spawn_dust_anim")) {
      this.scene.anims.create({
        key: "spawn_dust_anim",
        frames: this.scene.anims.generateFrameNumbers("spawn_dust", {
          start: 0,
          end: 9,
        }),
        frameRate: 15,
        repeat: 0,
      });
    }
    if (!this.scene.anims.exists("g_spawn_anim")) {
      this.scene.anims.create({
        key: "g_spawn_anim",
        frames: this.scene.anims.generateFrameNumbers("g_spawn", {
          start: 0,
          end: 6,
        }),
        frameRate: 15,
        repeat: 0,
      });
    }
    if (!this.scene.anims.exists("g_idle_anim")) {
      this.scene.anims.create({
        key: "g_idle_anim",
        frames: this.scene.anims.generateFrameNumbers("g_idle", {
          start: 0,
          end: 0,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  private createTextures() {
    const graphics = this.scene.add.graphics();

    if (!this.scene.textures.exists("fx_dust")) {
      graphics.fillStyle(0xeeeeee, 1);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture("fx_dust", 8, 8);
      graphics.clear();
    }

    if (!this.scene.textures.exists("fx_debris")) {
      graphics.fillStyle(0x8b4513, 1);
      graphics.fillRect(0, 0, 6, 6);
      graphics.generateTexture("fx_debris", 6, 6);
      graphics.clear();
    }

    if (!this.scene.textures.exists("fx_blood")) {
      graphics.fillStyle(0xcc0000, 1);
      graphics.fillCircle(3, 3, 3);
      graphics.generateTexture("fx_blood", 6, 6);
      graphics.clear();
    }

    if (!this.scene.textures.exists("fx_sparkle")) {
      graphics.fillStyle(0xffffaa, 1);
      graphics.fillCircle(3, 3, 3);
      graphics.generateTexture("fx_sparkle", 6, 6);
      graphics.clear();
    }

    graphics.destroy();
  }

  private createEmitters() {
    // Dust Explosion Emitter
    this.dustEmitter = this.scene.add.particles(0, 0, "fx_dust", {
      emitting: false,
      lifespan: { min: 400, max: 700 },
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      gravityY: -20, // Float up slightly
      blendMode: "NORMAL",
    });
    this.dustEmitter.setDepth(200);

    // Debris Explosion Emitter
    this.debrisEmitter = this.scene.add.particles(0, 0, "fx_debris", {
      emitting: false,
      lifespan: { min: 300, max: 500 },
      speed: { min: 100, max: 250 },
      angle: { min: 180 + 45, max: 360 - 45 }, // Upwards arc
      scale: { start: 1, end: 0 },
      gravityY: 600, // Fall down heavily
      blendMode: "NORMAL",
    });
    this.debrisEmitter.setDepth(200);

    // Blood Explosion Emitter
    this.bloodEmitter = this.scene.add.particles(0, 0, "fx_blood", {
      emitting: false,
      lifespan: { min: 200, max: 450 },
      speed: { min: 150, max: 300 },
      angle: { min: 0, max: 360 }, // Burst outward
      scale: { start: 1, end: 0 },
      gravityY: 300, // Fall down slightly
      blendMode: "NORMAL",
    });
    this.bloodEmitter.setDepth(200);
  }

  public playDustExplosion(x: number, y: number, count: number = 8) {
    this.dustEmitter.emitParticleAt(x, y, count);
  }

  public playDebrisExplosion(x: number, y: number, count: number = 5) {
    this.debrisEmitter.emitParticleAt(x, y, count);
  }

  public playBloodExplosion(x: number, y: number, count: number = 10) {
    this.bloodEmitter.emitParticleAt(x, y, count);
  }

  public playSpawnDust(x: number, y: number) {
    const splash = this.scene.add.sprite(x, y, "spawn_dust");
    splash.setScale(1.5); // 64x64 is a bit small, let's scale it up to cover the player
    splash.setDepth(y + 10); // Appear strictly in front of the player
    splash.play("spawn_dust_anim");
    splash.on("animationcomplete", () => {
      splash.destroy();
    });
  }

  public playGSpawn(x: number, y: number): Phaser.GameObjects.Sprite {
    const splash = this.scene.add.sprite(x, y, "g_spawn");
    splash.setScale(1.0);
    splash.setDepth(y + 10);
    splash.play("g_spawn_anim");
    splash.on("animationcomplete", () => {
      splash.destroy();
    });
    return splash;
  }

  public createInteractSparkle(
    x: number,
    y: number,
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.scene.add.particles(x, y, "fx_sparkle", {
      lifespan: { min: 600, max: 1000 },
      speed: { min: 10, max: 30 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      gravityY: -30,
      blendMode: "ADD",
      quantity: 1,
      frequency: 150,
    });
    emitter.setDepth(y + 10);
    return emitter;
  }

  public destroy() {
    if (this.dustEmitter) {
      this.dustEmitter.destroy();
    }
    if (this.debrisEmitter) {
      this.debrisEmitter.destroy();
    }
    if (this.bloodEmitter) {
      this.bloodEmitter.destroy();
    }
  }
}
