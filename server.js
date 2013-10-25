#!/usr/bin/env node

'use strict';

var http = require('http')
    , connect = require('connect')
    , cookie = require('cookie')
    , socketio = require('socket.io')
    , fs = require('fs')
    , cards = require('./lib/creative-atrocities/cards')
    , optimist = require('optimist')
    , clone = require('clone');

var argv = optimist
    .usage('Usage: $0 -p [port]')
    .boolean('h')
    .alias('h', 'help')
    .describe('h', 'Display this help message.')
    .boolean('color')
    .describe('color', 'Use ANSI codes in console output.')
    .default('color', false)
    .alias('p', 'port')
    .default('p', 8080)
    .describe('p', 'Port to use.').argv;

if (argv.h) {
    optimist.showHelp();
    process.exit();
}

require('./lib/creative-atrocities/logstyle.js').setup(argv.color);

var webRoot;
if (fs.existsSync('public/index.html')) {
    console.log('Creative Atrocities starting'.info);
    webRoot = 'public';
} else {
    console.log('Creative Atrocities is missing static files'.err);
    webRoot = 'fallback';
}

var generateId = socketio.Manager.prototype.generateId;
var secret = generateId();
var cookieKey = 'atrocities';

var app = connect()
    .use(connect.logger('dev'))
    .use(connect.cookieParser())
    .use(connect.cookieSession({ secret: secret, key: cookieKey }))
    .use(function (req, res, next) {
        if (!req.session.sessionId) {
            req.session.sessionId = generateId();
        }
        next();
    })
    .use(connect.static(webRoot));

var server = http.createServer(app).listen(argv.p);
var io = socketio.listen(server, {
    'flash policy port': -1,
    'log colors': argv.color,
    'transports': [
        'websocket'
        , 'flashsocket'
        , 'htmlfile'
        , 'xhr-polling'
        , 'jsonp-polling'
    ]
});

io.set('authorization', function (hs, callback) {
    var parsed = cookie.parse(hs.headers.cookie);
    var unsigned = connect.utils.parseSignedCookies(parsed, secret);
    var unjsoned = connect.utils.parseJSONCookies(unsigned, secret);
    var session = unjsoned[cookieKey];

    if (session && session.sessionId) {
        hs.sessionId = session.sessionId;
        console.log('Authorization successful for session ', hs.sessionId.arg);
        callback(null, true);
    } else {
        console.log('Authorization failure'.warn);
        callback('Invalid or non-existing session cookie', false);
    }
});

io.configure('production', function (){
    io.enable('browser client minification');  // send minified client
    io.enable('browser client etag');          // apply etag caching logic based on version number
    io.enable('browser client gzip');          // gzip the file
    io.set('log level', 2);                    // reduce logging
});

var games = {};
var sessions = {};

function terseDecks() {
    var decks = cards.decks;
    var stripped = [];

    Object.keys(decks).forEach(function(id) {
        var deck = decks[id];
        stripped.push({ id: id, name: deck.name });
    });

    stripped.sort(function(a,b) {
        if (a.name < b.name) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        }
        return 0;
    });

    return stripped;
}

function shuffleArray(ar) {
    var res = ar.slice();
    for (var i = res.length - 1; i >= 0; i--) {
        var n = Math.floor(Math.random() * i);
        var t = res[i];
        res[i] = res[n];
        res[n] = t;
    }
    return res;
}

function sendGameError(game, message) {
    var gameSocketId = sessions[game.sessionId].socketId;
    var gameSocket = io.sockets.sockets[gameSocketId];
    gameSocket.emit('error', message);
}

function sendPlayerError(player, message) {
    var playerSocketId = sessions[player.sessionId].socketId;
    var playerSocket = io.sockets.sockets[playerSocketId];
    playerSocket.emit('error', message);
}

function isExpectedGameState(game, expected) {
    if (game.state === expected) {
        return true;
    }

    var gameId = game.gameId;

    console.log(gameId.ctx, 'Wrong game state; expected'.err, expected.arg, 'but is'.err, game.state.arg);

    sendGameError(game, 'Wrong game state; expected ' + expected + ' but is ' + game.state);

    return false;
}

