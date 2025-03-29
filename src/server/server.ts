import express from 'express'
import http from 'http'
import path from 'path'
import { Server, Socket } from 'socket.io'
import { GameRoom, Player, ShipPlacement, GameState, AttackResult } from '../shared/types'
import { GameManager } from './game-manager'

// Configurar servidor express
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})

// Servir archivos estáticos
const clientPath = path.join(__dirname, '../client')
app.use(express.static(clientPath))

// Ruta API de verificación
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' })
})

// Servir index.html para todas las rutas que no son API ni archivos estáticos
// Esto es necesario para aplicaciones SPA en Vercel
app.get('*', (req, res) => {
    // Excluir rutas de API y socket.io
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/socket.io/')) {
        res.sendFile(path.join(clientPath, 'index.html'))
    }
})

// Puerto del servidor
const PORT = process.env.PORT || 3000

// Gestor de juegos
const gameManager = new GameManager()

// Conexiones de socket
io.on('connection', (socket: Socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`)

    // Crear sala de juego
    socket.on('create-room', (data: { playerName: string }) => {
        const roomCode = gameManager.createRoom(socket.id, data.playerName)
        socket.join(roomCode)
        socket.emit('room-created', { roomCode })
        console.log(`Sala creada: ${roomCode} por ${data.playerName}`)
    })

    // Unirse a sala de juego
    socket.on('join-room', (data: { playerName: string; roomCode: string }) => {
        try {
            const room = gameManager.joinRoom(socket.id, data.playerName, data.roomCode)
            socket.join(data.roomCode)
            socket.emit('room-joined', room)
            socket.to(data.roomCode).emit('player-joined', room.players)
            console.log(`${data.playerName} se unió a la sala ${data.roomCode}`)
        } catch (error) {
            socket.emit('error', (error as Error).message)
        }
    })

    // Salir de la sala
    socket.on('leave-room', () => {
        const roomCode = gameManager.getPlayerRoom(socket.id)
        if (roomCode) {
            socket.leave(roomCode)
            const room = gameManager.removePlayerFromRoom(socket.id, roomCode)
            if (room) {
                socket.to(roomCode).emit('player-left', room.players)
                console.log(`Jugador ${socket.id} salió de la sala ${roomCode}`)
            }
        }
    })

    // Iniciar juego
    socket.on('start-game', (data: { roomCode: string }) => {
        try {
            const { roomCode } = data
            if (gameManager.startGame(roomCode)) {
                io.to(roomCode).emit('game-started')
                console.log(`Juego iniciado en la sala ${roomCode}`)
            }
        } catch (error) {
            socket.emit('error', (error as Error).message)
        }
    })

    // Colocar barco
    socket.on('place-ship', (placement: ShipPlacement) => {
        try {
            const roomCode = gameManager.getPlayerRoom(socket.id)
            if (roomCode) {
                gameManager.placeShip(socket.id, roomCode, placement)
                // Enviamos actualización del estado del juego
                const gameState = gameManager.getPlayerGameState(socket.id, roomCode)
                if (gameState) {
                    socket.emit('game-update', gameState)
                }
            }
        } catch (error) {
            socket.emit('error', (error as Error).message)
        }
    })

    // Jugador listo
    socket.on('player-ready', () => {
        try {
            const roomCode = gameManager.getPlayerRoom(socket.id)
            if (roomCode) {
                const allReady = gameManager.setPlayerReady(socket.id, roomCode)
                if (allReady) {
                    // Todos los jugadores están listos, comenzamos la partida real
                    io.to(roomCode).emit('all-players-ready')

                    // Actualizar estado para todos los jugadores
                    const playerIds = gameManager.getPlayerIds(roomCode)
                    playerIds.forEach((playerId: string) => {
                        const gameState: GameState | null = gameManager.getPlayerGameState(
                            playerId,
                            roomCode
                        )
                        if (gameState) {
                            io.to(playerId).emit('game-update', gameState)
                        }
                    })
                }
            }
        } catch (error) {
            socket.emit('error', (error as Error).message)
        }
    })

    // Realizar ataque
    socket.on('attack', (coordinate: { x: number; y: number }) => {
        try {
            const roomCode = gameManager.getPlayerRoom(socket.id)
            if (!roomCode) return

            const result = gameManager.processAttack(socket.id, roomCode, coordinate)

            // Actualizar estados para ambos jugadores
            const playerIds = gameManager.getPlayerIds(roomCode)
            playerIds.forEach((playerId: string) => {
                const gameState: GameState | null = gameManager.getPlayerGameState(
                    playerId,
                    roomCode
                )
                if (gameState) {
                    io.to(playerId).emit('game-update', gameState)
                }
            })

            // Verificar si el juego ha terminado
            if (result.gameOver) {
                const winner = gameManager.getPlayer(socket.id)
                io.to(roomCode).emit('game-over', winner)
                gameManager.endGame(roomCode)
            }
        } catch (error) {
            socket.emit('error', (error as Error).message)
        }
    })

    // Desconexión
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`)
        const roomCode = gameManager.getPlayerRoom(socket.id)
        if (roomCode) {
            const room = gameManager.removePlayerFromRoom(socket.id, roomCode)
            if (room) {
                socket.to(roomCode).emit('player-left', room.players)
                console.log(`Jugador ${socket.id} eliminado de la sala ${roomCode}`)
            }
        }
    })
})

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`)
})

// Exportar para serverless
export { app, server }
