Creative Atrocities
===================

This game is meant to be played together with two or more players, seated around a device (typically a tablet)
which assumes the role of controller / card table. Each player uses a
[QR code](http://en.wikipedia.org/wiki/QR_code)
provided by the controller to fire up a web page on their smartphone which takes on the role of a hand of cards.

Gameplay
--------

The actual game is a remix of the popular card game 
[Cards Against Humanity](http://www.cardsagainsthumanity.com/).

The game needs 3+ players and one device more than the number of players. The extra device (the controller)
should preferably have a bigger screen since it is meant to be viewed by all players. It will be used for 
the initial deck selection and then display the invite QR code used by the players to join the game.

Players will scan the QR code on their handhelds, provide a display name and then wait for the game to start.
The player devices should from now on be handled like a secret hand of cards, as it will literally display
ten cards that you should keep hidden from your opponents. When all players have joined and are properly
displayed on the controller, the player with the least sticky fingers pushes the button to start the game.

All players are now shown a black card which is either a statement with blanks to be filled in, or a question
for which an answer is to be picked. All players except the Czar (a new one each round) gets to pick one or
more white cards from his/her hand that together with the black card is likely to be well received by the Czar.

As all players have made their picks and clicked the button to proceed, the Czar is prompted to pick the winner.
At this point, all of the candidates are shown (anonymously) on the controller aswell as on the handheld of the
Czar. It is the duty of the Czar to read out loud all the candidates and then pick one of them as the winner.
The winner will be granted a point, as will be shown on the scoreboard of the controller and also in the top 
right corner of the player handheld. A new Czar is appointed by the game and the next round starts.

Running Creative Atrocities
---------------------------

The easiest way is to try out the game is to run along to the
deployed drone at [Nodejitsu](http://creative-atrocities.jit.su/). The company
has graciously offered to host us as part of their
[Open Source Hosting](http://opensource.nodejitsu.com/) initiative.

The slightly trickier way:

    $ git clone https://github.com/mmartensson/creative-atrocities.git
    $ cd creative-atrocities
    $ npm install
    $ ./node_modules/.bin/bower install
    $ ./node_modules/.bin/grunt
    $ node server.js
    
The `server.js` defaults to using port 8080, but that can be changed using the `--port` argument.

History
-------

Idea conceived at #spelbar ([Twitter](https://twitter.com/search?q=%23spelbar),
[Tumblr](http://spelbar.tumblr.com/),
[Google+](https://plus.google.com/communities/113740453792529383063)) where we meet every wednesday to
combine beer with table top games.

Screenshots
-----------

![Black card with matching white choices](https://raw.github.com/mmartensson/creative-atrocities/screenshots/screenshots/CreativeAtrocities-BlackCard.png)
