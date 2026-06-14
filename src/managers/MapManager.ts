import Phaser from 'phaser';
import { TILESETS } from '../constants/assetsKeys';

export class MapManager {
    public map: Phaser.Tilemaps.Tilemap;
    public createdLayers: Phaser.Tilemaps.TilemapLayer[] = [];
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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

                // Skip the water layer — it fills the entire map with
                // collides:true tiles. Water boundaries are handled
                // separately below with invisible rectangles.
                if (layer.name !== 'water') {
                    tileLayer.setCollisionByProperty({ collides: true });
                    this.scene.matter.world.convertTilemapLayer(tileLayer);
                }
            }
        });

        // =========================
        // OBJECT COLLISIONS
        // =========================
        const collisionLayer = this.map.getObjectLayer('Collisions');

        collisionLayer?.objects.forEach(obj => {
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
        // For each cell in the map, check if ANY non-water layer has a
        // tile there. If not, it's open water — place a static Matter body.
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
}
