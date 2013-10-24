/* Based on https://github.com/einaros/tinycolor */

var stringStyles = {
    'arg' : [ 
        function() { return '\033[37m"\033[35m' + this + '\033[37m"\033[39m'; },
        function() { return '"' + this + '"' }],
    'ctx' : [ 
        function() { return '\033[37m[\033[36m' + this + '\033[37m]\033[39m'; },
        function() { return '"' + this + '"' }],
    'err' : [ 
        function() { return '\033[31m' + this + '\033[39m'; },
        function() { return '"' + this + '"' }], 
    'info' : [ 
        function() { return '\033[32m' + this + '\033[39m'; },
        function() { return '"' + this + '"' }],
    'warn' : [ 
        function() { return '\033[33m' + this + '\033[39m'; },
        function() { return '"' + this + '"' }] 
};

var numberStyles = {
    'arg' : [ 
        function() { return '\033[35m' + this + '\033[39m'; },
        function() { return '"' + this + '"' }]
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
}
