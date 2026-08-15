import Phaser from "phaser";

export const createNpcAnimations = (scene: Phaser.Scene) => {
  if (!scene.anims.exists("npc_idle")) {
    scene.anims.create({
      key: "npc_idle",
      frames: scene.anims.generateFrameNumbers("pawn_idle", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }
};
