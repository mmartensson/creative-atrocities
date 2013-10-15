'use strict';

/*global io:false */

$(document).on('pagebeforecreate', function() {
    document.location.hash = '';
});

$(document).on('ready', function() {
    var socket = io.connect();
    var handCards = [];
    var gameId = $.url().param('g');

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
    });

    $('#login-btn').click(function() {
        var playerName = $('#name').val();

        socket.emit('join game', { playerName: playerName, gameId: gameId });
        return false;
    });

    // INITIAL WAIT
    // (Dealt white cards are shown)

    var receiveCardsAndWait = function(data) {
        handCards = data.cards;

        $('#wait-cards li').remove();
        $.each(handCards, function (i, card) {
            $('#wait-cards').append('<li>' + card.text + '</li>');
        });
        $.mobile.changePage('#wait', { transition: 'slideup' });

        $('#wait').on('pageshow', function() {
            $('#wait-cards').listview('refresh');
        });
    };

    socket.on('game joined', function (data) {
        console.log('Game joined', data);
        receiveCardsAndWait(data);
    });

    // ROUND STARTS
    // (Black card shown, user selects white cards)

    function setWhiteCards(select, count, skip) {
        select.append('<option data-placeholder="true" value="">' +
            '- Pick card number ' + count + ' -</option>');

        $.each(handCards, function (i, card) {
            if (!skip[card.id]) {
                select.append('<option value="' + card.id + '">' +
                    card.text + '</option>');
            }
        });

        select.selectmenu().val('').selectmenu('refresh');
    }

    socket.on('next round', function (data) {
        console.log('Next round', data);
        var pick = data.blackCard.pick;

        $('#play option').remove();

        $('#select-white-2').selectmenu().selectmenu(pick <= 1 ? 'disable' : 'enable');
        $('#select-white-3').selectmenu().selectmenu(pick <= 2 ? 'disable' : 'enable');

        for (var i=1; i<= pick; i++) {
            setWhiteCards($('#select-white-' + i), i, {});
        }

        $('#black_card').html(data.blackCard.text);

        $.mobile.changePage('#play', { transition: 'flip' });
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

        socket.emit('to controller', 'cards played', { cards: cards });
        return false;
    });

    // ROUND STARTS (CZAR)
    // (Black card shown, player waits)

    socket.on('next czar', function (data) {
        console.log('Next czar', data);
        $('#czar_black_card').html(data.blackCard.text);
        $('#candidates').empty();

        $.mobile.changePage('#czar', { transition: 'slideup' });
    });


    // CARDS PLAYED
    // (Looping back to wait)

    socket.on('cards approved', function (data) {
        console.log('Cards approved', data);
        receiveCardsAndWait(data);
    });


    // CARDS PLAYED (CZAR)
    // (White card sets received, player prompted to pick a winning set)
    socket.on('decision time', function (data) {
        console.log('Cards played', data);
        $('#candidates').empty();
        for (var i=0; i<data.cards.length; i++) {
            var set = data.cards[i];
            var list = [];
            for (var j=0; j<set.length; j++) {
                var text = set[j];
                list.push('<li>' + text + '</li>');
            }
            $('#candidates').append('<li><a href="#" data-index="' + i + '"><ul>' + list.join('') + '</ul></a></li>');
        }
        $('#candidates').listview('refresh');
        $('#candidates li a').click(function() {
            var index = $(this).jqmData('index');
            socket.emit('to controller', 'winner selected', index);
        });
    });

    // OTHER STUFF
    socket.on('score updated', function (score) {
        console.log('Score updated', score);
        $('.awesome-points .ui-btn-inner .ui-btn-text').text(score);
    });
});
