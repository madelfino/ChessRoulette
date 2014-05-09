window.onload = function() {

    var messages = [];
    var socket = io.connect('http://chesspuzzleoftheday.com:3000');
    var field = document.getElementById("field");
    var sendButton = document.getElementById("send");
    var content = document.getElementById("content");
    var name = document.getElementById("name");
    var cfg = {
        draggable: true,
        position: 'start'
    };
    var board = new ChessBoard('board', cfg);
    var id, game_id;

    socket.on('init', function(data) {
        id = data.id;
        game_id = data.gameid;
        name.value = 'guest' + pad(data.num, 5);
    });

    socket.on('message', function(data) {
        if(data.message && (data.recipient == game_id || data.recipient == id)) {
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
