import { GameRoom, Player, ShipPlacement, AttackResult, GameState } from '../shared/types'

// Clase para gestionar las partidas del juego
export class GameManager {
    private rooms: Map<string, GameRoom> = new Map()
    private playerRooms: Map<string, string> = new Map() // Mapeo de playerId a roomCode
    private gameBoards: Map<string, Map<string, number[][]>> = new Map() // roomCode -> playerId -> tablero
    private playerShips: Map<string, Map<string, Set<number>>> = new Map() // roomCode -> playerId -> conjunto de ids de barcos colocados
    private shipCells: Map<string, Map<string, Map<number, Set<string>>>> = new Map() // roomCode -> playerId -> shipId -> conjunto de celdas
    private currentTurnMap: Map<string, string> = new Map() // roomCode -> playerId del jugador actual

    // Crear una nueva sala
    public createRoom(playerId: string, playerName: string): string {
        const roomCode = this.generateRoomCode()
        const player: Player = { id: playerId, name: playerName, ready: false }

        const room: GameRoom = {
            code: roomCode,
            players: [player],
            status: 'waiting',
        }

        this.rooms.set(roomCode, room)
        this.playerRooms.set(playerId, roomCode)

        return roomCode
    }

    // Unirse a una sala existente
    public joinRoom(playerId: string, playerName: string, roomCode: string): GameRoom {
        const room = this.rooms.get(roomCode)

        if (!room) {
            throw new Error('La sala no existe')
        }

        if (room.status !== 'waiting') {
            throw new Error('La partida ya ha comenzado')
        }

        if (room.players.length >= 2) {
            throw new Error('La sala está llena')
        }

        const player: Player = { id: playerId, name: playerName, ready: false }
        room.players.push(player)
        this.playerRooms.set(playerId, roomCode)

        return room
    }

    // Eliminar jugador de una sala
    public removePlayerFromRoom(playerId: string, roomCode: string): GameRoom | null {
        const room = this.rooms.get(roomCode)

        if (!room) return null

        room.players = room.players.filter((player) => player.id !== playerId)
        this.playerRooms.delete(playerId)

        // Si no quedan jugadores, eliminar la sala
        if (room.players.length === 0) {
            this.rooms.delete(roomCode)
            this.gameBoards.delete(roomCode)
            this.playerShips.delete(roomCode)
            this.shipCells.delete(roomCode)
            this.currentTurnMap.delete(roomCode)
            return null
        }

        return room
    }

    // Obtener el código de sala de un jugador
    public getPlayerRoom(playerId: string): string | undefined {
        return this.playerRooms.get(playerId)
    }

    // Obtener jugador por id
    public getPlayer(playerId: string): Player | null {
        const roomCode = this.playerRooms.get(playerId)
        if (!roomCode) return null

        const room = this.rooms.get(roomCode)
        if (!room) return null

        const player = room.players.find((p) => p.id === playerId)
        return player || null
    }

    // Obtener todas las IDs de jugadores en una sala
    public getPlayerIds(roomCode: string): string[] {
        const room = this.rooms.get(roomCode)
        if (!room) return []

        return room.players.map((player) => player.id)
    }

    // Iniciar el juego en la sala
    public startGame(roomCode: string): boolean {
        const room = this.rooms.get(roomCode)

        if (!room) {
            throw new Error('La sala no existe')
        }

        if (room.players.length < 2) {
            throw new Error('Se necesitan al menos 2 jugadores para comenzar')
        }

        if (room.status !== 'waiting') {
            throw new Error('El juego ya ha comenzado')
        }

        room.status = 'playing'

        // Inicializar tableros para todos los jugadores
        this.initializeGameBoards(roomCode)

        // Establecer el primer turno aleatoriamente
        const randomPlayerIndex = Math.floor(Math.random() * room.players.length)
        this.currentTurnMap.set(roomCode, room.players[randomPlayerIndex].id)

        return true
    }

    // Inicializar los tableros de juego
    private initializeGameBoards(roomCode: string): void {
        const room = this.rooms.get(roomCode)
        if (!room) return

        // Crear tableros vacíos (10x10)
        const boards = new Map<string, number[][]>()
        const playerShips = new Map<string, Set<number>>()
        const shipCells = new Map<string, Map<number, Set<string>>>()

        room.players.forEach((player) => {
            // Tablero inicial con todas las celdas vacías (0)
            const board: number[][] = Array(10)
                .fill(0)
                .map(() => Array(10).fill(0))
            boards.set(player.id, board)

            // Inicializar el conjunto de barcos colocados (vacío)
            playerShips.set(player.id, new Set<number>())

            // Inicializar el mapa de celdas de barcos
            shipCells.set(player.id, new Map<number, Set<string>>())
        })

        this.gameBoards.set(roomCode, boards)
        this.playerShips.set(roomCode, playerShips)
        this.shipCells.set(roomCode, shipCells)
    }

