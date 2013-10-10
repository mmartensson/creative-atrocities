'use strict';

/*global io:false */

var qrSize;

(function() {
    var w=window.innerWidth;
    var h=window.innerHeight;
    qrSize = Math.min(400, Math.min(w/2, h/2));

    $('#qr').width(qrSize).height(qrSize);
})();

function displayLoginURL(login) {
    $('#qr-cleartext')
       .html('Scan barcode or enter <a href="' + login + '">' +
           login + '</a> directly into browser of player phone')
       .show('fast');

    $('#qr').empty().qrcode({
        // render method: `'canvas'`, `'image'` or `'div'`
        render: 'canvas',

        // error correction level: `'L'`, `'M'`, `'Q'` or `'H'`
        ecLevel: 'H',

        // size in pixel
        size: qrSize,

        // code color or image element
        fill: '#000',

        // background color or image element, `null` for transparent background
        background: null,

        // content
        text: login,

        // corner radius relative to module width: 0.0 .. 0.5
        radius: 0.3,

        // quiet zone in modules
        quiet: 1,

        // modes
        // 0: normal
        // 1: label strip
        // 2: label box
        // 3: image strip
        // 4: image box
        mode: 2,

        label: 'Login',
        fontname: 'Helvetica Neue,Roboto,sans',
        fontcolor: '#FF9818',
    });
}

$(document).on('ready', function() {
    var socket = io.connect();

    var blackCards = [];
    var whiteCards = [];
    var gameId;
    var players = {}; // playerId => { playerName, score }

    socket.on('welcome', function (data) {
        console.log('Welcome', data);

        var sets = [ data.sets[0].id ];
        socket.emit('create game', { sets: sets });
    });

    socket.on('game created', function (data) {
        console.log('Created', data);

        blackCards = data.blackCards;
        whiteCards = data.whiteCards;
        gameId = data.gameId;

        var login = document.location;
        login += 'player.html?g=' + gameId;
        displayLoginURL(login);
    });

    socket.on('player joined', function (data) {
        console.log('Player joined', data);

        var cards = whiteCards.splice(-10,10);
        socket.emit('relay', data.playerId, 'game joined', { cards: cards });

        $('<tr><td>' + data.playerName + '</td></tr>').appendTo('#players > tbody');

        players[data.playerId] = { playerName: data.playerName, score: 0 };
    });

    $('#start-btn').click(function() {
        var blackCard;

        // Not yet supporting black cards that prompt extra white cards to be drawn
        do {
            blackCard = blackCards.pop();
        } while (blackCard.draw);

        console.log('Starting new round with black card: ' + blackCard.text);

        $.each(players, function (playerId, player) {
            // TODO: Add extra cards here if black card specifies
            socket.emit('relay', playerId, 'next round', { blackCard: blackCard });
            console.log('Sent card information to player ' + player.playerName);
        });
    });
});
