import Phaser from 'phaser';
import { TILESETS } from '../constants/assetsKeys';

export class MapManager {
    public map: Phaser.Tilemaps.Tilemap;
    public createdLayers: Phaser.Tilemaps.TilemapLayer[] = [];
    private scene: Phaser.Scene;
    private isMaster: boolean;

    constructor(scene: Phaser.Scene, isMaster: boolean = true) {
        this.scene = scene;
        this.isMaster = isMaster;
        this.map = this.scene.make.tilemap({ key: 'map' });
    }

    public buildMap() {
        // =========================
        // TILESETS
        // =========================
        const registeredTilesets: Phaser.Tilemaps.Tileset[] = [];

        for (const asset of TILESETS) {
            const tileset = this.map.addTilesetImage(asset.tiledName, asset.key);
            if (tileset) {
                registeredTilesets.push(tileset);
            }
        }

        // =========================
        // TILE LAYERS
        // =========================
        this.map.layers.forEach(layer => {
            const tileLayer = this.map.createLayer(layer.name, registeredTilesets, 0, 0);

            if (tileLayer instanceof Phaser.Tilemaps.TilemapLayer) {
                this.createdLayers.push(tileLayer);

                // Default depth is 0 (below player).
                // If a layer has a custom boolean property 'abovePlayer' set to true in Tiled, 
                // it renders at depth 20 (above the player).
                const isAbove = layer.properties?.some((p: any) => p.name === 'abovePlayer' && p.value === true);
                tileLayer.setDepth(isAbove ? 20 : 0);

                if (this.isMaster) {
                    tileLayer.setCollisionByProperty({ collides: true });
                    this.scene.matter.world.convertTilemapLayer(tileLayer);
                }
            }
        });

        // =========================
        // OBJECT & WATER COLLISIONS
        // =========================
        // If this is a slave screen, skip physics entirely! Slaves only render graphics.
        if (!this.isMaster) return;

        // Support both lowercase and uppercase layer names
        const collisionLayer = this.map.getObjectLayer('collisions') || this.map.getObjectLayer('Collisions');

        collisionLayer?.objects.forEach(obj => {
            // Check if the object has the custom 'collides' property set to true
            let shouldCollide = false;
            if (Array.isArray(obj.properties)) {
                shouldCollide = obj.properties.some((p: any) => p.name === 'collides' && p.value === true);
            } else if (obj.properties) {
                shouldCollide = obj.properties.collides === true;
            }

            // Only create physics bodies for objects that explicitly have the collides property
            if (!shouldCollide) return;

            const x = obj.x ?? 0;
            const y = obj.y ?? 0;
            const width = obj.width ?? 0;
            const height = obj.height ?? 0;

            if (width === 0 || height === 0) return;

            this.scene.matter.add.rectangle(
                x + width / 2,
                y + height / 2,
                width,
                height,
                { isStatic: true }
            );
        });

        // =========================
        // WATER BOUNDARY COLLISION
        // =========================
        const tileW = this.map.tileWidth;
        const tileH = this.map.tileHeight;
        const nonWaterLayers = this.createdLayers.filter(
            l => l.layer.name !== 'water'
        );

        for (let row = 0; row < this.map.height; row++) {
            for (let col = 0; col < this.map.width; col++) {
                const hasGround = nonWaterLayers.some(layer => {
                    const tile = layer.getTileAt(col, row);
                    return tile !== null && tile.index > 0;
                });

                if (!hasGround) {
                    this.scene.matter.add.rectangle(
                        col * tileW + tileW / 2,
                        row * tileH + tileH / 2,
                        tileW,
                        tileH,
                        { isStatic: true }
                    );
                }
            }
        }
    }

    public get widthInPixels(): number {
        return this.map.widthInPixels;
    }

    public get heightInPixels(): number {
        return this.map.heightInPixels;
    }

    public getPlayerSpawnPoint(): { x: number, y: number } {
        // Look for an object layer named 'Spawns' or 'spawns'
        const spawnsLayer = this.map.getObjectLayer('Spawns') || this.map.getObjectLayer('spawns');
        
        if (spawnsLayer && spawnsLayer.objects) {
            // Find an object named 'PlayerSpawn' or of type 'PlayerSpawn'
            const spawnPoint = spawnsLayer.objects.find(obj => obj.name === 'PlayerSpawn' || obj.type === 'PlayerSpawn');
            if (spawnPoint) {
                return { 
                    x: spawnPoint.x ?? this.widthInPixels / 2, 
                    y: spawnPoint.y ?? this.heightInPixels / 2 
                };
            }
        }
        
        // Fallback to the center of the map
        return { x: this.widthInPixels / 2, y: this.heightInPixels / 2 };
    }
}
