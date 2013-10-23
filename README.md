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
