import Phaser from "phaser";
import { TILESETS } from "../constants/assetsKeys";

interface AnimatedTile {
  tile: Phaser.Tilemaps.Tile;
  animation: { tileid: number; duration: number }[];
  currentFrame: number;
  timer: number;
  firstgid: number;
}

export class MapManager {
  public map: Phaser.Tilemaps.Tilemap;
  public createdLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private scene: Phaser.Scene;
  private isMaster: boolean;
  private animatedTiles: AnimatedTile[] = [];

  constructor(
    scene: Phaser.Scene,
    isMaster: boolean = true,
    mapKey: string = "map",
  ) {
    this.scene = scene;
    this.isMaster = isMaster;
    this.map = this.scene.make.tilemap({ key: mapKey });
  }

  public buildMap() {
    // load tilesets
    const registeredTilesets: Phaser.Tilemaps.Tileset[] = [];

    // We need to keep track of tileset animation data
    const tilesetAnimations: {
      [firstgid: number]: {
        [tileid: number]: { tileid: number; duration: number }[];
      };
    } = {};

    // Extract tileset names embedded in the map JSON
    const mapTilesetNames = this.map.tilesets.map((t) => t.name);

    for (const asset of TILESETS) {
      if (!mapTilesetNames.includes(asset.tiledName)) continue;

      const tileset = this.map.addTilesetImage(asset.tiledName, asset.key);
      if (tileset) {
        registeredTilesets.push(tileset);

        // Extract animation data from the tileset
        if (tileset.tileData) {
          tilesetAnimations[tileset.firstgid] = {};
          for (const tileIdStr in tileset.tileData) {
            const tileData = (tileset.tileData as any)[tileIdStr];
            if (tileData && tileData.animation) {
              tilesetAnimations[tileset.firstgid][parseInt(tileIdStr)] =
                tileData.animation;
            }
          }
        }
      }
    }

    // create layers
    this.map.layers.forEach((layerData, index) => {
      // use standard layer
      const tileLayer = this.map.createLayer(
        layerData.name,
        registeredTilesets,
        0,
        0,
      ) as Phaser.Tilemaps.TilemapLayer;

      if (tileLayer) {
        this.createdLayers.push(tileLayer);

        // Check if the layer name contains 'above' OR if it has a custom property 'abovePlayer' set to true
        const isAbove =
          layerData.name.toLowerCase().includes("above") ||
          layerData.properties?.some(
            (p: any) => p.name === "abovePlayer" && p.value === true,
          );

        // Normal layers get their index (0, 1, 2, 3...). Above layers get 1000.
        tileLayer.setDepth(isAbove ? 1000 : index);

        if (this.isMaster) {
          let layerCollides = false;
          if (layerData.properties) {
            layerCollides = layerData.properties.some(
              (p: any) => p.name === "collides" && p.value === true,
            );
          }

          if (layerCollides) {
            tileLayer.setCollisionByExclusion([-1]);
          } else {
            tileLayer.setCollisionByProperty({ collides: true });
          }
          this.scene.matter.world.convertTilemapLayer(tileLayer);
        }

        // Scan this layer for any animated tiles
        // kinda slow to do this pixel by pixel but it works for now
        for (let row = 0; row < this.map.height; row++) {
          for (let col = 0; col < this.map.width; col++) {
            const tile = tileLayer.getTileAt(col, row);
            if (tile && tile.index > 0) {
              // Find which tileset this tile belongs to
              const tileset = this.map.tilesets.find(
                (ts) =>
                  tile.index >= ts.firstgid &&
                  tile.index < ts.firstgid + ts.total,
              );
              if (tileset) {
                const localId = tile.index - tileset.firstgid;
                const animData = tilesetAnimations[tileset.firstgid]?.[localId];
                if (animData) {
                  this.animatedTiles.push({
                    tile: tile,
                    animation: animData,
                    currentFrame: 0,
                    timer: 0,
                    firstgid: tileset.firstgid,
                  });
                }
              }
            }
          }
        }
      }
    });

    // collisions (master only)
    if (!this.isMaster) return;

    if (this.map.objects) {
      this.map.objects.forEach((layer) => {
        const isCollisionLayer = layer.name.toLowerCase() === "collisions";

        layer.objects?.forEach((obj) => {
          let shouldCollide = isCollisionLayer;

          if (!shouldCollide && obj.properties) {
            if (Array.isArray(obj.properties)) {
              shouldCollide = obj.properties.some(
                (p: any) => p.name === "collides" && p.value === true,
              );
            } else {
              shouldCollide = (obj.properties as any).collides === true;
            }
          }

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
            { isStatic: true },
          );
        });
      });
    }

