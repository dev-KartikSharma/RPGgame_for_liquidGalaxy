import Phaser from 'phaser';

export default class PauseMenuScene extends Phaser.Scene {



    constructor() {
        super({ key: 'PauseMenuScene' });
    }

    create() {
        const width = 1280;
        const height = 720;

        // Semi-transparent background
        const bgRect = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0, 0);

        // Load the UI map
        const map = this.make.tilemap({ key: 'pause_menu' });

        // Add tilesets
        const ribbonTileset = map.addTilesetImage('BigRibbons', 'big_ribbons');
        const paperTileset = map.addTilesetImage('SpecialPaper', 'special_paper');
        const iconTileset = map.addTilesetImage('Icon_09', 'icon_09');
        const woodTileset = map.addTilesetImage('WoodTable', 'wood_table');

        const tilesets = [];
        if (ribbonTileset) tilesets.push(ribbonTileset);
        if (paperTileset) tilesets.push(paperTileset);
        if (iconTileset) tilesets.push(iconTileset);
        if (woodTileset) tilesets.push(woodTileset);

        // Create a Container to hold all the 1280x720 elements
        const menuContainer = this.add.container(0, 0);

        // Create the tile layers
        const layer1 = map.createLayer('Tile Layer 1', tilesets, 0, 0);
        const layer2 = map.createLayer('Tile Layer 2', tilesets, 0, 0);
        if (layer1) menuContainer.add(layer1);
        if (layer2) menuContainer.add(layer2);

        // Extract Interactive Objects
        const objectLayer = map.getObjectLayer('Object Layer 1');
        if (objectLayer && objectLayer.objects) {
            objectLayer.objects.forEach(obj => {
                if (obj.name === 'ResumeButton') {
                    const x = obj.x || 0;
                    const y = obj.y || 0;
                    const objWidth = obj.width || 0;
                    const objHeight = obj.height || 0;

                    const zone = this.add.zone(x, y, objWidth, objHeight).setOrigin(0, 0);
                    zone.setInteractive({ useHandCursor: true });
                    
                    zone.on('pointerup', () => {
                        this.resumeGame();
                    });
                    
                    menuContainer.add(zone);
                }
            });
        }

        // Add PAUSED text
        const pausedText = this.add.text(width / 2, 210, 'PAUSED', {
            fontSize: '48px',
            color: '#000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        menuContainer.add(pausedText);

        // --- DYNAMIC UI CENTERING & SCALING ---
        const resizeUI = () => {
            const gameWidth = this.scale.width;
            const gameHeight = this.scale.height;
            
            // Background covers the whole physical screen
            bgRect.setSize(gameWidth, gameHeight);
            
            // Scale and center the 1280x720 menu container
            const scaleRatio = Math.min(gameWidth / 1280, gameHeight / 720);
            menuContainer.setScale(scaleRatio);
            
            menuContainer.setPosition(
                (gameWidth - 1280 * scaleRatio) / 2,
                (gameHeight - 720 * scaleRatio) / 2
            );
        };
        resizeUI();
        this.scale.on('resize', resizeUI);

        // ESC key to also resume
        this.input.keyboard!.on('keydown-ESC', () => {
            this.resumeGame();
        });
        
        // Clean up events
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', resizeUI);
        });
    }

    private resumeGame() {
        this.scene.resume('Game');
        this.scene.stop();
    }
}
