import Phaser from 'phaser';

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
        if (!this.scene.anims.exists('spawn_dust_anim')) {
            this.scene.anims.create({
                key: 'spawn_dust_anim',
                frames: this.scene.anims.generateFrameNumbers('spawn_dust', { start: 0, end: 9 }),
                frameRate: 15,
                repeat: 0
            });
        }
    }

    private createTextures() {
        // Create a simple white/gray circle for dust
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0xeeeeee, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('fx_dust', 8, 8);
        graphics.clear();

        // Create a simple brown square for debris/wood chips
        graphics.fillStyle(0x8B4513, 1);
        graphics.fillRect(0, 0, 6, 6);
        graphics.generateTexture('fx_debris', 6, 6);
        graphics.clear();

        // Create a red circle for blood
        graphics.fillStyle(0xcc0000, 1);
        graphics.fillCircle(3, 3, 3);
        graphics.generateTexture('fx_blood', 6, 6);
        graphics.destroy();
    }

    private createEmitters() {
        // Dust Explosion Emitter
        this.dustEmitter = this.scene.add.particles(0, 0, 'fx_dust', {
            emitting: false,
            lifespan: { min: 400, max: 700 },
            speed: { min: 80, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            gravityY: -20, // Float up slightly
            blendMode: 'NORMAL'
        });
        this.dustEmitter.setDepth(200);

        // Debris Explosion Emitter
        this.debrisEmitter = this.scene.add.particles(0, 0, 'fx_debris', {
            emitting: false,
            lifespan: { min: 300, max: 500 },
            speed: { min: 100, max: 250 },
            angle: { min: 180 + 45, max: 360 - 45 }, // Upwards arc
            scale: { start: 1, end: 0 },
            gravityY: 600, // Fall down heavily
            blendMode: 'NORMAL'
        });
        this.debrisEmitter.setDepth(200);

        // Blood Explosion Emitter
        this.bloodEmitter = this.scene.add.particles(0, 0, 'fx_blood', {
            emitting: false,
            lifespan: { min: 200, max: 450 },
            speed: { min: 150, max: 300 },
            angle: { min: 0, max: 360 }, // Burst outward
            scale: { start: 1, end: 0 },
            gravityY: 300, // Fall down slightly
            blendMode: 'NORMAL'
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
        const splash = this.scene.add.sprite(x, y, 'spawn_dust');
        splash.setScale(1.5); // 64x64 is a bit small, let's scale it up to cover the player
        splash.setDepth(y + 10); // Appear strictly in front of the player
        splash.play('spawn_dust_anim');
        splash.on('animationcomplete', () => {
            splash.destroy();
        });
    }
}
