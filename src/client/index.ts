import { Socket, io } from 'socket.io-client'
import { GameState, Player, Ship, GameRoom, ShipPlacement } from '../shared/types'

class BattleshipGame {
    private socket: Socket
    private playerName: string = ''
    private roomCode: string = ''
    private gameState: GameState | null = null
    private currentPlacingShip: Ship | null = null
    private shipOrientation: 'horizontal' | 'vertical' = 'horizontal'
    private ships: Ship[] = [
        { id: 1, name: 'Portaaviones', size: 5, placed: false },
        { id: 2, name: 'Acorazado', size: 4, placed: false },
        { id: 3, name: 'Crucero', size: 3, placed: false },
        { id: 4, name: 'Submarino', size: 3, placed: false },
        { id: 5, name: 'Destructor', size: 2, placed: false },
    ]

    constructor() {
        this.socket = io()
        this.setupEventListeners()
        this.setupSocketEvents()
    }

    private setupEventListeners(): void {
        // Botones de configuración inicial
        document.getElementById('create-game')?.addEventListener('click', () => this.createGame())
        document.getElementById('join-game')?.addEventListener('click', () => this.joinGame())

        // Controles de sala
        document.getElementById('start-game')?.addEventListener('click', () => this.startGame())
        document.getElementById('leave-room')?.addEventListener('click', () => this.leaveRoom())

        // Controles de juego
        document
            .getElementById('rotate-ship')
            ?.addEventListener('click', () => this.toggleShipOrientation())
    }

    private setupSocketEvents(): void {
        // Eventos de sala
        this.socket.on('room-created', (data: { roomCode: string }) => {
            this.roomCode = data.roomCode
            this.showRoomScreen()
        })

        this.socket.on('room-joined', (room: GameRoom) => {
            this.roomCode = room.code
            this.showRoomScreen()
            this.updatePlayersList(room.players)
        })

        this.socket.on('player-joined', (players: Player[]) => {
            this.updatePlayersList(players)
            this.showNotification('info', 'Un nuevo jugador se ha unido a la sala')
        })

        this.socket.on('player-left', (players: Player[]) => {
            this.updatePlayersList(players)
            this.showNotification('warning', 'Un jugador ha abandonado la sala')
        })

        this.socket.on('game-started', () => {
            this.showGameScreen()
            this.initializeBoards()
            this.startShipPlacement()
            this.showNotification('success', '¡La partida ha comenzado!')
        })

        // Eventos de juego
        this.socket.on('game-update', (gameState: GameState) => {
            this.gameState = gameState
            this.updateBoards()
        })

        this.socket.on('game-over', (winner: Player) => {
            this.showGameEndDialog(winner)
        })

        // Errores
        this.socket.on('error', (message: string) => {
            this.showNotification('error', `Error: ${message}`)
        })
    }

    private createGame(): void {
        const nameInput = document.getElementById('player-name') as HTMLInputElement
        if (nameInput && nameInput.value.trim()) {
            this.playerName = nameInput.value.trim()
            this.socket.emit('create-room', { playerName: this.playerName })
        } else {
            alert('Por favor, ingresa tu nombre')
        }
    }

    private joinGame(): void {
        const nameInput = document.getElementById('player-name') as HTMLInputElement
        const codeInput = document.getElementById('game-code') as HTMLInputElement

        if (!nameInput.value.trim()) {
            alert('Por favor, ingresa tu nombre')
            return
        }

        if (!codeInput.value.trim()) {
            alert('Por favor, ingresa el código de la sala')
            return
        }

        this.playerName = nameInput.value.trim()
        this.socket.emit('join-room', {
            playerName: this.playerName,
            roomCode: codeInput.value.trim(),
        })
    }

    private showSetupScreen(): void {
        document.getElementById('game-setup')?.classList.remove('hidden')
        document.getElementById('game-room')?.classList.add('hidden')
        document.getElementById('game-board')?.classList.add('hidden')
    }

