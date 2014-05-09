var express = require("express"),
    UUID = require("node-uuid"),
    app = express(),
    port = 3000,
    counter = 0,
    server = { games : {}, numGames: 0 };

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
    client.emit('message', { message: 'Welcome to Chess Roulette' });
    server.findGame(client);
    client.on('disconnect', function() {
        if (client.game && client.game.id) {
            server.endGame(client.game.id, client.userid);
        }
    });
    client.on('send', function(data) {
        io.sockets.emit('message', data);
    });
});

server.createGame = function(player) {
    var game = {
        id : UUID(),
        players : [player],
        numPlayers : 1
    }
    game.players[0].color = 'w';
    this.games[game.id] = game;
    this.numGames++;
}; //createGame

server.endGame = function(gameid, playerid) {
    var game = this.games[gameid];
    if (game) {
        io.sockets.emit('endGame', { id: gameid });
        delete this.games[gameid];
        this.numGames--;
    } else {
        console.log('Game ' + gameid + ' not found!');
    }
}; //endGame

server.startGame = function(game) {
    io.sockets.emit('startGame', { id: game.id });
    game.active = true;
}

server.findGame = function(player) {
    console.log('Looking for game.  There are ' + this.numGames + ' total games.');
    io.sockets.emit('message', { message: 'Looking for open game', recipient: player.userid });
    if (this.numGames) {
        var joined_game = false;
        for (var gameid in this.games) {
            var game = this.games[gameid];
            if (game.numPlayers < 2) {
                io.sockets.emit('message', { message: 'Game found!', recipient: player.userid });
                joined_game = true;
                game.numPlayers++;
                player.color = 'b';
                game.players.push(player);
                this.startGame(game)
            }
        }
        if (!joined_game) {
            io.sockets.emit('message', { message: 'No open games found, creating new game...', recipient: player.userid });
            this.createGame(player);
        }
    } else {
        io.sockets.emit('message', { message: 'No games found, creating new game...', recipient: player.userid });
        this.createGame(player);
    }
}; //findGame
