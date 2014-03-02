'use strict';

/* global io:false */ /* 'io' is initialized outside of the scope of this file */

$(document).on('ready', function() {
    var socket = io.connect();
    var gameId = $.url().param('g');
    var player;

    socket.on('error', function (error) {
        $('#error-message').text(error);
        console.error('SocketIO issue: ' + error);
        $.mobile.changePage('#error', {
            transition: 'pop'
        });
    });

    // LOGIN
    // (Player name prompt is shown)

    $('#name').focus().tap().click().keypress(function (ev) {
        var keycode = (ev.keyCode ? ev.keyCode : ev.which);
        if (0+keycode === 13) {
            $('#login-btn').trigger('click');
        }
    });

    socket.on('welcome', function (data) {
        console.log('Welcome', data);
        $.mobile.changePage('#login', { transition: 'flip' });
    });

    $('#login-btn').click(function() {
        var playerName = $('#name').val();

        socket.emit('join game', { playerName: playerName, gameId: gameId });
        return false;
    });

    // INITIAL WAIT
    // (Dealt white cards are shown)

    socket.on('player state wait', function (data) {
        console.log('State wait', data);
        player = data;
        updatePlayerScore();

        $('#wait-cards li').remove();
        $.each(player.whiteCards, function (i, card) {
            $('#wait-cards').append('<li>' + card.text + '</li>');
        });

        $.mobile.changePage('#wait', { transition: 'slideup' });
    });
    $('#wait').on('pageshow', function() {
        $('#wait-cards').listview('refresh');
    });

    // ROUND STARTS
    // (Black card shown, user selects white cards)

    function setWhiteCards(select, count, skip) {
        select.append('<option data-placeholder="true" value="">' +
            '- Pick card number ' + count + ' -</option>');

        $.each(player.whiteCards, function (i, card) {
            if (!skip[card.id]) {
                select.append('<option value="' + card.id + '">' +
                    card.text + '</option>');
            }
        });

        select.selectmenu().val('').selectmenu('refresh');
    }

    function updatePlayerScore() {
        $('.awesome-points .ui-btn-inner .ui-btn-text').text(player.points);
    }

    socket.on('player state play', function (data) {
        console.log('State play', data);
        player = data;
        updatePlayerScore();

        var pick = +player.blackCard.pick;

        $('#play option').remove();

        $('#select-white-2').selectmenu().selectmenu(pick <= 1 ? 'disable' : 'enable');
        $('#select-white-3').selectmenu().selectmenu(pick <= 2 ? 'disable' : 'enable');

        for (var i=1; i<= pick; i++) {
            setWhiteCards($('#select-white-' + i), i, {});
        }

        $('#black_card').html(player.blackCard.text);

        $.mobile.changePage('#play', { transition: 'slideup' });
    });

    $('#play-cards-btn').click(function() {
        var cards = [];
        for (var i=1; i<=3; i++) {
            if ($('#select-white-'+i).prop('disabled')) {
                break;
            }
            var card = $('#select-white-'+i).val();
            cards.push(card);
        }

        socket.emit('play cards', cards);
        return false;
    });

    // ROUND STARTS (CZAR)
    // (Black card shown, player waits)

    socket.on('player state czar wait', function (data) {
        console.log('State czar wait', data);
        player = data;
        updatePlayerScore();

        $('#czar_black_card').html(player.blackCard.text);
        $('#candidates').empty();

        $.mobile.changePage('#czar', { transition: 'slideup' });
    });

    // CARDS PLAYED
    // (Looping back to wait)

    // CARDS PLAYED 
    // (White card sets received, Czar prompted to pick a winning set)
    socket.on('player state czar decision', function (data) {
        console.log('State czar decision', data);
        player = data;
        updatePlayerScore();

        $('#czar_black_card').html(player.blackCard.text);
        $('#candidates').empty();
        for (var i=0; i<player.candidates.length; i++) {
            var set = player.candidates[i].cards;
            var list = [];
            for (var j=0; j<set.length; j++) {
                var text = set[j].text;
                list.push('<li>' + text + '</li>');
            }
            $('#candidates').append('<li><a href="#" data-index="' + i + '"><ul>' + list.join('') + '</ul></a></li>');
        }
        $('#candidates').listview('refresh');
        $('#candidates li a').click(function() {
            var index = $(this).jqmData('index');
            socket.emit('decide winner', index);
        });
    });

    // GAME OVER
    socket.on('player state game over', function (data) {
        console.log('State game over', data);
        player = data;
        updatePlayerScore();

        $.mobile.changePage('#game-over', { transition: 'slideup' });
    });

    // LOGOUT
    // (Logout requested and confirmed)
    $('#logout-btn').click(function() {
        socket.emit('logout');
    });
});