    private showRoomScreen(): void {
        document.getElementById('game-setup')?.classList.add('hidden')
        document.getElementById('game-room')?.classList.remove('hidden')
        document.getElementById('game-board')?.classList.add('hidden')

        const roomCodeElement = document.getElementById('room-code')
        if (roomCodeElement) {
            roomCodeElement.innerHTML = `<span class="material-icons">code</span> Código: <strong>${this.roomCode}</strong>`
        }
    }

    private showGameScreen(): void {
        document.getElementById('game-setup')?.classList.add('hidden')
        document.getElementById('game-room')?.classList.add('hidden')
        document.getElementById('game-board')?.classList.remove('hidden')
    }

    private updatePlayersList(players: Player[]): void {
        const playersListElement = document.getElementById('players-list')
        if (playersListElement) {
            playersListElement.innerHTML = '<h3 class="section-title">Jugadores</h3>'
            const list = document.createElement('ul')
            players.forEach((player) => {
                const item = document.createElement('li')

                // Usar íconos de Material UI
                if (player.ready) {
                    item.innerHTML = `<span class="material-icons" style="color: var(--success-color); margin-right: 8px;">check_circle</span>${player.name}`
                } else {
                    item.innerHTML = `<span class="material-icons" style="margin-right: 8px;">person</span>${player.name}`
                }

                list.appendChild(item)
            })
            playersListElement.appendChild(list)
        }

        // Habilitar botón de inicio cuando haya al menos 2 jugadores
        const startButton = document.getElementById('start-game') as HTMLButtonElement
        if (startButton) {
            startButton.disabled = players.length < 2
        }
    }

    private startGame(): void {
        this.socket.emit('start-game', { roomCode: this.roomCode })
    }

    private leaveRoom(): void {
        this.socket.emit('leave-room')
        this.showSetupScreen()
    }

    private initializeBoards(): void {
        const playerBoard = document.getElementById('player-board')
        const enemyBoard = document.getElementById('enemy-board')

        if (playerBoard && enemyBoard) {
            // Limpiar tableros
            playerBoard.innerHTML = ''
            enemyBoard.innerHTML = ''

            // Crear tablero del jugador
            for (let y = 0; y < 10; y++) {
                for (let x = 0; x < 10; x++) {
                    const cell = document.createElement('div')
                    cell.classList.add('cell')
                    cell.dataset.x = x.toString()
                    cell.dataset.y = y.toString()
                    cell.addEventListener('click', () => this.handlePlayerBoardClick(x, y))
                    cell.addEventListener('mouseover', () => this.handlePlayerBoardHover(x, y))
                    cell.addEventListener('mouseout', () => this.handlePlayerBoardHoverOut())
                    playerBoard.appendChild(cell)
                }
            }

            // Crear tablero enemigo
            for (let y = 0; y < 10; y++) {
                for (let x = 0; x < 10; x++) {
                    const cell = document.createElement('div')
                    cell.classList.add('cell')
                    cell.dataset.x = x.toString()
                    cell.dataset.y = y.toString()
                    cell.addEventListener('click', () => this.handleEnemyBoardClick(x, y))
                    enemyBoard.appendChild(cell)
                }
            }
        }
    }

    private startShipPlacement(): void {
        // Encontrar el primer barco no colocado
        this.currentPlacingShip = this.ships.find((ship) => !ship.placed) || null

        if (this.currentPlacingShip) {
            const statusElement = document.getElementById('game-status')
            if (statusElement) {
                statusElement.innerHTML = `
                    <span class="material-icons">directions_boat</span>
                    <span>Coloca tu ${this.currentPlacingShip.name} (tamaño: ${this.currentPlacingShip.size})</span>
                `
            }
        }
    }

    private toggleShipOrientation(): void {
        this.shipOrientation = this.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal'
        const statusElement = document.getElementById('game-status')
        if (statusElement && this.currentPlacingShip) {
            statusElement.innerHTML = `
                <span class="material-icons">directions_boat</span>
                <span>Coloca tu ${this.currentPlacingShip.name} (tamaño: ${this.currentPlacingShip.size}, orientación: ${this.shipOrientation})</span>
            `
        }
    }