    // Colocar un barco en el tablero
    public placeShip(playerId: string, roomCode: string, placement: ShipPlacement): boolean {
        const room = this.rooms.get(roomCode)
        if (!room || room.status !== 'playing') return false

        const boards = this.gameBoards.get(roomCode)
        if (!boards) return false

        const board = boards.get(playerId)
        if (!board) return false

        // Validar la colocación del barco
        const { shipId, startX, startY, orientation } = placement
        let shipSize: number

        // Determinar el tamaño del barco según su ID
        switch (shipId) {
            case 1: // Portaaviones
                shipSize = 5
                break
            case 2: // Acorazado
                shipSize = 4
                break
            case 3: // Crucero
            case 4: // Submarino
                shipSize = 3
                break
            case 5: // Destructor
                shipSize = 2
                break
            default:
                return false
        }

        // Verificar que el barco no se salga del tablero
        if (orientation === 'horizontal') {
            if (startX + shipSize > 10) return false
        } else {
            // vertical
            if (startY + shipSize > 10) return false
        }

        // Verificar que no haya otro barco en esa posición
        for (let i = 0; i < shipSize; i++) {
            const x = orientation === 'horizontal' ? startX + i : startX
            const y = orientation === 'vertical' ? startY + i : startY

            if (board[y][x] !== 0) {
                return false // Ya hay un barco en esta posición
            }
        }

        // Colocar el barco
        const playerShips = this.playerShips.get(roomCode)
        if (!playerShips) return false

        const playerShipSet = playerShips.get(playerId)
        if (!playerShipSet) return false

        // Verificar que el barco no haya sido colocado ya
        if (playerShipSet.has(shipId)) {
            return false
        }

        // Registrar el barco como colocado
        playerShipSet.add(shipId)

        // Guardar las celdas que ocupa el barco
        const roomShipCells = this.shipCells.get(roomCode)
        if (!roomShipCells) return false

        const playerShipCells = roomShipCells.get(playerId)
        if (!playerShipCells) return false

        const shipCellsSet = new Set<string>()

        // Colocar el barco en el tablero
        for (let i = 0; i < shipSize; i++) {
            const x = orientation === 'horizontal' ? startX + i : startX
            const y = orientation === 'vertical' ? startY + i : startY

            board[y][x] = 1 // Marcar como celda con barco
            shipCellsSet.add(`${x},${y}`)
        }

        playerShipCells.set(shipId, shipCellsSet)

        return true
    }

    // Marcar jugador como listo
    public setPlayerReady(playerId: string, roomCode: string): boolean {
        const room = this.rooms.get(roomCode)
        if (!room) return false

        const player = room.players.find((p) => p.id === playerId)
        if (!player) return false

        player.ready = true

        // Verificar si todos los jugadores están listos
        return room.players.every((p) => p.ready)
    }

