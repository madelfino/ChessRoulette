var express = require("express"),
    UUID = require("node-uuid"),
    app = express(),
    port = 3000,
    counter = 0,
    server = { games : {}, numGames: 0 },
    helpMessage = 'List of commands:<br /><br />/help - Display this message<br />/newgame - Find a new opponent';

app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

app.get("/", function(req, res) {
    res.render("page");
});

app.use(express.static(__dirname + '/public', {maxAge: 864000 }));

var io = require('socket.io').listen(app.listen(port));
console.log("Listening on port " + port);

io.sockets.on('connection', function(client) {
    counter++;
    client.userid = UUID();
    client.emit('init', { id: client.userid, num: counter });
    client.emit('message', { message: "Welcome to Chess Roulette!" });
    client.emit('message', { message: "Type '/help' to see list of commands." });
    server.findGame(client);
    client.on('disconnect', function() {
        if (client.game && client.game.id) {
            server.endGame(client.game.id, client.userid);
        }
    });
    client.on('send', function(data) {
        switch (data.message) { 
            case '/help':
                client.emit('message', { message: helpMessage, clientid: client.userid });
                break;
            case '/newgame':
                server.endGame(client.game.id, client.userid);
                break;
            default:
                io.sockets.emit('message', data);
        }
    });
    client.on('move', function(data) {
        io.sockets.emit('setposition', data );
    });
    client.on('newgame', function() {
        server.findGame(client);
    });
});

server.createGame = function(player) {
    var game = {
        id : UUID(),
        players : [player],
        numPlayers : 1
    }
    player.game = game;
    player.emit('setcolor', { color: 'w' });
    player.emit('message', { message: 'You are playing as white.' });
    player.emit('message', { message: 'Waiting on opponent...' });
    player.emit('setgameid', { gameid: game.id });
    game.players[0].color = 'w';
    this.games[game.id] = game;
    this.numGames++;
}; //createGame

server.endGame = function(gameid, playerid) {
    var game = this.games[gameid];
    if (game) {
        io.sockets.emit('messgae', { message: 'Game ended', clientid: playerid });
        io.sockets.emit('endGame', { id: gameid });
        delete this.games[gameid];
        this.numGames--;
    } else {
        console.log('Game ' + gameid + ' not found!');
    }
}; //endGame

server.startGame = function(game) {
    io.sockets.emit('startGame', { id: game.id });
}

server.findGame = function(player) {
    console.log('Looking for game.  There are ' + this.numGames + ' total games.');
    player.emit('message', { message: 'Looking for open game', clientid: player.userid });
    if (this.numGames) {
        var joined_game = false;
        for (var gameid in this.games) {
            var game = this.games[gameid];
            if (game.numPlayers < 2) {
                joined_game = true;
                game.numPlayers++;
                player.game = game;
                player.emit('setcolor', { color: 'b' });
                player.emit('message', { message: 'You are playing as black.', clientid: player.userid });
                player.emit('setgameid', { gameid: game.id });
                io.sockets.emit('message', { message: 'Opponent found!', gameid: game.id });
                game.players.push(player);
                this.startGame(game)
            }
        }
        if (!joined_game) {
            player.emit('message', { message: 'No open games found, creating new game...', clientid: player.userid });
            this.createGame(player);
        }
    } else {
        player.emit('message', { message: 'No games found, creating new game...', clientid: player.userid });
        this.createGame(player);
    }
}; //findGame