    // water bounds
    const tileW = this.map.tileWidth;
    const tileH = this.map.tileHeight;
    const nonWaterLayers = this.createdLayers.filter(
      (l) => !l.layer.name.toLowerCase().includes("water"),
    );

    const transitions = this.getMapTransitions();

    for (let row = 0; row < this.map.height; row++) {
      for (let col = 0; col < this.map.width; col++) {
        const hasGround = nonWaterLayers.some((layer) => {
          const tile = layer.getTileAt(col, row);
          return tile !== null && tile.index > 0;
        });

        if (!hasGround) {
          const tileRect = new Phaser.Geom.Rectangle(col * tileW, row * tileH, tileW, tileH);
          const overlapsTransition = transitions.some(t => {
              const tRect = new Phaser.Geom.Rectangle(t.x, t.y, t.width, t.height);
              return Phaser.Geom.Intersects.RectangleToRectangle(tileRect, tRect);
          });

          if (!overlapsTransition) {
            this.scene.matter.add.rectangle(
              col * tileW + tileW / 2,
              row * tileH + tileH / 2,
              tileW,
              tileH,
              { isStatic: true, isSensor: true, label: "water" },
            );
          }
        }
      }
    }
  }

  public update(delta: number) {
    for (const animTile of this.animatedTiles) {
      animTile.timer += delta;
      const currentAnimData = animTile.animation[animTile.currentFrame];

      if (animTile.timer >= currentAnimData.duration) {
        animTile.timer -= currentAnimData.duration;
        animTile.currentFrame =
          (animTile.currentFrame + 1) % animTile.animation.length;
        const nextAnimData = animTile.animation[animTile.currentFrame];

        // Update the tile index visually!
        animTile.tile.index = animTile.firstgid + nextAnimData.tileid;
      }
    }
  }

  public get widthInPixels(): number {
    return this.map.widthInPixels;
  }

  public get heightInPixels(): number {
    return this.map.heightInPixels;
  }

  public getPlayerSpawnPoint(spawnName?: string | null): { x: number; y: number } {
    // Look for an object layer named 'Spawns' or 'spawns' (tiled is weird with caps)
    const spawnsLayer =
      this.map.getObjectLayer("Spawns") || this.map.getObjectLayer("spawns");

    if (spawnsLayer && spawnsLayer.objects) {
      // If a specific spawnName is provided, look for it first
      if (spawnName) {
        const specificSpawn = spawnsLayer.objects.find(
          (obj) => obj.name === spawnName,
        );
        if (specificSpawn) {
          return {
            x: specificSpawn.x ?? this.widthInPixels / 2,
            y: specificSpawn.y ?? this.heightInPixels / 2,
          };
        }
      }

      // Find an object named 'PlayerSpawn' or of type 'PlayerSpawn'
      const spawnPoint = spawnsLayer.objects.find(
        (obj) => obj.name === "PlayerSpawn" || obj.type === "PlayerSpawn",
      );
      if (spawnPoint) {
        return {
          x: spawnPoint.x ?? this.widthInPixels / 2,
          y: spawnPoint.y ?? this.heightInPixels / 2,
        };
      }
    }

    // Fallback to the center of the map
    return { x: this.widthInPixels / 2, y: this.heightInPixels / 2 };
  }

  public getEnemySpawnPoints(): { x: number; y: number; type?: string }[] {
    const spawnsLayer =
      this.map.getObjectLayer("Spawns") || this.map.getObjectLayer("spawns");
    const enemySpawns: { x: number; y: number; type?: string }[] = [];

    if (spawnsLayer && spawnsLayer.objects) {
      spawnsLayer.objects.forEach((obj) => {
        if (obj.name === "EnemySpawn" || obj.type === "EnemySpawn") {
          enemySpawns.push({
            x: obj.x ?? 0,
            y: obj.y ?? 0,
            type: obj.type,
          });
        }
      });
    }

    return enemySpawns;
  }

  public getNpcSpawnPoints(): { x: number; y: number; type?: string }[] {
    const spawnsLayer =
      this.map.getObjectLayer("Spawns") || this.map.getObjectLayer("spawns");
    const npcSpawns: { x: number; y: number; type?: string }[] = [];

    if (spawnsLayer && spawnsLayer.objects) {
      spawnsLayer.objects.forEach((obj) => {
        if (obj.name === "NPCSpawn" || obj.type === "NPCSpawn") {
          npcSpawns.push({
            x: obj.x ?? 0,
            y: obj.y ?? 0,
            type: obj.type,
          });
        }
      });
    }

    return npcSpawns;
  }

  public getPointOfInterest(name: string): { x: number; y: number } | null {
    if (this.map.objects) {
      for (const layer of this.map.objects) {
        if (layer.objects) {
          const obj = layer.objects.find((o) => o.name === name);
          if (obj) {
            const width = obj.width ?? 0;
            const height = obj.height ?? 0;
            // Center X, Bottom Y for rectangle objects (like interaction zones)
            return {
              x: (obj.x ?? 0) + width / 2,
              y: (obj.y ?? 0) + height,
            };
          }
        }
      }
    }
    return null;
  }

  public getPointsOfInterest(name: string): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    if (this.map.objects) {
      for (const layer of this.map.objects) {
        if (layer.objects) {
          const objs = layer.objects.filter(
            (o) => o.name === name || o.type === name,
          );
          for (const obj of objs) {
            const width = obj.width ?? 0;
            const height = obj.height ?? 0;
            points.push({
              x: (obj.x ?? 0) + width / 2,
              y: (obj.y ?? 0) + height,
            });
          }
        }
      }
    }
    return points;
  }

  public getMapTransitions(): {
    x: number;
    y: number;
    width: number;
    height: number;
    targetMap: string;
    spawnName?: string;
  }[] {
    const transitionsLayer =
      this.map.getObjectLayer("Transitions") ||
      this.map.getObjectLayer("transitions") ||
      this.map.getObjectLayer("Warp") ||
      this.map.getObjectLayer("warp");
    const transitions: {
      x: number;
      y: number;
      width: number;
      height: number;
      targetMap: string;
      spawnName?: string;
    }[] = [];

    if (transitionsLayer && transitionsLayer.objects) {
      transitionsLayer.objects.forEach((obj) => {
        let targetMap = obj.properties?.find(
          (p: any) => p.name === "targetMap",
        )?.value;
        const spawnName = obj.properties?.find(
          (p: any) => p.name === "spawnName",
        )?.value;
          if (targetMap) {
            // Clean filename if user typed file extension in Tiled
            if (targetMap.endsWith(".json")) {
              targetMap = targetMap.replace(".json", "");
            }
            // Map legacy or shorthand names to asset keys
            if (targetMap === "spawn") {
              targetMap = "map";
            }

          transitions.push({
            x: obj.x ?? 0,
            y: obj.y ?? 0,
            width: obj.width ?? 0,
            height: obj.height ?? 0,
            targetMap: targetMap,
            spawnName: spawnName,
          });
        }
      });
    }
    return transitions;
  }
}
