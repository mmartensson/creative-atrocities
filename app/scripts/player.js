'use strict';

/*global io:false */

function format(text) {
    text = text.replace('&reg;', '®');
    return text;
}

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
            $('#wait-cards').append('<li>' + format(card.text) + '</li>');
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
        $('option', select).remove();

        select.append('<option data-placeholder="true" value="">' +
            '- Pick card number ' + count + ' -</option>');

        $.each(handCards, function (i, card) {
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

    // CARDS PLAYED
    // (Looping back to wait)

	socket.on('cards approved', function (data) {
        console.log('Cards approved', data);
		receiveCardsAndWait(data);
	});
});
