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

    var game = {};

    socket.on('error', function (error) {
        console.error('SocketIO issue: ' + error);
    });

    var updateScoreBoard = function() {
        $('#scoreboard-tbl tbody').remove();

        $.each(game.playerOrder, function(i, p) {
            var player = game.players[p];
            var icon = '&nbsp;';
            if (player.state === 'wait') {
                icon = '<span class="ui-icon ui-icon-check ready">&nbsp;</span>';
            } else if (player.state === 'czar wait') {
                icon = '<span class="ui-icon ui-icon-star ready">&nbsp;</span>';
            }

            $('#scoreboard-tbl').append('<tr> <td class="ui-body-c">' + icon +
                '</td><td class="ui-body-c">' + player.name + '</td><td class="ui-body-c">' +
                player.points + '</td></tr>');
        });

        if (game.lastWinningSet) {
            var set = game.lastWinningSet;
            $('#lastWinner').text(set.playerName);
            var cards = ['<div data-theme="a" class="ui-corner-all ui-content ui-bar-a ui-shadow">' +
                set.blackCard.text + '</div>'];
            $.each(set.cards, function(j, card) {
                cards.push('<div data-theme="c" class="ui-corner-all ui-content ui-bar-c ui-shadow">' +
                    card.text + '</div>');
            });
            $('#lastWinningSet').append('<div class="candidate">' + cards.join('') + '</div>');
        }

        $('#currentBlackCard').html('<div data-theme="a" class="black-card ui-corner-all ui-content ui-bar-a ui-shadow">' + game.activeBlackCard.text + '</div>');
    };

    // Welcome message which is sent to any connecting client before it has chosen a role
    // by creating or joining a game. In the case of the controller, it means we should 
    // perform a setup and request a game to be created.
    socket.on('welcome', function (data) {
        console.log('Welcome', data);

        $.each(data.decks, function(i, deck) {
            $('#decks').append('<input type="checkbox" data-deck="' + deck.id + '" id="deck-cb-' + i + '">' +
                '<label for="deck-cb-' + i + '">' + deck.name + '</label>');
        });
        $('#decks').controlgroup().controlgroup('refresh');
        $('#decks input').checkboxradio().checkboxradio('refresh');
        $.mobile.changePage('#setup', { transition: 'flip' });
    });

    $('#create-btn').click(function() {
        var decks = [];
        $.each($('#decks input'), function(i, cb) {
            if ($(cb).is(':checked')) {
                decks.push($(cb).jqmData('deck'));
            }
        });
        socket.emit('create game', { decks: decks });
    });

    // Called directly after a game has been created, whenever a player jons, and in a reconnect 
    // scenario where invites are not yet finished.
    socket.on('controller state invite', function (data) {
        console.log('State invite', data);
        game = data;

        var u = $.url().attr();
        var login = u.protocol + '://' + u.host + (0 + u.port === 80 ? '' : (':' + u.port)) + u.directory + 'player.html?g=' + game.gameId;

        // Using the icon span to determine if we are still showing the "No players" message (clearing it)
        if ($('#players span').length === 0) {
            $('#players > tbody').empty();
        }

        for (var i=$('#players > tbody > tr').length; i<game.playerOrder.length; i++) {
            var sessionId = game.playerOrder[i];
            var player = game.players[sessionId];
            $('<tr><td class="ui-body-c"><span class="ui-icon ui-icon-check ready">&nbsp;</span></td><td class="ui-body-c">' + player.name + '</td></tr>').appendTo('#players > tbody');
        }

        displayLoginURL(login);
        $.mobile.changePage('#invite', { transition: 'flip' });
    });

    $('#start-btn').click(function() {
        socket.emit('start game');
    });

    socket.on('controller state play', function(data) {
        console.log('State play', data);
        game = data;

        updateScoreBoard();
        $.mobile.changePage('#scoreboard', { transition: 'flip' });
    });

    socket.on('controller state decision', function (data) {
        console.log('State decision', data);
        game = data;

        $('#candidates-container').empty();
        $.mobile.changePage('#candidates', { transition: 'flip' });
    });

    $('#candidates').on('pageshow', function() {
        var candidates = game.players[game.playerOrder[game.czarIndex]].candidates;
        $.each(candidates, function(i, played) {
            var cards = ['<div data-theme="a" class="ui-corner-all ui-content ui-bar-a ui-shadow">' +
                game.activeBlackCard.text + '</div>'];
            $.each(played.cards, function(j, card) {
                cards.push('<div data-theme="c" class="ui-corner-all ui-content ui-bar-c ui-shadow">' +
                    card.text + '</div>');
            });
            $('#candidates-container').append('<div class="candidate">' + cards.join('') + '</div>');
        });
    });
});
