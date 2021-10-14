const io = require('socket.io')({
    cors: {
        origin: "*"
    }
});

const {FRAME_RATE} = require ('./constants');
const {gameLoop, getUpdatedVelocity, initGame} = require('./game');
const {makeid} = require('./utils');

const state = {};
const clientRooms = {};


io.on('connection', client => {
    client.on('keydown', handleKeydown);
    client.on('keyup', handleKeyUp);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);

    function handleJoinGame(roomName){
        const room = io.sockets.adapter.rooms[roomName];
        

        let allUsers;
        if (room){
            allUsers = room.sockets;
        }

        let numClients = 0;
        if (allUsers){
            numClients = Object.keys(allUsers).length;
        }
        

        if (numClients === 1) {
            client.emit('unknownGame');
            return;
        } else if (numClients > 1) {
            client.emit('tooManyPlayers');
            return;
        }

        clientRooms[client.id] = roomName;

        client.join(roomName);
        client.number = 2;
        client.emit('init', 2);

        startGameInterval(roomName);
        console.log('game has started');
    }

    function handleNewGame() {
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        state[roomName] = initGame();

        client.join(roomName);
        client.number = 1;
        client.emit('init',1);
    }

    function handleKeydown(keyCode){
        const roomName = clientRooms[client.id];

        if (!roomName){
            return;
        }

        try {
            keyCode = parseInt(keyCode);
        } catch(e){
            console.error(e);
            return;
        }
        const vel = getUpdatedVelocity(keyCode);

        if (vel) {
            state[roomName].players[client.number - 1].vel = vel;
        }
    }

    function handleKeyUp(keyCode){
        const roomName = clientRooms[client.id];
        if (!roomName){
            return;
        }

        try {
            keyCode = parseInt(keyCode);
        } catch(e){
            console.error(e);
            return;
        }
        const negateVel =getUpdatedVelocity(0);
        if (negateVel) {
            state[roomName].players[client.number - 1].vel = negateVel;
        }
    }
});

function startGameInterval (roomName){
    const intervalId = setInterval(() => {
        const winner = gameLoop(state[roomName]);

        if (!winner){
            emitGameState(roomName, state[roomName]);
            //client.emit('gameState', JSON.stringify(state));
        } else {
            emitGameOver(roomName, winner);
            state[roomName] = null;
            clearInterval(intervalId);
            console.log('game has ended');
        }
    }, 1000/FRAME_RATE);
}

function emitGameState(room, gameState) {
    io.sockets.in(room)
    .emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner){
    io.sockets.in(room)
    .emit('gameOver', JSON.stringify({winner}));
}

io.listen(3000);