function isExpectedPlayerState(player, expected) {
    if (player.state === expected) {
        return true;
    }

    var gameId = sessions[player.sessionId].gameId;

    console.log(gameId.ctx, 'Wrong state for player'.err, player.name.arg, '/'.err, player.sessionId.arg,
            '; expected'.err, expected.arg, 'but is'.err, player.state.arg);

    var game = games[gameId];

    sendPlayerError(player, 'Wrong player state; expected ' + expected + ' but is ' + player.state);
    sendGameError(game, 'Wrong state for player ' + player.name + '; expected ' + expected + ' but is ' + player.state);

    return false;
}

function pushControllerState(gameId) {
    var game = games[gameId];
    var socketId = sessions[game.sessionId].socketId;
    var socket = io.sockets.sockets[socketId];
    var controller = clone(game);
    // Skipping cards since they are of no use to the 
    // controller and would consume a lot of bandwidth.
    delete controller.blackCards;
    delete controller.whiteCards;

    controller.playerOrder.forEach(function(p) {
        var player = controller.players[p];

        delete player.whiteCards;
        delete player.blackCard;
        delete player.playedCards;
    });

    if (socket) {
        socket.emit('controller state '+controller.state, controller);
    } else {
        console.log(gameId.ctx, 'Currently no controller socket available'.warn);
    }
}

function pushPlayerState(gameId, sessionId) {
    var player = games[gameId].players[sessionId];
    var socketId = sessions[sessionId].socketId;
    var socket = io.sockets.sockets[socketId];

    if (socket) {
        socket.emit('player state '+player.state, player);
    } else {
        console.log(gameId.ctx, 'Currently no player socket available for '.warn,
                sessionId.arg);
    }
}

