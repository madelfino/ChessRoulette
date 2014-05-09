window.onload = function() {

    var messages = [],
        socket = io.connect('http://chesspuzzleoftheday.com:3000'),
        field = document.getElementById("field"),
        sendButton = document.getElementById("send"),
        content = document.getElementById("content"),
        name = document.getElementById("name"),
        id, game_id = '-', color = '-',
        board,
        game = new Chess();

    var onDragStart = function(source, piece, position, orientation) {
        if (game.game_over() === true ||
            (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
            (piece.search(color) === -1)) {
            return false;
        }
    }; //onDragStart

    var onDrop = function(source, target) {
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });
        if (move === null) {
            return 'snapback';
        } else {
            socket.emit('move', { gameid: game_id, newposition: game.fen() });
        }
    }; //onDrop

    var onSnapEnd = function() {
        board.position(game.fen());
    }; //onSnapEnd

    var cfg = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };
    board = new ChessBoard('board', cfg);

    socket.on('init', function(data) {
        id = data.id;
        game_id = data.gameid;
        name.value = 'guest' + pad(data.num, 5);
    });

    socket.on('setcolor', function(data) {
        color = data.color;
        var orient = (color == 'b') ? 'black' : 'white';
        board.orientation(orient);
    });

    socket.on('setposition', function(data) {
        if (data.gameid === game_id) {
            if (game.load(data.newposition)) {
                board.position(game.fen());
            }
        }
    });

    socket.on('setgameid', function(data) {
        game_id = data.gameid;
    });

    socket.on('message', function(data) {
        if(data.message && (data.gameid === game_id)) {
            messages.push(data);
            var html = '';
            for(var i=0; i<messages.length; i++) {
                html += '<b style="color: ' + (messages[i].clientid ? (messages[i].clientid == id ? 'blue' : 'red') : 'black') + ';">' + (messages[i].username ? messages[i].username : 'Server') + ': </b>';
                html += messages[i].message + '<br />';
            }
            content.innerHTML = html;
            content.scrollTop = content.scrollHeight;
        } else {
            console.log("There is a problem: " + data);
        }
    });

    sendButton.onclick = sendMessage = function() {
        if(name.value == "") {
            alert("Please type your name!");
        } else {
            var text = field.value;
            socket.emit('send', { clientid: id, gameid: game_id, message: text, username: name.value });
            field.value = "";
        }
    };
}

function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

$(document).ready(function() {
    $("#field").keyup(function(e) {
        if(e.keyCode == 13) {
            sendMessage();
        }
    });
});
