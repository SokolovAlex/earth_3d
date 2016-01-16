(function(angular) {
    'use strict';

    angular
        .module('common.utils', [])
        .factory('utils', utils);

    function utils() {
        var instance = {
            memorize: function(fn) {
                return function () {
                    var args = Array.prototype.slice.call(arguments);

                    var key = "", len = args.length, cur = null;

                    while (len--) {
                        cur = args[len];
                        key += (cur === Object(cur))? JSON.stringify(cur): cur;

                        fn.memoize || (fn.memoize = {});
                    }

                    return (key in fn.memoize)? fn.memoize[key]:
                        fn.memoize[key] = fn.apply(this, args);
                };
            },
            debounce: function(func, wait, immediate) {
                var timeout;
                return function() {
                    var context = this, args = arguments;
                    var later = function () {
                        timeout = null;
                        if (!immediate) {
                            func.apply(context, args);
                        }
                    };
                    var callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) {
                        func.apply(context, args);
                    }
                };
            },
            getTween: function (prop, to, time) {
                time = time || 500;
                var node = this;
                var curr = node[prop];
                var interpol = d3.interpolateObject(curr, to);
                return function (t) {
                    node[prop].copy(interpol(t / time));
                    if (t >= time) {
                        return true;
                    }
                };
            }
        };

        return instance;
    }
})(angular);
