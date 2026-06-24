import Phaser from 'phaser';

export function createEnemyAnimations(
    scene: Phaser.Scene
) {

    if (scene.anims.exists('enemy_idle')) {
        return;
    }

    // IDLE
    scene.anims.create({
        key: 'enemy_idle',
        frames: scene.anims.generateFrameNames(
            'enemy_goblin_torch_blue',
            {
                start: 3,
                end: 9,
                prefix: 'Torch_Blue ',
                suffix: '.aseprite'
            }
        ),
        frameRate: 10,
        repeat: -1
    });

    // RUN
    scene.anims.create({
        key: 'enemy_run',
        frames: scene.anims.generateFrameNames(
            'enemy_goblin_torch_blue',
            {
                start: 10,
                end: 15,
                prefix: 'Torch_Blue ',
                suffix: '.aseprite'
            }
        ),
        frameRate: 12,
        repeat: -1
    });

    // ATTACK RIGHT
    scene.anims.create({
        key: 'enemy_attack',
        frames: scene.anims.generateFrameNames(
            'enemy_goblin_torch_blue',
            {
                start: 16,
                end: 21,
                prefix: 'Torch_Blue ',
                suffix: '.aseprite'
            }
        ),
        frameRate: 12,
        repeat: 0
    });
}
