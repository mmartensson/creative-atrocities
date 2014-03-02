/* Based on https://github.com/einaros/tinycolor */

'use strict';

var stringStyles = {
    'arg' : [
        function() { return '\u001b[37m"\u001b[35m' + this + '\u001b[37m"\u001b[39m'; },
        function() { return '"' + this + '"'; }
    ],
    'ctx' : [
        function() { return '\u001b[37m[\u001b[36m' + this + '\u001b[37m]\u001b[39m'; },
        function() { return '"' + this + '"'; }
    ],
    'err' : [
        function() { return '\u001b[31m' + this + '\u001b[39m'; },
        function() { return '"' + this + '"'; }
    ],
    'info' : [
        function() { return '\u001b[32m' + this + '\u001b[39m'; },
        function() { return '"' + this + '"'; }
    ],
    'warn' : [
        function() { return '\u001b[33m' + this + '\u001b[39m'; },
        function() { return '"' + this + '"'; }
    ]
};

var numberStyles = {
    'arg' : [
        function() { return '\u001b[35m' + this + '\u001b[39m'; },
        function() { return '"' + this + '"'; }
    ]
};

exports.setup = function(color) {
    Object.keys(stringStyles).forEach(function(style) {
        Object.defineProperty(String.prototype, style, {
            get: color ? stringStyles[style][0] : stringStyles[style][1],
            enumerable: false
        });
    });

    Object.keys(numberStyles).forEach(function(style) {
        Object.defineProperty(Number.prototype, style, {
            get: color ? numberStyles[style][0] : numberStyles[style][1],
            enumerable: false
        });
    });
};
