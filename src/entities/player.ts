import Phaser from 'phaser';

export class Player extends Phaser.Physics.Matter.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private attackKey: Phaser.Input.Keyboard.Key;
    private guardKey: Phaser.Input.Keyboard.Key;

    // Stats Placeholders
    public maxHealth: number = 100;
    public health: number = 100;
    public maxStamina: number = 100;
    public stamina: number = 100;
    public maxMana: number = 100;
    public mana: number = 100;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene.matter.world, x, y, 'player');

        scene.add.existing(this);

        this.setScale(0.5);
        this.setRectangle(40, 40);
        this.setFixedRotation();
        this.setFriction(0);
        this.setFrictionAir(0);
        this.setFrictionStatic(0);

        this.play('Idle');

        // Input setup
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.guardKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    }

    update() {
        if ((this as any).isLGSlave) {
            // Slaves are controlled by the master screen via socket
            return;
        }

        const speed = 3;
        const currentAnim = this.anims.currentAnim?.key;

        // If attack is playing, don't interrupt it
        if (currentAnim === 'Attack 1' || currentAnim === 'Attack 2') {
            if (!this.anims.isPlaying) {
                this.play('Idle', true);
            }
            return;
        }

        // Attack
        if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
            this.setVelocity(0);
            const attack = Math.random() < 0.5 ? 'Attack 1' : 'Attack 2';
            this.play(attack, true);
            return;
        }

        // Guard
        if (this.guardKey.isDown) {
            this.setVelocity(0);
            if (currentAnim !== 'Guard') {
                this.play('Guard', true);
            }
            return;
        }

        // Movement
        let moving = false;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown) {
            vx = -speed;
            moving = true;
        } else if (this.cursors.right.isDown) {
            vx = speed;
            moving = true;
        }

        if (this.cursors.up.isDown) {
            vy = -speed;
            moving = true;
        } else if (this.cursors.down.isDown) {
            vy = speed;
            moving = true;
        }

        this.setVelocity(vx, vy);

        // Run / Idle
        if (moving) {
            if (currentAnim !== 'Run') {
                this.play('Run', true);
            }
        } else {
            if (currentAnim !== 'Idle') {
                this.play('Idle', true);
            }
        }
    }
}
