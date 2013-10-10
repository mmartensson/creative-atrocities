'use strict';

/*global io:false */

function format(text) {
    text = text.replace('&reg;', '®');
    return text;
}

$(document).on('ready', function() {
    var socket = io.connect();
    var cards = [];
    var gameId = $.url().param('g');

    socket.on('welcome', function (data) {
        console.log('Welcome', data);
    });

    $('#login-btn').click(function() {
        var playerName = $('#name').val();

        socket.emit('join game', { playerName: playerName, gameId: gameId });
        return false;
    });

    socket.on('game joined', function (data) {
        console.log('Game joined', data);
        cards = data.cards;

        $('#wait-cards li').remove();
        $.each(cards, function (i, card) {
            $('#wait-cards').append('<li>' + format(card.text) + '</li>');
        });
        $.mobile.changePage('#wait', { transition: 'slideup' });
    });

    function setWhiteCards(select, count, skip) {
        $('option', select).remove();

        select.append('<option data-placeholder="true" value="">' +
            '- Pick card number ' + count + ' -</option>');

        $.each(cards, function (i, card) {
            if (!skip[card.id]) {
                select.append('<option value="' + card.id + '">' +
                    card.text + '</option>');
            }
        });

        select.selectmenu();
    }

    socket.on('next round', function (data) {
        console.log('Next round', data);
        var pick = data.blackCard.pick;

        $('#select-white-2').prop('disabled', pick <= 1 ? 'true' : '');
        $('#select-white-3').prop('disabled', pick <= 2  ? 'true' : '');

        for (var i=1; i<= pick; i++) {
            setWhiteCards($('#select-white-' + i), i, {});
        }

        $('#black_card').text(format(data.blackCard.text));

        $.mobile.changePage('#play', { transition: 'flip' });
    });
});
