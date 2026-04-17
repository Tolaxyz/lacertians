"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

export default function GameCanvas() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!gameRef.current || initializedRef.current) return;
    initializedRef.current = true;

    gameRef.current.innerHTML = "";

    /* ---------------- LOADING SCENE ---------------- */
    class LoadingScene extends Phaser.Scene {
      loadStartTime = 0;

      constructor() {
        super("LoadingScene");
      }

      preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor("#8A5FA2");

        const titleSize = width < 768 ? "38px" : "72px";

        const title = this.add
          .text(width / 2, height / 2 - 140, "Welcome to L0F0", {
            fontFamily: "Comic Sans MS",
            fontSize: titleSize,
            color: "#F8F4FF",
            fontStyle: "bold",
            stroke: "#5A2F63",
            strokeThickness: 3,
            align: "center",
            wordWrap: { width: width - 40 },
          })
          .setOrigin(0.5);

        this.tweens.add({
          targets: title,
          y: title.y - 25,
          duration: 4000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });

        const ballRadius = width < 768 ? 24 : 40;
        const ball = this.add.circle(
          width / 2,
          height / 2 + 60,
          ballRadius,
          0xf2c14e,
          1,
        );

        this.tweens.add({
          targets: ball,
          y: ball.y + (width < 768 ? 80 : 120),
          duration: 1000,
          ease: "Bounce.easeOut",
          yoyo: true,
          repeat: -1,
        });

        const boxWidth = width < 768 ? Math.min(width - 40, 280) : 400;
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0xf8f4ff, 0.18);
        progressBox.fillRoundedRect(
          width / 2 - boxWidth / 2,
          height / 2 + 140,
          boxWidth,
          50,
          20,
        );

        const progressBar = this.add.graphics();

        this.load.on("progress", (value: number) => {
          progressBar.clear();
          progressBar.fillStyle(0xd97bb7, 1);
          progressBar.fillRoundedRect(
            width / 2 - boxWidth / 2 + 10,
            height / 2 + 150,
            (boxWidth - 20) * value,
            30,
            20,
          );
        });

        this.load.image("player", "/player.png");
        this.load.image("player_jump", "/player_jump.png");
        this.load.image("coin", "/coin.png");
        this.load.image("enemy", "/enemy.png");
        this.load.image(
          "ground",
          "https://labs.phaser.io/assets/sprites/platform.png",
        );

        this.loadStartTime = this.time.now;
      }

      create() {
        const elapsed = this.time.now - this.loadStartTime;
        const minTime = 2000;
        const remaining = Math.max(minTime - elapsed, 0);

        this.time.delayedCall(remaining, () => {
          this.scene.start("GameScene");
        });
      }
    }

    /* ---------------- GAME SCENE ---------------- */
    class GameScene extends Phaser.Scene {
      playerBody!: Phaser.Physics.Arcade.Sprite;
      playerWalkSprite!: Phaser.GameObjects.Image;
      playerJumpSprite!: Phaser.GameObjects.Image;
      cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      coins!: Phaser.Physics.Arcade.Group;
      enemies!: Phaser.Physics.Arcade.Group;
      score = 0;
      scoreText!: Phaser.GameObjects.Text;
      isGameOver = false;
      currentVisualState: "walk" | "jump" = "walk";

      playerFootOffset = 6;
      isMobile = false;
      playerWidth = 60;
      playerHeight = 80;
      moveSpeed = 260;
      jumpSpeed = 520;
      touchMoveDirection: -1 | 0 | 1 = 0;
      lastTapTime = 0;
      touchDeadZone = 0.12;
      mobileHint?: HTMLDivElement;

      constructor() {
        super("GameScene");
      }

      setupResponsiveValues() {
        const width = this.scale.width;
        this.isMobile = width < 768;

        if (width < 480) {
          this.playerWidth = 42;
          this.playerHeight = 56;
          this.moveSpeed = 210;
          this.jumpSpeed = 460;
          this.playerFootOffset = 3;
        } else if (width < 768) {
          this.playerWidth = 50;
          this.playerHeight = 68;
          this.moveSpeed = 230;
          this.jumpSpeed = 490;
          this.playerFootOffset = 4;
        } else {
          this.playerWidth = 60;
          this.playerHeight = 80;
          this.moveSpeed = 260;
          this.jumpSpeed = 520;
          this.playerFootOffset = 6;
        }
      }

      showMobileHint() {
        if (!this.isMobile || !gameRef.current) return;

        if (this.mobileHint) {
          this.mobileHint.remove();
          this.mobileHint = undefined;
        }

        const hint = document.createElement("div");
        hint.style.position = "absolute";
        hint.style.top = "10px";
        hint.style.left = "50%";
        hint.style.transform = "translateX(-50%)";
        hint.style.padding = "8px 12px";
        hint.style.background = "rgba(0,0,0,0.35)";
        hint.style.color = "#EAEAEA";
        hint.style.borderRadius = "12px";
        hint.style.fontFamily = "Comic Sans MS";
        hint.style.fontSize = "14px";
        hint.style.zIndex = "20";
        hint.style.pointerEvents = "none";
        hint.style.whiteSpace = "nowrap";
        hint.innerText = "Tap left/right to move • Double tap to jump";

        gameRef.current.appendChild(hint);
        this.mobileHint = hint;

        window.setTimeout(() => {
          if (this.mobileHint === hint) {
            hint.remove();
            this.mobileHint = undefined;
          }
        }, 2500);
      }

      refreshResponsiveLayout() {
        this.setupResponsiveValues();

        if (this.playerWalkSprite && this.playerJumpSprite) {
          this.playerWalkSprite.setDisplaySize(
            this.playerWidth,
            this.playerHeight,
          );
          this.playerJumpSprite.setDisplaySize(
            this.playerWidth,
            this.playerHeight,
          );
        }

        if (this.playerBody) {
          const bodyWidth = Math.round(this.playerWidth * 0.6);
          const bodyHeight = Math.round(this.playerHeight * 0.8);

          this.playerBody.setSize(bodyWidth, bodyHeight);
          this.playerBody.setOffset(
            (this.playerBody.width - bodyWidth) / 2,
            this.playerBody.height - bodyHeight,
          );
        }

        if (this.scoreText) {
          this.scoreText.setFontSize(this.isMobile ? "20px" : "26px");
        }
      }

      handleJump() {
        const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
        const isGrounded = body.blocked.down || body.touching.down;

        if (isGrounded) {
          this.playerBody.setVelocityY(-this.jumpSpeed);
        }
      }

      setupTouchControls() {
        if (!this.isMobile) return;

        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          const now = this.time.now;
          const width = this.scale.width;
          const xRatio = pointer.x / width;

          if (now - this.lastTapTime < 280) {
            this.handleJump();
          }
          this.lastTapTime = now;

          if (xRatio < 0.5 - this.touchDeadZone) {
            this.touchMoveDirection = -1;
          } else if (xRatio > 0.5 + this.touchDeadZone) {
            this.touchMoveDirection = 1;
          } else {
            this.touchMoveDirection = 0;
          }
        });

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
          if (!pointer.isDown) return;

          const width = this.scale.width;
          const xRatio = pointer.x / width;

          if (xRatio < 0.5 - this.touchDeadZone) {
            this.touchMoveDirection = -1;
          } else if (xRatio > 0.5 + this.touchDeadZone) {
            this.touchMoveDirection = 1;
          } else {
            this.touchMoveDirection = 0;
          }
        });

        this.input.on("pointerup", () => {
          this.touchMoveDirection = 0;
        });
      }

      create() {
        this.isGameOver = false;
        this.score = 0;
        this.currentVisualState = "walk";

        this.physics.resume();
        this.physics.world.setBounds(0, 0, 4000, 800);

        this.setupResponsiveValues();

        const platforms = this.physics.add.staticGroup();

        for (let i = 0; i < 20; i++) {
          const platform = platforms
            .create(i * 200, 760, "ground")
            .setScale(2)
            .refreshBody();

          platform.setTint(0x3f4f55);
        }

        const p1 = platforms.create(600, 600, "ground");
        p1.setTint(0x3f4f55);

        const p2 = platforms.create(900, 500, "ground");
        p2.setTint(0x3f4f55);

        const p3 = platforms.create(1400, 650, "ground");
        p3.setTint(0x3f4f55);

        const p4 = platforms.create(1800, 550, "ground");
        p4.setTint(0x3f4f55);

        const p5 = platforms.create(2300, 600, "ground");
        p5.setTint(0x3f4f55);

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        const floatingText = this.add
          .text(centerX, centerY, "L0F0's pLaYgRoUnD", {
            fontFamily: "Comic Sans MS",
            fontSize: this.isMobile ? "40px" : "64px",
            fontStyle: "bold",
            color: "#EAEAEA",
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(-1);

        this.tweens.add({
          targets: floatingText,
          y: centerY - 20,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });

        this.playerBody = this.physics.add.sprite(200, 400, "player");
        this.playerBody.setVisible(false);
        this.playerBody.setBounce(0.1);
        this.playerBody.setCollideWorldBounds(true);

        const bodyWidth = Math.round(this.playerWidth * 0.6);
        const bodyHeight = Math.round(this.playerHeight * 0.8);
        this.playerBody.setSize(bodyWidth, bodyHeight);
        this.playerBody.setOffset(
          (this.playerBody.width - bodyWidth) / 2,
          this.playerBody.height - bodyHeight,
        );

        this.playerWalkSprite = this.add.image(200, 400, "player");
        this.playerWalkSprite.setDisplaySize(
          this.playerWidth,
          this.playerHeight,
        );
        this.playerWalkSprite.setOrigin(0.5, 1);

        this.playerJumpSprite = this.add.image(200, 400, "player_jump");
        this.playerJumpSprite.setDisplaySize(
          this.playerWidth,
          this.playerHeight,
        );
        this.playerJumpSprite.setOrigin(0.5, 1);
        this.playerJumpSprite.setVisible(false);

        this.physics.add.collider(this.playerBody, platforms);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.setupTouchControls();

        this.cameras.main.startFollow(this.playerBody, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, 4000, 800);

        this.coins = this.physics.add.group();

        for (let i = 0; i < 25; i++) {
          const coin = this.coins.create(
            Phaser.Math.Between(200, 3800),
            0,
            "coin",
          ) as Phaser.Physics.Arcade.Sprite;

          coin.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
          coin.setScale(this.isMobile ? 0.24 : 0.3);
          coin.setTint(0xf2c14e);
        }

        this.physics.add.collider(this.coins, platforms);

        this.physics.add.overlap(
          this.playerBody,
          this.coins,
          (_player, coin) => {
            const collectedCoin = coin as Phaser.Physics.Arcade.Sprite;
            collectedCoin.disableBody(true, true);
            this.score += 10;
            this.scoreText.setText("Score: " + this.score);
          },
          undefined,
          this,
        );

        this.enemies = this.physics.add.group();

        for (let i = 0; i < 8; i++) {
          const enemy = this.enemies.create(
            600 + i * 400,
            200,
            "enemy",
          ) as Phaser.Physics.Arcade.Sprite;

          enemy.setBounce(1);
          enemy.setCollideWorldBounds(true);
          enemy.setVelocityX(Phaser.Math.Between(-120, 120));
          enemy.setScale(this.isMobile ? 0.32 : 0.4);
          enemy.setTint(0xb86b77);
        }

        this.physics.add.collider(this.enemies, platforms);
        this.physics.add.collider(
          this.playerBody,
          this.enemies,
          this.hitEnemy,
          undefined,
          this,
        );

        this.scoreText = this.add
          .text(20, 20, "Score: 0", {
            fontFamily: "Comic Sans MS",
            fontSize: this.isMobile ? "20px" : "26px",
            color: "#EAEAEA",
          })
          .setScrollFactor(0);

        this.scale.on("resize", () => {
          this.refreshResponsiveLayout();
        });

        this.refreshResponsiveLayout();
        this.showMobileHint();
      }

      syncVisualPlayer() {
        const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
        const footX = body.center.x;
        const footY = body.bottom + this.playerFootOffset;
        const flipX = this.playerBody.flipX;
        const rotation = this.playerBody.rotation;

        this.playerWalkSprite.setPosition(footX, footY);
        this.playerJumpSprite.setPosition(footX, footY);

        this.playerWalkSprite.setFlipX(flipX);
        this.playerJumpSprite.setFlipX(flipX);

        this.playerWalkSprite.setRotation(rotation);
        this.playerJumpSprite.setRotation(rotation);
      }

      setPlayerVisualState(nextState: "walk" | "jump") {
        if (this.currentVisualState === nextState) return;

        this.currentVisualState = nextState;

        if (nextState === "walk") {
          this.playerWalkSprite.setVisible(true);
          this.playerJumpSprite.setVisible(false);
        } else {
          this.playerWalkSprite.setVisible(false);
          this.playerJumpSprite.setVisible(true);
        }
      }

      hitEnemy() {
        if (this.isGameOver) return;

        this.isGameOver = true;
        this.physics.pause();

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add
          .text(centerX, centerY - 100, "GAME OVER", {
            fontFamily: "Comic Sans MS",
            fontSize: this.isMobile ? "40px" : "64px",
            color: "#EAEAEA",
          })
          .setOrigin(0.5)
          .setScrollFactor(0);

        const button = this.add
          .rectangle(centerX, centerY + 20, 240, 80, 0x3f4f55, 1)
          .setStrokeStyle(4, 0xeaeaea)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setScrollFactor(0);

        this.add
          .text(centerX, centerY + 20, "Restart Game", {
            fontFamily: "Comic Sans MS",
            fontSize: this.isMobile ? "22px" : "28px",
            color: "#8A5FA2",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setScrollFactor(0);

        button.on("pointerdown", () => this.scene.restart());
      }

      update() {
        if (this.isGameOver) return;

        const movingLeft =
          this.cursors.left.isDown || this.touchMoveDirection === -1;
        const movingRight =
          this.cursors.right.isDown || this.touchMoveDirection === 1;

        if (movingLeft && !movingRight) {
          this.playerBody.setVelocityX(-this.moveSpeed);
          this.playerBody.setFlipX(true);
          this.playerBody.rotation = 0.15 * Math.sin(this.time.now * 0.005);
        } else if (movingRight && !movingLeft) {
          this.playerBody.setVelocityX(this.moveSpeed);
          this.playerBody.setFlipX(false);
          this.playerBody.rotation = 0.15 * Math.sin(this.time.now * 0.005);
        } else {
          this.playerBody.setVelocityX(0);
          this.playerBody.rotation = Phaser.Math.Linear(
            this.playerBody.rotation,
            0,
            0.15,
          );
        }

        const body = this.playerBody.body as Phaser.Physics.Arcade.Body;

        if (
          this.cursors.up.isDown &&
          (body.blocked.down || body.touching.down)
        ) {
          this.playerBody.setVelocityY(-this.jumpSpeed);
        }

        const isGrounded = body.blocked.down || body.touching.down;

        this.setPlayerVisualState(isGrounded ? "walk" : "jump");
        this.syncVisualPlayer();
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 900 },
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [LoadingScene, GameScene],
      backgroundColor: "#8A5FA2",
      transparent: false,
      clearBeforeRender: true,
    };

    phaserInstance.current = new Phaser.Game(config);

    return () => {
      if (phaserInstance.current) {
        phaserInstance.current.destroy(true);
        phaserInstance.current = null;
      }

      if (gameRef.current) {
        gameRef.current.innerHTML = "";
      }

      initializedRef.current = false;
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        touchAction: "manipulation",
      }}
    />
  );
}
