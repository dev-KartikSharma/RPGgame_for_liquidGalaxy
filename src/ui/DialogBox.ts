import Phaser from "phaser";

export interface DialogPage {
  speaker?: string;
  text: string;
}

export class DialogBox {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private textObj: Phaser.GameObjects.Text;
  private speakerTextObj: Phaser.GameObjects.Text;
  private promptTextObj: Phaser.GameObjects.Text;

  private isTyping: boolean = false;
  private currentText: string = "";
  private currentIndex: number = 0;
  private pages: DialogPage[] = [];
  private pageIndex: number = 0;
  private typeTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.container = scene.add.container(0, 0).setVisible(false);

    // Create the background panel
    this.background = scene.add
      .rectangle(0, 0, 1024, 150, 0x000000, 0.8)
      .setOrigin(0.5)
      .setInteractive(); // catch clicks

    // Border
    this.background.setStrokeStyle(4, 0xffffff);

    // Speaker Text object
    this.speakerTextObj = scene.add
      .text(0, 0, "", {
        fontSize: "20px",
        color: "#ffff00",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    // Text object
    this.textObj = scene.add
      .text(0, 0, "", {
        fontSize: "24px",
        color: "#ffffff",
        wordWrap: { width: 1024 - 40 },
      })
      .setOrigin(0, 0);

    // Prompt Text object
    this.promptTextObj = scene.add
      .text(0, 0, "Press F to continue ▼", {
        fontSize: "16px",
        color: "#aaaaaa",
        fontStyle: "italic",
      })
      .setOrigin(1, 1);

    // Blinking effect
    scene.tweens.add({
      targets: this.promptTextObj,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.container.add([
      this.background,
      this.speakerTextObj,
      this.textObj,
      this.promptTextObj,
    ]);

    this.resize(scene.scale.width / 2, scene.scale.height / 2); // Initial layout

    // Click to advance/skip
    this.background.on("pointerdown", () => this.handleInput());
    scene.input.keyboard!.on("keydown-F", () => this.handleInput());
  }

  public resize(logicalWidth: number, logicalHeight: number) {
    const dialogWidth = Math.min(1024, logicalWidth * 0.8);
    this.background.setSize(dialogWidth, 150);
    this.background.setPosition(logicalWidth / 2, logicalHeight - 100);

    this.speakerTextObj.setPosition(
      logicalWidth / 2 - dialogWidth / 2 + 20,
      logicalHeight - 170,
    );
    this.textObj.setPosition(
      logicalWidth / 2 - dialogWidth / 2 + 20,
      logicalHeight - 140,
    );
    this.textObj.setStyle({ wordWrap: { width: dialogWidth - 40 } });

    this.promptTextObj.setPosition(
      logicalWidth / 2 + dialogWidth / 2 - 20,
      logicalHeight - 35,
    );
  }

  public show(text: string | string[] | DialogPage[]) {
    if (Array.isArray(text)) {
      if (text.length > 0 && typeof text[0] === "string") {
        this.pages = (text as string[]).map((t) => ({ text: t }));
      } else {
        this.pages = text as DialogPage[];
      }
    } else {
      this.pages = [{ text: text as string }];
    }
    this.pageIndex = 0;
    this.startPage();
    this.container.setVisible(true);
  }

  private startPage() {
    const page = this.pages[this.pageIndex];
    this.currentText = page.text;

    if (page.speaker) {
      this.speakerTextObj.setText(page.speaker);
      this.speakerTextObj.setVisible(true);
    } else {
      this.speakerTextObj.setVisible(false);
    }

    this.currentIndex = 0;
    this.isTyping = true;
    this.textObj.setText("");
    this.promptTextObj.setVisible(false);

    this.typeTimer = this.scene.time.addEvent({
      delay: 30, // typing speed
      callback: this.typeNextChar,
      callbackScope: this,
      loop: true,
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
      this.textObj.setText(
        this.currentText.substring(0, this.currentIndex + 1),
      );
      this.currentIndex++;
    } else {
      this.isTyping = false;
      this.promptTextObj.setVisible(true);
      if (this.typeTimer) {
        this.typeTimer.remove();
      }
    }
  }

  private handleInput() {
    if (!this.container.visible) return;

    if (this.isTyping) {
      // Skip typing and show full text
      if (this.typeTimer) this.typeTimer.remove();
      this.textObj.setText(this.currentText);
      this.isTyping = false;
      this.promptTextObj.setVisible(true);
    } else {
      // Advance to next page if available
      this.pageIndex++;
      if (this.pageIndex < this.pages.length) {
        this.startPage();
      } else {
        // Dismiss dialog
        this.hide();
      }
    }
  }
}