io.sockets.on('connection', function (socket) {
    var sessionId = socket.handshake.sessionId;
    var session = sessions[sessionId];
    var sessionType = session ? session.type : 'new';

    console.log('Received connection from ' + sessionId.arg + ' (' + sessionType + ')');

    if (sessionType === 'controller') {
        session.socketId = socket.id;
        pushControllerState(session.gameId);
    } else if (sessionType === 'player') {
        session.socketId = socket.id;
        pushPlayerState(session.gameId, sessionId);
    } else {
        // Generic welcome for new clients (session type unknown)
        socket.emit('welcome', {
            decks: terseDecks()
        });
    }

    // Controller
    socket.on('create game', function(data) {
        if (sessionType !== 'new') {
            if (session.gameId) {
                console.log('Game creation request from'.err, sessionId.arg, '; already involved as'.err, sessionType.arg, 'in game', session.gameId.arg, '(halting)'.err);
                socket.emit('error', 'Already active as '+sessionType + ' in another game');
                return;
            } else {
                console.log('Game creation request from'.warn, sessionId.arg, '; already involved as'.warn, sessionType.arg, 'but not in any current game (continuing)'.warn);
            }
        }

        var gameId = generateId();
        sessions[sessionId] = {
            type: 'controller',
            gameId: gameId,
            socketId: socket.id
        };
        sessionType = 'controller';

        var blackCards = [];
        var whiteCards = [];

        for (var i=0; i<data.decks.length; i++) {
            var deckId = data.decks[i];
            var deck = cards.decks[deckId];
            console.log(gameId.ctx, 'Using deck', deck.name.arg);

            for (var bi=0; bi<deck.blackCards.length; bi++) {
                var bcId = deck.blackCards[bi];
                var bc = cards.blackCards[bcId];
                bc.id = bcId;
                blackCards.push(bc);
            }

            for (var wi=0; wi<deck.whiteCards.length; wi++) {
                var wcId = deck.whiteCards[wi];
                var wc = cards.whiteCards[wcId];
                wc.id = wcId;
                whiteCards.push(wc);
            }
        }

        var game = {
            gameId: gameId,
            sessionId: sessionId,
            blackCards: shuffleArray(blackCards),
            whiteCards: shuffleArray(whiteCards),
            players: {},
            playerOrder: [],
            czarIndex: -1,
            state: 'invite'
        };
        games[gameId] = game;

        console.log(gameId.ctx, 'Game created'.info);
        pushControllerState(gameId);
    });

    var startRound = function() {
        var gameId = sessions[sessionId].gameId;
        var game = games[gameId];

        // Not yet supporting black cards that prompt extra white cards to be drawn
        do {
            game.activeBlackCard = game.blackCards.pop();
        } while (game.activeBlackCard.draw);

        // Picking the next czar
        if (++game.czarIndex >= game.playerOrder.length) {
            game.czarIndex = 0;
        }
 
        var czarSessionId = game.playerOrder[game.czarIndex];
        var czarPlayer = game.players[czarSessionId];

        console.log(gameId.ctx, 'Starting new round with czar'.info,
            czarPlayer.name.arg, 'and black card'.info,
            game.activeBlackCard.text.arg);
 
        game.playerOrder.forEach(function(p) {
            var player = game.players[p];
            player.blackCard = game.activeBlackCard;
            delete player.playedCards;
            delete player.candidates;

            if (p === czarSessionId) {
                player.state = 'czar wait';
            } else {
                player.state = 'play';
            }
            pushPlayerState(gameId, p);
        });

        game.state = 'play';
        pushControllerState(gameId);
    };

    socket.on('start game', function() {
        var gameId = sessions[sessionId].gameId;
        var game = games[gameId];

        if (!isExpectedGameState(game, 'invite')) {
            return;
        }
        startRound();
    });

    // Player
    socket.on('join game', function(data) {
        if (sessionType !== 'new') {
            if (session.gameId) {
                console.log('Request from'.err, sessionId.arg, 'to join game'.err, data.gameId.arg, '; already involved as'.err,
                    sessionType.arg, 'in game', session.gameId.arg, '(halting)'.err);
                socket.emit('error', 'Already active as '+sessionType + ' in another game');
                return;
            } else {
                console.log('Game creation request from'.warn, sessionId.arg, '; already involved as'.warn, sessionType.arg, 'but not in any current game (continuing)'.warn);
            }
        }

        var gameId = data.gameId;
        console.log(gameId.ctx, 'Player'.info, data.playerName.arg, '/', sessionId.arg,
            'joins the game'.info);
        sessions[sessionId] = {
            type: 'player',
            gameId: data.gameId,
            socketId: socket.id
        };
        sessionType = 'player';

        var game = games[gameId];
        var whiteCards = game.whiteCards.splice(-10,10);

        var player = {
            name: data.playerName,
            sessionId: sessionId,
            whiteCards: whiteCards,
            state: 'wait',
            points: 0
        };
        game.players[sessionId] = player;
        game.playerOrder.push(sessionId);

        pushPlayerState(gameId, sessionId);
        pushControllerState(gameId);
    });

    socket.on('play cards', function(cards) {
        var gameId = sessions[sessionId].gameId;
        var game = games[gameId];
        var player = game.players[sessionId];

        if (!isExpectedPlayerState(player, 'play')) {
            return;
        }

        var pick = +game.activeBlackCard.pick;
        if (pick !== cards.length) {
            socket.emit('error', 'Wrong number of cards picked; expected ' + pick +
                ' but got ' + cards.length);
            return;
        }

        var playedCards = [];
        var keptCards = [];
        player.whiteCards.forEach(function(card) {
            if (cards.indexOf(card.id) < 0) {
                keptCards.push(card);
            } else {
                playedCards.push(card);
            }
        });

        if (pick !== playedCards.length) {
            socket.emit('error', 'Some of the played cards were not in the hand of the player');
            return;
        }

        player.whiteCards = keptCards;
        for (var i=0; i<pick; i++) {
            player.whiteCards.push(game.whiteCards.pop());
        }

        player.playedCards = playedCards;
        player.state = 'wait';

        pushPlayerState(gameId, sessionId);

        // Prepare for the Czar decision
        var remainingPlayers = 0;
        var candidates = [];
        game.playerOrder.forEach(function(p) {
            var state = game.players[p].state;
            if (state === 'play') {
                remainingPlayers++;
            } else if (state === 'wait') {
                candidates.push({ sessionId: p, cards: game.players[p].playedCards });
            }
        });

        // If all cards are played, wake up the Czar 
        if (remainingPlayers === 0) {
            game.state = 'decision';

            var czarSessionId = game.playerOrder[game.czarIndex];
            var czarPlayer = game.players[czarSessionId];
            czarPlayer.state = 'czar decision';
            czarPlayer.candidates = shuffleArray(candidates);
            pushPlayerState(gameId, czarSessionId);
        }

        pushControllerState(gameId);
    });

    socket.on('decide winner', function(winningIndex) {
        var gameId = sessions[sessionId].gameId;
        var game = games[gameId];
        var player = game.players[sessionId];

        if (!isExpectedPlayerState(player, 'czar decision')) {
            return;
        }

        var candidate = player.candidates[winningIndex];
        var winner = game.players[candidate.sessionId];
        winner.points++;
        console.log(gameId.ctx, 'Winner is'.info, winner.name.arg,
            'now at'.info, winner.points.arg, 'points'.info);

        startRound();
    });
});
