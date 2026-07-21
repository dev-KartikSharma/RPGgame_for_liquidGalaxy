import Phaser from "phaser";

export function createPlayerAnimations(scene: Phaser.Scene) {
  if (scene.anims.exists("Idle")) {
    return;
  }

  // IDLE
  scene.anims.create({
    key: "Idle",
    frames: scene.anims.generateFrameNames("player", {
      start: 0,
      end: 7,
      prefix: "Warrior ",
      suffix: ".aseprite",
    }),
    frameRate: 10,
    repeat: -1,
  });

  // RUN
  scene.anims.create({
    key: "Run",
    frames: scene.anims.generateFrameNames("player", {
      start: 8,
      end: 13,
      prefix: "Warrior ",
      suffix: ".aseprite",
    }),
    frameRate: 12,
    repeat: -1,
  });

  // ATTACK 1
  scene.anims.create({
    key: "Attack 1",
    frames: scene.anims.generateFrameNames("player", {
      start: 14,
      end: 17,
      prefix: "Warrior ",
      suffix: ".aseprite",
    }),
    frameRate: 12,
    repeat: 0,
  });

  // ATTACK 2
  scene.anims.create({
    key: "Attack 2",
    frames: scene.anims.generateFrameNames("player", {
      start: 18,
      end: 21,
      prefix: "Warrior ",
      suffix: ".aseprite",
    }),
    frameRate: 12,
    repeat: 0,
  });

  // GUARD
  scene.anims.create({
    key: "Guard",
    frames: scene.anims.generateFrameNames("player", {
      start: 22,
      end: 27,
      prefix: "Warrior ",
      suffix: ".aseprite",
    }),
    frameRate: 10,
    repeat: -1,
  });
}
