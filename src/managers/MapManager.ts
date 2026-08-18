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
        // Scan tilemap layers for animated tile definitions
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
            shouldCollide = this.getProperty(obj.properties, "collides") === true;
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

  /**
   * Safely retrieves a custom property value from either Array or Object format.
   */
  private getProperty(properties: any, propName: string): any {
    if (!properties) return undefined;
    if (Array.isArray(properties)) {
      const prop = properties.find(
        (p: any) =>
          p &&
          typeof p.name === "string" &&
          p.name.toLowerCase() === propName.toLowerCase(),
      );
      return prop ? prop.value : undefined;
    }
    if (typeof properties === "object") {
      // Case-insensitive key lookup on object properties
      for (const key of Object.keys(properties)) {
        if (key.toLowerCase() === propName.toLowerCase()) {
          return properties[key];
        }
      }
    }
    return undefined;
  }

  /**
   * Finds an object layer matching any of the candidate names (case-insensitive).
   */
  private getObjectLayerByName(
    candidates: string[],
  ): Phaser.Tilemaps.ObjectLayer | null {
    if (!this.map || !this.map.objects) return null;
    for (const name of candidates) {
      const found = this.map.objects.find(
        (l) => l.name && l.name.toLowerCase() === name.toLowerCase(),
      );
      if (found) return found;
    }
    return null;
  }

  /**
   * Collects all objects across all object layers in the map.
   */
  private getAllMapObjects(): Phaser.Types.Tilemaps.TiledObject[] {
    if (!this.map || !this.map.objects) return [];
    const allObjs: Phaser.Types.Tilemaps.TiledObject[] = [];
    for (const layer of this.map.objects) {
      if (layer && layer.objects) {
        allObjs.push(...layer.objects);
      }
    }
    return allObjs;
  }

  public getPlayerSpawnPoint(
    spawnName?: string | null,
  ): { x: number; y: number } {
    const mapKey = (this.map as any)?.key ?? "unknown_map";
    const defaultX = this.widthInPixels > 0 ? this.widthInPixels / 2 : 400;
    const defaultY = this.heightInPixels > 0 ? this.heightInPixels / 2 : 300;

    // 1. Sanitize spawnName
    const sanitizedSpawnName =
      spawnName &&
      typeof spawnName === "string" &&
      spawnName.trim() !== "" &&
      spawnName.trim().toLowerCase() !== "null" &&
      spawnName.trim().toLowerCase() !== "undefined"
        ? spawnName.trim()
        : null;

    // 2. Discover spawn layer or candidate objects
    const spawnLayerCandidates = [
      "Spawns",
      "spawns",
      "Spawn",
      "spawn",
      "SpawnPoints",
      "spawnpoints",
      "Spawn Points",
      "spawn_points",
      "PlayerSpawns",
      "PlayerSpawn",
      "Entities",
      "entities",
      "Objects",
      "objects",
    ];

    const spawnsLayer = this.getObjectLayerByName(spawnLayerCandidates);
    const candidateObjects = spawnsLayer?.objects ?? this.getAllMapObjects();

    // Helper to calculate centered coordinates from a Tiled object
    const computeCoordinates = (
      obj: Phaser.Types.Tilemaps.TiledObject,
    ): { x: number; y: number } => {
      const rawX = obj.x ?? 0;
      const rawY = obj.y ?? 0;
      const width = obj.width ?? 0;
      const height = obj.height ?? 0;

      let x = width > 0 ? rawX + width / 2 : rawX;
      let y = height > 0 ? rawY + height / 2 : rawY;

      // Coordinate sanity and boundary clamping
      if (isNaN(x) || !isFinite(x)) x = defaultX;
      if (isNaN(y) || !isFinite(y)) y = defaultY;

      if (this.widthInPixels > 64) {
        x = Phaser.Math.Clamp(x, 32, this.widthInPixels - 32);
      }
      if (this.heightInPixels > 64) {
        y = Phaser.Math.Clamp(y, 32, this.heightInPixels - 32);
      }

      return { x, y };
    };

    // Tier 1: Look for specific requested spawn point
    if (sanitizedSpawnName) {
      const targetLower = sanitizedSpawnName.toLowerCase();
      const specificSpawn = candidateObjects.find((obj) => {
        if (obj.name && obj.name.toLowerCase() === targetLower) return true;
        if (obj.type && obj.type.toLowerCase() === targetLower) return true;
        const propSpawnName = this.getProperty(obj.properties, "spawnName");
        if (
          typeof propSpawnName === "string" &&
          propSpawnName.toLowerCase() === targetLower
        )
          return true;
        const propName = this.getProperty(obj.properties, "name");
        if (
          typeof propName === "string" &&
          propName.toLowerCase() === targetLower
        )
          return true;
        return false;
      });

      if (specificSpawn) {
        const coords = computeCoordinates(specificSpawn);
        return coords;
      }

      console.warn(
        `[MapManager] Requested spawn point "${sanitizedSpawnName}" not found in map "${mapKey}". Falling back to default player spawn.`,
      );
    }

    // Tier 2: Search for standard default player spawn names
    const defaultSpawnNames = [
      "playerspawn",
      "player_spawn",
      "player",
      "spawn",
      "start",
      "defaultspawn",
      "default_spawn",
      "playerstart",
      "player_start",
    ];

    const defaultSpawn = candidateObjects.find((obj) => {
      const nameLower = obj.name ? obj.name.toLowerCase() : "";
      const typeLower = obj.type ? obj.type.toLowerCase() : "";
      return (
        defaultSpawnNames.includes(nameLower) ||
        defaultSpawnNames.includes(typeLower)
      );
    });

    if (defaultSpawn) {
      const coords = computeCoordinates(defaultSpawn);
      return coords;
    }

    // Tier 3: First available object in spawn layer
    if (candidateObjects.length > 0) {
      const firstObj = candidateObjects[0];
      const coords = computeCoordinates(firstObj);
      console.warn(
        `[MapManager] No named player spawn point found in map "${mapKey}". Using first available object "${firstObj.name || firstObj.id}" at (${coords.x}, ${coords.y}).`,
      );
      return coords;
    }

    // Tier 4: Map center fallback
    console.warn(
      `[MapManager] No spawn objects found in map "${mapKey}". Falling back to map center (${defaultX}, ${defaultY}).`,
    );
    return { x: defaultX, y: defaultY };
  }
  public getEnemySpawnPoints(): { x: number; y: number; type?: string }[] {
    const spawnsLayer = this.getObjectLayerByName([
      "Spawns",
      "spawns",
      "Spawn",
      "spawn",
      "SpawnPoints",
      "spawnpoints",
      "Entities",
      "entities",
      "Objects",
      "objects",
    ]);
    const candidateObjects = spawnsLayer?.objects ?? this.getAllMapObjects();
    const enemySpawns: { x: number; y: number; type?: string }[] = [];

    candidateObjects.forEach((obj: any) => {
      const name = obj.name?.toLowerCase() || "";
      const type = obj.type?.toLowerCase() || "";
      const customType = this.getProperty(obj.properties, "enemyType");

      const isPlayerSpawn = 
        name === "playerspawn" || 
        type === "playerspawn" || 
        name === "player_spawn" || 
        name === "spawn" || 
        type === "spawn" || 
        name === "defaultspawn" || 
        name === "default_spawn" ||
        name === "startpoint" ||
        name === "start_point";

      const isNpcSpawn = 
        name === "npcspawn" || 
        type === "npcspawn" || 
        name === "npc_spawn" ||
        name.includes("npc");

      if (isPlayerSpawn || isNpcSpawn) {
        return; // Skip player and NPC points
      }

      const isTnt = name.includes("tnt") || type.includes("tnt") || name.includes("dynamite") || type.includes("dynamite");
      const isBarrel = name.includes("barrel") || type.includes("barrel");
      const isTorch = name.includes("torch") || type.includes("torch");
      const isGoblin = name.includes("goblin") || type.includes("goblin");
      const isEnemy = name.includes("enemy") || type.includes("enemy");
      
      const isSpawn = 
        name.includes("spawn") || 
        type.includes("spawn") || 
        name === "tntblue" || 
        type === "tntblue" ||
        name === "tnt_blue" ||
        type === "tnt_blue";

      if (
        isSpawn ||
        isTnt ||
        isBarrel ||
        isTorch ||
        isGoblin ||
        isEnemy ||
        customType !== undefined
      ) {
        let enemyType = "enemy_goblin_torch_blue"; // default fallback

        if (typeof customType === "string" && customType.trim() !== "") {
          enemyType = customType.trim();
        } else if (isTnt) {
          enemyType = "enemy_goblin_tnt_blue";
        } else if (isBarrel) {
          enemyType = "enemy_goblin_barrel_blue";
        } else if (isTorch || isGoblin || isEnemy) {
          enemyType = "enemy_goblin_torch_blue";
        }

        enemySpawns.push({
          x: obj.x ?? 0,
          y: obj.y ?? 0,
          type: enemyType,
        });
      }
    });

    return enemySpawns;
  }

  public getNpcSpawnPoints(): { x: number; y: number; type?: string }[] {
    const spawnsLayer = this.getObjectLayerByName([
      "Spawns",
      "spawns",
      "Spawn",
      "spawn",
      "SpawnPoints",
      "spawnpoints",
      "Entities",
      "entities",
      "Objects",
      "objects",
    ]);
    const candidateObjects = spawnsLayer?.objects ?? this.getAllMapObjects();
    const npcSpawns: { x: number; y: number; type?: string }[] = [];

    candidateObjects.forEach((obj) => {
      if (
        obj.name === "NPCSpawn" ||
        obj.type === "NPCSpawn" ||
        obj.name?.toLowerCase() === "npcspawn" ||
        obj.type?.toLowerCase() === "npcspawn"
      ) {
        npcSpawns.push({
          x: obj.x ?? 0,
          y: obj.y ?? 0,
          type: obj.type,
        });
      }
    });

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

  public getSpawnAreas(): {
    x: number;
    y: number;
    width: number;
    height: number;
    maxMobs: number;
    spawnInterval: number;
    enemyType?: string;
  }[] {
    const areas: {
      x: number;
      y: number;
      width: number;
      height: number;
      maxMobs: number;
      spawnInterval: number;
      enemyType?: string;
    }[] = [];

    if (this.map.objects) {
      for (const layer of this.map.objects) {
        if (layer.objects) {
          const objs = layer.objects.filter(
            (o) => o.name === "SpawnArea" || o.type === "SpawnArea",
          );
          for (const obj of objs) {
            const x = obj.x ?? 0;
            const y = obj.y ?? 0;
            const width = obj.width ?? 0;
            const height = obj.height ?? 0;

            let maxMobs = 5;
            let spawnInterval = 5000; // ms
            let enemyType: string | undefined = undefined;

            if (obj.properties) {
              const maxVal = this.getProperty(obj.properties, "maxMobs");
              if (typeof maxVal === "number") maxMobs = maxVal;

              const intervalVal = this.getProperty(obj.properties, "spawnInterval");
              if (typeof intervalVal === "number") spawnInterval = intervalVal;

              const typeVal = this.getProperty(obj.properties, "enemyType");
              if (typeof typeVal === "string") enemyType = typeVal;
            }

            areas.push({ x, y, width, height, maxMobs, spawnInterval, enemyType });
          }
        }
      }
    }
    return areas;
  }

  public getMapTransitions(): {
    x: number;
    y: number;
    width: number;
    height: number;
    targetMap: string;
    spawnName?: string;
  }[] {
    const transitions: {
      x: number;
      y: number;
      width: number;
      height: number;
      targetMap: string;
      spawnName?: string;
    }[] = [];

    const transitionsLayer = this.getObjectLayerByName([
      "Transitions",
      "transitions",
      "Transition",
      "transition",
      "Warp",
      "warp",
      "Warps",
      "warps",
      "Portals",
      "portals",
    ]);

    const objects = transitionsLayer?.objects ?? this.getAllMapObjects();

    objects.forEach((obj) => {
      let targetMap = this.getProperty(obj.properties, "targetMap");
      const spawnName =
        this.getProperty(obj.properties, "spawnName") ||
        this.getProperty(obj.properties, "targetSpawn");

      if (targetMap && typeof targetMap === "string") {
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
          spawnName: typeof spawnName === "string" ? spawnName : undefined,
        });
      }
    });

    return transitions;
  }
}
