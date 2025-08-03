import * as Phaser from 'phaser';

interface Player {
    id: string;
    x: number;
    y: number;
    color: string;
    name: string;
    is_ready: boolean;
    is_dead: boolean;
    velocity_y: number;
}

interface Enemy {
    id: number;
    x: number;
    y: number;
    direction: number;
}

interface GameState {
    players: { [key: string]: Player };
    enemies: { [key: string]: Enemy };
    game_started: boolean;
    countdown_active: boolean;
}

export class GameScene extends Phaser.Scene {
    private socket: WebSocket;
    private playerId: string;
    private playerSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
    private playerNames: Map<string, Phaser.GameObjects.Text> = new Map();
    private enemySprites: Map<number, Phaser.GameObjects.Rectangle> = new Map();
    private readyButton?: Phaser.GameObjects.Text;
    private countdownText?: Phaser.GameObjects.Text;
    private gameOverText?: Phaser.GameObjects.Text;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
    private playerColor: string;
    private playerName: string;

    constructor(socket: WebSocket, playerId: string, playerColor: string, playerName: string) {
        super({ key: 'GameScene' });
        this.socket = socket;
        this.playerId = playerId;
        this.playerColor = playerColor;
        this.playerName = playerName;
    }

    preload() {
        // No assets to preload
    }

    create() {
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasdKeys = {
                W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
                A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
            };
        }

        // Add ready button
        this.readyButton = this.add.text(400, 300, 'Ready', {
            fontSize: '32px',
            backgroundColor: '#444'
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            this.socket.send(JSON.stringify({
                type: 'ready',
                ready: true
            }));
            this.readyButton?.setVisible(false);
        });

        this.countdownText = this.add.text(400, 200, '', {
            fontSize: '64px'
        }).setOrigin(0.5).setVisible(false);

        this.gameOverText = this.add.text(400, 200, 'Game Over!\nClick to restart', {
            fontSize: '48px',
            align: 'center'
        })
        .setOrigin(0.5)
        .setInteractive()
        .setVisible(false)
        .on('pointerdown', () => {
            this.socket.send(JSON.stringify({ type: 'restart' }));
        });

        // Join game
        this.socket.send(JSON.stringify({
            type: 'join',
            color: this.playerColor,
            name: this.playerName
        }));

        // Listen for game state updates
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'countdown') {
                this.countdownText?.setText(data.count.toString()).setVisible(true);
                return;
            }

            // Update game state
            this.updateGameState(data);
        };
    }

    updateGameState(state: GameState) {
        // Update players
        for (const [id, player] of Object.entries(state.players)) {
            let sprite = this.playerSprites.get(id);
            let nameText = this.playerNames.get(id);

            if (!sprite) {
                // Create new player sprite
                sprite = this.add.rectangle(player.x, player.y, 40, 40, parseInt(player.color.replace('#', '0x')));
                this.playerSprites.set(id, sprite);

                // Create player name
                nameText = this.add.text(player.x, player.y + 30, player.name, {
                    fontSize: '16px'
                }).setOrigin(0.5);
                this.playerNames.set(id, nameText);
            }

            // Update position
            sprite.setPosition(player.x, player.y);
            nameText?.setPosition(player.x, player.y + 30);

            // Update transparency for dead players
            if (player.is_dead) {
                sprite.setAlpha(0.5);
                nameText?.setAlpha(0.5);
            }
        }

        // Remove disconnected players
        for (const [id, sprite] of this.playerSprites.entries()) {
            if (!state.players[id]) {
                sprite.destroy();
                this.playerSprites.delete(id);
                this.playerNames.get(id)?.destroy();
                this.playerNames.delete(id);
            }
        }

        // Update enemies
        for (const [id, enemy] of Object.entries(state.enemies)) {
            let sprite = this.enemySprites.get(enemy.id);

            if (!sprite) {
                // Create new enemy sprite
                sprite = this.add.rectangle(enemy.x, enemy.y, 30, 30, 0xff0000);
                this.enemySprites.set(enemy.id, sprite);
            }

            sprite.setPosition(enemy.x, enemy.y);
        }

        // Remove dead enemies
        for (const [id, sprite] of this.enemySprites.entries()) {
            if (!state.enemies[id]) {
                sprite.destroy();
                this.enemySprites.delete(id);
            }
        }

        // Update game state elements
        if (state.countdown_active) {
            this.readyButton?.setVisible(false);
        }

        // Check for game over
        if (state.game_started) {
            const allPlayersDead = Object.values(state.players).every(p => p.is_dead);
            this.gameOverText?.setVisible(allPlayersDead);
            this.readyButton?.setVisible(!state.countdown_active && !state.game_started);
        }
    }

    update() {
        // Only send input to the server, do not move the player sprite directly
        if (!this.cursors) return;
        let move = 0;
        if (this.cursors.left.isDown || this.wasdKeys.A?.isDown) {
            move = -1;
        } else if (this.cursors.right.isDown || this.wasdKeys.D?.isDown) {
            move = 1;
        }
        const jump = !!(this.cursors.up.isDown || this.wasdKeys.W?.isDown);
        // Always send input to the server for this player
        this.socket.send(JSON.stringify({
            type: 'update',
            move,
            jump
        }));
    }
}
