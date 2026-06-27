import Phaser from 'phaser';
import { events } from '../managers/EventManager';

export class Player extends Phaser.Physics.Matter.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd: any;
    private attackKey: Phaser.Input.Keyboard.Key;
    private guardKey: Phaser.Input.Keyboard.Key;
    private interactKey: Phaser.Input.Keyboard.Key;

    // Stats Placeholders
    public maxHealth: number = 100;
    public health: number = 100;
    private maxMana: number = 100;
    private mana: number = 100;
    private lastManaRegenTime: number = 0;
    public isDead: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
        super(scene.matter.world, x, y, texture, frame);

        scene.add.existing(this);

        this.setScale(0.5);
        this.setRectangle(20, 20);
        this.setFixedRotation();
        this.setFriction(0);
        this.setFrictionAir(0);
        this.setFrictionStatic(0);

        this.play('Idle');

        // Input setup
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasd = scene.input.keyboard!.addKeys('W,A,S,D');
        this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.guardKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.interactKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // Initialize UI values
        events.emit('player-health-changed', this.health, this.maxHealth);
        events.emit('player-mana-changed', this.mana, this.maxMana);
    }

    update(time: number) {
        if ((this as any).isLGSlave) {
            // Slaves are controlled by the master screen via socket
            return;
        }

        // Mana regeneration
        if (time > this.lastManaRegenTime + 1000) {
            if (this.mana < this.maxMana) {
                this.mana = Math.min(this.mana + 5, this.maxMana);
                events.emit('player-mana-changed', this.mana, this.maxMana);
            }
            this.lastManaRegenTime = time;
        }

        const speed = 3;
        const currentAnim = this.anims.currentAnim?.key;

        // If attack is playing no interruption
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
            
            // Deal damage at the start of attack for simplicity
            events.emit('player-attack', this);
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
        let vx = 0;
        let vy = 0;

        const leftDown = this.cursors.left.isDown || this.wasd.A.isDown;
        const rightDown = this.cursors.right.isDown || this.wasd.D.isDown;
        const upDown = this.cursors.up.isDown || this.wasd.W.isDown;
        const downDown = this.cursors.down.isDown || this.wasd.S.isDown;

        // Debug key to test UI
        if (Phaser.Input.Keyboard.JustDown(this.scene.input.keyboard!.addKey('X'))) {
            this.takeDamage(10);
        }

        // Interaction
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            events.emit('interact', this);
        }

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
            const length = Math.sqrt(vx * vx + vy * vy);
            vx = (vx / length) * speed;
            vy = (vy / length) * speed;
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

    takeDamage(amount: number) {
        if (this.isDead) return;
        
        // If the player is currently guarding, block the damage!
        if (this.anims.currentAnim?.key === 'Guard') {
            // We could play a block sound or visual effect here
            return;
        }
        
        this.health -= amount;
        events.emit('player-health-changed', this.health, this.maxHealth);

        if (this.health <= 0) {
            this.isDead = true;
            // Handle death logic here if needed
        }
    }

    consumeMana(amount: number): boolean {
        if (this.mana >= amount) {
            this.mana -= amount;
            events.emit('player-mana-changed', this.mana, this.maxMana);
            return true;
        }
        return false;
    }
}
