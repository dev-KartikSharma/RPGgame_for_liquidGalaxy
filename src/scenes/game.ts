import Phaser from 'phaser';
import { TILESETS } from '../constants/assetsKeys';

export default class MainScene extends Phaser.Scene {

    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('Game');
    }

    create() {

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

        // =========================
        // TILESETS
        // =========================

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

        // =========================
        // TILE LAYERS
        // =========================

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

        // =========================
        // PLAYER
        // =========================

        this.player = this.physics.add.sprite(
            map.widthInPixels / 2,
            map.heightInPixels / 2,
            'player'
        );

        this.player.setCollideWorldBounds(true);

        console.log(
            'Player Position:',
            this.player.x,
            this.player.y
        );

        console.log(
            'Player Size:',
            this.player.width,
            this.player.height
        );

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

        // Player ↔ Object Collision

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

        this.cameras.main.setZoom(0.5);

        // =========================
        // INPUT
        // =========================

        this.cursors = this.input.keyboard!.createCursorKeys();
    }

    update() {

        const speed = 200;

        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        }
        else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        }
    }
}