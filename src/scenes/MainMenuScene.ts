import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {

    private startButton!: Phaser.GameObjects.Image;

    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        // Assume master screen only for the main menu, or just show it anyway
        // because it's before the game starts. The URL params might have `?screen=1`
        const urlParams = new URLSearchParams(window.location.search);
        const screenParam = urlParams.get('screen');
        const isMaster = !screenParam || parseInt(screenParam, 10) === 1;

        if (!isMaster) {
            // If it's a slave screen, just wait until master sends a start command or just sit idle
            // For now, let's just make slave screens render a waiting message or just black.
            this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Waiting for Master...', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
            return;
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Add background image and scale to fit
        const bg = this.add.image(width / 2, height / 2, 'start_screen');
        bg.setDisplaySize(width, height);

        this.add.text(width / 2, height / 3, 'RPG GAME', {
            fontSize: '64px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Start Button
        this.startButton = this.add.image(width / 2, height / 2, 'button_regular').setInteractive();
        const startText = this.add.text(width / 2, height / 2 - 5, 'Start Game', {
            fontSize: '24px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.startButton.on('pointerdown', () => {
            this.startButton.setTexture('button_pressed');
            startText.setY(height / 2 + 5); // move text down to simulate press
        });

        this.startButton.on('pointerup', () => {
            this.startButton.setTexture('button_regular');
            startText.setY(height / 2 - 5);
            this.startGame();
        });

        this.startButton.on('pointerout', () => {
            this.startButton.setTexture('button_regular');
            startText.setY(height / 2 - 5);
        });
    }

    private startGame() {
        // Transition to the Game scene
        this.scene.start('Game');
    }
}