    // Procesar un ataque
    public processAttack(
        playerId: string,
        roomCode: string,
        coordinate: { x: number; y: number }
    ): AttackResult {
        const room = this.rooms.get(roomCode)
        if (!room || room.status !== 'playing') {
            throw new Error('El juego no está en curso')
        }

        // Verificar si es el turno del jugador
        const currentTurn = this.currentTurnMap.get(roomCode)
        if (currentTurn !== playerId) {
            throw new Error('No es tu turno')
        }

        // Obtener el ID del oponente
        const opponentId = room.players.find((p) => p.id !== playerId)?.id
        if (!opponentId) {
            throw new Error('No hay oponente')
        }

        // Obtener el tablero del oponente
        const boards = this.gameBoards.get(roomCode)
        if (!boards) throw new Error('Error de inicialización de tableros')

        const opponentBoard = boards.get(opponentId)
        if (!opponentBoard) throw new Error('Error de inicialización de tableros')

        const { x, y } = coordinate

        // Validar coordenadas
        if (x < 0 || x >= 10 || y < 0 || y >= 10) {
            throw new Error('Coordenadas inválidas')
        }

        // Verificar si ya se ha atacado esta celda
        if (opponentBoard[y][x] === 2 || opponentBoard[y][x] === 3) {
            throw new Error('Esta celda ya ha sido atacada')
        }

        const result: AttackResult = {
            x,
            y,
            hit: false,
            gameOver: false,
        }

        // Determinar el resultado del ataque
        if (opponentBoard[y][x] === 1) {
            // Impacto en un barco
            opponentBoard[y][x] = 2 // Marcar como impacto
            result.hit = true

            // Verificar si se ha hundido un barco
            const roomShipCells = this.shipCells.get(roomCode)
            if (roomShipCells) {
                const opponentShipCells = roomShipCells.get(opponentId)
                if (opponentShipCells) {
                    // Buscar a qué barco pertenece esta celda
                    for (const [shipId, cells] of opponentShipCells.entries()) {
                        if (cells.has(`${x},${y}`)) {
                            // Verificar si todas las celdas del barco han sido impactadas
                            const allHit = Array.from(cells).every((cellCoord) => {
                                const [cellX, cellY] = cellCoord.split(',').map(Number)
                                return opponentBoard[cellY][cellX] === 2
                            })

                            if (allHit) {
                                // El barco ha sido hundido
                                result.sunk = {
                                    id: shipId,
                                    name: this.getShipName(shipId),
                                    size: cells.size,
                                    placed: true,
                                }

                                // Verificar si el jugador ganó (todos los barcos del oponente hundidos)
                                const playerShips = this.playerShips.get(roomCode)?.get(opponentId)
                                if (playerShips) {
                                    const allSunk = Array.from(playerShips).every((shipId) => {
                                        const shipCells = opponentShipCells.get(shipId)
                                        if (!shipCells) return false

                                        return Array.from(shipCells).every((cellCoord) => {
                                            const [cellX, cellY] = cellCoord.split(',').map(Number)
                                            return opponentBoard[cellY][cellX] === 2
                                        })
                                    })

                                    if (allSunk) {
                                        result.gameOver = true
                                    }
                                }
                            }

                            break
                        }
                    }
                }
            }
        } else {
            // Agua
            opponentBoard[y][x] = 3 // Marcar como agua
        }

        // Cambiar el turno al oponente (a menos que haya terminado el juego)
        if (!result.gameOver) {
            this.currentTurnMap.set(roomCode, opponentId)
        }

        return result
    }

    // Obtener el estado actual del juego para un jugador
    public getPlayerGameState(playerId: string, roomCode: string): GameState | null {
        const room = this.rooms.get(roomCode)
        if (!room || room.status !== 'playing') return null

        // Obtener el ID del oponente
        const opponentId = room.players.find((p) => p.id !== playerId)?.id
        if (!opponentId) return null

        const boards = this.gameBoards.get(roomCode)
        if (!boards) return null

        const playerBoard = boards.get(playerId)
        const opponentBoard = boards.get(opponentId)

        if (!playerBoard || !opponentBoard) return null

        // Crear una copia del tablero del oponente con información limitada
        const enemyBoard: number[][] = Array(10)
            .fill(0)
            .map(() => Array(10).fill(0))

        // Solo mostrar impactos y agua en el tablero enemigo
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                if (opponentBoard[y][x] === 2) {
                    enemyBoard[y][x] = 2 // Impacto
                } else if (opponentBoard[y][x] === 3) {
                    enemyBoard[y][x] = 3 // Agua
                }
            }
        }

        // Determinar de quién es el turno
        const currentTurn = this.currentTurnMap.get(roomCode) || room.players[0].id

        return {
            playerBoard,
            enemyBoard,
            currentTurn,
        }
    }

    // Finalizar un juego
    public endGame(roomCode: string): void {
        const room = this.rooms.get(roomCode)
        if (!room) return

        room.status = 'finished'
        this.currentTurnMap.delete(roomCode)
    }

    // Generar un código de sala aleatorio
    private generateRoomCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''

        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length)
            code += chars.charAt(randomIndex)
        }

        // Asegurarse de que el código sea único
        if (this.rooms.has(code)) {
            return this.generateRoomCode()
        }

        return code
    }

    // Obtener el nombre de un barco según su ID
    private getShipName(shipId: number): string {
        switch (shipId) {
            case 1:
                return 'Portaaviones'
            case 2:
                return 'Acorazado'
            case 3:
                return 'Crucero'
            case 4:
                return 'Submarino'
            case 5:
                return 'Destructor'
            default:
                return 'Barco desconocido'
        }
    }
}
