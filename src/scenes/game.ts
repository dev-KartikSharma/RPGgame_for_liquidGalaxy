import Phaser from "phaser";
import { io } from "socket.io-client";
import { createPlayerAnimations } from "../animations/playeranimation";
import { createEnemyAnimations } from "../animations/enemyanimation";
import { createNpcAnimations } from "../animations/npcanimation";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemy";
import { Npc } from "../entities/npc";
import { MapManager } from "../managers/MapManager";
import { ParticleManager } from "../managers/ParticleManager";
import { events } from "../managers/EventManager";

export default class MainScene extends Phaser.Scene {
  private player!: Player;
  private mapManager!: MapManager;
  private particleManager!: ParticleManager;

  public socket: any;
  private isMaster: boolean = true;
  private screenNum: number = 1;
  private screenAmount: number = 5;
  private lastEmitData: any = {};
  private enemies: Enemy[] = [];
  private enemiesLastEmitData: { [id: string]: any } = {};
  private npcs: Npc[] = [];
  private coins: {
    id: string;
    sprite: Phaser.GameObjects.Image;
    sensor?: MatterJS.BodyType;
  }[] = [];
  private pendingCoinPickups: Set<string> = new Set<string>();
  private castleMsgShown: boolean = false;
  private towerMsgShown: boolean = false;
  private isDialogActive: boolean = false;
  private introPlayed: boolean = false;
  private castleLocation: { x: number; y: number } | null = null;
  private towerLocation: { x: number; y: number } | null = null;

  private interactPrompt!: Phaser.GameObjects.Text;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private castleSparkle?: Phaser.GameObjects.Particles.ParticleEmitter;
  private towerSparkle?: Phaser.GameObjects.Particles.ParticleEmitter;

  private goblinHouseSpawners: {
    x: number;
    y: number;
    spawned: number;
    max: number;
    lastSpawn: number;
  }[] = [];

  private mapSpawnAreas: {
    x: number;
    y: number;
    width: number;
    height: number;
    maxMobs: number;
    spawnInterval: number;
    lastSpawn: number;
    enemyType?: string;
  }[] = [];

  private projectiles: {
    sprite: Phaser.GameObjects.Sprite;
    logicalX: number;
    logicalY: number;
    targetX: number;
    targetY: number;
    vx: number;
    vy: number;
    speed: number;
    distToTravel: number;
    distTraveled: number;
  }[] = [];

  private currentMapKey: string = "map";
  private currentSpawnName: string | null = null;

  // Bound event handlers for EventManager and scene lifecycle
  private handleShowDialog = () => {
    this.isDialogActive = true;
  };

  private handleDialogClosed = () => {
    this.time.delayedCall(50, () => {
      this.isDialogActive = false;
    });
  };