    private handlePlayerBoardClick(x: number, y: number): void {
        if (this.currentPlacingShip) {
            // Intentar colocar el barco
            const shipPlacement: ShipPlacement = {
                shipId: this.currentPlacingShip.id,
                startX: x,
                startY: y,
                orientation: this.shipOrientation,
            }

            this.socket.emit('place-ship', shipPlacement)

            // Actualizar localmente (temporalmente, se actualizará cuando llegue la respuesta del servidor)
            const ship = this.ships.find((s) => s.id === this.currentPlacingShip!.id)
            if (ship) {
                ship.placed = true
                this.currentPlacingShip = this.ships.find((s) => !s.placed) || null

                if (this.currentPlacingShip) {
                    const statusElement = document.getElementById('game-status')
                    if (statusElement) {
                        statusElement.innerHTML = `
                            <span class="material-icons">directions_boat</span>
                            <span>Coloca tu ${this.currentPlacingShip.name} (tamaño: ${this.currentPlacingShip.size}, orientación: ${this.shipOrientation})</span>
                        `
                    }
                } else {
                    // Todos los barcos colocados
                    this.socket.emit('player-ready')
                    const statusElement = document.getElementById('game-status')
                    if (statusElement) {
                        statusElement.innerHTML = `
                            <span class="material-icons">hourglass_top</span>
                            <span>Esperando a que el otro jugador termine de colocar sus barcos...</span>
                        `
                    }
                }
            }
        }
    }

    private handlePlayerBoardHover(x: number, y: number): void {
        if (!this.currentPlacingShip) return

        const size = this.currentPlacingShip.size
        const playerBoard = document.getElementById('player-board')

        if (playerBoard) {
            // Resaltar celdas donde se colocará el barco
            for (let i = 0; i < size; i++) {
                const cellX = this.shipOrientation === 'horizontal' ? x + i : x
                const cellY = this.shipOrientation === 'vertical' ? y + i : y

                if (cellX < 10 && cellY < 10) {
                    const cell = playerBoard.querySelector(
                        `[data-x="${cellX}"][data-y="${cellY}"]`
                    ) as HTMLElement
                    if (cell) {
                        cell.style.backgroundColor = '#aed6f1'
                    }
                }
            }
        }
    }

    private handlePlayerBoardHoverOut(): void {
        const playerBoard = document.getElementById('player-board')
        if (playerBoard) {
            // Restaurar el color normal de todas las celdas
            const cells = playerBoard.querySelectorAll('.cell')
            cells.forEach((cell) => {
                ;(cell as HTMLElement).style.backgroundColor = ''
            })
        }
    }

    private handleEnemyBoardClick(x: number, y: number): void {
        // Enviar ataque al servidor
        if (this.gameState && this.gameState.currentTurn === this.socket.id) {
            this.socket.emit('attack', { x, y })
        } else {
            this.showNotification('warning', 'No es tu turno')
        }
    }

    private updateBoards(): void {
        if (!this.gameState) return

        // Actualizar tablero del jugador
        const playerBoard = document.getElementById('player-board')
        if (playerBoard && this.gameState.playerBoard) {
            this.gameState.playerBoard.forEach((row, y) => {
                row.forEach((cell, x) => {
                    const cellElement = playerBoard.querySelector(`[data-x="${x}"][data-y="${y}"]`)
                    if (cellElement) {
                        if (cell === 1) {
                            cellElement.classList.add('ship')
                        } else if (cell === 2) {
                            cellElement.classList.add('hit')
                        } else if (cell === 3) {
                            cellElement.classList.add('miss')
                        }
                    }
                })
            })
        }

        // Actualizar tablero enemigo
        const enemyBoard = document.getElementById('enemy-board')
        if (enemyBoard && this.gameState.enemyBoard) {
            this.gameState.enemyBoard.forEach((row, y) => {
                row.forEach((cell, x) => {
                    const cellElement = enemyBoard.querySelector(`[data-x="${x}"][data-y="${y}"]`)
                    if (cellElement) {
                        if (cell === 2) {
                            cellElement.classList.add('hit')
                        } else if (cell === 3) {
                            cellElement.classList.add('miss')
                        }
                    }
                })
            })
        }

        // Actualizar información de turno
        const statusElement = document.getElementById('game-status')
        if (statusElement) {
            if (this.gameState && this.gameState.currentTurn === this.socket.id) {
                statusElement.innerHTML = `
                    <span class="material-icons" style="color: var(--success-color);">play_arrow</span>
                    <span>Tu turno - Ataca el tablero enemigo</span>
                `
                statusElement.classList.add('active-turn')
                statusElement.classList.remove('waiting-turn')
            } else {
                statusElement.innerHTML = `
                    <span class="material-icons" style="color: var(--warning-color);">hourglass_bottom</span>
                    <span>Turno del oponente - Espera tu turno</span>
                `
                statusElement.classList.add('waiting-turn')
                statusElement.classList.remove('active-turn')
            }
        }
    }

