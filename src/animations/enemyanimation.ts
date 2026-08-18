import Phaser from "phaser";

export function createEnemyAnimations(scene: Phaser.Scene) {
  // 1. Blue Torch (loaded as texture atlas)
  if (!scene.anims.exists("enemy_goblin_torch_blue_idle")) {
    scene.anims.create({
      key: "enemy_goblin_torch_blue_idle",
      frames: scene.anims.generateFrameNames("enemy_goblin_torch_blue", {
        start: 3,
        end: 9,
        prefix: "Torch_Blue ",
        suffix: ".aseprite",
      }),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: "enemy_goblin_torch_blue_run",
      frames: scene.anims.generateFrameNames("enemy_goblin_torch_blue", {
        start: 10,
        end: 15,
        prefix: "Torch_Blue ",
        suffix: ".aseprite",
      }),
      frameRate: 12,
      repeat: -1,
    });
    scene.anims.create({
      key: "enemy_goblin_torch_blue_attack",
      frames: scene.anims.generateFrameNames("enemy_goblin_torch_blue", {
        start: 16,
        end: 21,
        prefix: "Torch_Blue ",
        suffix: ".aseprite",
      }),
      frameRate: 12,
      repeat: 0,
    });

    // Backwards compatibility for old references
    scene.anims.create({
      key: "enemy_idle",
      frames: scene.anims.generateFrameNames("enemy_goblin_torch_blue", {
        start: 3,
        end: 9,
        prefix: "Torch_Blue ",
        suffix: ".aseprite",
      }),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: "enemy_run",
      frames: scene.anims.generateFrameNames("enemy_goblin_torch_blue", {
        start: 10,
        end: 15,
        prefix: "Torch_Blue ",
        suffix: ".aseprite",
      }),
      frameRate: 12,
      repeat: -1,
    });
    scene.anims.create({
      key: "enemy_attack",
      frames: scene.anims.generateFrameNames("enemy_goblin_torch_blue", {
        start: 16,
        end: 21,
        prefix: "Torch_Blue ",
        suffix: ".aseprite",
      }),
      frameRate: 12,
      repeat: 0,
    });
  }

  // 2. TNT Blue (spritesheet)
  const tntKey = "enemy_goblin_tnt_blue";
  if (!scene.anims.exists(`${tntKey}_idle`)) {
    scene.anims.create({
      key: `${tntKey}_idle`,
      frames: scene.anims.generateFrameNumbers(tntKey, { start: 1, end: 6 }),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: `${tntKey}_run`,
      frames: scene.anims.generateFrameNumbers(tntKey, { start: 7, end: 12 }),
      frameRate: 12,
      repeat: -1,
    });
    scene.anims.create({
      key: `${tntKey}_attack`,
      frames: scene.anims.generateFrameNumbers(tntKey, { start: 13, end: 19 }),
      frameRate: 12,
      repeat: 0,
    });
  }

  // 3. Barrel Blue (spritesheet)
  const barrelKey = "enemy_goblin_barrel_blue";
  if (!scene.anims.exists(`${barrelKey}_idle`)) {
    scene.anims.create({
      key: `${barrelKey}_idle`,
      frames: scene.anims.generateFrameNumbers(barrelKey, { start: 8, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: `${barrelKey}_run`,
      frames: scene.anims.generateFrameNumbers(barrelKey, { start: 15, end: 17 }),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: `${barrelKey}_attack`,
      frames: scene.anims.generateFrameNumbers(barrelKey, { start: 18, end: 20 }),
      frameRate: 10,
      repeat: 0,
    });
  }

  // 4. TNT Blue Projectile (dynamite spinning in air)
  if (!scene.anims.exists("enemy_goblin_tnt_blue_projectile")) {
    scene.anims.create({
      key: "enemy_goblin_tnt_blue_projectile",
      frames: scene.anims.generateFrameNumbers("dynamite_projectile", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1,
    });
  }

  // 5. Explosion effect animation
  if (!scene.anims.exists("explosion_anim")) {
    scene.anims.create({
      key: "explosion_anim",
      frames: scene.anims.generateFrameNumbers("explosion", { start: 0, end: 8 }),
      frameRate: 15, // slightly faster to look punchier
      repeat: 0,
    });
  }
}
