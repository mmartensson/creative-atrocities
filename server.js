#!/usr/bin/env node

'use strict';

var http = require('http')
    , connect = require('connect')
    , cookie = require('cookie')
    , socketio = require('socket.io')
    , fs = require('fs')
    , colors = require('colors')
    , cards = require('./lib/creative-atrocities/cards')
    , optimist = require('optimist');

var argv = optimist
    .usage('Usage: $0 -p [port]')
    .boolean('h')
    .alias('h', 'help')
    .describe('h', 'Display this help message.')
    .alias('p', 'port')
    .default('p', 8080)
    .describe('p', 'Port to use.').argv;

if (argv.h) {
    optimist.showHelp();
    process.exit();
}

colors.setTheme({
    info: 'green',
    warn:  [ 'italic', 'yellow' ],
    error: [ 'underline', 'red' ]
});

var webRoot;
if (fs.existsSync('public/index.html')) {
    console.log('Creative Atrocities starting'.info);
    webRoot = 'public';
} else {
    console.log('Creative Atrocities is missing static files'.error);
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
        if (!req.session.sesId) {
            req.session.sesId = generateId();
        }
        next();
    })
    .use(connect.static(webRoot));

var server = http.createServer(app).listen(argv.p);
var io = socketio.listen(server);

io.configure(function (){
    io.set('authorization', function (hs, callback) {
        var parsed = cookie.parse(hs.headers.cookie);
        var unsigned = connect.utils.parseSignedCookies(parsed, secret);
        var unjsoned = connect.utils.parseJSONCookies(unsigned, secret);
        var session = unjsoned[cookieKey];

        console.log('Unsigned', unsigned);
        console.log('Session', session);

        if (session && session.sesId) {
            hs.sesId = session.sesId;
            console.log('Authorization successful for session '.info + (hs.sesId).magenta);
            callback(null, true);
        } else {
            console.log('Authorization failure'.warn);
            callback('Invalid or non-existing session cookie', false);
        }
    });
});

function terseDecks() {
    var decks = cards.decks;
    var stripped = [];

    for (var id in decks) {
        if (decks.hasOwnProperty(id)) {
            var deck = decks[id];
            stripped.push({ id: id, name: deck.name });
        }
    }

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

io.sockets.on('connection', function (socket) {
    // Generic welcome
    socket.emit('welcome', {
        decks: terseDecks()
    });

    // Relaying of private messages from controller to player
    socket.on('to player', function(to, ev, data) {
        if (io.sockets.sockets[to]) {
            io.sockets.sockets[to].emit(ev, data);
        } else {
            socket.emit('error', 'Could not relay message to ' + to + '; destination incorrect or terminated.');
        }
    });

    // Relaying of private messages from player to controller
    socket.on('to controller', function(ev, data) {
        socket.get('identity', function (err, identity) {
            data.__identity = identity;
            var gameId = identity.gameId;
            if (io.sockets.sockets[gameId]) {
                io.sockets.sockets[gameId].emit(ev, data);
            } else {
                socket.emit('error', 'Could not relay message to controller; destination incorrect or terminated.');
            }
        });
    });

    // Controller
    socket.on('create game', function(data) {
        var gameId = socket.id;

        var blackCards = [];
        var whiteCards = [];

        for (var i=0; i<data.decks.length; i++) {
            var deckId = data.decks[i];
            var deck = cards.decks[deckId];
            console.log('Using deck "' + deck.name + '"');

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

        console.log('Creating game ' + gameId);
        socket.emit('game created', {
            gameId: gameId,
            blackCards: shuffleArray(blackCards),
            whiteCards: shuffleArray(whiteCards)
        });
    });

    // Player
    socket.on('join game', function(data) {
        console.log('Player ' + data.playerName + ' joins game ' + data.gameId);

        socket.set('identity', {
            gameId: data.gameId,
            playerId: socket.id,
            playerName: data.playerName
        }, function() {
            if (io.sockets.sockets[data.gameId]) {
                io.sockets.sockets[data.gameId].emit('player joined',
                    { playerId: socket.id, playerName: data.playerName });
            } else {
                socket.emit('error', 'Game identifier ' + data.gameId + ' is incorrect or terminated.');
            }
        });
    });
});