    private showNotification(
        type: 'error' | 'warning' | 'info' | 'success',
        message: string
    ): void {
        // Crear elemento de notificación
        const notification = document.createElement('div')
        notification.className = `notification notification-${type}`

        // Añadir icono apropiado según el tipo
        let icon = ''
        switch (type) {
            case 'error':
                icon = 'error'
                break
            case 'warning':
                icon = 'warning'
                break
            case 'success':
                icon = 'check_circle'
                break
            case 'info':
            default:
                icon = 'info'
                break
        }

        notification.innerHTML = `
            <span class="material-icons">${icon}</span>
            <span>${message}</span>
            <span class="material-icons close-notification">close</span>
        `

        // Añadir al DOM
        document.body.appendChild(notification)

        // Mostrar con animación
        setTimeout(() => {
            notification.classList.add('show')
        }, 10)

        // Configurar cierre de notificación
        const closeButton = notification.querySelector('.close-notification')
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.classList.remove('show')
                setTimeout(() => {
                    document.body.removeChild(notification)
                }, 300)
            })
        }

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.remove('show')
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification)
                    }
                }, 300)
            }
        }, 5000)
    }

    private showGameEndDialog(winner: Player): void {
        // Crear overlay para diálogo modal
        const overlay = document.createElement('div')
        overlay.className = 'modal-overlay'

        // Crear diálogo modal
        const dialog = document.createElement('div')
        dialog.className = 'modal-dialog'

        const isWinner = winner.id === this.socket.id

        dialog.innerHTML = `
            <div class="modal-header">
                <h3>${isWinner ? '¡Victoria!' : 'Has perdido'}</h3>
            </div>
            <div class="modal-content">
                <div class="result-icon">
                    <span class="material-icons" style="font-size: 48px; color: ${
                        isWinner ? 'var(--success-color)' : 'var(--error-color)'
                    }">
                        ${isWinner ? 'emoji_events' : 'sentiment_very_dissatisfied'}
                    </span>
                </div>
                <p>${isWinner ? '¡Has ganado la partida!' : `El ganador es: ${winner.name}`}</p>
            </div>
            <div class="modal-footer">
                <button id="return-to-lobby" class="mui-button mui-button-primary">
                    <span class="material-icons">home</span>
                    Volver al lobby
                </button>
            </div>
        `

        // Añadir al DOM
        overlay.appendChild(dialog)
        document.body.appendChild(overlay)

        // Mostrar con animación
        setTimeout(() => {
            overlay.classList.add('show')
            dialog.classList.add('show')
        }, 10)

        // Configurar botón para volver al lobby
        document.getElementById('return-to-lobby')?.addEventListener('click', () => {
            overlay.classList.remove('show')
            dialog.classList.remove('show')
            setTimeout(() => {
                document.body.removeChild(overlay)
                this.showSetupScreen()
            }, 300)
        })
    }
}

// Inicializar el juego cuando la página esté cargada
window.addEventListener('DOMContentLoaded', () => {
    new BattleshipGame()
})
