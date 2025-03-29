# Batalla Naval - Juego multijugador

Un juego de Batalla Naval (Battleship) multijugador implementado con TypeScript, Socket.IO y Express.

## Características

-   Interfaz de usuario intuitiva para colocar barcos y jugar
-   Sistema de salas para partidas privadas
-   Comunicación en tiempo real mediante Socket.IO
-   Implementado completamente en TypeScript

## Barcos disponibles

-   Portaaviones (5 casillas)
-   Acorazado (4 casillas)
-   Crucero (3 casillas)
-   Submarino (3 casillas)
-   Destructor (2 casillas)

## Requisitos

-   Node.js (v14 o superior)
-   npm

## Instalación

1. Clona el repositorio:

```bash
git clone <url-del-repositorio>
cd batalla-naval-ts
```

2. Instala las dependencias:

```bash
npm install
```

## Ejecución

Para ejecutar el juego en modo desarrollo:

```bash
npm run dev
```

Para construir y ejecutar en producción:

```bash
npm run build
npm start
```

El servidor estará disponible en http://localhost:3000

## Cómo jugar

1. Abre la aplicación en tu navegador
2. Introduce tu nombre y crea una nueva sala o únete a una existente con un código
3. Cuando haya dos jugadores, inicia la partida
4. Coloca tus barcos en el tablero (puedes usar el botón "Rotar barco" para cambiar la orientación)
5. Ataca el tablero enemigo por turnos
6. El primer jugador en hundir todos los barcos del oponente gana

## Estructura del proyecto

```
├── src/
│   ├── client/          # Código cliente
│   │   ├── public/      # Archivos estáticos (HTML, CSS)
│   │   └── index.ts     # Punto de entrada del cliente
│   ├── server/          # Código servidor
│   │   ├── server.ts    # Configuración del servidor Express y Socket.IO
│   │   └── game-manager.ts  # Lógica del juego
│   └── shared/          # Código compartido
│       └── types.ts     # Interfaces y tipos compartidos
├── dist/                # Código compilado (generado)
├── package.json
└── tsconfig.json
```
