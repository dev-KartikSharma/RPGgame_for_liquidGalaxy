import Phaser from 'phaser';

export class DialogBox {
    private scene: Phaser.Scene;
    public container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Rectangle;
    private textObj: Phaser.GameObjects.Text;
    
    private isTyping: boolean = false;
    private currentText: string = '';
    private currentIndex: number = 0;
    private typeTimer?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.container = scene.add.container(0, 0).setVisible(false);

        // Create the background panel (using a primitive rectangle for now, 
        // could use 'Paper_Bg' scaled or a 9-slice banner)
        this.background = scene.add.rectangle(0, 0, 1024, 150, 0x000000, 0.8)
            .setOrigin(0.5)
            .setInteractive(); // catch clicks

        // Border
        this.background.setStrokeStyle(4, 0xffffff);

        // Text object
        this.textObj = scene.add.text(0, 0, '', {
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: 1024 - 40 }
        }).setOrigin(0, 0);

        this.container.add([this.background, this.textObj]);

        this.resize(scene.scale.width / 2, scene.scale.height / 2); // Initial layout

        // Click to advance/skip
        this.background.on('pointerdown', () => this.handleInput());
        scene.input.keyboard!.on('keydown-SPACE', () => this.handleInput());
    }

    public resize(logicalWidth: number, logicalHeight: number) {
        const dialogWidth = Math.min(1024, logicalWidth * 0.8);
        this.background.setSize(dialogWidth, 150);
        this.background.setPosition(logicalWidth / 2, logicalHeight - 100);
        
        this.textObj.setPosition(logicalWidth / 2 - dialogWidth / 2 + 20, logicalHeight - 150);
        this.textObj.setStyle({ wordWrap: { width: dialogWidth - 40 } });
    }

    public show(text: string) {
        this.currentText = text;
        this.currentIndex = 0;
        this.isTyping = true;
        this.textObj.setText('');
        
        this.container.setVisible(true);

        this.typeTimer = this.scene.time.addEvent({
            delay: 30, // typing speed
            callback: this.typeNextChar,
            callbackScope: this,
            loop: true
        });
    }

    public hide() {
        this.container.setVisible(false);
        this.isTyping = false;
        if (this.typeTimer) {
            this.typeTimer.remove();
        }
    }

    private typeNextChar() {
        if (this.currentIndex < this.currentText.length) {
            this.textObj.setText(this.currentText.substring(0, this.currentIndex + 1));
            this.currentIndex++;
        } else {
            this.isTyping = false;
            if (this.typeTimer) {
                this.typeTimer.remove();
            }
        }
    }

    private handleInput() {
        if (!this.background.visible) return;

        if (this.isTyping) {
            // Skip typing and show full text
            if (this.typeTimer) this.typeTimer.remove();
            this.textObj.setText(this.currentText);
            this.isTyping = false;
        } else {
            // Dismiss dialog
            this.hide();
        }
    }
}
