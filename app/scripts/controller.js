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

        msize: 6,

        label: 'Creative Atrocities',
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
    var playerOrder = []; // playerId keys into players
    var playedCards = [];
    var activeBlackCard;
    var currentCzar = -1; // index into playerOrder

    var updateScoreBoard = function() {
        $('#scoreboard-tbl tbody').remove();

        for (var i=0; i<playerOrder.length; i++) {
            var playerId = playerOrder[i];
            var player = players[playerId];

            $('#scoreboard-tbl').append('<tr> <td>' +
                (player.played ? '<span class="ui-icon ui-icon-check ready">&nbsp;</span>' : '&nbsp;') +
                '</td><td>' + player.playerName + '</td><td>' + player.score + '</td></tr>');
        }
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
        playerOrder.push(data.playerId);
        updateScoreBoard();
    });

    var startNextRound = function() {
        $.mobile.changePage('#scoreboard', { transition: 'flip' });

        // Not yet supporting black cards that prompt extra white cards to be drawn
        do {
            activeBlackCard = blackCards.pop();
        } while (activeBlackCard.draw);

        console.log('Starting new round with black card: ' + activeBlackCard.text);
        playedCards = [];

        if (++currentCzar >= playerOrder.length) {
            currentCzar = 0;
        }

        $.each(players, function (playerId, player) {
            if (playerId === playerOrder[currentCzar]) {
                socket.emit('to player', playerId, 'next czar', { blackCard: activeBlackCard });
                console.log('Sent card information to player ' + player.playerName + ' (new czar)');
                player.played = true;
            } else {
                // TODO: Add extra cards here if black card specifies
                socket.emit('to player', playerId, 'next round', { blackCard: activeBlackCard });
                console.log('Sent card information to player ' + player.playerName);
                player.played = false;
            }
        });

        updateScoreBoard();
    };
    $('#start-btn').click(startNextRound);

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

        var removedCards = [];
        player.cards = $.grep(player.cards, function(card) {
            if ($.inArray(card.id, data.cards) === -1) {
                return true;
            } else {
                removedCards.push(card);
                return false;
            }
        });
        if (removedCards.length < pick) {
            // In the event of an unlikely bug or a cheating attempt
            socket.emit('to player', playerId, 'error', 'Card played that was not in the hand of the player.');
            return;
        }

        var replacementCards = whiteCards.splice(-pick,pick);
        // FIXME: Error checking; replacementCards.length < pick is possible here
        player.cards = player.cards.concat(replacementCards);

        socket.emit('to player', playerId, 'cards approved', { cards: player.cards });
        
        player.played = true;
        data.cards = removedCards;
        playedCards.push(data);
        updateScoreBoard();

        var remainingPlayers = 0;
        $.each(players, function(playerId, player) {
            if (!player.played) {
                remainingPlayers++;
            }
        });

        if (remainingPlayers === 0) {
            var anonymizedCards = [];
            $.each(playedCards, function(i, played) {
                var set = [];
                $.each(played.cards, function(j, card) {
                    set.push(card.text);
                });
                anonymizedCards.push(set);
            });
            socket.emit('to player', playerOrder[currentCzar], 'decision time', { cards: anonymizedCards });

            $('#candidates-container').empty();
            $.mobile.changePage('#candidates', { transition: 'flip' });
        }
    });

    $('#candidates').on('pageshow', function() {
        $.each(playedCards, function(i, played) {
            console.log('Candidate', played);

            var cards = ['<div data-theme="a" class="ui-corner-all ui-content ui-bar-a ui-shadow">' + activeBlackCard.text + '</div>'];
            $.each(played.cards, function(j, card) {
                cards.push('<div data-theme="c" class="ui-corner-all ui-content ui-bar-c ui-shadow">' + card.text + '</div>');
            });
            $('#candidates-container').append('<div class="candidate">' + cards.join('') + '</div>');
        });
    });

    socket.on('winner selected', function (index) {
        console.log('Winner selected', index);
        var winningSet = playedCards[index];
        var winningPlayerId = winningSet.__identity.playerId;
        players[winningPlayerId].score++;
        socket.emit('to player', winningPlayerId, 'score updated', players[winningPlayerId].score);
        startNextRound();
    });
});
