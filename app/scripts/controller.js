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
    var players = {}; // playerId => { playerName, cards, played, score }
    var playedCards = [];
    var activeBlackCard;

    var updateScoreBoard = function() {
        $('#scoreboard-tbl tbody').remove();

        $.each(players, function (playerId, player) {
            $('#scoreboard-tbl').append('<tr> <td>' +
                (player.played ? '<span class="ui-icon ui-icon-check ready">&nbsp;</span>' : '&nbsp;') +
                '</td><td>' + player.playerName + '</td><td>' + player.score + '</td></tr>');
        });
    };

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
        socket.emit('to player', data.playerId, 'game joined', { cards: cards });

        $('<tr><td>' + data.playerName + '</td></tr>').appendTo('#players > tbody');

        players[data.playerId] = { playerName: data.playerName, score: 0, cards: cards };
        updateScoreBoard();
    });

    $('#start-btn').click(function() {
        // Not yet supporting black cards that prompt extra white cards to be drawn
        do {
            activeBlackCard = blackCards.pop();
        } while (activeBlackCard.draw);

        console.log('Starting new round with black card: ' + activeBlackCard.text);
        playedCards = [];

        $.each(players, function (playerId, player) {
            player.played = false;
            // TODO: Add extra cards here if black card specifies
            socket.emit('to player', playerId, 'next round', { blackCard: activeBlackCard });
            console.log('Sent card information to player ' + player.playerName);
        });

        updateScoreBoard();
    });

    socket.on('cards played', function (data) {
        console.log('Cards played', data);

        var pick = activeBlackCard.pick;
        var playerId = data.__identity.playerId;
        var player = players[playerId];
        if (!player) {
            console.log('ERROR: Cards played by unknown player "' + playerId + '".');
            return;
        }

        if (data.cards.length < pick) {
            // In the event of an unlikely bug
            socket.emit('to player', playerId, 'error', 'Expected ' + pick + 'cards, received ' + data.cards.length);
            return;
        }

        var removed = 0;
        player.cards = $.grep(player.cards, function(card) {
            if ($.inArray(card.id, data.cards) === -1) {
                return true;
            } else {
                removed++;
                return false;
            }
        });
        if (removed < pick) {
            // In the event of an unlikely bug or a cheating attempt
            socket.emit('to player', playerId, 'error', 'Card played that was not in the hand of the player.');
            return;
        }

        var replacementCards = whiteCards.splice(-pick,pick);
        // FIXME: Error checking; replacementCards.length < pick is possible here
        player.cards = player.cards.concat(replacementCards);

        socket.emit('to player', playerId, 'cards approved', { cards: player.cards });
        
        player.played = true;
        playedCards.push(data);
        updateScoreBoard();

        // FIXME: Check if that was all, in which case the Czar should be prompted to select a winner
    });
});
