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

  private socket: any;
  private isMaster: boolean = true;
  private screenNum: number = 1;
  private lastEmitData: any = {};
  private enemies: Enemy[] = [];
  private enemiesLastEmitData: { [id: string]: any } = {};
  private npcs: Npc[] = [];
  private coins: {
    id: string;
    sprite: Phaser.GameObjects.Image;
    sensor?: MatterJS.BodyType;
  }[] = [];
  private castleMsgShown: boolean = false;
  private towerMsgShown: boolean = false;
  private isDialogActive: boolean = false;
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

  private currentMapKey: string = "map";
  private currentSpawnName: string | null = null;

  constructor() {
    super("Game");
  }

  init(data: any) {
    if (data && data.mapKey) {
      this.currentMapKey = data.mapKey;
    } else {
      this.currentMapKey = "map";
    }
    
    if (data && data.spawnName) {
      this.currentSpawnName = data.spawnName;
    } else {
      this.currentSpawnName = null;
    }
    
    (this as any).transitioning = false;

    // Clean up events from previous runs to prevent duplicate listeners
    events.off("player-attack");
    events.off("show-dialog");
    events.off("enemy-died");
    events.off("player-died");
  }

  create() {
    // Always ensure the scene is fully running — it may have been paused
    // by the death screen or a map transition before scene.restart() was called.
    // scene.restart() on a paused scene keeps it paused, so we force-resume here.
    this.scene.resume();
    this.matter.world.resume();

    // lg screen setup
    // TODO: test if this works on actual setup instead of localhost
    const urlParams = new URLSearchParams(window.location.search);
    const screenParam = urlParams.get("screen");
    if (screenParam) {
      this.screenNum = parseInt(screenParam, 10);
      if (this.screenNum !== 1) {
        this.isMaster = false;
      }
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
      // console.log("bounds set for master");
    }

    // spawn player
    const spawnPoint = this.mapManager.getPlayerSpawnPoint(this.currentSpawnName);
    this.player = new Player(this, spawnPoint.x, spawnPoint.y, "player");
    this.player.setDepth(500);



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

      events.on("show-dialog", () => {
        this.isDialogActive = true;
      });
      events.on("dialog-closed", () => {
        this.time.delayedCall(50, () => {
          this.isDialogActive = false;
        });
      });

      if (this.castleLocation) {
        this.castleSparkle = this.particleManager.createInteractSparkle(
          this.castleLocation.x,
          this.castleLocation.y,
        );
      }
      if (this.towerLocation) {
        this.towerSparkle = this.particleManager.createInteractSparkle(
          this.towerLocation.x,
          this.towerLocation.y,
        );
      }

      const enemySpawns = this.mapManager.getEnemySpawnPoints();
      console.log("Spawning enemies:", enemySpawns);

      enemySpawns.forEach((spawn) => {
        console.log("Spawning enemy at", spawn.x, spawn.y);
        const enemy = new Enemy(
          this,
          spawn.x,
          spawn.y,
          "enemy_goblin_torch_blue",
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

      this.matter.world.on(
        "collisionstart",
        (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
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
                console.log("Transitioning to map:", targetMap, "spawnName:", spawnName);

                if (this.socket) {
                  this.socket.emit("map_transition", { mapKey: targetMap });
                }

                if (this.socket) this.socket.disconnect();
                this.socket = null;
                this.scene.restart({ mapKey: targetMap, spawnName: spawnName });
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
        },
      );

      events.on("player-attack", (attackingPlayer: Player) => {
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
      });

      events.on("player-died", () => {
        this.scene.pause();
        this.scene.launch("DeathMenuScene");
      });

      events.on("enemy-died", (x: number, y: number) => {
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
      });
    }

    // matter.js handles collisions

    // HUD
    if (this.isMaster) {
      this.scene.launch("UIScene");
    }

    // setup camera & network

    const socketHost = window.location.hostname;
    this.socket = io(`http://${socketHost}:8128`);

    // Removed camera bounds so slave screens don't clamp to the edges when offset

    // follow player (no lerp to avoid pixel blur)
    // tried lerp 0.1 but it looked weird af
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setZoom(2);

    // Custom LG Layout: lg4 -> lg5 -> lg1 -> lg2 -> lg3
    let screenMultiplier = 0;
    if (this.screenNum === 4) {
      screenMultiplier = -2; // Far Left
    } else if (this.screenNum === 5) {
      screenMultiplier = -1; // Mid Left
    } else if (this.screenNum === 1) {
      screenMultiplier = 0; // Center (Master)
    } else if (this.screenNum === 2) {
      screenMultiplier = 1; // Mid Right
    } else if (this.screenNum === 3) {
      screenMultiplier = 2; // Far Right
    } else {
      screenMultiplier = 0;
    }
    // lg offsets
    const calculateLGOffset = () => {
      const visibleWorldWidth =
        this.cameras.main.width / this.cameras.main.zoom;
      // Removed the negative sign so Screen 2 (multiplier 1) looks to the right
      const lgOffsetX = screenMultiplier * visibleWorldWidth;
      this.cameras.main.setFollowOffset(lgOffsetX, 0);
    };

    calculateLGOffset();

    this.scale.on("resize", calculateLGOffset);

    // Clean up event listeners and sockets on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      events.off("player-attack");
      events.off("show-dialog");
      events.off("dialog-closed");
      events.off("enemy-died");
      events.off("player-died");

      this.scale.off("resize", calculateLGOffset);

      if (this.castleSparkle) {
        this.castleSparkle.destroy();
        this.castleSparkle = undefined;
      }
      if (this.towerSparkle) {
        this.towerSparkle.destroy();
        this.towerSparkle = undefined;
      }
      this.matter.world.off("collisionstart");

      if (this.socket) {
        this.socket.off("player_update");
        this.socket.off("enemy_update");
        this.socket.off("coin_spawn");
        this.socket.off("coin_pickup");
        this.socket.off("map_transition");
        this.socket.disconnect();
        this.socket = null;
      }
    });

    if (!this.isMaster) {
      (this.player as any).isLGSlave = true;
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
          enemy = new Enemy(this, data.x, data.y, "enemy_goblin_torch_blue");
          (enemy as any).isLGSlave = true;
          enemy.id = data.id;
          enemy.setDepth(499);
          this.enemies.push(enemy);
        }

        if (enemy) {
          if (data.isDead && !enemy.isDead) {
            enemy.isDead = true;
            enemy.setTint(0x555555);
            this.time.delayedCall(1000, () => enemy?.destroy());
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
        }
      });

      this.socket.on("map_transition", (data: any) => {
        if ((this as any).transitioning) return;
        (this as any).transitioning = true;
        if (this.socket) this.socket.disconnect();
        this.socket = null;
        this.scene.restart({ mapKey: data.mapKey });
      });
    } else {
      // Pause menu listener — blocked while the scene is loading (isLoading flag)
      this.input.keyboard!.on("keydown-ESC", () => {
        if ((this as any).isLoading) return;
        this.scene.pause();
        this.scene.launch("PauseMenuScene");
      });
    }

    // Show opening dialogue on the initial map immediately
    if (this.isMaster && this.currentMapKey === "map") {
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
    }
  }

  update(time: number, delta: number) {
    if (this.mapManager) {
      this.mapManager.update(delta);
    }

    if (this.isMaster) {
      this.player.update(time);

      let canInteractWithCastle = false;
      let canInteractWithTower = false;

      let interactPressed = false;
      if (!this.isDialogActive) {
        interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);
      }

      this.npcs.forEach((npc) => {
        const dist = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          npc.x,
          npc.y,
        );
        if (dist < 80 && !npc.hasSpoken) {
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
        if (
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.castleLocation.x,
            this.castleLocation.y,
          ) < 60
        ) {
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
        if (
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.towerLocation.x,
            this.towerLocation.y,
          ) < 60
        ) {
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
            const dist = Phaser.Math.Distance.Between(
              this.player.x,
              this.player.y,
              spawner.x,
              spawner.y,
            );
            if (dist < 200) {
              // Trigger distance
              if (time > spawner.lastSpawn + 1000) {
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
          }
        });
      }

      const currentAnim = this.player.anims.currentAnim?.key;

      // send sync data if changed
      if (
        this.player.x !== this.lastEmitData.x ||
        this.player.y !== this.lastEmitData.y ||
        currentAnim !== this.lastEmitData.anim ||
        this.player.flipX !== this.lastEmitData.flipX
      ) {
        const emitData = {
          x: this.player.x,
          y: this.player.y,
          anim: currentAnim,
          flipX: this.player.flipX,
        };

        this.socket.emit("player_update", emitData);
        this.lastEmitData = emitData;
      }

      // remove dead enemies
      this.enemies = this.enemies.filter(
        (enemy) => enemy.active && !enemy.isDead,
      );

      this.npcs.forEach((npc) => {
        npc.update();
      });

      this.enemies.forEach((enemy) => {
        if (enemy.active) {
          enemy.update(time);
        }

        const enemyAnim = enemy.anims.currentAnim?.key;
        const lastData = this.enemiesLastEmitData[enemy.id] || {};

        if (
          enemy.x !== lastData.x ||
          enemy.y !== lastData.y ||
          enemyAnim !== lastData.anim ||
          enemy.flipX !== lastData.flipX ||
          enemy.isDead !== lastData.isDead
        ) {
          const enemyEmitData = {
            id: enemy.id,
            x: enemy.x,
            y: enemy.y,
            anim: enemyAnim,
            flipX: enemy.flipX,
            isDead: enemy.isDead,
          };

          // emit it
          this.socket.emit("enemy_update", enemyEmitData);
          this.enemiesLastEmitData[enemy.id] = enemyEmitData;
        }
      });
    }
  }
}
