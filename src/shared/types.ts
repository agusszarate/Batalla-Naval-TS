// Tipos compartidos entre cliente y servidor

export interface Player {
    id: string
    name: string
    ready: boolean
}

export interface Ship {
    id: number
    name: string
    size: number
    placed: boolean
}

export interface Coordinate {
    x: number
    y: number
}

export interface ShipPlacement {
    shipId: number
    startX: number
    startY: number
    orientation: 'horizontal' | 'vertical'
}

export interface GameRoom {
    code: string
    players: Player[]
    status: 'waiting' | 'playing' | 'finished'
}

export interface GameState {
    playerBoard: number[][] // 0: vacío, 1: barco, 2: impacto, 3: agua
    enemyBoard: number[][] // 0: desconocido, 2: impacto, 3: agua
    currentTurn: string // ID del jugador actual
    winner?: string // ID del ganador (si hay uno)
}

export interface AttackResult {
    x: number
    y: number
    hit: boolean // true si golpeó un barco, false si agua
    sunk?: Ship // barco hundido, si corresponde
    gameOver?: boolean // true si el juego ha terminado
}
