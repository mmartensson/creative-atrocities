#!/usr/bin/env node

var app = require('http').createServer(handler)
  , static = require('node-static')
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , cards = require('./lib/creative-atrocities/cards')
  , optimist = require('optimist')
      .usage('Usage: $0 -p [port]')
	  .boolean('h')
      .alias('h', 'help')
	  .describe('h', 'Display this help message.')
	  .alias('p', 'port')
	  .default('p', 8080)
	  .describe('p', 'Port to use.');

var argv = optimist.argv;

if (argv.h) {
	optimist.showHelp();
    process.exit();
}

var fileServer = new static.Server('public');

app.listen(argv.p);

function handler (request, response) {
  request.addListener('end', function () {
      fileServer.serve(request, response);
  }).resume();
}

function terseCardSets() {
  var sets = cards.cardSets;
  var stripped = [];

  for (var id in sets) {
    if (sets.hasOwnProperty(id)) {
      var set = sets[id];
      stripped.push({ id: id, name: set.name, description: set.description });
    }
  }
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
    sets: terseCardSets()
  });

  // Relaying of private messages (to/from controller)
  socket.on('relay', function(to, ev, data) {
    if (io.sockets.sockets[to]) {
        io.sockets.sockets[to].emit(ev, data); 
    } else {
        socket.emit('error', 'Could not relay message to ' + to + '; destination incorrect or terminated.');
    }
  });

  // Controller
  socket.on('create game', function(data) {
    var gameId = socket.id;
     
    var blackCards = [];
    var whiteCards = [];

    for (var i=0; i<data.sets.length; i++) {
      var set_id = data.sets[i]; 
      var set = cards.cardSets[set_id];
      console.log('Using set "' + set.name + '"');


      for (var j=0; j<set.blackCards.length; j++) {
         var bc_id = set.blackCards[j];
         var bc = cards.blackCards[bc_id];
         bc.id = bc_id;
         blackCards.push(bc);
      }

      for (var j=0; j<set.whiteCards.length; j++) {
         var wc_id = set.whiteCards[j];
         var wc = cards.whiteCards[wc_id];
         wc.id = wc_id;
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

    socket.set('gameId', data.gameId);
    socket.set('playerName', data.playerName);

    if (io.sockets.sockets[data.gameId]) {
        io.sockets.sockets[data.gameId].emit('player joined', 
            { playerId: socket.id, playerName: data.playerName });
    } else {
        socket.emit('error', 'Game identifier ' + data.gameId + ' is incorrect or terminated.');
    }
  });
});
