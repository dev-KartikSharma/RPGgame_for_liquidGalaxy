import Phaser from 'phaser';
import { TILESETS } from '../constants/assetsKeys';
import { createPlayerAnimations } from '../animations/playeranimation';


export default class MainScene extends Phaser.Scene {

    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private attackKey!: Phaser.Input.Keyboard.Key;
    private guardKey!: Phaser.Input.Keyboard.Key;

    constructor() {
        super('Game');
    }

    create() {

        // =========================
        // ANIMATIONS
        // =========================

        createPlayerAnimations(this);
        // this.player.play('Idle');
        console.log(
            'Idle Animation Exists:',
            this.anims.exists('Idle')
        );

        console.log(
            'Run Animation Exists:',
            this.anims.exists('Run')
        );

        // =========================
        // MAP
        // =========================

        const map = this.make.tilemap({
            key: 'map'
        });

        console.log('Map Size:', map.width, map.height);
        console.log('Map Pixels:', map.widthInPixels, map.heightInPixels);

        // =========================
        // WORLD BOUNDS
        // =========================

        this.physics.world.setBounds(
            0,
            0,
            map.widthInPixels,
            map.heightInPixels
        );

        // TILESETS

        const registeredTilesets: Phaser.Tilemaps.Tileset[] = [];

        for (const asset of TILESETS) {

            const tileset = map.addTilesetImage(
                asset.tiledName,
                asset.key
            );

            if (tileset) {
                registeredTilesets.push(tileset);
            }
        }

        // TILE LAYERS

        const createdLayers: Phaser.Tilemaps.TilemapLayer[] = [];

        map.layers.forEach(layer => {

            const tileLayer = map.createLayer(
                layer.name,
                registeredTilesets,
                0,
                0
            );

            if (tileLayer instanceof Phaser.Tilemaps.TilemapLayer) {

                tileLayer.setCollisionByProperty({
                    collides: true
                });

                let collidableCount = 0;

                tileLayer.forEachTile(
                    (tile: Phaser.Tilemaps.Tile) => {

                        if (tile.properties.collides === true) {
                            collidableCount++;
                        }

                    }
                );

                console.log(
                    `${layer.name} => ${collidableCount} collidable tiles`
                );

                createdLayers.push(tileLayer);
            }
        });


        // PLAYER

        this.player = this.physics.add.sprite(
            map.widthInPixels / 2,
            map.heightInPixels / 2,
            'player'
        );
        this.player.setSize(48, 48);
        

        this.player.setScale(0.45);
    

        this.player.setCollideWorldBounds(true);

        // Idle animation (playing manually)
        this.player.play('Idle');

        // console.log(
        //     'Player Position:',
        //     this.player.x,
        //     this.player.y
        // );


        // =========================
        // TILE COLLISIONS
        // =========================

        const waterLayer = createdLayers.find(
            layer => layer.layer.name === 'water'
        );

        if (waterLayer) {

            this.physics.add.collider(
                this.player,
                waterLayer
            );

            console.log('Water Layer Collision Enabled');
        }


        // =========================
        // OBJECT COLLISIONS
        // =========================

        const collisionLayer = map.getObjectLayer('Collisions');

        console.log('Collision Layer:', collisionLayer);

        const walls = this.physics.add.staticGroup();

        collisionLayer?.objects.forEach(obj => {

            const x = obj.x ?? 0;
            const y = obj.y ?? 0;
            const width = obj.width ?? 0;
            const height = obj.height ?? 0;

            if (width === 0 || height === 0) return;

            const wall = this.add.rectangle(
                x + width / 2,
                y + height / 2,
                width,
                height,
                0xff0000,
                0.2
            );

            this.physics.add.existing(
                wall,
                true
            );

            walls.add(wall);
        });

        this.physics.add.collider(
            this.player,
            walls
        );

        // =========================
        // MAP BORDER DEBUG
        // =========================

        const graphics = this.add.graphics();

        graphics.lineStyle(
            4,
            0xff0000
        );

        graphics.strokeRect(
            0,
            0,
            map.widthInPixels,
            map.heightInPixels
        );
        

        // =========================
        // CAMERA
        // =========================

        this.cameras.main.setBounds(
            0,
            0,
            map.widthInPixels,
            map.heightInPixels
        );

        this.cameras.main.startFollow(
            this.player,
            true
        );

        this.cameras.main.setZoom(1.5);

        // =========================
        // INPUT
        // =========================

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.attackKey = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );
        console.log(this.attackKey);
        this.guardKey = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.SHIFT
        );
        console.log(this.guardKey);
    }

    update() {

        const speed = 200;

        const currentAnim =
            this.player.anims.currentAnim?.key;

        // =========================
        // IF ATTACK IS PLAYING
        // DON'T INTERRUPT IT
        // =========================

        if (
            currentAnim === 'Attack 1' ||
            currentAnim === 'Attack 2'
        ) {

            if (
                !this.player.anims.isPlaying
            ) {

                this.player.play(
                    'Idle',
                    true
                );

            }

            return;
        }

        // =========================
        // ATTACK
        // =========================

        if (
            Phaser.Input.Keyboard.JustDown(
                this.attackKey
            )
        ) {

            this.player.setVelocity(0);

            const attack =
                Math.random() < 0.5
                    ? 'Attack 1'
                    : 'Attack 2';

            console.log(
                'Playing:',
                attack
            );

            this.player.play(
                attack,
                true
            );

            return;
        }

        // =========================
        // GUARD
        // =========================

        if (this.guardKey.isDown) {

            this.player.setVelocity(0);

            if (
                currentAnim !== 'Guard'
            ) {

                this.player.play(
                    'Guard',
                    true
                );

            }

            return;
        }

        // =========================
        // MOVEMENT
        // =========================

        let moving = false;

        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {

            this.player.setVelocityX(-speed);
            moving = true;

        }
        else if (this.cursors.right.isDown) {

            this.player.setVelocityX(speed);
            moving = true;

        }

        if (this.cursors.up.isDown) {

            this.player.setVelocityY(-speed);
            moving = true;

        }
        else if (this.cursors.down.isDown) {

            this.player.setVelocityY(speed);
            moving = true;

        }

        // =========================
        // RUN / IDLE
        // =========================

        if (moving) {

            if (
                currentAnim !== 'Run'
            ) {

                this.player.play(
                    'Run',
                    true
                );

            }

        }
        else {

            if (
                currentAnim !== 'Idle'
            ) {

                this.player.play(
                    'Idle',
                    true
                );

            }

        }
    }
}