  private handlePlayerAttack = (attackingPlayer: Player) => {
    const attackRange = 80;

    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;
      const dist = Phaser.Math.Distance.Between(
        attackingPlayer.x,
        attackingPlayer.y,
        enemy.x,
        enemy.y,
      );
      if (dist <= attackRange) {
        const facingRight = !attackingPlayer.flipX;
        const isEnemyRight = enemy.x > attackingPlayer.x;
        if (facingRight === isEnemyRight) {
          enemy.takeDamage(20);

          // blood fx
          this.particleManager.playBloodExplosion(enemy.x, enemy.y, 15);
        }
      }
    });
  };

  private handlePlayerDied = () => {
    this.scene.pause();
    this.scene.launch("DeathMenuScene");
  };

  private handleEnemyDied = (x: number, y: number) => {
    const splash = this.particleManager.playGSpawn(x, y);

    splash.on("animationcomplete", () => {
      const coinId = Phaser.Math.RND.uuid();
      const coinSprite = this.add.sprite(x, y, "g_idle");
      coinSprite.play("g_idle_anim");
      coinSprite.setDepth(200);

      this.tweens.add({
        targets: coinSprite,
        y: y - 20,
        duration: 300,
        yoyo: true,
        ease: "Sine.easeOut",
      });

      const sensor = this.matter.add.circle(x, y, 20, {
        isSensor: true,
        isStatic: true,
        label: "coin",
      });
      (sensor as any).coinId = coinId;

      this.coins.push({ id: coinId, sprite: coinSprite, sensor });

      if (this.socket) {
        this.socket.emit("coin_spawn", { id: coinId, x, y });
      }
    });
  };

  private handlePause = () => {
    if (this.isMaster && this.socket) {
      this.socket.emit("game_pause");
    }
  };

  private handleResume = () => {
    if (this.isMaster && this.socket) {
      this.socket.emit("game_resume");
    }
  };

  private handleKeyDownEsc = () => {
    if ((this as any).isLoading || (this as any).transitioning) return;
    if (this.scene.isActive("Game")) {
      this.scene.pause();
      this.scene.launch("PauseMenuScene");
    }
  };

  private calculateLGOffset = () => {
    if (!this.cameras || !this.cameras.main) return;
    const half = Math.floor(this.screenAmount / 2);
    const leftScreen = half + 2;
    const rightScreen = half + 1;

    let screenMultiplier = 0;
    if (this.screenNum === 1) {
      screenMultiplier = 0;   // Center (Master)
    } else if (this.screenNum === leftScreen) {
      screenMultiplier = -1;  // Left
    } else if (this.screenNum === rightScreen) {
      screenMultiplier = 1;   // Right
    } else if (this.screenNum === 2) {
      screenMultiplier = -half; // Far Left
    } else if (this.screenNum === this.screenAmount) {
      screenMultiplier = half;  // Far Right
    } else {
      screenMultiplier = 0;
    }
    const visibleWorldWidth =
      this.cameras.main.width / this.cameras.main.zoom;
    const lgOffsetX = screenMultiplier * visibleWorldWidth;
    this.cameras.main.setFollowOffset(lgOffsetX, 0);
  };

  private handleCollisionStart = (
    event: Phaser.Physics.Matter.Events.CollisionStartEvent,
  ) => {
    if (this.player.isDead || (this as any).transitioning) return;

    for (const pair of event.pairs) {
      const bodyA = pair.bodyA as MatterJS.BodyType;
      const bodyB = pair.bodyB as MatterJS.BodyType;
      const isPlayer =
        bodyA === this.player.body || bodyB === this.player.body;

      if (isPlayer) {
        const otherBody = bodyA === this.player.body ? bodyB : bodyA;
        if (otherBody.label === "transition") {
          (this as any).transitioning = true;
          const targetMap = (otherBody as any).targetMap;
          const spawnName = (otherBody as any).spawnName;

          if (this.socket) {
            this.socket.emit("map_transition", {
              mapKey: targetMap,
              spawnName: spawnName,
            });
          }

          this.cameras.main.fadeOut(1000, 0, 0, 0);
          this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.restart({ mapKey: targetMap, spawnName: spawnName });
          });
        } else if (otherBody.label === "coin") {
          const coinId = (otherBody as any).coinId;
          const coinIndex = this.coins.findIndex((c) => c.id === coinId);
          if (coinIndex !== -1) {
            const coin = this.coins[coinIndex];

            // Add to inventory
            events.emit("add-inventory-item", {
              id: "gold_coin",
              name: "Gold Coin",
              iconKey: "g_idle",
              quantity: 1,
            });

            // Clean up
            coin.sprite.destroy();
            this.matter.world.remove(coin.sensor!);
            this.coins.splice(coinIndex, 1);

            // Emit to slaves
            if (this.socket) {
              this.socket.emit("coin_pickup", { id: coinId });
            }
          }
        }
      }
    }
  };

  constructor() {
    super("Game");
  }

  init(data: any) {
    if (data && data.mapKey) {
      this.currentMapKey = data.mapKey;
    } else {
      this.currentMapKey = "map";
      this.castleMsgShown = false;
      this.towerMsgShown = false;
      this.introPlayed = false;
    }
    
    if (data && data.spawnName) {
      this.currentSpawnName = data.spawnName;
    } else {
      this.currentSpawnName = null;
    }
    
    (this as any).transitioning = false;

    // Reset entity collections to prevent stale references on restart
    this.enemies = [];
    this.npcs = [];
    this.coins = [];
    this.mapSpawnAreas = [];
    this.projectiles = [];
    this.enemiesLastEmitData = {};
    this.lastEmitData = {};
    this.pendingCoinPickups = new Set<string>();

    // Clean up events from previous runs to prevent duplicate listeners
    events.off("player-attack", this.handlePlayerAttack);
    events.off("show-dialog", this.handleShowDialog);
    events.off("dialog-closed", this.handleDialogClosed);
    events.off("enemy-died", this.handleEnemyDied);
    events.off("player-died", this.handlePlayerDied);
  }

  create() {
    // Always ensure the scene is fully running — it may have been paused
    // by the death screen or a map transition before scene.restart() was called.
    // scene.restart() on a paused scene keeps it paused, so we force-resume here.
    this.scene.resume();
    this.matter.world.resume();

    // Liquid Galaxy multi-display configuration:
    // Determine screen index from URL parameter `?screen=[1-5]`.
    // Screen 1: Master display (handles physics simulation, input, state broadcasting).
    // Screens 2–5: Slave displays (panoramic slave viewports with horizontal camera offsets).
    const urlParams = new URLSearchParams(window.location.search);
    const screensParam = urlParams.get("screens") || urlParams.get("screenAmount");
    this.screenAmount =
      screensParam &&
      !isNaN(parseInt(screensParam, 10)) &&
      parseInt(screensParam, 10) > 0
        ? parseInt(screensParam, 10)
        : 5;
    const screenParam = urlParams.get("screen");
    if (screenParam) {
      const parsedScreen = parseInt(screenParam, 10);
      this.screenNum = !isNaN(parsedScreen) ? parsedScreen : 1;
      this.isMaster = this.screenNum === 1;
    } else {
      this.screenNum = 1;
      this.isMaster = true;
    }

    // animations
    createPlayerAnimations(this);
    createEnemyAnimations(this);
    createNpcAnimations(this);

    // generate map (master handles physics)
    this.mapManager = new MapManager(this, this.isMaster, this.currentMapKey);
    this.mapManager.buildMap();

    // set bounds for master screen only
    if (this.isMaster) {
      this.matter.world.setBounds(
        0,
        0,
        this.mapManager.widthInPixels,
        this.mapManager.heightInPixels,
      );
    }

    // spawn player
    const spawnPoint = this.mapManager.getPlayerSpawnPoint(this.currentSpawnName);
    this.player = new Player(this, spawnPoint.x, spawnPoint.y, "player");
    this.player.setDepth(500);

    if (this.currentMapKey === "map" && !this.introPlayed) {
      this.player.setVisible(false);
    }

    // fx manager
    this.particleManager = new ParticleManager(this);

    // Spawn NPCs (Both master and slaves)
    const npcSpawns = this.mapManager.getNpcSpawnPoints();
    npcSpawns.forEach((spawn) => {
      const npc = new Npc(
        this,
        spawn.x,
        spawn.y,
        "pawn_idle",
        [
          { speaker: "Survivor", text: "You... you aren't one of them, are you? Thank the stars." },
          { speaker: "Survivor", text: "I came to this old mine hoping to scavenge some gold, but the Eclipse ruined it all. The goblins have completely taken over." },
          { speaker: "Survivor", text: "I'm too terrified to move... if they spot me, I'm dead. You look like you can fight, though." },
          { speaker: "Survivor", text: "If you want to live, head south out of these woods. The Blue Banner has set up protection in the village down there." }
        ]
      );
      if (!this.isMaster) {
        (npc as any).isLGSlave = true;
      }
      npc.setDepth(498);
      this.npcs.push(npc);
    });

    // load enemies on master
    if (this.isMaster) {
      this.castleLocation = this.mapManager.getPointOfInterest("BrokenCastle");
      this.towerLocation = this.mapManager.getPointOfInterest("BrokenTower");

      this.interactKey = this.input.keyboard!.addKey("E");
      this.interactPrompt = this.add
        .text(0, 0, "[E] Inspect", {
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "#000000aa",
          padding: { x: 4, y: 4 },
        })
        .setOrigin(0.5)
        .setVisible(false)
        .setDepth(9999);

      events.on("show-dialog", this.handleShowDialog);
      events.on("dialog-closed", this.handleDialogClosed);

      if (this.castleLocation && !this.castleMsgShown) {
        this.castleSparkle = this.particleManager.createInteractSparkle(
          this.castleLocation.x,
          this.castleLocation.y,
        );
      }
      if (this.towerLocation && !this.towerMsgShown) {
        this.towerSparkle = this.particleManager.createInteractSparkle(
          this.towerLocation.x,
          this.towerLocation.y,
        );
      }

      const enemySpawns = this.mapManager.getEnemySpawnPoints();

      const enemyTypes = [
        "enemy_goblin_torch_blue",
        "enemy_goblin_tnt_blue",
        "enemy_goblin_barrel_blue"
      ];

      enemySpawns.forEach((spawn) => {
        const enemyType = spawn.type || Phaser.Math.RND.pick(enemyTypes);
        const enemy = new Enemy(
          this,
          spawn.x,
          spawn.y,
          enemyType,
        );
        enemy.setDepth(499);
        enemy.setTarget(this.player);
        this.enemies.push(enemy);
      });

      // Initialize Goblin House Spawners
      const goblinHouses = this.mapManager.getPointsOfInterest("goblinHouse");
      this.goblinHouseSpawners = goblinHouses.map((house) => ({
        x: house.x,
        y: house.y,
        spawned: 0,
        max: Phaser.Math.Between(4, 6),
        lastSpawn: 0,
      }));

      // Initialize Map Spawn Areas
      const areas = this.mapManager.getSpawnAreas();
      this.mapSpawnAreas = areas.map((area) => ({
        ...area,
        lastSpawn: 0,
      }));

      // Map transitions
      const transitions = this.mapManager.getMapTransitions();
      transitions.forEach((transition) => {
        const zone = this.matter.add.rectangle(
          transition.x + transition.width / 2,
          transition.y + transition.height / 2,
          transition.width,
          transition.height,
          { isStatic: true, isSensor: true, label: "transition" },
        );
        (zone as any).targetMap = transition.targetMap;
        (zone as any).spawnName = transition.spawnName;
      });

      this.matter.world.on("collisionstart", this.handleCollisionStart);

      events.on("player-attack", this.handlePlayerAttack);
      events.on("player-died", this.handlePlayerDied);
      events.on("enemy-died", this.handleEnemyDied);
    }

    // matter.js handles collisions

    // HUD
    if (this.isMaster) {
      this.scene.launch("UIScene");
    }

    // setup camera & network

    const socketUrl = window.location.port === "5173"
      ? `http://${window.location.hostname}:8128`
      : window.location.origin;
    this.socket = io(socketUrl);

    // Removed camera bounds so slave screens don't clamp to the edges when offset

    // follow player (no lerp on master to avoid pixel blur; smooth lerp on slave to buffer network jitter)
    if (this.isMaster) {
      this.cameras.main.startFollow(this.player, true);
    } else {
      this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    }
    this.cameras.main.setZoom(2);

    // Custom Liquid Galaxy Layout: LG2 (-2 Far Left) | LG4 (-1 Left) | LG1 (0 Master) | LG3 (+1 Right) | LG5 (+2 Far Right)
    this.calculateLGOffset();
    this.scale.on("resize", this.calculateLGOffset);

    // Clean up event listeners and sockets on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      events.off("player-attack", this.handlePlayerAttack);
      events.off("show-dialog", this.handleShowDialog);
      events.off("dialog-closed", this.handleDialogClosed);
      events.off("enemy-died", this.handleEnemyDied);
      events.off("player-died", this.handlePlayerDied);

      this.events.off(Phaser.Scenes.Events.PAUSE, this.handlePause);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume);

      if (this.input.keyboard) {
        this.input.keyboard.off("keydown-ESC", this.handleKeyDownEsc);
        this.input.keyboard.removeAllListeners();
      }

      this.scale.off("resize", this.calculateLGOffset);

      if (this.particleManager) {
        this.particleManager.destroy();
      }
      if (this.castleSparkle) {
        this.castleSparkle.destroy();
        this.castleSparkle = undefined;
      }
      if (this.towerSparkle) {
        this.towerSparkle.destroy();
        this.towerSparkle = undefined;
      }
      if (this.matter && this.matter.world) {
        this.matter.world.off("collisionstart", this.handleCollisionStart);
      }

      this.pendingCoinPickups.clear();

      if (this.socket) {
        this.socket.off("player_update");
        this.socket.off("enemy_update");
        this.socket.off("coin_spawn");
        this.socket.off("coin_pickup");
        this.socket.off("map_transition");
        this.socket.off("projectile_spawn");
        this.socket.off("explosion_spawn");
        this.socket.off("game_pause");
        this.socket.off("game_resume");
        this.socket.off("game_restart");
        this.socket.off("quit_to_main");
        this.socket.disconnect();
        this.socket = null;
      }
    });

    if (!this.isMaster) {
      this.player.isLGSlave = true;
      this.socket.on("player_update", (data: any) => {
        this.player.setPosition(data.x, data.y);
        if (data.anim) {
          this.player.play(data.anim, true);
        }
        if (data.flipX !== undefined) {
          this.player.setFlipX(data.flipX);
        }
      });

      this.socket.on("enemy_update", (data: any) => {
        let enemy = this.enemies.find((e) => e.id === data.id);
        if (!enemy && !data.isDead) {
          const texture = data.texture || "enemy_goblin_torch_blue";
          enemy = new Enemy(this, data.x, data.y, texture);
          (enemy as any).isLGSlave = true;
          enemy.id = data.id;
          enemy.setDepth(499);
          this.enemies.push(enemy);
        }

        if (enemy) {
          if (data.isDead && !enemy.isDead) {
            enemy.isDead = true;
            enemy.setTint(0x555555);
            this.time.delayedCall(1000, () => {
              if (enemy) {
                enemy.destroy();
              }
              this.enemies = this.enemies.filter(
                (e) => e !== enemy && e.id !== data.id,
              );
              delete this.enemiesLastEmitData[data.id];
            });
          } else if (!enemy.isDead) {
            enemy.setPosition(data.x, data.y);
            if (data.anim) {
              enemy.play(data.anim, true);
            }
            if (data.flipX !== undefined) {
              enemy.setFlipX(data.flipX);
            }
          }
        }
      });

      this.socket.on("coin_spawn", (data: any) => {
        const splash = this.particleManager.playGSpawn(data.x, data.y);
        splash.on("animationcomplete", () => {
          if (this.pendingCoinPickups.has(data.id)) {
            this.pendingCoinPickups.delete(data.id);
            return;
          }
          const coinSprite = this.add.sprite(data.x, data.y, "g_idle");
          coinSprite.play("g_idle_anim");
          coinSprite.setDepth(200);
          this.tweens.add({
            targets: coinSprite,
            y: data.y - 20,
            duration: 300,
            yoyo: true,
            ease: "Sine.easeOut",
          });
          this.coins.push({ id: data.id, sprite: coinSprite });
        });
      });

      this.socket.on("coin_pickup", (data: any) => {
        const coinIndex = this.coins.findIndex((c) => c.id === data.id);
        if (coinIndex !== -1) {
          const coin = this.coins[coinIndex];
          coin.sprite.destroy();
          this.coins.splice(coinIndex, 1);
        } else {
          this.pendingCoinPickups.add(data.id);
        }
      });

      this.socket.on("map_transition", (data: any) => {
        if ((this as any).transitioning) return;
        (this as any).transitioning = true;
        
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.restart({ mapKey: data.mapKey, spawnName: data.spawnName });
        });
      });

      this.socket.on("game_pause", () => {
        this.scene.pause();
        this.matter.world.pause();
      });

      this.socket.on("game_resume", () => {
        this.scene.resume();
        this.matter.world.resume();
      });

      this.socket.on("game_restart", () => {
        if ((this as any).transitioning) return;
        (this as any).transitioning = true;
        this.scene.restart({ mapKey: "map", spawnName: null });
      });

      this.socket.on("quit_to_main", () => {
        this.scene.stop("UIScene");
        this.scene.stop("PauseMenuScene");
        this.scene.stop("DeathMenuScene");
        this.scene.start("MainMenuScene");
      });

      this.socket.on("projectile_spawn", (data: any) => {
        this.spawnProjectile(data.startX, data.startY, data.targetX, data.targetY);
      });

      this.socket.on("explosion_spawn", (data: any) => {
        // Clean up any matching projectile in flight on Slave
        this.projectiles = this.projectiles.filter((proj) => {
          const dist = Phaser.Math.Distance.Between(
            proj.logicalX,
            proj.logicalY,
            data.x,
            data.y,
          );
          if (dist <= 50) {
            proj.sprite.destroy();
            return false;
          }
          return true;
        });

        this.explodeProjectile(data.x, data.y);
      });
    } else {
      this.events.on(Phaser.Scenes.Events.PAUSE, this.handlePause);
      this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume);

      // Pause menu listener — blocked while the scene is loading (isLoading flag)
      this.input.keyboard!.on("keydown-ESC", this.handleKeyDownEsc);
    }

    // Show opening dialogue on the initial map or play fade-in
    if (this.currentMapKey === "map" && !this.introPlayed) {
      this.introPlayed = true;
      this.cameras.main.fadeIn(2000, 0, 0, 0);

      // wait for fade then play dust and show player
      this.time.delayedCall(500, () => {
        this.particleManager.playSpawnDust(this.player.x, this.player.y);
        
        this.time.delayedCall(300, () => {
          this.player.setVisible(true);
        });
      });

      if (this.isMaster) {
        this.time.delayedCall(2000, () => {
          events.emit("show-dialog", [
            {
              speaker: "The Awakened",
              text: "...Ugh. My head. How long have I been asleep?",
            },
            {
              speaker: "The Awakened",
              text: "The last thing I remember... the sky turning black, and the Great Castle falling. Then, nothing but darkness.",
            },
            {
              speaker: "The Awakened",
              text: "My armor... the blue crest of the River-Folk. I must be miles away from the Domain.",
            },
            {
              speaker: "The Awakened",
              text: "This forest feels... wrong. I can hear rustling in the bushes. I need to find a way out of these woods and figure out what happened to the kingdom.",
            },
            {
              speaker: "System",
              text: "Use W, A, S, D to move and SPACE to attack. Beware of the feral Goblins lurking in the trees!",
            },
          ]);
        });
      }
    } else {
      this.cameras.main.fadeIn(1000, 0, 0, 0);
    }
  }

  update(time: number, delta: number) {
    if (this.mapManager) {
      this.mapManager.update(delta);
    }

    if (this.isMaster) {
      if (this.isDialogActive) {
        this.player.setVelocity(0, 0);
        if (this.player.anims.currentAnim?.key !== "Idle") {
          this.player.play("Idle", true);
        }
      } else {
        this.player.update(time);
      }

      let canInteractWithCastle = false;
      let canInteractWithTower = false;

      let interactPressed = false;
      if (!this.isDialogActive) {
        interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);
      }

      this.npcs.forEach((npc) => {
        if (!npc || !npc.active || !this.player || !this.player.active) return;

        const dx = this.player.x - npc.x;
        const dy = this.player.y - npc.y;
        if (dx * dx + dy * dy < 80 * 80 && !npc.hasSpoken) {
          npc.setIndicatorVisible(true);
          if (interactPressed) {
            npc.hasSpoken = true;
            events.emit("show-dialog", npc.dialogText);
          }
        } else {
          npc.setIndicatorVisible(false);
        }
      });

      if (!this.castleMsgShown && this.castleLocation && this.castleSparkle) {
        const dx = this.player.x - this.castleLocation.x;
        const dy = this.player.y - this.castleLocation.y;
        if (dx * dx + dy * dy < 60 * 60) {
          canInteractWithCastle = true;
          this.interactPrompt
            .setPosition(this.castleLocation.x, this.castleLocation.y - 30)
            .setVisible(true);

          if (interactPressed) {
            this.castleMsgShown = true;
            this.castleSparkle.stop();
            this.interactPrompt.setVisible(false);
            events.emit("show-dialog", [
              {
                speaker: "The Awakened",
                text: "This stonework... it used to be an outpost of the Blue Banner.",
              },
              {
                speaker: "The Awakened",
                text: "It hasn't just collapsed from age; it looks like it was torn apart by dark magic. The Eclipse left nothing untouched.",
              },
            ]);
          }
        }
      }

      if (!this.towerMsgShown && this.towerLocation && this.towerSparkle) {
        const dx = this.player.x - this.towerLocation.x;
        const dy = this.player.y - this.towerLocation.y;
        if (dx * dx + dy * dy < 60 * 60) {
          canInteractWithTower = true;
          this.interactPrompt
            .setPosition(this.towerLocation.x, this.towerLocation.y - 30)
            .setVisible(true);

          if (interactPressed) {
            this.towerMsgShown = true;
            this.towerSparkle.stop();
            this.interactPrompt.setVisible(false);
            events.emit("show-dialog", [
              {
                speaker: "The Awakened",
                text: "An old watchtower, completely pulverized. The scent of ash and rot is strong here...",
              },
              {
                speaker: "The Awakened",
                text: "The Goblins have turned this sacred ground into their nest. I need to draw my sword.",
              },
            ]);
          }
        }
      }

      if (!canInteractWithCastle && !canInteractWithTower) {
        this.interactPrompt.setVisible(false);
      }

      // Process goblin house spawners
      if (!this.player.isDead) {
        this.goblinHouseSpawners.forEach((spawner) => {
          if (spawner.spawned < spawner.max) {
            if (time <= spawner.lastSpawn + 1000) return;
            const dx = this.player.x - spawner.x;
            const dy = this.player.y - spawner.y;
            if (dx * dx + dy * dy < 200 * 200) {
              // Spawn 1 goblin every 1 second
              spawner.lastSpawn = time;
              spawner.spawned++;

              const enemy = new Enemy(
                this,
                spawner.x,
                spawner.y + 10,
                "enemy_goblin_torch_blue",
              );
              enemy.setDepth(499);
              enemy.setTarget(this.player);
              this.enemies.push(enemy);
            }
          }
        });

        // Process Map Spawn Areas
        this.mapSpawnAreas.forEach((area) => {
          if (time <= area.lastSpawn + area.spawnInterval) return;

          // Spawner triggers when player is within 600px of the spawn area's center
          const centerX = area.x + area.width / 2;
          const centerY = area.y + area.height / 2;
          const dx = this.player.x - centerX;
          const dy = this.player.y - centerY;

          if (dx * dx + dy * dy < 600 * 600) {
            const activeCount = this.enemies.filter((e) => 
              !e.isDead && 
              e.x >= area.x && e.x <= area.x + area.width &&
              e.y >= area.y && e.y <= area.y + area.height
            ).length;

            if (activeCount < area.maxMobs) {
              area.lastSpawn = time;

              // Pick a random point inside the bounding box
              const spawnX = area.x + Math.random() * area.width;
              const spawnY = area.y + Math.random() * area.height;

              let spawnType = area.enemyType;
              if (!spawnType) {
                const enemyTypes = [
                  "enemy_goblin_torch_blue",
                  "enemy_goblin_tnt_blue",
                  "enemy_goblin_barrel_blue"
                ];
                spawnType = Phaser.Math.RND.pick(enemyTypes);
              }
              const enemy = new Enemy(
                this,
                spawnX,
                spawnY,
                spawnType
              );
              enemy.setDepth(499);
              enemy.setTarget(this.player);
              this.enemies.push(enemy);
            }
          }
        });
      }

      const currentAnim = this.player.anims.currentAnim?.key;
      const roundedPlayerX = Math.round(this.player.x * 10) / 10;
      const roundedPlayerY = Math.round(this.player.y * 10) / 10;

      // send sync data if changed
      if (
        roundedPlayerX !== this.lastEmitData.x ||
        roundedPlayerY !== this.lastEmitData.y ||
        currentAnim !== this.lastEmitData.anim ||
        this.player.flipX !== this.lastEmitData.flipX
      ) {
        const emitData = {
          x: roundedPlayerX,
          y: roundedPlayerY,
          anim: currentAnim,
          flipX: this.player.flipX,
        };

        if (this.socket) {
          this.socket.emit("player_update", emitData);
        }
        this.lastEmitData = emitData;
      }

      this.npcs.forEach((npc) => {
        npc.update();
      });

      this.enemies.forEach((enemy) => {
        if (enemy.active && !enemy.isDead) {
          enemy.update(time);
        }

        const enemyAnim = enemy.anims.currentAnim?.key;
        const lastData = this.enemiesLastEmitData[enemy.id] || {};
        const roundedEnemyX = Math.round(enemy.x * 10) / 10;
        const roundedEnemyY = Math.round(enemy.y * 10) / 10;

        if (
          roundedEnemyX !== lastData.x ||
          roundedEnemyY !== lastData.y ||
          enemyAnim !== lastData.anim ||
          enemy.flipX !== lastData.flipX ||
          enemy.isDead !== lastData.isDead
        ) {
          const enemyEmitData = {
            id: enemy.id,
            x: roundedEnemyX,
            y: roundedEnemyY,
            texture: enemy.texture.key,
            anim: enemyAnim,
            flipX: enemy.flipX,
            isDead: enemy.isDead,
          };

          // emit it
          if (this.socket) {
            this.socket.emit("enemy_update", enemyEmitData);
          }
          this.enemiesLastEmitData[enemy.id] = enemyEmitData;
        }
      });

      // remove dead enemies and clean up emit cache AFTER emitting death update
      this.enemies = this.enemies.filter((enemy) => {
        if (!enemy.active || enemy.isDead) {
          delete this.enemiesLastEmitData[enemy.id];
          return false;
        }
        return true;
      });
    } else {
      // Periodic cleanup of inactive enemies on Slave
      this.enemies = this.enemies.filter((enemy) => enemy && enemy.active && !enemy.isDead);
    }

    // Projectile update (run on both Master and Slaves)
    this.projectiles = this.projectiles.filter((proj) => {
      proj.logicalX += proj.vx;
      proj.logicalY += proj.vy;
      proj.distTraveled += proj.speed;

      const total = proj.distToTravel;
      const progress = Phaser.Math.Clamp(proj.distTraveled / total, 0, 1);
      
      const arcHeight = 50; 
      const offset = Math.sin(progress * Math.PI) * arcHeight;

      proj.sprite.setPosition(proj.logicalX, proj.logicalY - offset);

      if (proj.distTraveled >= total || progress >= 1) {
        if (this.isMaster) {
          this.explodeProjectile(proj.logicalX, proj.logicalY);
        }
        proj.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  public spawnProjectile(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
  ) {
    // 1. Create spinning dynamite sprite
    const sprite = this.add.sprite(startX, startY, "dynamite_projectile");
    sprite.setDepth(500);
    sprite.setScale(1.0);
    sprite.play("enemy_goblin_tnt_blue_projectile");

    // 2. Calculate trajectories
    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    const speed = 4; // Standard projectile speed
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const distToTravel = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);

    this.projectiles.push({
      sprite,
      logicalX: startX,
      logicalY: startY,
      targetX,
      targetY,
      vx,
      vy,
      speed,
      distToTravel,
      distTraveled: 0,
    });

    // 3. Emit sync event if Master
    if (this.isMaster && this.socket) {
      this.socket.emit("projectile_spawn", { startX, startY, targetX, targetY });
    }
  }

  public explodeProjectile(x: number, y: number) {
    // 1. Spawn explosion visual effect
    const explosion = this.add.sprite(x, y, "explosion");
    explosion.setDepth(501);
    explosion.setScale(1.5);
    explosion.play("explosion_anim");
    explosion.once("animationcomplete", () => {
      explosion.destroy();
    });

    // Trigger explosion impact particle effect
    const particles = this.add.particles(x, y, "water_splash", {
      speed: { min: 20, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      tint: 0xff3300, // Fire explosion particle tint
      lifespan: 400,
      maxParticles: 15,
    });
    this.time.delayedCall(400, () => {
      particles.destroy();
    });

    // 2. Damage calculation on Master
    if (this.isMaster) {
      const damageRadius = 60;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
      if (dist <= damageRadius && !this.player.isDead) {
        this.player.takeDamage(12); // Area of effect damage
      }

      // Sync explosion
      if (this.socket) {
        this.socket.emit("explosion_spawn", { x, y });
      }
    }
  }
}
