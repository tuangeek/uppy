(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

var fingerprint = require('./lib/fingerprint.js');
var pad = require('./lib/pad.js');

var c = 0,
  blockSize = 4,
  base = 36,
  discreteValues = Math.pow(base, blockSize);

function randomBlock () {
  return pad((Math.random() *
    discreteValues << 0)
    .toString(base), blockSize);
}

function safeCounter () {
  c = c < discreteValues ? c : 0;
  c++; // this is not subliminal
  return c - 1;
}

function cuid () {
  // Starting with a lowercase letter makes
  // it HTML element ID friendly.
  var letter = 'c', // hard-coded allows for sequential access

    // timestamp
    // warning: this exposes the exact date and time
    // that the uid was created.
    timestamp = (new Date().getTime()).toString(base),

    // Prevent same-machine collisions.
    counter = pad(safeCounter().toString(base), blockSize),

    // A few chars to generate distinct ids for different
    // clients (so different computers are far less
    // likely to generate the same id)
    print = fingerprint(),

    // Grab some more chars from Math.random()
    random = randomBlock() + randomBlock();

  return letter + timestamp + counter + print + random;
}

cuid.slug = function slug () {
  var date = new Date().getTime().toString(36),
    counter = safeCounter().toString(36).slice(-4),
    print = fingerprint().slice(0, 1) +
      fingerprint().slice(-1),
    random = randomBlock().slice(-2);

  return date.slice(-2) +
    counter + print + random;
};

cuid.fingerprint = fingerprint;

module.exports = cuid;

},{"./lib/fingerprint.js":2,"./lib/pad.js":3}],2:[function(require,module,exports){
var pad = require('./pad.js');

var env = typeof window === 'object' ? window : self;
var globalCount = Object.keys(env);
var mimeTypesLength = navigator.mimeTypes ? navigator.mimeTypes.length : 0;
var clientId = pad((mimeTypesLength +
  navigator.userAgent.length).toString(36) +
  globalCount.toString(36), 4);

module.exports = function fingerprint () {
  return clientId;
};

},{"./pad.js":3}],3:[function(require,module,exports){
module.exports = function pad (num, size) {
  var s = '000000000' + num;
  return s.substr(s.length - size);
};

},{}],4:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.4+314e4831
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var TRY_CATCH_ERROR = { error: null };

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    TRY_CATCH_ERROR.error = error;
    return TRY_CATCH_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === TRY_CATCH_ERROR) {
      reject(promise, TRY_CATCH_ERROR.error);
      TRY_CATCH_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    return promise.then(function (value) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason) {
      return constructor.resolve(callback()).then(function () {
        throw reason;
      });
    });
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));





}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":21}],5:[function(require,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func`
 * should be invoked on the leading and/or trailing edge of the `wait`
 * timeout. The `func` is invoked with the last arguments provided to the
 * throttled function. Subsequent calls to the throttled function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the throttled function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=true]
 *  Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // Avoid excessively updating the position while scrolling.
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
 * jQuery(element).on('click', throttled);
 *
 * // Cancel the trailing throttled invocation.
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    'leading': leading,
    'maxWait': wait,
    'trailing': trailing
  });
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = throttle;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
var wildcard = require('wildcard');
var reMimePartSplit = /[\/\+\.]/;

/**
  # mime-match

  A simple function to checker whether a target mime type matches a mime-type
  pattern (e.g. image/jpeg matches image/jpeg OR image/*).

  ## Example Usage

  <<< example.js

**/
module.exports = function(target, pattern) {
  function test(pattern) {
    var result = wildcard(pattern, target, reMimePartSplit);

    // ensure that we have a valid mime type (should have two parts)
    return result && result.length >= 2;
  }

  return pattern ? test(pattern.split(';')[0]) : test;
};

},{"wildcard":10}],7:[function(require,module,exports){
/**
* Create an event emitter with namespaces
* @name createNamespaceEmitter
* @example
* var emitter = require('./index')()
*
* emitter.on('*', function () {
*   console.log('all events emitted', this.event)
* })
*
* emitter.on('example', function () {
*   console.log('example event emitted')
* })
*/
module.exports = function createNamespaceEmitter () {
  var emitter = {}
  var _fns = emitter._fns = {}

  /**
  * Emit an event. Optionally namespace the event. Handlers are fired in the order in which they were added with exact matches taking precedence. Separate the namespace and event with a `:`
  * @name emit
  * @param {String} event – the name of the event, with optional namespace
  * @param {...*} data – up to 6 arguments that are passed to the event listener
  * @example
  * emitter.emit('example')
  * emitter.emit('demo:test')
  * emitter.emit('data', { example: true}, 'a string', 1)
  */
  emitter.emit = function emit (event, arg1, arg2, arg3, arg4, arg5, arg6) {
    var toEmit = getListeners(event)

    if (toEmit.length) {
      emitAll(event, toEmit, [arg1, arg2, arg3, arg4, arg5, arg6])
    }
  }

  /**
  * Create en event listener.
  * @name on
  * @param {String} event
  * @param {Function} fn
  * @example
  * emitter.on('example', function () {})
  * emitter.on('demo', function () {})
  */
  emitter.on = function on (event, fn) {
    if (!_fns[event]) {
      _fns[event] = []
    }

    _fns[event].push(fn)
  }

  /**
  * Create en event listener that fires once.
  * @name once
  * @param {String} event
  * @param {Function} fn
  * @example
  * emitter.once('example', function () {})
  * emitter.once('demo', function () {})
  */
  emitter.once = function once (event, fn) {
    function one () {
      fn.apply(this, arguments)
      emitter.off(event, one)
    }
    this.on(event, one)
  }

  /**
  * Stop listening to an event. Stop all listeners on an event by only passing the event name. Stop a single listener by passing that event handler as a callback.
  * You must be explicit about what will be unsubscribed: `emitter.off('demo')` will unsubscribe an `emitter.on('demo')` listener,
  * `emitter.off('demo:example')` will unsubscribe an `emitter.on('demo:example')` listener
  * @name off
  * @param {String} event
  * @param {Function} [fn] – the specific handler
  * @example
  * emitter.off('example')
  * emitter.off('demo', function () {})
  */
  emitter.off = function off (event, fn) {
    var keep = []

    if (event && fn) {
      var fns = this._fns[event]
      var i = 0
      var l = fns ? fns.length : 0

      for (i; i < l; i++) {
        if (fns[i] !== fn) {
          keep.push(fns[i])
        }
      }
    }

    keep.length ? this._fns[event] = keep : delete this._fns[event]
  }

  function getListeners (e) {
    var out = _fns[e] ? _fns[e] : []
    var idx = e.indexOf(':')
    var args = (idx === -1) ? [e] : [e.substring(0, idx), e.substring(idx + 1)]

    var keys = Object.keys(_fns)
    var i = 0
    var l = keys.length

    for (i; i < l; i++) {
      var key = keys[i]
      if (key === '*') {
        out = out.concat(_fns[key])
      }

      if (args.length === 2 && args[0] === key) {
        out = out.concat(_fns[key])
        break
      }
    }

    return out
  }

  function emitAll (e, fns, args) {
    var i = 0
    var l = fns.length

    for (i; i < l; i++) {
      if (!fns[i]) break
      fns[i].event = e
      fns[i].apply(fns[i], args)
    }
  }

  return emitter
}

},{}],8:[function(require,module,exports){
!function() {
    'use strict';
    function VNode() {}
    function h(nodeName, attributes) {
        var lastSimple, child, simple, i, children = EMPTY_CHILDREN;
        for (i = arguments.length; i-- > 2; ) stack.push(arguments[i]);
        if (attributes && null != attributes.children) {
            if (!stack.length) stack.push(attributes.children);
            delete attributes.children;
        }
        while (stack.length) if ((child = stack.pop()) && void 0 !== child.pop) for (i = child.length; i--; ) stack.push(child[i]); else {
            if ('boolean' == typeof child) child = null;
            if (simple = 'function' != typeof nodeName) if (null == child) child = ''; else if ('number' == typeof child) child = String(child); else if ('string' != typeof child) simple = !1;
            if (simple && lastSimple) children[children.length - 1] += child; else if (children === EMPTY_CHILDREN) children = [ child ]; else children.push(child);
            lastSimple = simple;
        }
        var p = new VNode();
        p.nodeName = nodeName;
        p.children = children;
        p.attributes = null == attributes ? void 0 : attributes;
        p.key = null == attributes ? void 0 : attributes.key;
        if (void 0 !== options.vnode) options.vnode(p);
        return p;
    }
    function extend(obj, props) {
        for (var i in props) obj[i] = props[i];
        return obj;
    }
    function cloneElement(vnode, props) {
        return h(vnode.nodeName, extend(extend({}, vnode.attributes), props), arguments.length > 2 ? [].slice.call(arguments, 2) : vnode.children);
    }
    function enqueueRender(component) {
        if (!component.__d && (component.__d = !0) && 1 == items.push(component)) (options.debounceRendering || defer)(rerender);
    }
    function rerender() {
        var p, list = items;
        items = [];
        while (p = list.pop()) if (p.__d) renderComponent(p);
    }
    function isSameNodeType(node, vnode, hydrating) {
        if ('string' == typeof vnode || 'number' == typeof vnode) return void 0 !== node.splitText;
        if ('string' == typeof vnode.nodeName) return !node._componentConstructor && isNamedNode(node, vnode.nodeName); else return hydrating || node._componentConstructor === vnode.nodeName;
    }
    function isNamedNode(node, nodeName) {
        return node.__n === nodeName || node.nodeName.toLowerCase() === nodeName.toLowerCase();
    }
    function getNodeProps(vnode) {
        var props = extend({}, vnode.attributes);
        props.children = vnode.children;
        var defaultProps = vnode.nodeName.defaultProps;
        if (void 0 !== defaultProps) for (var i in defaultProps) if (void 0 === props[i]) props[i] = defaultProps[i];
        return props;
    }
    function createNode(nodeName, isSvg) {
        var node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);
        node.__n = nodeName;
        return node;
    }
    function removeNode(node) {
        var parentNode = node.parentNode;
        if (parentNode) parentNode.removeChild(node);
    }
    function setAccessor(node, name, old, value, isSvg) {
        if ('className' === name) name = 'class';
        if ('key' === name) ; else if ('ref' === name) {
            if (old) old(null);
            if (value) value(node);
        } else if ('class' === name && !isSvg) node.className = value || ''; else if ('style' === name) {
            if (!value || 'string' == typeof value || 'string' == typeof old) node.style.cssText = value || '';
            if (value && 'object' == typeof value) {
                if ('string' != typeof old) for (var i in old) if (!(i in value)) node.style[i] = '';
                for (var i in value) node.style[i] = 'number' == typeof value[i] && !1 === IS_NON_DIMENSIONAL.test(i) ? value[i] + 'px' : value[i];
            }
        } else if ('dangerouslySetInnerHTML' === name) {
            if (value) node.innerHTML = value.__html || '';
        } else if ('o' == name[0] && 'n' == name[1]) {
            var useCapture = name !== (name = name.replace(/Capture$/, ''));
            name = name.toLowerCase().substring(2);
            if (value) {
                if (!old) node.addEventListener(name, eventProxy, useCapture);
            } else node.removeEventListener(name, eventProxy, useCapture);
            (node.__l || (node.__l = {}))[name] = value;
        } else if ('list' !== name && 'type' !== name && !isSvg && name in node) {
            setProperty(node, name, null == value ? '' : value);
            if (null == value || !1 === value) node.removeAttribute(name);
        } else {
            var ns = isSvg && name !== (name = name.replace(/^xlink\:?/, ''));
            if (null == value || !1 === value) if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase()); else node.removeAttribute(name); else if ('function' != typeof value) if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value); else node.setAttribute(name, value);
        }
    }
    function setProperty(node, name, value) {
        try {
            node[name] = value;
        } catch (e) {}
    }
    function eventProxy(e) {
        return this.__l[e.type](options.event && options.event(e) || e);
    }
    function flushMounts() {
        var c;
        while (c = mounts.pop()) {
            if (options.afterMount) options.afterMount(c);
            if (c.componentDidMount) c.componentDidMount();
        }
    }
    function diff(dom, vnode, context, mountAll, parent, componentRoot) {
        if (!diffLevel++) {
            isSvgMode = null != parent && void 0 !== parent.ownerSVGElement;
            hydrating = null != dom && !('__preactattr_' in dom);
        }
        var ret = idiff(dom, vnode, context, mountAll, componentRoot);
        if (parent && ret.parentNode !== parent) parent.appendChild(ret);
        if (!--diffLevel) {
            hydrating = !1;
            if (!componentRoot) flushMounts();
        }
        return ret;
    }
    function idiff(dom, vnode, context, mountAll, componentRoot) {
        var out = dom, prevSvgMode = isSvgMode;
        if (null == vnode || 'boolean' == typeof vnode) vnode = '';
        if ('string' == typeof vnode || 'number' == typeof vnode) {
            if (dom && void 0 !== dom.splitText && dom.parentNode && (!dom._component || componentRoot)) {
                if (dom.nodeValue != vnode) dom.nodeValue = vnode;
            } else {
                out = document.createTextNode(vnode);
                if (dom) {
                    if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                    recollectNodeTree(dom, !0);
                }
            }
            out.__preactattr_ = !0;
            return out;
        }
        var vnodeName = vnode.nodeName;
        if ('function' == typeof vnodeName) return buildComponentFromVNode(dom, vnode, context, mountAll);
        isSvgMode = 'svg' === vnodeName ? !0 : 'foreignObject' === vnodeName ? !1 : isSvgMode;
        vnodeName = String(vnodeName);
        if (!dom || !isNamedNode(dom, vnodeName)) {
            out = createNode(vnodeName, isSvgMode);
            if (dom) {
                while (dom.firstChild) out.appendChild(dom.firstChild);
                if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                recollectNodeTree(dom, !0);
            }
        }
        var fc = out.firstChild, props = out.__preactattr_, vchildren = vnode.children;
        if (null == props) {
            props = out.__preactattr_ = {};
            for (var a = out.attributes, i = a.length; i--; ) props[a[i].name] = a[i].value;
        }
        if (!hydrating && vchildren && 1 === vchildren.length && 'string' == typeof vchildren[0] && null != fc && void 0 !== fc.splitText && null == fc.nextSibling) {
            if (fc.nodeValue != vchildren[0]) fc.nodeValue = vchildren[0];
        } else if (vchildren && vchildren.length || null != fc) innerDiffNode(out, vchildren, context, mountAll, hydrating || null != props.dangerouslySetInnerHTML);
        diffAttributes(out, vnode.attributes, props);
        isSvgMode = prevSvgMode;
        return out;
    }
    function innerDiffNode(dom, vchildren, context, mountAll, isHydrating) {
        var j, c, f, vchild, child, originalChildren = dom.childNodes, children = [], keyed = {}, keyedLen = 0, min = 0, len = originalChildren.length, childrenLen = 0, vlen = vchildren ? vchildren.length : 0;
        if (0 !== len) for (var i = 0; i < len; i++) {
            var _child = originalChildren[i], props = _child.__preactattr_, key = vlen && props ? _child._component ? _child._component.__k : props.key : null;
            if (null != key) {
                keyedLen++;
                keyed[key] = _child;
            } else if (props || (void 0 !== _child.splitText ? isHydrating ? _child.nodeValue.trim() : !0 : isHydrating)) children[childrenLen++] = _child;
        }
        if (0 !== vlen) for (var i = 0; i < vlen; i++) {
            vchild = vchildren[i];
            child = null;
            var key = vchild.key;
            if (null != key) {
                if (keyedLen && void 0 !== keyed[key]) {
                    child = keyed[key];
                    keyed[key] = void 0;
                    keyedLen--;
                }
            } else if (!child && min < childrenLen) for (j = min; j < childrenLen; j++) if (void 0 !== children[j] && isSameNodeType(c = children[j], vchild, isHydrating)) {
                child = c;
                children[j] = void 0;
                if (j === childrenLen - 1) childrenLen--;
                if (j === min) min++;
                break;
            }
            child = idiff(child, vchild, context, mountAll);
            f = originalChildren[i];
            if (child && child !== dom && child !== f) if (null == f) dom.appendChild(child); else if (child === f.nextSibling) removeNode(f); else dom.insertBefore(child, f);
        }
        if (keyedLen) for (var i in keyed) if (void 0 !== keyed[i]) recollectNodeTree(keyed[i], !1);
        while (min <= childrenLen) if (void 0 !== (child = children[childrenLen--])) recollectNodeTree(child, !1);
    }
    function recollectNodeTree(node, unmountOnly) {
        var component = node._component;
        if (component) unmountComponent(component); else {
            if (null != node.__preactattr_ && node.__preactattr_.ref) node.__preactattr_.ref(null);
            if (!1 === unmountOnly || null == node.__preactattr_) removeNode(node);
            removeChildren(node);
        }
    }
    function removeChildren(node) {
        node = node.lastChild;
        while (node) {
            var next = node.previousSibling;
            recollectNodeTree(node, !0);
            node = next;
        }
    }
    function diffAttributes(dom, attrs, old) {
        var name;
        for (name in old) if ((!attrs || null == attrs[name]) && null != old[name]) setAccessor(dom, name, old[name], old[name] = void 0, isSvgMode);
        for (name in attrs) if (!('children' === name || 'innerHTML' === name || name in old && attrs[name] === ('value' === name || 'checked' === name ? dom[name] : old[name]))) setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
    }
    function collectComponent(component) {
        var name = component.constructor.name;
        (components[name] || (components[name] = [])).push(component);
    }
    function createComponent(Ctor, props, context) {
        var inst, list = components[Ctor.name];
        if (Ctor.prototype && Ctor.prototype.render) {
            inst = new Ctor(props, context);
            Component.call(inst, props, context);
        } else {
            inst = new Component(props, context);
            inst.constructor = Ctor;
            inst.render = doRender;
        }
        if (list) for (var i = list.length; i--; ) if (list[i].constructor === Ctor) {
            inst.__b = list[i].__b;
            list.splice(i, 1);
            break;
        }
        return inst;
    }
    function doRender(props, state, context) {
        return this.constructor(props, context);
    }
    function setComponentProps(component, props, opts, context, mountAll) {
        if (!component.__x) {
            component.__x = !0;
            if (component.__r = props.ref) delete props.ref;
            if (component.__k = props.key) delete props.key;
            if (!component.base || mountAll) {
                if (component.componentWillMount) component.componentWillMount();
            } else if (component.componentWillReceiveProps) component.componentWillReceiveProps(props, context);
            if (context && context !== component.context) {
                if (!component.__c) component.__c = component.context;
                component.context = context;
            }
            if (!component.__p) component.__p = component.props;
            component.props = props;
            component.__x = !1;
            if (0 !== opts) if (1 === opts || !1 !== options.syncComponentUpdates || !component.base) renderComponent(component, 1, mountAll); else enqueueRender(component);
            if (component.__r) component.__r(component);
        }
    }
    function renderComponent(component, opts, mountAll, isChild) {
        if (!component.__x) {
            var rendered, inst, cbase, props = component.props, state = component.state, context = component.context, previousProps = component.__p || props, previousState = component.__s || state, previousContext = component.__c || context, isUpdate = component.base, nextBase = component.__b, initialBase = isUpdate || nextBase, initialChildComponent = component._component, skip = !1;
            if (isUpdate) {
                component.props = previousProps;
                component.state = previousState;
                component.context = previousContext;
                if (2 !== opts && component.shouldComponentUpdate && !1 === component.shouldComponentUpdate(props, state, context)) skip = !0; else if (component.componentWillUpdate) component.componentWillUpdate(props, state, context);
                component.props = props;
                component.state = state;
                component.context = context;
            }
            component.__p = component.__s = component.__c = component.__b = null;
            component.__d = !1;
            if (!skip) {
                rendered = component.render(props, state, context);
                if (component.getChildContext) context = extend(extend({}, context), component.getChildContext());
                var toUnmount, base, childComponent = rendered && rendered.nodeName;
                if ('function' == typeof childComponent) {
                    var childProps = getNodeProps(rendered);
                    inst = initialChildComponent;
                    if (inst && inst.constructor === childComponent && childProps.key == inst.__k) setComponentProps(inst, childProps, 1, context, !1); else {
                        toUnmount = inst;
                        component._component = inst = createComponent(childComponent, childProps, context);
                        inst.__b = inst.__b || nextBase;
                        inst.__u = component;
                        setComponentProps(inst, childProps, 0, context, !1);
                        renderComponent(inst, 1, mountAll, !0);
                    }
                    base = inst.base;
                } else {
                    cbase = initialBase;
                    toUnmount = initialChildComponent;
                    if (toUnmount) cbase = component._component = null;
                    if (initialBase || 1 === opts) {
                        if (cbase) cbase._component = null;
                        base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, !0);
                    }
                }
                if (initialBase && base !== initialBase && inst !== initialChildComponent) {
                    var baseParent = initialBase.parentNode;
                    if (baseParent && base !== baseParent) {
                        baseParent.replaceChild(base, initialBase);
                        if (!toUnmount) {
                            initialBase._component = null;
                            recollectNodeTree(initialBase, !1);
                        }
                    }
                }
                if (toUnmount) unmountComponent(toUnmount);
                component.base = base;
                if (base && !isChild) {
                    var componentRef = component, t = component;
                    while (t = t.__u) (componentRef = t).base = base;
                    base._component = componentRef;
                    base._componentConstructor = componentRef.constructor;
                }
            }
            if (!isUpdate || mountAll) mounts.unshift(component); else if (!skip) {
                if (component.componentDidUpdate) component.componentDidUpdate(previousProps, previousState, previousContext);
                if (options.afterUpdate) options.afterUpdate(component);
            }
            if (null != component.__h) while (component.__h.length) component.__h.pop().call(component);
            if (!diffLevel && !isChild) flushMounts();
        }
    }
    function buildComponentFromVNode(dom, vnode, context, mountAll) {
        var c = dom && dom._component, originalComponent = c, oldDom = dom, isDirectOwner = c && dom._componentConstructor === vnode.nodeName, isOwner = isDirectOwner, props = getNodeProps(vnode);
        while (c && !isOwner && (c = c.__u)) isOwner = c.constructor === vnode.nodeName;
        if (c && isOwner && (!mountAll || c._component)) {
            setComponentProps(c, props, 3, context, mountAll);
            dom = c.base;
        } else {
            if (originalComponent && !isDirectOwner) {
                unmountComponent(originalComponent);
                dom = oldDom = null;
            }
            c = createComponent(vnode.nodeName, props, context);
            if (dom && !c.__b) {
                c.__b = dom;
                oldDom = null;
            }
            setComponentProps(c, props, 1, context, mountAll);
            dom = c.base;
            if (oldDom && dom !== oldDom) {
                oldDom._component = null;
                recollectNodeTree(oldDom, !1);
            }
        }
        return dom;
    }
    function unmountComponent(component) {
        if (options.beforeUnmount) options.beforeUnmount(component);
        var base = component.base;
        component.__x = !0;
        if (component.componentWillUnmount) component.componentWillUnmount();
        component.base = null;
        var inner = component._component;
        if (inner) unmountComponent(inner); else if (base) {
            if (base.__preactattr_ && base.__preactattr_.ref) base.__preactattr_.ref(null);
            component.__b = base;
            removeNode(base);
            collectComponent(component);
            removeChildren(base);
        }
        if (component.__r) component.__r(null);
    }
    function Component(props, context) {
        this.__d = !0;
        this.context = context;
        this.props = props;
        this.state = this.state || {};
    }
    function render(vnode, parent, merge) {
        return diff(merge, vnode, {}, !1, parent, !1);
    }
    var options = {};
    var stack = [];
    var EMPTY_CHILDREN = [];
    var defer = 'function' == typeof Promise ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;
    var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;
    var items = [];
    var mounts = [];
    var diffLevel = 0;
    var isSvgMode = !1;
    var hydrating = !1;
    var components = {};
    extend(Component.prototype, {
        setState: function(state, callback) {
            var s = this.state;
            if (!this.__s) this.__s = extend({}, s);
            extend(s, 'function' == typeof state ? state(s, this.props) : state);
            if (callback) (this.__h = this.__h || []).push(callback);
            enqueueRender(this);
        },
        forceUpdate: function(callback) {
            if (callback) (this.__h = this.__h || []).push(callback);
            renderComponent(this, 2);
        },
        render: function() {}
    });
    var preact = {
        h: h,
        createElement: h,
        cloneElement: cloneElement,
        Component: Component,
        render: render,
        rerender: rerender,
        options: options
    };
    if ('undefined' != typeof module) module.exports = preact; else self.preact = preact;
}();

},{}],9:[function(require,module,exports){
module.exports = prettierBytes

function prettierBytes (num) {
  if (typeof num !== 'number' || isNaN(num)) {
    throw new TypeError('Expected a number, got ' + typeof num)
  }

  var neg = num < 0
  var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  if (neg) {
    num = -num
  }

  if (num < 1) {
    return (neg ? '-' : '') + num + ' B'
  }

  var exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
  num = Number(num / Math.pow(1000, exponent))
  var unit = units[exponent]

  if (num >= 10 || num % 1 === 0) {
    // Do not show decimals when the number is two-digit, or if the number has no
    // decimal component.
    return (neg ? '-' : '') + num.toFixed(0) + ' ' + unit
  } else {
    return (neg ? '-' : '') + num.toFixed(1) + ' ' + unit
  }
}

},{}],10:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  # wildcard

  Very simple wildcard matching, which is designed to provide the same
  functionality that is found in the
  [eve](https://github.com/adobe-webplatform/eve) eventing library.

  ## Usage

  It works with strings:

  <<< examples/strings.js

  Arrays:

  <<< examples/arrays.js

  Objects (matching against keys):

  <<< examples/objects.js

  While the library works in Node, if you are are looking for file-based
  wildcard matching then you should have a look at:

  <https://github.com/isaacs/node-glob>
**/

function WildcardMatcher(text, separator) {
  this.text = text = text || '';
  this.hasWild = ~text.indexOf('*');
  this.separator = separator;
  this.parts = text.split(separator);
}

WildcardMatcher.prototype.match = function(input) {
  var matches = true;
  var parts = this.parts;
  var ii;
  var partsCount = parts.length;
  var testParts;

  if (typeof input == 'string' || input instanceof String) {
    if (!this.hasWild && this.text != input) {
      matches = false;
    } else {
      testParts = (input || '').split(this.separator);
      for (ii = 0; matches && ii < partsCount; ii++) {
        if (parts[ii] === '*')  {
          continue;
        } else if (ii < testParts.length) {
          matches = parts[ii] === testParts[ii];
        } else {
          matches = false;
        }
      }

      // If matches, then return the component parts
      matches = matches && testParts;
    }
  }
  else if (typeof input.splice == 'function') {
    matches = [];

    for (ii = input.length; ii--; ) {
      if (this.match(input[ii])) {
        matches[matches.length] = input[ii];
      }
    }
  }
  else if (typeof input == 'object') {
    matches = {};

    for (var key in input) {
      if (this.match(key)) {
        matches[key] = input[key];
      }
    }
  }

  return matches;
};

module.exports = function(text, test, separator) {
  var matcher = new WildcardMatcher(text, separator || /[\/\.]/);
  if (typeof test != 'undefined') {
    return matcher.match(test);
  }

  return matcher;
};

},{}],11:[function(require,module,exports){
(function (global){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Utils = require('../core/Utils');
var Translator = require('../core/Translator');
var ee = require('namespace-emitter');
var cuid = require('cuid');
var throttle = require('lodash.throttle');
var prettyBytes = require('prettier-bytes');
var match = require('mime-match');
var DefaultStore = require('../store/DefaultStore');

/**
 * Uppy Core module.
 * Manages plugins, state updates, acts as an event bus,
 * adds/removes files and metadata.
 *
 * @param {object} opts — Uppy options
 */

var Uppy = function () {
  function Uppy(opts) {
    var _this = this;

    _classCallCheck(this, Uppy);

    var defaultLocale = {
      strings: {
        youCanOnlyUploadX: {
          0: 'You can only upload %{smart_count} file',
          1: 'You can only upload %{smart_count} files'
        },
        youHaveToAtLeastSelectX: {
          0: 'You have to select at least %{smart_count} file',
          1: 'You have to select at least %{smart_count} files'
        },
        exceedsSize: 'This file exceeds maximum allowed size of',
        youCanOnlyUploadFileTypes: 'You can only upload:',
        uppyServerError: 'Connection with Uppy Server failed'
      }

      // set default options
    };var defaultOptions = {
      id: 'uppy',
      autoProceed: true,
      debug: false,
      restrictions: {
        maxFileSize: false,
        maxNumberOfFiles: false,
        minNumberOfFiles: false,
        allowedFileTypes: false
      },
      meta: {},
      onBeforeFileAdded: function onBeforeFileAdded(currentFile, files) {
        return _Promise.resolve();
      },
      onBeforeUpload: function onBeforeUpload(files) {
        return _Promise.resolve();
      },
      locale: defaultLocale,
      store: new DefaultStore()

      // Merge default options with the ones set by user
    };this.opts = _extends({}, defaultOptions, opts);
    this.opts.restrictions = _extends({}, defaultOptions.restrictions, this.opts.restrictions);

    this.locale = _extends({}, defaultLocale, this.opts.locale);
    this.locale.strings = _extends({}, defaultLocale.strings, this.opts.locale.strings);

    // i18n
    this.translator = new Translator({ locale: this.locale });
    this.i18n = this.translator.translate.bind(this.translator);

    // Container for different types of plugins
    this.plugins = {};

    this.getState = this.getState.bind(this);
    this.getPlugin = this.getPlugin.bind(this);
    this.setFileMeta = this.setFileMeta.bind(this);
    this.setFileState = this.setFileState.bind(this);
    this.log = this.log.bind(this);
    this.info = this.info.bind(this);
    this.hideInfo = this.hideInfo.bind(this);
    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.pauseResume = this.pauseResume.bind(this);
    this._calculateProgress = this._calculateProgress.bind(this);
    this.updateOnlineStatus = this.updateOnlineStatus.bind(this);
    this.resetProgress = this.resetProgress.bind(this);

    this.pauseAll = this.pauseAll.bind(this);
    this.resumeAll = this.resumeAll.bind(this);
    this.retryAll = this.retryAll.bind(this);
    this.cancelAll = this.cancelAll.bind(this);
    this.retryUpload = this.retryUpload.bind(this);
    this.upload = this.upload.bind(this);

    this.emitter = ee();
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.once = this.emitter.once.bind(this.emitter);
    this.emit = this.emitter.emit.bind(this.emitter);

    this.preProcessors = [];
    this.uploaders = [];
    this.postProcessors = [];

    this.store = this.opts.store;
    this.setState({
      plugins: {},
      files: {},
      currentUploads: {},
      capabilities: {
        resumableUploads: false
      },
      totalProgress: 0,
      meta: _extends({}, this.opts.meta),
      info: {
        isHidden: true,
        type: 'info',
        message: ''
      }
    });

    this._storeUnsubscribe = this.store.subscribe(function (prevState, nextState, patch) {
      _this.emit('state-update', prevState, nextState, patch);
      _this.updateAll(nextState);
    });

    // for debugging and testing
    // this.updateNum = 0
    if (this.opts.debug) {
      global.uppyLog = '';
      global[this.opts.id] = this;
    }
  }

  Uppy.prototype.on = function on(event, callback) {
    this.emitter.on(event, callback);
    return this;
  };

  Uppy.prototype.off = function off(event, callback) {
    this.emitter.off(event, callback);
    return this;
  };

  /**
   * Iterate on all plugins and run `update` on them.
   * Called each time state changes.
   *
   */


  Uppy.prototype.updateAll = function updateAll(state) {
    this.iteratePlugins(function (plugin) {
      plugin.update(state);
    });
  };

  /**
   * Updates state
   *
   * @param {patch} object
   */


  Uppy.prototype.setState = function setState(patch) {
    this.store.setState(patch);
  };

  /**
   * Returns current state.
   */


  Uppy.prototype.getState = function getState() {
    return this.store.getState();
  };

  /**
  * Back compat for when this.state is used instead of this.getState().
  */


  /**
  * Shorthand to set state for a specific file.
  */
  Uppy.prototype.setFileState = function setFileState(fileID, state) {
    var _extends2;

    this.setState({
      files: _extends({}, this.getState().files, (_extends2 = {}, _extends2[fileID] = _extends({}, this.getState().files[fileID], state), _extends2))
    });
  };

  Uppy.prototype.resetProgress = function resetProgress() {
    var defaultProgress = {
      percentage: 0,
      bytesUploaded: 0,
      uploadComplete: false,
      uploadStarted: false
    };
    var files = _extends({}, this.getState().files);
    var updatedFiles = {};
    Object.keys(files).forEach(function (fileID) {
      var updatedFile = _extends({}, files[fileID]);
      updatedFile.progress = _extends({}, updatedFile.progress, defaultProgress);
      updatedFiles[fileID] = updatedFile;
    });

    this.setState({
      files: updatedFiles,
      totalProgress: 0
    });

    // TODO Document on the website
    this.emit('reset-progress');
  };

  Uppy.prototype.addPreProcessor = function addPreProcessor(fn) {
    this.preProcessors.push(fn);
  };

  Uppy.prototype.removePreProcessor = function removePreProcessor(fn) {
    var i = this.preProcessors.indexOf(fn);
    if (i !== -1) {
      this.preProcessors.splice(i, 1);
    }
  };

  Uppy.prototype.addPostProcessor = function addPostProcessor(fn) {
    this.postProcessors.push(fn);
  };

  Uppy.prototype.removePostProcessor = function removePostProcessor(fn) {
    var i = this.postProcessors.indexOf(fn);
    if (i !== -1) {
      this.postProcessors.splice(i, 1);
    }
  };

  Uppy.prototype.addUploader = function addUploader(fn) {
    this.uploaders.push(fn);
  };

  Uppy.prototype.removeUploader = function removeUploader(fn) {
    var i = this.uploaders.indexOf(fn);
    if (i !== -1) {
      this.uploaders.splice(i, 1);
    }
  };

  Uppy.prototype.setMeta = function setMeta(data) {
    var updatedMeta = _extends({}, this.getState().meta, data);
    var updatedFiles = _extends({}, this.getState().files);

    Object.keys(updatedFiles).forEach(function (fileID) {
      updatedFiles[fileID] = _extends({}, updatedFiles[fileID], {
        meta: _extends({}, updatedFiles[fileID].meta, data)
      });
    });

    this.log('Adding metadata:');
    this.log(data);

    this.setState({
      meta: updatedMeta,
      files: updatedFiles
    });
  };

  Uppy.prototype.setFileMeta = function setFileMeta(fileID, data) {
    var updatedFiles = _extends({}, this.getState().files);
    if (!updatedFiles[fileID]) {
      this.log('Was trying to set metadata for a file that’s not with us anymore: ', fileID);
      return;
    }
    var newMeta = _extends({}, updatedFiles[fileID].meta, data);
    updatedFiles[fileID] = _extends({}, updatedFiles[fileID], {
      meta: newMeta
    });
    this.setState({ files: updatedFiles });
  };

  /**
   * Get a file object.
   *
   * @param {string} fileID The ID of the file object to return.
   */


  Uppy.prototype.getFile = function getFile(fileID) {
    return this.getState().files[fileID];
  };

  /**
  * Check if minNumberOfFiles restriction is reached before uploading.
  *
  * @return {boolean}
  * @private
  */


  Uppy.prototype._checkMinNumberOfFiles = function _checkMinNumberOfFiles() {
    var minNumberOfFiles = this.opts.restrictions.minNumberOfFiles;

    if (Object.keys(this.getState().files).length < minNumberOfFiles) {
      throw new Error('' + this.i18n('youHaveToAtLeastSelectX', { smart_count: minNumberOfFiles }));
    }
  };

  /**
  * Check if file passes a set of restrictions set in options: maxFileSize,
  * maxNumberOfFiles and allowedFileTypes.
  *
  * @param {object} file object to check
  * @private
  */


  Uppy.prototype._checkRestrictions = function _checkRestrictions(file) {
    var _opts$restrictions = this.opts.restrictions,
        maxFileSize = _opts$restrictions.maxFileSize,
        maxNumberOfFiles = _opts$restrictions.maxNumberOfFiles,
        allowedFileTypes = _opts$restrictions.allowedFileTypes;


    if (maxNumberOfFiles) {
      if (Object.keys(this.getState().files).length + 1 > maxNumberOfFiles) {
        throw new Error('' + this.i18n('youCanOnlyUploadX', { smart_count: maxNumberOfFiles }));
      }
    }

    if (allowedFileTypes) {
      var isCorrectFileType = allowedFileTypes.filter(function (type) {
        if (!file.type) return false;
        return match(file.type, type);
      }).length > 0;

      if (!isCorrectFileType) {
        var allowedFileTypesString = allowedFileTypes.join(', ');
        throw new Error(this.i18n('youCanOnlyUploadFileTypes') + ' ' + allowedFileTypesString);
      }
    }

    if (maxFileSize) {
      if (file.data.size > maxFileSize) {
        throw new Error(this.i18n('exceedsSize') + ' ' + prettyBytes(maxFileSize));
      }
    }
  };

  /**
  * Add a new file to `state.files`. This will run `onBeforeFileAdded`,
  * try to guess file type in a clever way, check file against restrictions,
  * and start an upload if `autoProceed === true`.
  *
  * @param {object} file object to add
  */


  Uppy.prototype.addFile = function addFile(file) {
    var _this2 = this;

    return _Promise.resolve()
    // Wrap this in a Promise `.then()` handler so errors will reject the Promise
    // instead of throwing.
    .then(function () {
      return _this2.opts.onBeforeFileAdded(file, _this2.getState().files);
    }).then(function () {
      return Utils.getFileType(file);
    }).then(function (fileType) {
      var updatedFiles = _extends({}, _this2.getState().files);
      var fileName = void 0;
      if (file.name) {
        fileName = file.name;
      } else if (fileType.split('/')[0] === 'image') {
        fileName = fileType.split('/')[0] + '.' + fileType.split('/')[1];
      } else {
        fileName = 'noname';
      }
      var fileExtension = Utils.getFileNameAndExtension(fileName).extension;
      var isRemote = file.isRemote || false;

      var fileID = Utils.generateFileID(file);

      var newFile = {
        source: file.source || '',
        id: fileID,
        name: fileName,
        extension: fileExtension || '',
        meta: _extends({}, _this2.getState().meta, {
          name: fileName,
          type: fileType
        }),
        type: fileType,
        data: file.data,
        progress: {
          percentage: 0,
          bytesUploaded: 0,
          bytesTotal: file.data.size || 0,
          uploadComplete: false,
          uploadStarted: false
        },
        size: file.data.size || 0,
        isRemote: isRemote,
        remote: file.remote || '',
        preview: file.preview
      };

      _this2._checkRestrictions(newFile);

      updatedFiles[fileID] = newFile;
      _this2.setState({ files: updatedFiles });

      _this2.emit('file-added', newFile);
      _this2.log('Added file: ' + fileName + ', ' + fileID + ', mime type: ' + fileType);

      if (_this2.opts.autoProceed && !_this2.scheduledAutoProceed) {
        _this2.scheduledAutoProceed = setTimeout(function () {
          _this2.scheduledAutoProceed = null;
          _this2.upload().catch(function (err) {
            console.error(err.stack || err.message || err);
          });
        }, 4);
      }
    }).catch(function (err) {
      var message = (typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err.message : err;
      _this2.log(message);
      _this2.info(message, 'error', 5000);
      return _Promise.reject((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err : new Error(err));
    });
  };

  Uppy.prototype.removeFile = function removeFile(fileID) {
    var _this3 = this;

    var _state = this.state,
        files = _state.files,
        currentUploads = _state.currentUploads;

    var updatedFiles = _extends({}, files);
    var removedFile = updatedFiles[fileID];
    delete updatedFiles[fileID];

    // Remove this file from its `currentUpload`.
    var updatedUploads = _extends({}, currentUploads);
    var removeUploads = [];
    Object.keys(updatedUploads).forEach(function (uploadID) {
      var newFileIDs = currentUploads[uploadID].fileIDs.filter(function (uploadFileID) {
        return uploadFileID !== fileID;
      });
      // Remove the upload if no files are associated with it anymore.
      if (newFileIDs.length === 0) {
        removeUploads.push(uploadID);
        return;
      }

      updatedUploads[uploadID] = _extends({}, currentUploads[uploadID], {
        fileIDs: newFileIDs
      });
    });

    this.setState({
      currentUploads: updatedUploads,
      files: updatedFiles
    });

    removeUploads.forEach(function (uploadID) {
      _this3._removeUpload(uploadID);
    });

    this._calculateTotalProgress();
    this.emit('file-removed', removedFile);
    this.log('File removed: ' + removedFile.id);

    // Clean up object URLs.
    if (removedFile.preview && Utils.isObjectURL(removedFile.preview)) {
      URL.revokeObjectURL(removedFile.preview);
    }

    this.log('Removed file: ' + fileID);
  };

  Uppy.prototype.pauseResume = function pauseResume(fileID) {
    var updatedFiles = _extends({}, this.getState().files);

    if (updatedFiles[fileID].uploadComplete) return;

    var wasPaused = updatedFiles[fileID].isPaused || false;
    var isPaused = !wasPaused;

    var updatedFile = _extends({}, updatedFiles[fileID], {
      isPaused: isPaused
    });

    updatedFiles[fileID] = updatedFile;
    this.setState({ files: updatedFiles });

    this.emit('upload-pause', fileID, isPaused);

    return isPaused;
  };

  Uppy.prototype.pauseAll = function pauseAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var inProgressUpdatedFiles = Object.keys(updatedFiles).filter(function (file) {
      return !updatedFiles[file].progress.uploadComplete && updatedFiles[file].progress.uploadStarted;
    });

    inProgressUpdatedFiles.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: true
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({ files: updatedFiles });

    this.emit('pause-all');
  };

  Uppy.prototype.resumeAll = function resumeAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var inProgressUpdatedFiles = Object.keys(updatedFiles).filter(function (file) {
      return !updatedFiles[file].progress.uploadComplete && updatedFiles[file].progress.uploadStarted;
    });

    inProgressUpdatedFiles.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: false,
        error: null
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({ files: updatedFiles });

    this.emit('resume-all');
  };

  Uppy.prototype.retryAll = function retryAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var filesToRetry = Object.keys(updatedFiles).filter(function (file) {
      return updatedFiles[file].error;
    });

    filesToRetry.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: false,
        error: null
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({
      files: updatedFiles,
      error: null
    });

    this.emit('retry-all', filesToRetry);

    var uploadID = this._createUpload(filesToRetry);
    return this._runUpload(uploadID);
  };

  Uppy.prototype.cancelAll = function cancelAll() {
    var _this4 = this;

    this.emit('cancel-all');

    // TODO Or should we just call removeFile on all files?

    var _getState = this.getState(),
        currentUploads = _getState.currentUploads;

    var uploadIDs = Object.keys(currentUploads);

    uploadIDs.forEach(function (id) {
      _this4._removeUpload(id);
    });

    this.setState({
      files: {},
      totalProgress: 0
    });
  };

  Uppy.prototype.retryUpload = function retryUpload(fileID) {
    var updatedFiles = _extends({}, this.getState().files);
    var updatedFile = _extends({}, updatedFiles[fileID], { error: null, isPaused: false });
    updatedFiles[fileID] = updatedFile;
    this.setState({
      files: updatedFiles
    });

    this.emit('upload-retry', fileID);

    var uploadID = this._createUpload([fileID]);
    return this._runUpload(uploadID);
  };

  Uppy.prototype.reset = function reset() {
    this.cancelAll();
  };

  Uppy.prototype._calculateProgress = function _calculateProgress(file, data) {
    if (!this.getFile(file.id)) {
      this.log('Not setting progress for a file that has been removed: ' + file.id);
      return;
    }

    this.setFileState(file.id, {
      progress: _extends({}, this.getFile(file.id).progress, {
        bytesUploaded: data.bytesUploaded,
        bytesTotal: data.bytesTotal,
        percentage: Math.floor((data.bytesUploaded / data.bytesTotal * 100).toFixed(2))
      })
    });

    this._calculateTotalProgress();
  };

  Uppy.prototype._calculateTotalProgress = function _calculateTotalProgress() {
    // calculate total progress, using the number of files currently uploading,
    // multiplied by 100 and the summ of individual progress of each file
    var files = _extends({}, this.getState().files);

    var inProgress = Object.keys(files).filter(function (file) {
      return files[file].progress.uploadStarted;
    });
    var progressMax = inProgress.length * 100;
    var progressAll = 0;
    inProgress.forEach(function (file) {
      progressAll = progressAll + files[file].progress.percentage;
    });

    var totalProgress = progressMax === 0 ? 0 : Math.floor((progressAll * 100 / progressMax).toFixed(2));

    this.setState({
      totalProgress: totalProgress
    });
  };

  /**
   * Registers listeners for all global actions, like:
   * `error`, `file-removed`, `upload-progress`
   *
   */


  Uppy.prototype.actions = function actions() {
    var _this5 = this;

    // const log = this.log
    // this.on('*', function (payload) {
    //   log(`[Core] Event: ${this.event}`)
    //   log(payload)
    // })

    // stress-test re-rendering
    // setInterval(() => {
    //   this.setState({bla: 'bla'})
    // }, 20)

    this.on('error', function (error) {
      _this5.setState({ error: error.message });
    });

    this.on('upload-error', function (file, error) {
      _this5.setFileState(file.id, { error: error.message });
      _this5.setState({ error: error.message });

      var message = 'Failed to upload ' + file.name;
      if ((typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' && error.message) {
        message = { message: message, details: error.message };
      }
      _this5.info(message, 'error', 5000);
    });

    this.on('upload', function () {
      _this5.setState({ error: null });
    });

    this.on('upload-started', function (file, upload) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getFile(file.id), {
          uploadStarted: Date.now(),
          uploadComplete: false,
          percentage: 0,
          bytesUploaded: 0,
          bytesTotal: file.size
        })
      });
    });

    // upload progress events can occur frequently, especially when you have a good
    // connection to the remote server. Therefore, we are throtteling them to
    // prevent accessive function calls.
    // see also: https://github.com/tus/tus-js-client/commit/9940f27b2361fd7e10ba58b09b60d82422183bbb
    var _throttledCalculateProgress = throttle(this._calculateProgress, 100, { leading: true, trailing: true });

    this.on('upload-progress', _throttledCalculateProgress);

    this.on('upload-success', function (file, uploadResp, uploadURL) {
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getFile(file.id).progress, {
          uploadComplete: true,
          percentage: 100
        }),
        uploadURL: uploadURL,
        isPaused: false
      });

      _this5._calculateTotalProgress();
    });

    this.on('preprocess-progress', function (file, progress) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getFile(file.id).progress, {
          preprocess: progress
        })
      });
    });

    this.on('preprocess-complete', function (file) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      var files = _extends({}, _this5.getState().files);
      files[file.id] = _extends({}, files[file.id], {
        progress: _extends({}, files[file.id].progress)
      });
      delete files[file.id].progress.preprocess;

      _this5.setState({ files: files });
    });

    this.on('postprocess-progress', function (file, progress) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getState().files[file.id].progress, {
          postprocess: progress
        })
      });
    });

    this.on('postprocess-complete', function (file) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      var files = _extends({}, _this5.getState().files);
      files[file.id] = _extends({}, files[file.id], {
        progress: _extends({}, files[file.id].progress)
      });
      delete files[file.id].progress.postprocess;
      // TODO should we set some kind of `fullyComplete` property on the file object
      // so it's easier to see that the file is upload…fully complete…rather than
      // what we have to do now (`uploadComplete && !postprocess`)

      _this5.setState({ files: files });
    });

    this.on('restored', function () {
      // Files may have changed--ensure progress is still accurate.
      _this5._calculateTotalProgress();
    });

    // show informer if offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', function () {
        return _this5.updateOnlineStatus();
      });
      window.addEventListener('offline', function () {
        return _this5.updateOnlineStatus();
      });
      setTimeout(function () {
        return _this5.updateOnlineStatus();
      }, 3000);
    }
  };

  Uppy.prototype.updateOnlineStatus = function updateOnlineStatus() {
    var online = typeof window.navigator.onLine !== 'undefined' ? window.navigator.onLine : true;
    if (!online) {
      this.emit('is-offline');
      this.info('No internet connection', 'error', 0);
      this.wasOffline = true;
    } else {
      this.emit('is-online');
      if (this.wasOffline) {
        this.emit('back-online');
        this.info('Connected!', 'success', 3000);
        this.wasOffline = false;
      }
    }
  };

  Uppy.prototype.getID = function getID() {
    return this.opts.id;
  };

  /**
   * Registers a plugin with Core.
   *
   * @param {Class} Plugin object
   * @param {Object} options object that will be passed to Plugin later
   * @return {Object} self for chaining
   */


  Uppy.prototype.use = function use(Plugin, opts) {
    if (typeof Plugin !== 'function') {
      var msg = 'Expected a plugin class, but got ' + (Plugin === null ? 'null' : typeof Plugin === 'undefined' ? 'undefined' : _typeof(Plugin)) + '.' + ' Please verify that the plugin was imported and spelled correctly.';
      throw new TypeError(msg);
    }

    // Instantiate
    var plugin = new Plugin(this, opts);
    var pluginId = plugin.id;
    this.plugins[plugin.type] = this.plugins[plugin.type] || [];

    if (!pluginId) {
      throw new Error('Your plugin must have an id');
    }

    if (!plugin.type) {
      throw new Error('Your plugin must have a type');
    }

    var existsPluginAlready = this.getPlugin(pluginId);
    if (existsPluginAlready) {
      var _msg = 'Already found a plugin named \'' + existsPluginAlready.id + '\'.\n        Tried to use: \'' + pluginId + '\'.\n        Uppy is currently limited to running one of every plugin.\n        Share your use case with us over at\n        https://github.com/transloadit/uppy/issues/\n        if you want us to reconsider.';
      throw new Error(_msg);
    }

    this.plugins[plugin.type].push(plugin);
    plugin.install();

    return this;
  };

  /**
   * Find one Plugin by name.
   *
   * @param string name description
   */


  Uppy.prototype.getPlugin = function getPlugin(name) {
    var foundPlugin = false;
    this.iteratePlugins(function (plugin) {
      var pluginName = plugin.id;
      if (pluginName === name) {
        foundPlugin = plugin;
        return false;
      }
    });
    return foundPlugin;
  };

  /**
   * Iterate through all `use`d plugins.
   *
   * @param function method description
   */


  Uppy.prototype.iteratePlugins = function iteratePlugins(method) {
    var _this6 = this;

    Object.keys(this.plugins).forEach(function (pluginType) {
      _this6.plugins[pluginType].forEach(method);
    });
  };

  /**
   * Uninstall and remove a plugin.
   *
   * @param {Plugin} instance The plugin instance to remove.
   */


  Uppy.prototype.removePlugin = function removePlugin(instance) {
    var list = this.plugins[instance.type];

    if (instance.uninstall) {
      instance.uninstall();
    }

    var index = list.indexOf(instance);
    if (index !== -1) {
      list.splice(index, 1);
    }
  };

  /**
   * Uninstall all plugins and close down this Uppy instance.
   */


  Uppy.prototype.close = function close() {
    this.reset();

    this._storeUnsubscribe();

    this.iteratePlugins(function (plugin) {
      plugin.uninstall();
    });
  };

  /**
  * Set info message in `state.info`, so that UI plugins like `Informer`
  * can display the message.
  *
  * @param {string} msg Message to be displayed by the informer
  */

  Uppy.prototype.info = function info(message) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3000;

    var isComplexMessage = (typeof message === 'undefined' ? 'undefined' : _typeof(message)) === 'object';

    this.setState({
      info: {
        isHidden: false,
        type: type,
        message: isComplexMessage ? message.message : message,
        details: isComplexMessage ? message.details : null
      }
    });

    this.emit('info-visible');

    window.clearTimeout(this.infoTimeoutID);
    if (duration === 0) {
      this.infoTimeoutID = undefined;
      return;
    }

    // hide the informer after `duration` milliseconds
    this.infoTimeoutID = setTimeout(this.hideInfo, duration);
  };

  Uppy.prototype.hideInfo = function hideInfo() {
    var newInfo = _extends({}, this.getState().info, {
      isHidden: true
    });
    this.setState({
      info: newInfo
    });
    this.emit('info-hidden');
  };

  /**
   * Logs stuff to console, only if `debug` is set to true. Silent in production.
   *
   * @param {String|Object} msg to log
   * @param {String} type optional `error` or `warning`
   */


  Uppy.prototype.log = function log(msg, type) {
    if (!this.opts.debug) {
      return;
    }

    var message = '[Uppy] [' + Utils.getTimeStamp() + '] ' + msg;

    global.uppyLog = global.uppyLog + '\n' + 'DEBUG LOG: ' + msg;

    if (type === 'error') {
      console.error(message);
      return;
    }

    if (type === 'warning') {
      console.warn(message);
      return;
    }

    if (msg === '' + msg) {
      console.log(message);
    } else {
      message = '[Uppy] [' + Utils.getTimeStamp() + ']';
      console.log(message);
      console.dir(msg);
    }
  };

  /**
   * Initializes actions.
   *
   */


  Uppy.prototype.run = function run() {
    this.log('Core is run, initializing actions...');
    this.actions();

    return this;
  };

  /**
   * Restore an upload by its ID.
   */


  Uppy.prototype.restore = function restore(uploadID) {
    this.log('Core: attempting to restore upload "' + uploadID + '"');

    if (!this.getState().currentUploads[uploadID]) {
      this._removeUpload(uploadID);
      return _Promise.reject(new Error('Nonexistent upload'));
    }

    return this._runUpload(uploadID);
  };

  /**
   * Create an upload for a bunch of files.
   *
   * @param {Array<string>} fileIDs File IDs to include in this upload.
   * @return {string} ID of this upload.
   */


  Uppy.prototype._createUpload = function _createUpload(fileIDs) {
    var _extends3;

    var uploadID = cuid();

    this.emit('upload', {
      id: uploadID,
      fileIDs: fileIDs
    });

    this.setState({
      currentUploads: _extends({}, this.getState().currentUploads, (_extends3 = {}, _extends3[uploadID] = {
        fileIDs: fileIDs,
        step: 0,
        result: {}
      }, _extends3))
    });

    return uploadID;
  };

  Uppy.prototype._getUpload = function _getUpload(uploadID) {
    return this.getState().currentUploads[uploadID];
  };

  /**
   * Add data to an upload's result object.
   *
   * @param {string} uploadID The ID of the upload.
   * @param {object} data Data properties to add to the result object.
   */


  Uppy.prototype.addResultData = function addResultData(uploadID, data) {
    var _extends4;

    if (!this._getUpload(uploadID)) {
      this.log('Not setting result for an upload that has been removed: ' + uploadID);
      return;
    }
    var currentUploads = this.getState().currentUploads;
    var currentUpload = _extends({}, currentUploads[uploadID], {
      result: _extends({}, currentUploads[uploadID].result, data)
    });
    this.setState({
      currentUploads: _extends({}, currentUploads, (_extends4 = {}, _extends4[uploadID] = currentUpload, _extends4))
    });
  };

  /**
   * Remove an upload, eg. if it has been canceled or completed.
   *
   * @param {string} uploadID The ID of the upload.
   */


  Uppy.prototype._removeUpload = function _removeUpload(uploadID) {
    var currentUploads = _extends({}, this.getState().currentUploads);
    delete currentUploads[uploadID];

    this.setState({
      currentUploads: currentUploads
    });
  };

  /**
   * Run an upload. This picks up where it left off in case the upload is being restored.
   *
   * @private
   */


  Uppy.prototype._runUpload = function _runUpload(uploadID) {
    var _this7 = this;

    var uploadData = this.getState().currentUploads[uploadID];
    var fileIDs = uploadData.fileIDs;
    var restoreStep = uploadData.step;

    var steps = [].concat(this.preProcessors, this.uploaders, this.postProcessors);
    var lastStep = _Promise.resolve();
    steps.forEach(function (fn, step) {
      // Skip this step if we are restoring and have already completed this step before.
      if (step < restoreStep) {
        return;
      }

      lastStep = lastStep.then(function () {
        var _extends5;

        var _getState2 = _this7.getState(),
            currentUploads = _getState2.currentUploads;

        var currentUpload = _extends({}, currentUploads[uploadID], {
          step: step
        });
        _this7.setState({
          currentUploads: _extends({}, currentUploads, (_extends5 = {}, _extends5[uploadID] = currentUpload, _extends5))
        });
        // TODO give this the `currentUpload` object as its only parameter maybe?
        // Otherwise when more metadata may be added to the upload this would keep getting more parameters
        return fn(fileIDs, uploadID);
      }).then(function (result) {
        return null;
      });
    });

    // Not returning the `catch`ed promise, because we still want to return a rejected
    // promise from this method if the upload failed.
    lastStep.catch(function (err) {
      _this7.emit('error', err);

      _this7._removeUpload(uploadID);
    });

    return lastStep.then(function () {
      var files = fileIDs.map(function (fileID) {
        return _this7.getFile(fileID);
      });
      var successful = files.filter(function (file) {
        return file && !file.error;
      });
      var failed = files.filter(function (file) {
        return file && file.error;
      });
      _this7.addResultData(uploadID, { successful: successful, failed: failed, uploadID: uploadID });

      var _getState3 = _this7.getState(),
          currentUploads = _getState3.currentUploads;

      if (!currentUploads[uploadID]) {
        _this7.log('Not setting result for an upload that has been removed: ' + uploadID);
        return;
      }

      var result = currentUploads[uploadID].result;
      _this7.emit('complete', result);

      _this7._removeUpload(uploadID);

      return result;
    });
  };

  /**
  * Start an upload for all the files that are not currently being uploaded.
  *
  * @return {Promise}
  */


  Uppy.prototype.upload = function upload() {
    var _this8 = this;

    if (!this.plugins.uploader) {
      this.log('No uploader type plugins are used', 'warning');
    }

    return _Promise.resolve().then(function () {
      return _this8.opts.onBeforeUpload(_this8.getState().files);
    }).then(function () {
      return _this8._checkMinNumberOfFiles();
    }).then(function () {
      var _getState4 = _this8.getState(),
          currentUploads = _getState4.currentUploads;
      // get a list of files that are currently assigned to uploads


      var currentlyUploadingFiles = Object.keys(currentUploads).reduce(function (prev, curr) {
        return prev.concat(currentUploads[curr].fileIDs);
      }, []);

      var waitingFileIDs = [];
      Object.keys(_this8.getState().files).forEach(function (fileID) {
        var file = _this8.getFile(fileID);
        // if the file hasn't started uploading and hasn't already been assigned to an upload..
        if (!file.progress.uploadStarted && currentlyUploadingFiles.indexOf(fileID) === -1) {
          waitingFileIDs.push(file.id);
        }
      });

      var uploadID = _this8._createUpload(waitingFileIDs);
      return _this8._runUpload(uploadID);
    }).catch(function (err) {
      var message = (typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err.message : err;
      _this8.log(message);
      _this8.info(message, 'error', 4000);
      return _Promise.reject((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err : new Error(err));
    });
  };

  _createClass(Uppy, [{
    key: 'state',
    get: function get() {
      return this.getState();
    }
  }]);

  return Uppy;
}();

module.exports = function (opts) {
  return new Uppy(opts);
};
// Expose class constructor.
module.exports.Uppy = Uppy;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../core/Translator":13,"../core/Utils":15,"../store/DefaultStore":19,"cuid":1,"es6-promise":4,"lodash.throttle":5,"mime-match":6,"namespace-emitter":7,"prettier-bytes":9}],12:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var preact = require('preact');

var _require = require('../core/Utils'),
    findDOMElement = _require.findDOMElement;

/**
 * Boilerplate that all Plugins share - and should not be used
 * directly. It also shows which methods final plugins should implement/override,
 * this deciding on structure.
 *
 * @param {object} main Uppy core object
 * @param {object} object with plugin options
 * @return {array | string} files or success/fail message
 */


module.exports = function () {
  function Plugin(uppy, opts) {
    _classCallCheck(this, Plugin);

    this.uppy = uppy;
    this.opts = opts || {};

    this.update = this.update.bind(this);
    this.mount = this.mount.bind(this);
    this.install = this.install.bind(this);
    this.uninstall = this.uninstall.bind(this);
  }

  Plugin.prototype.getPluginState = function getPluginState() {
    return this.uppy.state.plugins[this.id];
  };

  Plugin.prototype.setPluginState = function setPluginState(update) {
    var plugins = _extends({}, this.uppy.state.plugins);
    plugins[this.id] = _extends({}, plugins[this.id], update);

    this.uppy.setState({
      plugins: plugins
    });
  };

  Plugin.prototype.update = function update(state) {
    if (typeof this.el === 'undefined') {
      return;
    }

    if (this.updateUI) {
      this.updateUI(state);
    }
  };

  /**
   * Check if supplied `target` is a DOM element or an `object`.
   * If it’s an object — target is a plugin, and we search `plugins`
   * for a plugin with same name and return its target.
   *
   * @param {String|Object} target
   *
   */


  Plugin.prototype.mount = function mount(target, plugin) {
    var _this = this;

    var callerPluginName = plugin.id;

    var targetElement = findDOMElement(target);

    if (targetElement) {
      this.updateUI = function (state) {
        _this.el = preact.render(_this.render(state), targetElement, _this.el);
      };

      this.uppy.log('Installing ' + callerPluginName + ' to a DOM element');

      // clear everything inside the target container
      if (this.opts.replaceTargetContent) {
        targetElement.innerHTML = '';
      }

      this.el = preact.render(this.render(this.uppy.state), targetElement);

      return this.el;
    }

    var targetPlugin = void 0;
    if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target instanceof Plugin) {
      // Targeting a plugin *instance*
      targetPlugin = target;
    } else if (typeof target === 'function') {
      // Targeting a plugin type
      var Target = target;
      // Find the target plugin instance.
      this.uppy.iteratePlugins(function (plugin) {
        if (plugin instanceof Target) {
          targetPlugin = plugin;
          return false;
        }
      });
    }

    if (targetPlugin) {
      var targetPluginName = targetPlugin.id;
      this.uppy.log('Installing ' + callerPluginName + ' to ' + targetPluginName);
      this.el = targetPlugin.addTarget(plugin);
      return this.el;
    }

    this.uppy.log('Not installing ' + callerPluginName);
    throw new Error('Invalid target option given to ' + callerPluginName);
  };

  Plugin.prototype.render = function render(state) {
    throw new Error('Extend the render method to add your plugin to a DOM element');
  };

  Plugin.prototype.addTarget = function addTarget(plugin) {
    throw new Error('Extend the addTarget method to add your plugin to another plugin\'s target');
  };

  Plugin.prototype.unmount = function unmount() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    // this.target = null
  };

  Plugin.prototype.install = function install() {};

  Plugin.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return Plugin;
}();

},{"../core/Utils":15,"preact":8}],13:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Translates strings with interpolation & pluralization support.
 * Extensible with custom dictionaries and pluralization functions.
 *
 * Borrows heavily from and inspired by Polyglot https://github.com/airbnb/polyglot.js,
 * basically a stripped-down version of it. Differences: pluralization functions are not hardcoded
 * and can be easily added among with dictionaries, nested objects are used for pluralization
 * as opposed to `||||` delimeter
 *
 * Usage example: `translator.translate('files_chosen', {smart_count: 3})`
 *
 * @param {object} opts
 */
module.exports = function () {
  function Translator(opts) {
    _classCallCheck(this, Translator);

    var defaultOptions = {
      locale: {
        strings: {},
        pluralize: function pluralize(n) {
          if (n === 1) {
            return 0;
          }
          return 1;
        }
      }
    };

    this.opts = _extends({}, defaultOptions, opts);
    this.locale = _extends({}, defaultOptions.locale, opts.locale);

    // console.log(this.opts.locale)

    // this.locale.pluralize = this.locale ? this.locale.pluralize : defaultPluralize
    // this.locale.strings = Object.assign({}, en_US.strings, this.opts.locale.strings)
  }

  /**
   * Takes a string with placeholder variables like `%{smart_count} file selected`
   * and replaces it with values from options `{smart_count: 5}`
   *
   * @license https://github.com/airbnb/polyglot.js/blob/master/LICENSE
   * taken from https://github.com/airbnb/polyglot.js/blob/master/lib/polyglot.js#L299
   *
   * @param {string} phrase that needs interpolation, with placeholders
   * @param {object} options with values that will be used to replace placeholders
   * @return {string} interpolated
   */


  Translator.prototype.interpolate = function interpolate(phrase, options) {
    var replace = String.prototype.replace;
    var dollarRegex = /\$/g;
    var dollarBillsYall = '$$$$';

    for (var arg in options) {
      if (arg !== '_' && options.hasOwnProperty(arg)) {
        // Ensure replacement value is escaped to prevent special $-prefixed
        // regex replace tokens. the "$$$$" is needed because each "$" needs to
        // be escaped with "$" itself, and we need two in the resulting output.
        var replacement = options[arg];
        if (typeof replacement === 'string') {
          replacement = replace.call(options[arg], dollarRegex, dollarBillsYall);
        }
        // We create a new `RegExp` each time instead of using a more-efficient
        // string replace so that the same argument can be replaced multiple times
        // in the same phrase.
        phrase = replace.call(phrase, new RegExp('%\\{' + arg + '\\}', 'g'), replacement);
      }
    }
    return phrase;
  };

  /**
   * Public translate method
   *
   * @param {string} key
   * @param {object} options with values that will be used later to replace placeholders in string
   * @return {string} translated (and interpolated)
   */


  Translator.prototype.translate = function translate(key, options) {
    if (options && options.smart_count) {
      var plural = this.locale.pluralize(options.smart_count);
      return this.interpolate(this.opts.locale.strings[key][plural], options);
    }

    return this.interpolate(this.opts.locale.strings[key], options);
  };

  return Translator;
}();

},{}],14:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ee = require('namespace-emitter');

module.exports = function () {
  function UppySocket(opts) {
    var _this = this;

    _classCallCheck(this, UppySocket);

    this.queued = [];
    this.isOpen = false;
    this.socket = new WebSocket(opts.target);
    this.emitter = ee();

    this.socket.onopen = function (e) {
      _this.isOpen = true;

      while (_this.queued.length > 0 && _this.isOpen) {
        var first = _this.queued[0];
        _this.send(first.action, first.payload);
        _this.queued = _this.queued.slice(1);
      }
    };

    this.socket.onclose = function (e) {
      _this.isOpen = false;
    };

    this._handleMessage = this._handleMessage.bind(this);

    this.socket.onmessage = this._handleMessage;

    this.close = this.close.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.send = this.send.bind(this);
  }

  UppySocket.prototype.close = function close() {
    return this.socket.close();
  };

  UppySocket.prototype.send = function send(action, payload) {
    // attach uuid

    if (!this.isOpen) {
      this.queued.push({ action: action, payload: payload });
      return;
    }

    this.socket.send(JSON.stringify({
      action: action,
      payload: payload
    }));
  };

  UppySocket.prototype.on = function on(action, handler) {
    console.log(action);
    this.emitter.on(action, handler);
  };

  UppySocket.prototype.emit = function emit(action, payload) {
    console.log(action);
    this.emitter.emit(action, payload);
  };

  UppySocket.prototype.once = function once(action, handler) {
    this.emitter.once(action, handler);
  };

  UppySocket.prototype._handleMessage = function _handleMessage(e) {
    try {
      var message = JSON.parse(e.data);
      console.log(message);
      this.emit(message.action, message.payload);
    } catch (err) {
      console.log(err);
    }
  };

  return UppySocket;
}();

},{"namespace-emitter":7}],15:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var throttle = require('lodash.throttle');
// we inline file-type module, as opposed to using the NPM version,
// because of this https://github.com/sindresorhus/file-type/issues/78
// and https://github.com/sindresorhus/copy-text-to-clipboard/issues/5
var fileType = require('../vendor/file-type');

/**
 * A collection of small utility functions that help with dom manipulation, adding listeners,
 * promises and other good things.
 *
 * @module Utils
 */

function isTouchDevice() {
  return 'ontouchstart' in window || // works on most browsers
  navigator.maxTouchPoints; // works on IE10/11 and Surface
}

function truncateString(str, length) {
  if (str.length > length) {
    return str.substr(0, length / 2) + '...' + str.substr(str.length - length / 4, str.length);
  }
  return str;

  // more precise version if needed
  // http://stackoverflow.com/a/831583
}

function secondsToTime(rawSeconds) {
  var hours = Math.floor(rawSeconds / 3600) % 24;
  var minutes = Math.floor(rawSeconds / 60) % 60;
  var seconds = Math.floor(rawSeconds % 60);

  return { hours: hours, minutes: minutes, seconds: seconds };
}

/**
 * Converts list into array
*/
function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

/**
 * Returns a timestamp in the format of `hours:minutes:seconds`
*/
function getTimeStamp() {
  var date = new Date();
  var hours = pad(date.getHours().toString());
  var minutes = pad(date.getMinutes().toString());
  var seconds = pad(date.getSeconds().toString());
  return hours + ':' + minutes + ':' + seconds;
}

/**
 * Adds zero to strings shorter than two characters
*/
function pad(str) {
  return str.length !== 2 ? 0 + str : str;
}

/**
 * Takes a file object and turns it into fileID, by converting file.name to lowercase,
 * removing extra characters and adding type, size and lastModified
 *
 * @param {Object} file
 * @return {String} the fileID
 *
 */
function generateFileID(file) {
  // filter is needed to not join empty values with `-`
  return ['uppy', file.name ? file.name.toLowerCase().replace(/[^A-Z0-9]/ig, '') : '', file.type, file.data.size, file.data.lastModified].filter(function (val) {
    return val;
  }).join('-');
}

/**
 * Runs an array of promise-returning functions in sequence.
 */
function runPromiseSequence(functions) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var promise = _Promise.resolve();
  functions.forEach(function (func) {
    promise = promise.then(function () {
      return func.apply(undefined, args);
    });
  });
  return promise;
}

function isPreviewSupported(fileType) {
  if (!fileType) return false;
  var fileTypeSpecific = fileType.split('/')[1];
  // list of images that browsers can preview
  if (/^(jpeg|gif|png|svg|svg\+xml|bmp)$/.test(fileTypeSpecific)) {
    return true;
  }
  return false;
}

function getArrayBuffer(chunk) {
  return new _Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.addEventListener('load', function (e) {
      // e.target.result is an ArrayBuffer
      resolve(e.target.result);
    });
    reader.addEventListener('error', function (err) {
      console.error('FileReader error' + err);
      reject(err);
    });
    // file-type only needs the first 4100 bytes
    reader.readAsArrayBuffer(chunk);
  });
}

function getFileType(file) {
  var extensionsToMime = {
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'mp4': 'video/mp4',
    'mp3': 'audio/mp3',
    'svg': 'image/svg+xml',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'yaml': 'text/yaml',
    'yml': 'text/yaml'
  };

  var fileExtension = file.name ? getFileNameAndExtension(file.name).extension : null;

  if (file.isRemote) {
    // some remote providers do not support file types
    var mime = file.type ? file.type : extensionsToMime[fileExtension];
    return _Promise.resolve(mime);
  }

  // 1. try to determine file type from magic bytes with file-type module
  // this should be the most trustworthy way
  var chunk = file.data.slice(0, 4100);
  return getArrayBuffer(chunk).then(function (buffer) {
    var type = fileType(buffer);
    if (type && type.mime) {
      return type.mime;
    }

    // 2. if that’s no good, check if mime type is set in the file object
    if (file.type) {
      return file.type;
    }

    // 3. if that’s no good, see if we can map extension to a mime type
    if (fileExtension && extensionsToMime[fileExtension]) {
      return extensionsToMime[fileExtension];
    }

    // if all fails, well, return empty
    return null;
  }).catch(function () {
    return null;
  });
}

// TODO Check which types are actually supported in browsers. Chrome likes webm
// from my testing, but we may need more.
// We could use a library but they tend to contain dozens of KBs of mappings,
// most of which will go unused, so not sure if that's worth it.
var mimeToExtensions = {
  'video/ogg': 'ogv',
  'audio/ogg': 'ogg',
  'video/webm': 'webm',
  'audio/webm': 'webm',
  'video/mp4': 'mp4',
  'audio/mp3': 'mp3'
};

function getFileTypeExtension(mimeType) {
  return mimeToExtensions[mimeType] || null;
}

/**
* Takes a full filename string and returns an object {name, extension}
*
* @param {string} fullFileName
* @return {object} {name, extension}
*/
function getFileNameAndExtension(fullFileName) {
  var re = /(?:\.([^.]+))?$/;
  var fileExt = re.exec(fullFileName)[1];
  var fileName = fullFileName.replace('.' + fileExt, '');
  return {
    name: fileName,
    extension: fileExt
  };
}

/**
 * Check if a URL string is an object URL from `URL.createObjectURL`.
 *
 * @param {string} url
 * @return {boolean}
 */
function isObjectURL(url) {
  return url.indexOf('blob:') === 0;
}

function getProportionalHeight(img, width) {
  var aspect = img.width / img.height;
  return Math.round(width / aspect);
}

/**
 * Create a thumbnail for the given Uppy file object.
 *
 * @param {{data: Blob}} file
 * @param {number} width
 * @return {Promise}
 */
function createThumbnail(file, targetWidth) {
  var originalUrl = URL.createObjectURL(file.data);
  var onload = new _Promise(function (resolve, reject) {
    var image = new Image();
    image.src = originalUrl;
    image.onload = function () {
      URL.revokeObjectURL(originalUrl);
      resolve(image);
    };
    image.onerror = function () {
      // The onerror event is totally useless unfortunately, as far as I know
      URL.revokeObjectURL(originalUrl);
      reject(new Error('Could not create thumbnail'));
    };
  });

  return onload.then(function (image) {
    var targetHeight = getProportionalHeight(image, targetWidth);
    var canvas = resizeImage(image, targetWidth, targetHeight);
    return canvasToBlob(canvas, 'image/png');
  }).then(function (blob) {
    return URL.createObjectURL(blob);
  });
}

/**
 * Resize an image to the target `width` and `height`.
 *
 * Returns a Canvas with the resized image on it.
 */
function resizeImage(image, targetWidth, targetHeight) {
  var sourceWidth = image.width;
  var sourceHeight = image.height;

  if (targetHeight < image.height / 2) {
    var steps = Math.floor(Math.log(image.width / targetWidth) / Math.log(2));
    var stepScaled = downScaleInSteps(image, steps);
    image = stepScaled.image;
    sourceWidth = stepScaled.sourceWidth;
    sourceHeight = stepScaled.sourceHeight;
  }

  var canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  var context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

  return canvas;
}

/**
 * Downscale an image by 50% `steps` times.
 */
function downScaleInSteps(image, steps) {
  var source = image;
  var currentWidth = source.width;
  var currentHeight = source.height;

  for (var i = 0; i < steps; i += 1) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = currentWidth / 2;
    canvas.height = currentHeight / 2;
    context.drawImage(source,
    // The entire source image. We pass width and height here,
    // because we reuse this canvas, and should only scale down
    // the part of the canvas that contains the previous scale step.
    0, 0, currentWidth, currentHeight,
    // Draw to 50% size
    0, 0, currentWidth / 2, currentHeight / 2);
    currentWidth /= 2;
    currentHeight /= 2;
    source = canvas;
  }

  return {
    image: source,
    sourceWidth: currentWidth,
    sourceHeight: currentHeight
  };
}

/**
 * Save a <canvas> element's content to a Blob object.
 *
 * @param {HTMLCanvasElement} canvas
 * @return {Promise}
 */
function canvasToBlob(canvas, type, quality) {
  if (canvas.toBlob) {
    return new _Promise(function (resolve) {
      canvas.toBlob(resolve, type, quality);
    });
  }
  return _Promise.resolve().then(function () {
    return dataURItoBlob(canvas.toDataURL(type, quality), {});
  });
}

function dataURItoBlob(dataURI, opts, toFile) {
  // get the base64 data
  var data = dataURI.split(',')[1];

  // user may provide mime type, if not get it from data URI
  var mimeType = opts.mimeType || dataURI.split(',')[0].split(':')[1].split(';')[0];

  // default to plain/text if data URI has no mimeType
  if (mimeType == null) {
    mimeType = 'plain/text';
  }

  var binary = atob(data);
  var array = [];
  for (var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }

  // Convert to a File?
  if (toFile) {
    return new File([new Uint8Array(array)], opts.name || '', { type: mimeType });
  }

  return new Blob([new Uint8Array(array)], { type: mimeType });
}

function dataURItoFile(dataURI, opts) {
  return dataURItoBlob(dataURI, opts, true);
}

/**
 * Copies text to clipboard by creating an almost invisible textarea,
 * adding text there, then running execCommand('copy').
 * Falls back to prompt() when the easy way fails (hello, Safari!)
 * From http://stackoverflow.com/a/30810322
 *
 * @param {String} textToCopy
 * @param {String} fallbackString
 * @return {Promise}
 */
function copyToClipboard(textToCopy, fallbackString) {
  fallbackString = fallbackString || 'Copy the URL below';

  return new _Promise(function (resolve) {
    var textArea = document.createElement('textarea');
    textArea.setAttribute('style', {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '2em',
      height: '2em',
      padding: 0,
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent'
    });

    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();

    var magicCopyFailed = function magicCopyFailed() {
      document.body.removeChild(textArea);
      window.prompt(fallbackString, textToCopy);
      resolve();
    };

    try {
      var successful = document.execCommand('copy');
      if (!successful) {
        return magicCopyFailed('copy command unavailable');
      }
      document.body.removeChild(textArea);
      return resolve();
    } catch (err) {
      document.body.removeChild(textArea);
      return magicCopyFailed(err);
    }
  });
}

function getSpeed(fileProgress) {
  if (!fileProgress.bytesUploaded) return 0;

  var timeElapsed = new Date() - fileProgress.uploadStarted;
  var uploadSpeed = fileProgress.bytesUploaded / (timeElapsed / 1000);
  return uploadSpeed;
}

function getBytesRemaining(fileProgress) {
  return fileProgress.bytesTotal - fileProgress.bytesUploaded;
}

function getETA(fileProgress) {
  if (!fileProgress.bytesUploaded) return 0;

  var uploadSpeed = getSpeed(fileProgress);
  var bytesRemaining = getBytesRemaining(fileProgress);
  var secondsRemaining = Math.round(bytesRemaining / uploadSpeed * 10) / 10;

  return secondsRemaining;
}

function prettyETA(seconds) {
  var time = secondsToTime(seconds);

  // Only display hours and minutes if they are greater than 0 but always
  // display minutes if hours is being displayed
  // Display a leading zero if the there is a preceding unit: 1m 05s, but 5s
  var hoursStr = time.hours ? time.hours + 'h ' : '';
  var minutesVal = time.hours ? ('0' + time.minutes).substr(-2) : time.minutes;
  var minutesStr = minutesVal ? minutesVal + 'm ' : '';
  var secondsVal = minutesVal ? ('0' + time.seconds).substr(-2) : time.seconds;
  var secondsStr = secondsVal + 's';

  return '' + hoursStr + minutesStr + secondsStr;
}

/**
 * Check if an object is a DOM element. Duck-typing based on `nodeType`.
 *
 * @param {*} obj
 */
function isDOMElement(obj) {
  return obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj.nodeType === Node.ELEMENT_NODE;
}

/**
 * Find a DOM element.
 *
 * @param {Node|string} element
 * @return {Node|null}
 */
function findDOMElement(element) {
  if (typeof element === 'string') {
    return document.querySelector(element);
  }

  if ((typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && isDOMElement(element)) {
    return element;
  }
}

/**
 * Find one or more DOM elements.
 *
 * @param {string} element
 * @return {Array|null}
 */
function findAllDOMElements(element) {
  if (typeof element === 'string') {
    var elements = [].slice.call(document.querySelectorAll(element));
    return elements.length > 0 ? elements : null;
  }

  if ((typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && isDOMElement(element)) {
    return [element];
  }
}

function getSocketHost(url) {
  // get the host domain
  var regex = /^(?:https?:\/\/|\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\n]+)/;
  var host = regex.exec(url)[1];
  var socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws';

  return socketProtocol + '://' + host;
}

function _emitSocketProgress(uploader, progressData, file) {
  var progress = progressData.progress,
      bytesUploaded = progressData.bytesUploaded,
      bytesTotal = progressData.bytesTotal;

  if (progress) {
    uploader.uppy.log('Upload progress: ' + progress);
    uploader.uppy.emit('upload-progress', file, {
      uploader: uploader,
      bytesUploaded: bytesUploaded,
      bytesTotal: bytesTotal
    });
  }
}

var emitSocketProgress = throttle(_emitSocketProgress, 300, { leading: true, trailing: true });

function settle(promises) {
  var resolutions = [];
  var rejections = [];
  function resolved(value) {
    resolutions.push(value);
  }
  function rejected(error) {
    rejections.push(error);
  }

  var wait = _Promise.all(promises.map(function (promise) {
    return promise.then(resolved, rejected);
  }));

  return wait.then(function () {
    return {
      successful: resolutions,
      failed: rejections
    };
  });
}

/**
 * Limit the amount of simultaneously pending Promises.
 * Returns a function that, when passed a function `fn`,
 * will make sure that at most `limit` calls to `fn` are pending.
 *
 * @param {number} limit
 * @return {function()}
 */
function limitPromises(limit) {
  var pending = 0;
  var queue = [];
  return function (fn) {
    return function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var call = function call() {
        pending++;
        var promise = fn.apply(undefined, args);
        promise.then(onfinish, onfinish);
        return promise;
      };

      if (pending >= limit) {
        return new _Promise(function (resolve, reject) {
          queue.push(function () {
            call().then(resolve, reject);
          });
        });
      }
      return call();
    };
  };
  function onfinish() {
    pending--;
    var next = queue.shift();
    if (next) next();
  }
}

module.exports = {
  generateFileID: generateFileID,
  toArray: toArray,
  getTimeStamp: getTimeStamp,
  runPromiseSequence: runPromiseSequence,
  isTouchDevice: isTouchDevice,
  getFileNameAndExtension: getFileNameAndExtension,
  truncateString: truncateString,
  getFileTypeExtension: getFileTypeExtension,
  getFileType: getFileType,
  getArrayBuffer: getArrayBuffer,
  isPreviewSupported: isPreviewSupported,
  isObjectURL: isObjectURL,
  createThumbnail: createThumbnail,
  secondsToTime: secondsToTime,
  dataURItoBlob: dataURItoBlob,
  dataURItoFile: dataURItoFile,
  canvasToBlob: canvasToBlob,
  getSpeed: getSpeed,
  getBytesRemaining: getBytesRemaining,
  getETA: getETA,
  copyToClipboard: copyToClipboard,
  prettyETA: prettyETA,
  findDOMElement: findDOMElement,
  findAllDOMElements: findAllDOMElements,
  getSocketHost: getSocketHost,
  emitSocketProgress: emitSocketProgress,
  settle: settle,
  limitPromises: limitPromises
};

},{"../vendor/file-type":20,"es6-promise":4,"lodash.throttle":5}],16:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Plugin = require('../core/Plugin');

var _require = require('../core/Utils'),
    toArray = _require.toArray;

var Translator = require('../core/Translator');

var _require2 = require('preact'),
    h = _require2.h;

module.exports = function (_Plugin) {
  _inherits(FileInput, _Plugin);

  function FileInput(uppy, opts) {
    _classCallCheck(this, FileInput);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.id = _this.opts.id || 'FileInput';
    _this.title = 'File Input';
    _this.type = 'acquirer';

    var defaultLocale = {
      strings: {
        chooseFiles: 'Choose files'
      }

      // Default options
    };var defaultOptions = {
      target: null,
      allowMultipleFiles: true,
      pretty: true,
      inputName: 'files[]',
      locale: defaultLocale

      // Merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.locale = _extends({}, defaultLocale, _this.opts.locale);
    _this.locale.strings = _extends({}, defaultLocale.strings, _this.opts.locale.strings);

    // i18n
    _this.translator = new Translator({ locale: _this.locale });
    _this.i18n = _this.translator.translate.bind(_this.translator);

    _this.render = _this.render.bind(_this);
    _this.handleInputChange = _this.handleInputChange.bind(_this);
    _this.handleClick = _this.handleClick.bind(_this);
    return _this;
  }

  FileInput.prototype.handleInputChange = function handleInputChange(ev) {
    var _this2 = this;

    this.uppy.log('[FileInput] Something selected through input...');

    var files = toArray(ev.target.files);

    files.forEach(function (file) {
      _this2.uppy.addFile({
        source: _this2.id,
        name: file.name,
        type: file.type,
        data: file
      }).catch(function () {
        // Ignore
      });
    });
  };

  FileInput.prototype.handleClick = function handleClick(ev) {
    this.input.click();
  };

  FileInput.prototype.render = function render(state) {
    var _this3 = this;

    var hiddenInputStyle = {
      width: '0.1px',
      height: '0.1px',
      opacity: 0,
      overflow: 'hidden',
      position: 'absolute',
      zIndex: -1
    };

    return h(
      'div',
      { 'class': 'uppy uppy-FileInput-container' },
      h('input', { 'class': 'uppy-FileInput-input',
        style: this.opts.pretty && hiddenInputStyle,
        type: 'file',
        name: this.opts.inputName,
        onchange: this.handleInputChange,
        multiple: this.opts.allowMultipleFiles,
        ref: function ref(input) {
          _this3.input = input;
        } }),
      this.opts.pretty && h(
        'button',
        { 'class': 'uppy-FileInput-btn', type: 'button', onclick: this.handleClick },
        this.i18n('chooseFiles')
      )
    );
  };

  FileInput.prototype.install = function install() {
    var target = this.opts.target;
    if (target) {
      this.mount(target, this);
    }
  };

  FileInput.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return FileInput;
}(Plugin);

},{"../core/Plugin":12,"../core/Translator":13,"../core/Utils":15,"preact":8}],17:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Plugin = require('../core/Plugin');

var _require = require('preact'),
    h = _require.h;

/**
 * Progress bar
 *
 */


module.exports = function (_Plugin) {
  _inherits(ProgressBar, _Plugin);

  function ProgressBar(uppy, opts) {
    _classCallCheck(this, ProgressBar);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.id = _this.opts.id || 'ProgressBar';
    _this.title = 'Progress Bar';
    _this.type = 'progressindicator';

    // set default options
    var defaultOptions = {
      target: 'body',
      replaceTargetContent: false,
      fixed: false,
      hideAfterFinish: true

      // merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.render = _this.render.bind(_this);
    return _this;
  }

  ProgressBar.prototype.render = function render(state) {
    var progress = state.totalProgress || 0;
    var isHidden = progress === 100 && this.opts.hideAfterFinish;
    return h(
      'div',
      { 'class': 'uppy uppy-ProgressBar', style: { position: this.opts.fixed ? 'fixed' : 'initial' }, 'aria-hidden': isHidden },
      h('div', { 'class': 'uppy-ProgressBar-inner', style: { width: progress + '%' } }),
      h(
        'div',
        { 'class': 'uppy-ProgressBar-percentage' },
        progress
      )
    );
  };

  ProgressBar.prototype.install = function install() {
    var target = this.opts.target;
    if (target) {
      this.mount(target, this);
    }
  };

  ProgressBar.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return ProgressBar;
}(Plugin);

},{"../core/Plugin":12,"preact":8}],18:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Plugin = require('../core/Plugin');
var cuid = require('cuid');
var Translator = require('../core/Translator');
var UppySocket = require('../core/UppySocket');

var _require = require('../core/Utils'),
    emitSocketProgress = _require.emitSocketProgress,
    getSocketHost = _require.getSocketHost,
    settle = _require.settle,
    limitPromises = _require.limitPromises;

function buildResponseError(xhr, error) {
  // No error message
  if (!error) error = new Error('Upload error');
  // Got an error message string
  if (typeof error === 'string') error = new Error(error);
  // Got something else
  if (!(error instanceof Error)) {
    error = _extends(new Error('Upload error'), { data: error });
  }

  error.request = xhr;
  return error;
}

module.exports = function (_Plugin) {
  _inherits(XHRUpload, _Plugin);

  function XHRUpload(uppy, opts) {
    _classCallCheck(this, XHRUpload);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.type = 'uploader';
    _this.id = 'XHRUpload';
    _this.title = 'XHRUpload';

    var defaultLocale = {
      strings: {
        timedOut: 'Upload stalled for %{seconds} seconds, aborting.'
      }

      // Default options
    };var defaultOptions = {
      formData: true,
      fieldName: 'files[]',
      method: 'post',
      metaFields: null,
      responseUrlFieldName: 'url',
      bundle: false,
      headers: {},
      locale: defaultLocale,
      timeout: 30 * 1000,
      limit: 0,
      /**
       * @typedef respObj
       * @property {string} responseText
       * @property {number} status
       * @property {string} statusText
       * @property {Object.<string, string>} headers
       *
       * @param {string} responseContent the response body
       * @param {XMLHttpRequest | respObj} responseObject the response object
       */
      getResponseData: function getResponseData(responseContent, responseObject) {
        var response = {};
        try {
          response = JSON.parse(responseContent);
        } catch (err) {
          console.log(err);
        }

        return response;
      },

      /**
       *
       * @param {string} responseContent the response body
       * @param {XMLHttpRequest | respObj} responseObject the response object
       */
      getResponseError: function getResponseError(responseContent, responseObject) {
        return new Error('Upload error');
      }
    };

    // Merge default options with the ones set by user
    _this.opts = _extends({}, defaultOptions, opts);
    _this.locale = _extends({}, defaultLocale, _this.opts.locale);
    _this.locale.strings = _extends({}, defaultLocale.strings, _this.opts.locale.strings);

    // i18n
    _this.translator = new Translator({ locale: _this.locale });
    _this.i18n = _this.translator.translate.bind(_this.translator);

    _this.handleUpload = _this.handleUpload.bind(_this);

    // Simultaneous upload limiting is shared across all uploads with this plugin.
    if (typeof _this.opts.limit === 'number' && _this.opts.limit !== 0) {
      _this.limitUploads = limitPromises(_this.opts.limit);
    } else {
      _this.limitUploads = function (fn) {
        return fn;
      };
    }

    if (_this.opts.bundle && !_this.opts.formData) {
      throw new Error('`opts.formData` must be true when `opts.bundle` is enabled.');
    }
    return _this;
  }

  XHRUpload.prototype.getOptions = function getOptions(file) {
    var opts = _extends({}, this.opts, this.uppy.state.xhrUpload || {}, file.xhrUpload || {});
    opts.headers = {};
    _extends(opts.headers, this.opts.headers);
    if (this.uppy.state.xhrUpload) {
      _extends(opts.headers, this.uppy.state.xhrUpload.headers);
    }
    if (file.xhrUpload) {
      _extends(opts.headers, file.xhrUpload.headers);
    }

    return opts;
  };

  // Helper to abort upload requests if there has not been any progress for `timeout` ms.
  // Create an instance using `timer = createProgressTimeout(10000, onTimeout)`
  // Call `timer.progress()` to signal that there has been progress of any kind.
  // Call `timer.done()` when the upload has completed.


  XHRUpload.prototype.createProgressTimeout = function createProgressTimeout(timeout, timeoutHandler) {
    var uppy = this.uppy;
    var self = this;
    function onTimedOut() {
      uppy.log('[XHRUpload] timed out');
      var error = new Error(self.i18n('timedOut', { seconds: Math.ceil(timeout / 1000) }));
      timeoutHandler(error);
    }

    var aliveTimer = null;
    function progress() {
      if (timeout > 0) {
        done();
        aliveTimer = setTimeout(onTimedOut, timeout);
      }
    }

    function done() {
      if (aliveTimer) {
        clearTimeout(aliveTimer);
        aliveTimer = null;
      }
    }

    return {
      progress: progress,
      done: done
    };
  };

  XHRUpload.prototype.createFormDataUpload = function createFormDataUpload(file, opts) {
    var formPost = new FormData();

    var metaFields = Array.isArray(opts.metaFields) ? opts.metaFields
    // Send along all fields by default.
    : Object.keys(file.meta);
    metaFields.forEach(function (item) {
      formPost.append(item, file.meta[item]);
    });

    formPost.append(opts.fieldName, file.data);

    return formPost;
  };

  XHRUpload.prototype.createBareUpload = function createBareUpload(file, opts) {
    return file.data;
  };

  XHRUpload.prototype.upload = function upload(file, current, total) {
    var _this2 = this;

    var opts = this.getOptions(file);

    this.uppy.log('uploading ' + current + ' of ' + total);
    return new _Promise(function (resolve, reject) {
      var data = opts.formData ? _this2.createFormDataUpload(file, opts) : _this2.createBareUpload(file, opts);

      var timer = _this2.createProgressTimeout(opts.timeout, function (error) {
        xhr.abort();
        _this2.uppy.emit('upload-error', file, error);
        reject(error);
      });

      var xhr = new XMLHttpRequest();
      var id = cuid();

      xhr.upload.addEventListener('loadstart', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' started');
        // Begin checking for timeouts when loading starts.
        timer.progress();
      });

      xhr.upload.addEventListener('progress', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' progress: ' + ev.loaded + ' / ' + ev.total);
        timer.progress();

        if (ev.lengthComputable) {
          _this2.uppy.emit('upload-progress', file, {
            uploader: _this2,
            bytesUploaded: ev.loaded,
            bytesTotal: ev.total
          });
        }
      });

      xhr.addEventListener('load', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' finished');
        timer.done();

        if (ev.target.status >= 200 && ev.target.status < 300) {
          var body = opts.getResponseData(xhr.responseText, xhr);
          var uploadURL = body[opts.responseUrlFieldName];

          var response = {
            status: ev.target.status,
            body: body,
            uploadURL: uploadURL
          };

          _this2.uppy.setFileState(file.id, { response: response });

          _this2.uppy.emit('upload-success', file, body, uploadURL);

          if (uploadURL) {
            _this2.uppy.log('Download ' + file.name + ' from ' + file.uploadURL);
          }

          return resolve(file);
        } else {
          var _body = opts.getResponseData(xhr.responseText, xhr);
          var error = buildResponseError(xhr, opts.getResponseError(xhr.responseText, xhr));

          var _response = {
            status: ev.target.status,
            body: _body
          };

          _this2.uppy.setFileState(file.id, { response: _response });

          _this2.uppy.emit('upload-error', file, error);
          return reject(error);
        }
      });

      xhr.addEventListener('error', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' errored');
        timer.done();

        var error = buildResponseError(xhr, opts.getResponseError(xhr.responseText, xhr));
        _this2.uppy.emit('upload-error', file, error);
        return reject(error);
      });

      xhr.open(opts.method.toUpperCase(), opts.endpoint, true);

      Object.keys(opts.headers).forEach(function (header) {
        xhr.setRequestHeader(header, opts.headers[header]);
      });

      xhr.send(data);

      _this2.uppy.on('file-removed', function (removedFile) {
        if (removedFile.id === file.id) {
          timer.done();
          xhr.abort();
        }
      });

      _this2.uppy.on('upload-cancel', function (fileID) {
        if (fileID === file.id) {
          timer.done();
          xhr.abort();
        }
      });

      _this2.uppy.on('cancel-all', function () {
        // const files = this.uppy.getState().files
        // if (!files[file.id]) return
        xhr.abort();
      });
    });
  };

  XHRUpload.prototype.uploadRemote = function uploadRemote(file, current, total) {
    var _this3 = this;

    var opts = this.getOptions(file);
    return new _Promise(function (resolve, reject) {
      var fields = {};
      var metaFields = Array.isArray(opts.metaFields) ? opts.metaFields
      // Send along all fields by default.
      : Object.keys(file.meta);

      metaFields.forEach(function (name) {
        fields[name] = file.meta[name];
      });

      fetch(file.remote.url, {
        method: 'post',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(_extends({}, file.remote.body, {
          endpoint: opts.endpoint,
          size: file.data.size,
          fieldname: opts.fieldName,
          metadata: fields,
          headers: opts.headers
        }))
      }).then(function (res) {
        if (res.status < 200 && res.status > 300) {
          return reject(res.statusText);
        }

        res.json().then(function (data) {
          var token = data.token;
          var host = getSocketHost(file.remote.host);
          var socket = new UppySocket({ target: host + '/api/' + token });

          socket.on('progress', function (progressData) {
            return emitSocketProgress(_this3, progressData, file);
          });

          socket.on('success', function (data) {
            var resp = opts.getResponseData(data.response.responseText, data.response);
            var uploadURL = resp[opts.responseUrlFieldName];
            _this3.uppy.emit('upload-success', file, resp, uploadURL);
            socket.close();
            return resolve();
          });

          socket.on('error', function (errData) {
            var resp = errData.response;
            var error = resp ? opts.getResponseError(resp.responseText, resp) : new Error(errData.error);
            _this3.uppy.emit('upload-error', file, error);
            reject(new Error(errData.error));
          });
        });
      });
    });
  };

  XHRUpload.prototype.uploadBundle = function uploadBundle(files) {
    var _this4 = this;

    return new _Promise(function (resolve, reject) {
      var endpoint = _this4.opts.endpoint;
      var method = _this4.opts.method;

      var formData = new FormData();
      files.forEach(function (file, i) {
        var opts = _this4.getOptions(file);
        formData.append(opts.fieldName, file.data);
      });

      var xhr = new XMLHttpRequest();

      var timer = _this4.createProgressTimeout(_this4.opts.timeout, function (error) {
        xhr.abort();
        emitError(error);
        reject(error);
      });

      var emitError = function emitError(error) {
        files.forEach(function (file) {
          _this4.uppy.emit('upload-error', file, error);
        });
      };

      xhr.upload.addEventListener('loadstart', function (ev) {
        _this4.uppy.log('[XHRUpload] started uploading bundle');
        timer.progress();
      });

      xhr.upload.addEventListener('progress', function (ev) {
        timer.progress();

        if (!ev.lengthComputable) return;

        files.forEach(function (file) {
          _this4.uppy.emit('upload-progress', file, {
            uploader: _this4,
            bytesUploaded: ev.loaded,
            bytesTotal: ev.total
          });
        });
      });

      xhr.addEventListener('load', function (ev) {
        timer.done();

        if (ev.target.status >= 200 && ev.target.status < 300) {
          var resp = _this4.opts.getResponseData(xhr.responseText, xhr);
          files.forEach(function (file) {
            _this4.uppy.emit('upload-success', file, resp);
          });
          return resolve();
        }

        var error = _this4.opts.getResponseError(xhr.responseText, xhr) || new Error('Upload error');
        error.request = xhr;
        emitError(error);
        return reject(error);
      });

      xhr.addEventListener('error', function (ev) {
        timer.done();

        var error = _this4.opts.getResponseError(xhr.responseText, xhr) || new Error('Upload error');
        emitError(error);
        return reject(error);
      });

      _this4.uppy.on('cancel-all', function () {
        xhr.abort();
      });

      xhr.open(method.toUpperCase(), endpoint, true);

      Object.keys(_this4.opts.headers).forEach(function (header) {
        xhr.setRequestHeader(header, _this4.opts.headers[header]);
      });

      xhr.send(formData);

      files.forEach(function (file) {
        _this4.uppy.emit('upload-started', file);
      });
    });
  };

  XHRUpload.prototype.uploadFiles = function uploadFiles(files) {
    var _this5 = this;

    var actions = files.map(function (file, i) {
      var current = parseInt(i, 10) + 1;
      var total = files.length;

      if (file.error) {
        return function () {
          return _Promise.reject(new Error(file.error));
        };
      } else if (file.isRemote) {
        // We emit upload-started here, so that it's also emitted for files
        // that have to wait due to the `limit` option.
        _this5.uppy.emit('upload-started', file);
        return _this5.uploadRemote.bind(_this5, file, current, total);
      } else {
        _this5.uppy.emit('upload-started', file);
        return _this5.upload.bind(_this5, file, current, total);
      }
    });

    var promises = actions.map(function (action) {
      var limitedAction = _this5.limitUploads(action);
      return limitedAction();
    });

    return settle(promises);
  };

  XHRUpload.prototype.handleUpload = function handleUpload(fileIDs) {
    var _this6 = this;

    if (fileIDs.length === 0) {
      this.uppy.log('[XHRUpload] No files to upload!');
      return _Promise.resolve();
    }

    this.uppy.log('[XHRUpload] Uploading...');
    var files = fileIDs.map(function (fileID) {
      return _this6.uppy.getFile(fileID);
    });

    if (this.opts.bundle) {
      return this.uploadBundle(files);
    }

    return this.uploadFiles(files).then(function () {
      return null;
    });
  };

  XHRUpload.prototype.install = function install() {
    this.uppy.addUploader(this.handleUpload);
  };

  XHRUpload.prototype.uninstall = function uninstall() {
    this.uppy.removeUploader(this.handleUpload);
  };

  return XHRUpload;
}(Plugin);

},{"../core/Plugin":12,"../core/Translator":13,"../core/UppySocket":14,"../core/Utils":15,"cuid":1,"es6-promise":4}],19:[function(require,module,exports){
"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Default store that keeps state in a simple object.
 */
var DefaultStore = function () {
  function DefaultStore() {
    _classCallCheck(this, DefaultStore);

    this.state = {};
    this.callbacks = [];
  }

  DefaultStore.prototype.getState = function getState() {
    return this.state;
  };

  DefaultStore.prototype.setState = function setState(patch) {
    var prevState = _extends({}, this.state);
    var nextState = _extends({}, this.state, patch);

    this.state = nextState;
    this._publish(prevState, nextState, patch);
  };

  DefaultStore.prototype.subscribe = function subscribe(listener) {
    var _this = this;

    this.callbacks.push(listener);
    return function () {
      // Remove the listener.
      _this.callbacks.splice(_this.callbacks.indexOf(listener), 1);
    };
  };

  DefaultStore.prototype._publish = function _publish() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    this.callbacks.forEach(function (listener) {
      listener.apply(undefined, args);
    });
  };

  return DefaultStore;
}();

module.exports = function defaultStore() {
  return new DefaultStore();
};

},{}],20:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

module.exports = function (input) {
	var buf = new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	var check = function check(header, opts) {
		opts = _extends({
			offset: 0
		}, opts);

		for (var i = 0; i < header.length; i++) {
			if (header[i] !== buf[i + opts.offset]) {
				return false;
			}
		}

		return true;
	};

	if (check([0xFF, 0xD8, 0xFF])) {
		return {
			ext: 'jpg',
			mime: 'image/jpeg'
		};
	}

	if (check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
		return {
			ext: 'png',
			mime: 'image/png'
		};
	}

	if (check([0x47, 0x49, 0x46])) {
		return {
			ext: 'gif',
			mime: 'image/gif'
		};
	}

	if (check([0x57, 0x45, 0x42, 0x50], { offset: 8 })) {
		return {
			ext: 'webp',
			mime: 'image/webp'
		};
	}

	if (check([0x46, 0x4C, 0x49, 0x46])) {
		return {
			ext: 'flif',
			mime: 'image/flif'
		};
	}

	// Needs to be before `tif` check
	if ((check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) && check([0x43, 0x52], { offset: 8 })) {
		return {
			ext: 'cr2',
			mime: 'image/x-canon-cr2'
		};
	}

	if (check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) {
		return {
			ext: 'tif',
			mime: 'image/tiff'
		};
	}

	if (check([0x42, 0x4D])) {
		return {
			ext: 'bmp',
			mime: 'image/bmp'
		};
	}

	if (check([0x49, 0x49, 0xBC])) {
		return {
			ext: 'jxr',
			mime: 'image/vnd.ms-photo'
		};
	}

	if (check([0x38, 0x42, 0x50, 0x53])) {
		return {
			ext: 'psd',
			mime: 'image/vnd.adobe.photoshop'
		};
	}

	// Needs to be before the `zip` check
	if (check([0x50, 0x4B, 0x3, 0x4]) && check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], { offset: 30 })) {
		return {
			ext: 'epub',
			mime: 'application/epub+zip'
		};
	}

	// Needs to be before `zip` check
	// Assumes signed `.xpi` from addons.mozilla.org
	if (check([0x50, 0x4B, 0x3, 0x4]) && check([0x4D, 0x45, 0x54, 0x41, 0x2D, 0x49, 0x4E, 0x46, 0x2F, 0x6D, 0x6F, 0x7A, 0x69, 0x6C, 0x6C, 0x61, 0x2E, 0x72, 0x73, 0x61], { offset: 30 })) {
		return {
			ext: 'xpi',
			mime: 'application/x-xpinstall'
		};
	}

	if (check([0x50, 0x4B]) && (buf[2] === 0x3 || buf[2] === 0x5 || buf[2] === 0x7) && (buf[3] === 0x4 || buf[3] === 0x6 || buf[3] === 0x8)) {
		return {
			ext: 'zip',
			mime: 'application/zip'
		};
	}

	if (check([0x75, 0x73, 0x74, 0x61, 0x72], { offset: 257 })) {
		return {
			ext: 'tar',
			mime: 'application/x-tar'
		};
	}

	if (check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7]) && (buf[6] === 0x0 || buf[6] === 0x1)) {
		return {
			ext: 'rar',
			mime: 'application/x-rar-compressed'
		};
	}

	if (check([0x1F, 0x8B, 0x8])) {
		return {
			ext: 'gz',
			mime: 'application/gzip'
		};
	}

	if (check([0x42, 0x5A, 0x68])) {
		return {
			ext: 'bz2',
			mime: 'application/x-bzip2'
		};
	}

	if (check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
		return {
			ext: '7z',
			mime: 'application/x-7z-compressed'
		};
	}

	if (check([0x78, 0x01])) {
		return {
			ext: 'dmg',
			mime: 'application/x-apple-diskimage'
		};
	}

	if (check([0x0, 0x0, 0x0]) && (buf[3] === 0x18 || buf[3] === 0x20) && check([0x66, 0x74, 0x79, 0x70], { offset: 4 }) || check([0x33, 0x67, 0x70, 0x35]) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]) && check([0x6D, 0x70, 0x34, 0x31, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D], { offset: 16 }) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32, 0x0, 0x0, 0x0, 0x0])) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
		};
	}

	if (check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x56])) {
		return {
			ext: 'm4v',
			mime: 'video/x-m4v'
		};
	}

	if (check([0x4D, 0x54, 0x68, 0x64])) {
		return {
			ext: 'mid',
			mime: 'audio/midi'
		};
	}

	// https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska
	if (check([0x1A, 0x45, 0xDF, 0xA3])) {
		var sliced = buf.subarray(4, 4 + 4096);
		var idPos = sliced.findIndex(function (el, i, arr) {
			return arr[i] === 0x42 && arr[i + 1] === 0x82;
		});

		if (idPos >= 0) {
			var docTypePos = idPos + 3;
			var findDocType = function findDocType(type) {
				return Array.from(type).every(function (c, i) {
					return sliced[docTypePos + i] === c.charCodeAt(0);
				});
			};

			if (findDocType('matroska')) {
				return {
					ext: 'mkv',
					mime: 'video/x-matroska'
				};
			}

			if (findDocType('webm')) {
				return {
					ext: 'webm',
					mime: 'video/webm'
				};
			}
		}
	}

	if (check([0x0, 0x0, 0x0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) || check([0x66, 0x72, 0x65, 0x65], { offset: 4 }) || check([0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], { offset: 4 }) || check([0x6D, 0x64, 0x61, 0x74], { offset: 4 }) || // MJPEG
	check([0x77, 0x69, 0x64, 0x65], { offset: 4 })) {
		return {
			ext: 'mov',
			mime: 'video/quicktime'
		};
	}

	if (check([0x52, 0x49, 0x46, 0x46]) && check([0x41, 0x56, 0x49], { offset: 8 })) {
		return {
			ext: 'avi',
			mime: 'video/x-msvideo'
		};
	}

	if (check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
		return {
			ext: 'wmv',
			mime: 'video/x-ms-wmv'
		};
	}

	if (check([0x0, 0x0, 0x1, 0xBA])) {
		return {
			ext: 'mpg',
			mime: 'video/mpeg'
		};
	}

	if (check([0x49, 0x44, 0x33]) || check([0xFF, 0xFB])) {
		return {
			ext: 'mp3',
			mime: 'audio/mpeg'
		};
	}

	if (check([0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], { offset: 4 }) || check([0x4D, 0x34, 0x41, 0x20])) {
		return {
			ext: 'm4a',
			mime: 'audio/m4a'
		};
	}

	// Needs to be before `ogg` check
	if (check([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], { offset: 28 })) {
		return {
			ext: 'opus',
			mime: 'audio/opus'
		};
	}

	if (check([0x4F, 0x67, 0x67, 0x53])) {
		return {
			ext: 'ogg',
			mime: 'audio/ogg'
		};
	}

	if (check([0x66, 0x4C, 0x61, 0x43])) {
		return {
			ext: 'flac',
			mime: 'audio/x-flac'
		};
	}

	if (check([0x52, 0x49, 0x46, 0x46]) && check([0x57, 0x41, 0x56, 0x45], { offset: 8 })) {
		return {
			ext: 'wav',
			mime: 'audio/x-wav'
		};
	}

	if (check([0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A])) {
		return {
			ext: 'amr',
			mime: 'audio/amr'
		};
	}

	if (check([0x25, 0x50, 0x44, 0x46])) {
		return {
			ext: 'pdf',
			mime: 'application/pdf'
		};
	}

	if (check([0x4D, 0x5A])) {
		return {
			ext: 'exe',
			mime: 'application/x-msdownload'
		};
	}

	if ((buf[0] === 0x43 || buf[0] === 0x46) && check([0x57, 0x53], { offset: 1 })) {
		return {
			ext: 'swf',
			mime: 'application/x-shockwave-flash'
		};
	}

	if (check([0x7B, 0x5C, 0x72, 0x74, 0x66])) {
		return {
			ext: 'rtf',
			mime: 'application/rtf'
		};
	}

	if (check([0x00, 0x61, 0x73, 0x6D])) {
		return {
			ext: 'wasm',
			mime: 'application/wasm'
		};
	}

	if (check([0x77, 0x4F, 0x46, 0x46]) && (check([0x00, 0x01, 0x00, 0x00], { offset: 4 }) || check([0x4F, 0x54, 0x54, 0x4F], { offset: 4 }))) {
		return {
			ext: 'woff',
			mime: 'font/woff'
		};
	}

	if (check([0x77, 0x4F, 0x46, 0x32]) && (check([0x00, 0x01, 0x00, 0x00], { offset: 4 }) || check([0x4F, 0x54, 0x54, 0x4F], { offset: 4 }))) {
		return {
			ext: 'woff2',
			mime: 'font/woff2'
		};
	}

	if (check([0x4C, 0x50], { offset: 34 }) && (check([0x00, 0x00, 0x01], { offset: 8 }) || check([0x01, 0x00, 0x02], { offset: 8 }) || check([0x02, 0x00, 0x02], { offset: 8 }))) {
		return {
			ext: 'eot',
			mime: 'application/octet-stream'
		};
	}

	if (check([0x00, 0x01, 0x00, 0x00, 0x00])) {
		return {
			ext: 'ttf',
			mime: 'font/ttf'
		};
	}

	if (check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
		return {
			ext: 'otf',
			mime: 'font/otf'
		};
	}

	if (check([0x00, 0x00, 0x01, 0x00])) {
		return {
			ext: 'ico',
			mime: 'image/x-icon'
		};
	}

	if (check([0x46, 0x4C, 0x56, 0x01])) {
		return {
			ext: 'flv',
			mime: 'video/x-flv'
		};
	}

	if (check([0x25, 0x21])) {
		return {
			ext: 'ps',
			mime: 'application/postscript'
		};
	}

	if (check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
		return {
			ext: 'xz',
			mime: 'application/x-xz'
		};
	}

	if (check([0x53, 0x51, 0x4C, 0x69])) {
		return {
			ext: 'sqlite',
			mime: 'application/x-sqlite3'
		};
	}

	if (check([0x4E, 0x45, 0x53, 0x1A])) {
		return {
			ext: 'nes',
			mime: 'application/x-nintendo-nes-rom'
		};
	}

	if (check([0x43, 0x72, 0x32, 0x34])) {
		return {
			ext: 'crx',
			mime: 'application/x-google-chrome-extension'
		};
	}

	if (check([0x4D, 0x53, 0x43, 0x46]) || check([0x49, 0x53, 0x63, 0x28])) {
		return {
			ext: 'cab',
			mime: 'application/vnd.ms-cab-compressed'
		};
	}

	// Needs to be before `ar` check
	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E, 0x0A, 0x64, 0x65, 0x62, 0x69, 0x61, 0x6E, 0x2D, 0x62, 0x69, 0x6E, 0x61, 0x72, 0x79])) {
		return {
			ext: 'deb',
			mime: 'application/x-deb'
		};
	}

	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E])) {
		return {
			ext: 'ar',
			mime: 'application/x-unix-archive'
		};
	}

	if (check([0xED, 0xAB, 0xEE, 0xDB])) {
		return {
			ext: 'rpm',
			mime: 'application/x-rpm'
		};
	}

	if (check([0x1F, 0xA0]) || check([0x1F, 0x9D])) {
		return {
			ext: 'Z',
			mime: 'application/x-compress'
		};
	}

	if (check([0x4C, 0x5A, 0x49, 0x50])) {
		return {
			ext: 'lz',
			mime: 'application/x-lzip'
		};
	}

	if (check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
		return {
			ext: 'msi',
			mime: 'application/x-msi'
		};
	}

	if (check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
		return {
			ext: 'mxf',
			mime: 'application/mxf'
		};
	}

	if (check([0x47], { offset: 4 }) && (check([0x47], { offset: 192 }) || check([0x47], { offset: 196 }))) {
		return {
			ext: 'mts',
			mime: 'video/mp2t'
		};
	}

	if (check([0x42, 0x4C, 0x45, 0x4E, 0x44, 0x45, 0x52])) {
		return {
			ext: 'blend',
			mime: 'application/x-blender'
		};
	}

	if (check([0x42, 0x50, 0x47, 0xFB])) {
		return {
			ext: 'bpg',
			mime: 'image/bpg'
		};
	}

	return null;
};

},{}],21:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],22:[function(require,module,exports){
'use strict';

var Uppy = require('/home/travis/build/transloadit/uppy/src/core/Core');
var FileInput = require('/home/travis/build/transloadit/uppy/src/plugins/FileInput');
var XHRUpload = require('/home/travis/build/transloadit/uppy/src/plugins/XHRUpload');
var ProgressBar = require('/home/travis/build/transloadit/uppy/src/plugins/ProgressBar');

var uppy = new Uppy({ debug: true, autoProceed: true });
uppy.use(FileInput, { target: '.UppyForm', replaceTargetContent: true });
uppy.use(XHRUpload, {
  endpoint: '//api2.transloadit.com',
  formData: true,
  fieldName: 'files[]'
});
uppy.use(ProgressBar, {
  target: 'body',
  fixed: true,
  hideAfterFinish: false
});
uppy.run();

console.log('Uppy with Formtag and XHRUpload is loaded');

},{"/home/travis/build/transloadit/uppy/src/core/Core":11,"/home/travis/build/transloadit/uppy/src/plugins/FileInput":16,"/home/travis/build/transloadit/uppy/src/plugins/ProgressBar":17,"/home/travis/build/transloadit/uppy/src/plugins/XHRUpload":18}]},{},[22])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvY3VpZC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jdWlkL2xpYi9maW5nZXJwcmludC5icm93c2VyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2N1aWQvbGliL3BhZC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2VzNi1wcm9taXNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9taW1lLW1hdGNoL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL25hbWVzcGFjZS1lbWl0dGVyL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3ByZWFjdC9kaXN0L3ByZWFjdC5qcyIsIi4uL25vZGVfbW9kdWxlcy9wcmV0dGllci1ieXRlcy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy93aWxkY2FyZC9pbmRleC5qcyIsIi4uL3NyYy9jb3JlL0NvcmUuanMiLCIuLi9zcmMvY29yZS9QbHVnaW4uanMiLCIuLi9zcmMvY29yZS9UcmFuc2xhdG9yLmpzIiwiLi4vc3JjL2NvcmUvVXBweVNvY2tldC5qcyIsIi4uL3NyYy9jb3JlL1V0aWxzLmpzIiwiLi4vc3JjL3BsdWdpbnMvRmlsZUlucHV0LmpzIiwiLi4vc3JjL3BsdWdpbnMvUHJvZ3Jlc3NCYXIuanMiLCIuLi9zcmMvcGx1Z2lucy9YSFJVcGxvYWQuanMiLCIuLi9zcmMvc3RvcmUvRGVmYXVsdFN0b3JlLmpzIiwiLi4vc3JjL3ZlbmRvci9maWxlLXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2V4YW1wbGVzL3hocnVwbG9hZC9hcHAuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIi8qKlxuICogY3VpZC5qc1xuICogQ29sbGlzaW9uLXJlc2lzdGFudCBVSUQgZ2VuZXJhdG9yIGZvciBicm93c2VycyBhbmQgbm9kZS5cbiAqIFNlcXVlbnRpYWwgZm9yIGZhc3QgZGIgbG9va3VwcyBhbmQgcmVjZW5jeSBzb3J0aW5nLlxuICogU2FmZSBmb3IgZWxlbWVudCBJRHMgYW5kIHNlcnZlci1zaWRlIGxvb2t1cHMuXG4gKlxuICogRXh0cmFjdGVkIGZyb20gQ0xDVFJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIEVyaWMgRWxsaW90dCAyMDEyXG4gKiBNSVQgTGljZW5zZVxuICovXG5cbnZhciBmaW5nZXJwcmludCA9IHJlcXVpcmUoJy4vbGliL2ZpbmdlcnByaW50LmpzJyk7XG52YXIgcGFkID0gcmVxdWlyZSgnLi9saWIvcGFkLmpzJyk7XG5cbnZhciBjID0gMCxcbiAgYmxvY2tTaXplID0gNCxcbiAgYmFzZSA9IDM2LFxuICBkaXNjcmV0ZVZhbHVlcyA9IE1hdGgucG93KGJhc2UsIGJsb2NrU2l6ZSk7XG5cbmZ1bmN0aW9uIHJhbmRvbUJsb2NrICgpIHtcbiAgcmV0dXJuIHBhZCgoTWF0aC5yYW5kb20oKSAqXG4gICAgZGlzY3JldGVWYWx1ZXMgPDwgMClcbiAgICAudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSk7XG59XG5cbmZ1bmN0aW9uIHNhZmVDb3VudGVyICgpIHtcbiAgYyA9IGMgPCBkaXNjcmV0ZVZhbHVlcyA/IGMgOiAwO1xuICBjKys7IC8vIHRoaXMgaXMgbm90IHN1YmxpbWluYWxcbiAgcmV0dXJuIGMgLSAxO1xufVxuXG5mdW5jdGlvbiBjdWlkICgpIHtcbiAgLy8gU3RhcnRpbmcgd2l0aCBhIGxvd2VyY2FzZSBsZXR0ZXIgbWFrZXNcbiAgLy8gaXQgSFRNTCBlbGVtZW50IElEIGZyaWVuZGx5LlxuICB2YXIgbGV0dGVyID0gJ2MnLCAvLyBoYXJkLWNvZGVkIGFsbG93cyBmb3Igc2VxdWVudGlhbCBhY2Nlc3NcblxuICAgIC8vIHRpbWVzdGFtcFxuICAgIC8vIHdhcm5pbmc6IHRoaXMgZXhwb3NlcyB0aGUgZXhhY3QgZGF0ZSBhbmQgdGltZVxuICAgIC8vIHRoYXQgdGhlIHVpZCB3YXMgY3JlYXRlZC5cbiAgICB0aW1lc3RhbXAgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkpLnRvU3RyaW5nKGJhc2UpLFxuXG4gICAgLy8gUHJldmVudCBzYW1lLW1hY2hpbmUgY29sbGlzaW9ucy5cbiAgICBjb3VudGVyID0gcGFkKHNhZmVDb3VudGVyKCkudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSksXG5cbiAgICAvLyBBIGZldyBjaGFycyB0byBnZW5lcmF0ZSBkaXN0aW5jdCBpZHMgZm9yIGRpZmZlcmVudFxuICAgIC8vIGNsaWVudHMgKHNvIGRpZmZlcmVudCBjb21wdXRlcnMgYXJlIGZhciBsZXNzXG4gICAgLy8gbGlrZWx5IHRvIGdlbmVyYXRlIHRoZSBzYW1lIGlkKVxuICAgIHByaW50ID0gZmluZ2VycHJpbnQoKSxcblxuICAgIC8vIEdyYWIgc29tZSBtb3JlIGNoYXJzIGZyb20gTWF0aC5yYW5kb20oKVxuICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkgKyByYW5kb21CbG9jaygpO1xuXG4gIHJldHVybiBsZXR0ZXIgKyB0aW1lc3RhbXAgKyBjb3VudGVyICsgcHJpbnQgKyByYW5kb207XG59XG5cbmN1aWQuc2x1ZyA9IGZ1bmN0aW9uIHNsdWcgKCkge1xuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpLnRvU3RyaW5nKDM2KSxcbiAgICBjb3VudGVyID0gc2FmZUNvdW50ZXIoKS50b1N0cmluZygzNikuc2xpY2UoLTQpLFxuICAgIHByaW50ID0gZmluZ2VycHJpbnQoKS5zbGljZSgwLCAxKSArXG4gICAgICBmaW5nZXJwcmludCgpLnNsaWNlKC0xKSxcbiAgICByYW5kb20gPSByYW5kb21CbG9jaygpLnNsaWNlKC0yKTtcblxuICByZXR1cm4gZGF0ZS5zbGljZSgtMikgK1xuICAgIGNvdW50ZXIgKyBwcmludCArIHJhbmRvbTtcbn07XG5cbmN1aWQuZmluZ2VycHJpbnQgPSBmaW5nZXJwcmludDtcblxubW9kdWxlLmV4cG9ydHMgPSBjdWlkO1xuIiwidmFyIHBhZCA9IHJlcXVpcmUoJy4vcGFkLmpzJyk7XG5cbnZhciBlbnYgPSB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHNlbGY7XG52YXIgZ2xvYmFsQ291bnQgPSBPYmplY3Qua2V5cyhlbnYpO1xudmFyIG1pbWVUeXBlc0xlbmd0aCA9IG5hdmlnYXRvci5taW1lVHlwZXMgPyBuYXZpZ2F0b3IubWltZVR5cGVzLmxlbmd0aCA6IDA7XG52YXIgY2xpZW50SWQgPSBwYWQoKG1pbWVUeXBlc0xlbmd0aCArXG4gIG5hdmlnYXRvci51c2VyQWdlbnQubGVuZ3RoKS50b1N0cmluZygzNikgK1xuICBnbG9iYWxDb3VudC50b1N0cmluZygzNiksIDQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZpbmdlcnByaW50ICgpIHtcbiAgcmV0dXJuIGNsaWVudElkO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcGFkIChudW0sIHNpemUpIHtcbiAgdmFyIHMgPSAnMDAwMDAwMDAwJyArIG51bTtcbiAgcmV0dXJuIHMuc3Vic3RyKHMubGVuZ3RoIC0gc2l6ZSk7XG59O1xuIiwiLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3N0ZWZhbnBlbm5lci9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICB2NC4yLjQrMzE0ZTQ4MzFcbiAqL1xuXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHR0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShmYWN0b3J5KSA6XG5cdChnbG9iYWwuRVM2UHJvbWlzZSA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIHg7XG4gIHJldHVybiB4ICE9PSBudWxsICYmICh0eXBlID09PSAnb2JqZWN0JyB8fCB0eXBlID09PSAnZnVuY3Rpb24nKTtcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbih4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuXG5cbnZhciBfaXNBcnJheSA9IHZvaWQgMDtcbmlmIChBcnJheS5pc0FycmF5KSB7XG4gIF9pc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbn0gZWxzZSB7XG4gIF9pc0FycmF5ID0gZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xufVxuXG52YXIgaXNBcnJheSA9IF9pc0FycmF5O1xuXG52YXIgbGVuID0gMDtcbnZhciB2ZXJ0eE5leHQgPSB2b2lkIDA7XG52YXIgY3VzdG9tU2NoZWR1bGVyRm4gPSB2b2lkIDA7XG5cbnZhciBhc2FwID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gIHF1ZXVlW2xlbl0gPSBjYWxsYmFjaztcbiAgcXVldWVbbGVuICsgMV0gPSBhcmc7XG4gIGxlbiArPSAyO1xuICBpZiAobGVuID09PSAyKSB7XG4gICAgLy8gSWYgbGVuIGlzIDIsIHRoYXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHNjaGVkdWxlIGFuIGFzeW5jIGZsdXNoLlxuICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgIGlmIChjdXN0b21TY2hlZHVsZXJGbikge1xuICAgICAgY3VzdG9tU2NoZWR1bGVyRm4oZmx1c2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBzZXRTY2hlZHVsZXIoc2NoZWR1bGVGbikge1xuICBjdXN0b21TY2hlZHVsZXJGbiA9IHNjaGVkdWxlRm47XG59XG5cbmZ1bmN0aW9uIHNldEFzYXAoYXNhcEZuKSB7XG4gIGFzYXAgPSBhc2FwRm47XG59XG5cbnZhciBicm93c2VyV2luZG93ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQ7XG52YXIgYnJvd3Nlckdsb2JhbCA9IGJyb3dzZXJXaW5kb3cgfHwge307XG52YXIgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xudmFyIGlzTm9kZSA9IHR5cGVvZiBzZWxmID09PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYge30udG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nO1xuXG4vLyB0ZXN0IGZvciB3ZWIgd29ya2VyIGJ1dCBub3QgaW4gSUUxMFxudmFyIGlzV29ya2VyID0gdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcblxuLy8gbm9kZVxuZnVuY3Rpb24gdXNlTmV4dFRpY2soKSB7XG4gIC8vIG5vZGUgdmVyc2lvbiAwLjEwLnggZGlzcGxheXMgYSBkZXByZWNhdGlvbiB3YXJuaW5nIHdoZW4gbmV4dFRpY2sgaXMgdXNlZCByZWN1cnNpdmVseVxuICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2N1am9qcy93aGVuL2lzc3Vlcy80MTAgZm9yIGRldGFpbHNcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gIH07XG59XG5cbi8vIHZlcnR4XG5mdW5jdGlvbiB1c2VWZXJ0eFRpbWVyKCkge1xuICBpZiAodHlwZW9mIHZlcnR4TmV4dCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmVydHhOZXh0KGZsdXNoKTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gdXNlTXV0YXRpb25PYnNlcnZlcigpIHtcbiAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICBub2RlLmRhdGEgPSBpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMjtcbiAgfTtcbn1cblxuLy8gd2ViIHdvcmtlclxuZnVuY3Rpb24gdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZmx1c2g7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVzZVNldFRpbWVvdXQoKSB7XG4gIC8vIFN0b3JlIHNldFRpbWVvdXQgcmVmZXJlbmNlIHNvIGVzNi1wcm9taXNlIHdpbGwgYmUgdW5hZmZlY3RlZCBieVxuICAvLyBvdGhlciBjb2RlIG1vZGlmeWluZyBzZXRUaW1lb3V0IChsaWtlIHNpbm9uLnVzZUZha2VUaW1lcnMoKSlcbiAgdmFyIGdsb2JhbFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBnbG9iYWxTZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgfTtcbn1cblxudmFyIHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuZnVuY3Rpb24gZmx1c2goKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBxdWV1ZVtpXTtcbiAgICB2YXIgYXJnID0gcXVldWVbaSArIDFdO1xuXG4gICAgY2FsbGJhY2soYXJnKTtcblxuICAgIHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgIHF1ZXVlW2kgKyAxXSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGxlbiA9IDA7XG59XG5cbmZ1bmN0aW9uIGF0dGVtcHRWZXJ0eCgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgdmVydHggPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpLnJlcXVpcmUoJ3ZlcnR4Jyk7XG4gICAgdmVydHhOZXh0ID0gdmVydHgucnVuT25Mb29wIHx8IHZlcnR4LnJ1bk9uQ29udGV4dDtcbiAgICByZXR1cm4gdXNlVmVydHhUaW1lcigpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHVzZVNldFRpbWVvdXQoKTtcbiAgfVxufVxuXG52YXIgc2NoZWR1bGVGbHVzaCA9IHZvaWQgMDtcbi8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG5pZiAoaXNOb2RlKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VOZXh0VGljaygpO1xufSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTXV0YXRpb25PYnNlcnZlcigpO1xufSBlbHNlIGlmIChpc1dvcmtlcikge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTWVzc2FnZUNoYW5uZWwoKTtcbn0gZWxzZSBpZiAoYnJvd3NlcldpbmRvdyA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSBhdHRlbXB0VmVydHgoKTtcbn0gZWxzZSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VTZXRUaW1lb3V0KCk7XG59XG5cbmZ1bmN0aW9uIHRoZW4ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgdmFyIHBhcmVudCA9IHRoaXM7XG5cbiAgdmFyIGNoaWxkID0gbmV3IHRoaXMuY29uc3RydWN0b3Iobm9vcCk7XG5cbiAgaWYgKGNoaWxkW1BST01JU0VfSURdID09PSB1bmRlZmluZWQpIHtcbiAgICBtYWtlUHJvbWlzZShjaGlsZCk7XG4gIH1cblxuICB2YXIgX3N0YXRlID0gcGFyZW50Ll9zdGF0ZTtcblxuXG4gIGlmIChfc3RhdGUpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbX3N0YXRlIC0gMV07XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gaW52b2tlQ2FsbGJhY2soX3N0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHBhcmVudC5fcmVzdWx0KTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICB9XG5cbiAgcmV0dXJuIGNoaWxkO1xufVxuXG4vKipcbiAgYFByb21pc2UucmVzb2x2ZWAgcmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSByZXNvbHZlZCB3aXRoIHRoZVxuICBwYXNzZWQgYHZhbHVlYC4gSXQgaXMgc2hvcnRoYW5kIGZvciB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHJlc29sdmUoMSk7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gdmFsdWUgPT09IDFcbiAgfSk7XG4gIGBgYFxuXG4gIEluc3RlYWQgb2Ygd3JpdGluZyB0aGUgYWJvdmUsIHlvdXIgY29kZSBub3cgc2ltcGx5IGJlY29tZXMgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKDEpO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gdmFsdWUgPT09IDFcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgcmVzb2x2ZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QW55fSB2YWx1ZSB2YWx1ZSB0aGF0IHRoZSByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgd2l0aFxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIGZ1bGZpbGxlZCB3aXRoIHRoZSBnaXZlblxuICBgdmFsdWVgXG4qL1xuZnVuY3Rpb24gcmVzb2x2ZSQxKG9iamVjdCkge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gIGlmIChvYmplY3QgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcgJiYgb2JqZWN0LmNvbnN0cnVjdG9yID09PSBDb25zdHJ1Y3Rvcikge1xuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cblxuICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcbiAgcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxudmFyIFBST01JU0VfSUQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMik7XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG52YXIgUEVORElORyA9IHZvaWQgMDtcbnZhciBGVUxGSUxMRUQgPSAxO1xudmFyIFJFSkVDVEVEID0gMjtcblxudmFyIFRSWV9DQVRDSF9FUlJPUiA9IHsgZXJyb3I6IG51bGwgfTtcblxuZnVuY3Rpb24gc2VsZkZ1bGZpbGxtZW50KCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG59XG5cbmZ1bmN0aW9uIGNhbm5vdFJldHVybk93bigpIHtcbiAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS4nKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGhlbihwcm9taXNlKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHByb21pc2UudGhlbjtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICByZXR1cm4gVFJZX0NBVENIX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyeVRoZW4odGhlbiQkMSwgdmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcikge1xuICB0cnkge1xuICAgIHRoZW4kJDEuY2FsbCh2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbiQkMSkge1xuICBhc2FwKGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgIHZhciBlcnJvciA9IHRyeVRoZW4odGhlbiQkMSwgdGhlbmFibGUsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgaWYgKHNlYWxlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgaWYgKHRoZW5hYmxlICE9PSB2YWx1ZSkge1xuICAgICAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIGlmIChzZWFsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VhbGVkID0gdHJ1ZTtcblxuICAgICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgfSwgJ1NldHRsZTogJyArIChwcm9taXNlLl9sYWJlbCB8fCAnIHVua25vd24gcHJvbWlzZScpKTtcblxuICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICB9XG4gIH0sIHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSkge1xuICBpZiAodGhlbmFibGUuX3N0YXRlID09PSBGVUxGSUxMRUQpIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICB9IGVsc2UgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSB7XG4gICAgc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIHJldHVybiByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJDEpIHtcbiAgaWYgKG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IgPT09IHByb21pc2UuY29uc3RydWN0b3IgJiYgdGhlbiQkMSA9PT0gdGhlbiAmJiBtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yLnJlc29sdmUgPT09IHJlc29sdmUkMSkge1xuICAgIGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICB9IGVsc2Uge1xuICAgIGlmICh0aGVuJCQxID09PSBUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgIHJlamVjdChwcm9taXNlLCBUUllfQ0FUQ0hfRVJST1IuZXJyb3IpO1xuICAgICAgVFJZX0NBVENIX0VSUk9SLmVycm9yID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKHRoZW4kJDEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24odGhlbiQkMSkpIHtcbiAgICAgIGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuJCQxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICByZWplY3QocHJvbWlzZSwgc2VsZkZ1bGZpbGxtZW50KCkpO1xuICB9IGVsc2UgaWYgKG9iamVjdE9yRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSwgZ2V0VGhlbih2YWx1ZSkpO1xuICB9IGVsc2Uge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICBpZiAocHJvbWlzZS5fb25lcnJvcikge1xuICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgfVxuXG4gIHB1Ymxpc2gocHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcHJvbWlzZS5fcmVzdWx0ID0gdmFsdWU7XG4gIHByb21pc2UuX3N0YXRlID0gRlVMRklMTEVEO1xuXG4gIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggIT09IDApIHtcbiAgICBhc2FwKHB1Ymxpc2gsIHByb21pc2UpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHByb21pc2UuX3N0YXRlID0gUkVKRUNURUQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcblxuICBhc2FwKHB1Ymxpc2hSZWplY3Rpb24sIHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgdmFyIF9zdWJzY3JpYmVycyA9IHBhcmVudC5fc3Vic2NyaWJlcnM7XG4gIHZhciBsZW5ndGggPSBfc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG5cbiAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICBfc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICBfc3Vic2NyaWJlcnNbbGVuZ3RoICsgRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBSRUpFQ1RFRF0gPSBvblJlamVjdGlvbjtcblxuICBpZiAobGVuZ3RoID09PSAwICYmIHBhcmVudC5fc3RhdGUpIHtcbiAgICBhc2FwKHB1Ymxpc2gsIHBhcmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHVibGlzaChwcm9taXNlKSB7XG4gIHZhciBzdWJzY3JpYmVycyA9IHByb21pc2UuX3N1YnNjcmliZXJzO1xuICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgY2hpbGQgPSB2b2lkIDAsXG4gICAgICBjYWxsYmFjayA9IHZvaWQgMCxcbiAgICAgIGRldGFpbCA9IHByb21pc2UuX3Jlc3VsdDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgIGlmIChjaGlsZCkge1xuICAgICAgaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgIH1cbiAgfVxuXG4gIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG59XG5cbmZ1bmN0aW9uIHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gY2FsbGJhY2soZGV0YWlsKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgcmV0dXJuIFRSWV9DQVRDSF9FUlJPUjtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gIHZhciBoYXNDYWxsYmFjayA9IGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgdmFsdWUgPSB2b2lkIDAsXG4gICAgICBlcnJvciA9IHZvaWQgMCxcbiAgICAgIHN1Y2NlZWRlZCA9IHZvaWQgMCxcbiAgICAgIGZhaWxlZCA9IHZvaWQgMDtcblxuICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICB2YWx1ZSA9IHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpO1xuXG4gICAgaWYgKHZhbHVlID09PSBUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgIGZhaWxlZCA9IHRydWU7XG4gICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgdmFsdWUuZXJyb3IgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgcmVqZWN0KHByb21pc2UsIGNhbm5vdFJldHVybk93bigpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSBkZXRhaWw7XG4gICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgfVxuXG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykge1xuICAgIC8vIG5vb3BcbiAgfSBlbHNlIGlmIChoYXNDYWxsYmFjayAmJiBzdWNjZWVkZWQpIHtcbiAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgfSBlbHNlIGlmIChmYWlsZWQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IEZVTEZJTExFRCkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IFJFSkVDVEVEKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0aWFsaXplUHJvbWlzZShwcm9taXNlLCByZXNvbHZlcikge1xuICB0cnkge1xuICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKSB7XG4gICAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiByZWplY3RQcm9taXNlKHJlYXNvbikge1xuICAgICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZWplY3QocHJvbWlzZSwgZSk7XG4gIH1cbn1cblxudmFyIGlkID0gMDtcbmZ1bmN0aW9uIG5leHRJZCgpIHtcbiAgcmV0dXJuIGlkKys7XG59XG5cbmZ1bmN0aW9uIG1ha2VQcm9taXNlKHByb21pc2UpIHtcbiAgcHJvbWlzZVtQUk9NSVNFX0lEXSA9IGlkKys7XG4gIHByb21pc2UuX3N0YXRlID0gdW5kZWZpbmVkO1xuICBwcm9taXNlLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3N1YnNjcmliZXJzID0gW107XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRpb25FcnJvcigpIHtcbiAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG59XG5cbnZhciBFbnVtZXJhdG9yID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBFbnVtZXJhdG9yKENvbnN0cnVjdG9yLCBpbnB1dCkge1xuICAgIHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgICB0aGlzLnByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG5cbiAgICBpZiAoIXRoaXMucHJvbWlzZVtQUk9NSVNFX0lEXSkge1xuICAgICAgbWFrZVByb21pc2UodGhpcy5wcm9taXNlKTtcbiAgICB9XG5cbiAgICBpZiAoaXNBcnJheShpbnB1dCkpIHtcbiAgICAgIHRoaXMubGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuICAgICAgdGhpcy5fcmVtYWluaW5nID0gaW5wdXQubGVuZ3RoO1xuXG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuXG4gICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHRoaXMubGVuZ3RoIHx8IDA7XG4gICAgICAgIHRoaXMuX2VudW1lcmF0ZShpbnB1dCk7XG4gICAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZWplY3QodGhpcy5wcm9taXNlLCB2YWxpZGF0aW9uRXJyb3IoKSk7XG4gICAgfVxuICB9XG5cbiAgRW51bWVyYXRvci5wcm90b3R5cGUuX2VudW1lcmF0ZSA9IGZ1bmN0aW9uIF9lbnVtZXJhdGUoaW5wdXQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgdGhpcy5fc3RhdGUgPT09IFBFTkRJTkcgJiYgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLl9lYWNoRW50cnkoaW5wdXRbaV0sIGkpO1xuICAgIH1cbiAgfTtcblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24gX2VhY2hFbnRyeShlbnRyeSwgaSkge1xuICAgIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgICB2YXIgcmVzb2x2ZSQkMSA9IGMucmVzb2x2ZTtcblxuXG4gICAgaWYgKHJlc29sdmUkJDEgPT09IHJlc29sdmUkMSkge1xuICAgICAgdmFyIF90aGVuID0gZ2V0VGhlbihlbnRyeSk7XG5cbiAgICAgIGlmIChfdGhlbiA9PT0gdGhlbiAmJiBlbnRyeS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICAgICAgdGhpcy5fc2V0dGxlZEF0KGVudHJ5Ll9zdGF0ZSwgaSwgZW50cnkuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBfdGhlbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcbiAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gZW50cnk7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09IFByb21pc2UkMSkge1xuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBjKG5vb3ApO1xuICAgICAgICBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIGVudHJ5LCBfdGhlbik7XG4gICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChwcm9taXNlLCBpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChuZXcgYyhmdW5jdGlvbiAocmVzb2x2ZSQkMSkge1xuICAgICAgICAgIHJldHVybiByZXNvbHZlJCQxKGVudHJ5KTtcbiAgICAgICAgfSksIGkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl93aWxsU2V0dGxlQXQocmVzb2x2ZSQkMShlbnRyeSksIGkpO1xuICAgIH1cbiAgfTtcblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24gX3NldHRsZWRBdChzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcblxuXG4gICAgaWYgKHByb21pc2UuX3N0YXRlID09PSBQRU5ESU5HKSB7XG4gICAgICB0aGlzLl9yZW1haW5pbmctLTtcblxuICAgICAgaWYgKHN0YXRlID09PSBSRUpFQ1RFRCkge1xuICAgICAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgZnVsZmlsbChwcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgIH1cbiAgfTtcblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fd2lsbFNldHRsZUF0ID0gZnVuY3Rpb24gX3dpbGxTZXR0bGVBdChwcm9taXNlLCBpKSB7XG4gICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gZW51bWVyYXRvci5fc2V0dGxlZEF0KEZVTEZJTExFRCwgaSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIHJldHVybiBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoUkVKRUNURUQsIGksIHJlYXNvbik7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIEVudW1lcmF0b3I7XG59KCk7XG5cbi8qKlxuICBgUHJvbWlzZS5hbGxgIGFjY2VwdHMgYW4gYXJyYXkgb2YgcHJvbWlzZXMsIGFuZCByZXR1cm5zIGEgbmV3IHByb21pc2Ugd2hpY2hcbiAgaXMgZnVsZmlsbGVkIHdpdGggYW4gYXJyYXkgb2YgZnVsZmlsbG1lbnQgdmFsdWVzIGZvciB0aGUgcGFzc2VkIHByb21pc2VzLCBvclxuICByZWplY3RlZCB3aXRoIHRoZSByZWFzb24gb2YgdGhlIGZpcnN0IHBhc3NlZCBwcm9taXNlIHRvIGJlIHJlamVjdGVkLiBJdCBjYXN0cyBhbGxcbiAgZWxlbWVudHMgb2YgdGhlIHBhc3NlZCBpdGVyYWJsZSB0byBwcm9taXNlcyBhcyBpdCBydW5zIHRoaXMgYWxnb3JpdGhtLlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSByZXNvbHZlKDEpO1xuICBsZXQgcHJvbWlzZTIgPSByZXNvbHZlKDIpO1xuICBsZXQgcHJvbWlzZTMgPSByZXNvbHZlKDMpO1xuICBsZXQgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gVGhlIGFycmF5IGhlcmUgd291bGQgYmUgWyAxLCAyLCAzIF07XG4gIH0pO1xuICBgYGBcblxuICBJZiBhbnkgb2YgdGhlIGBwcm9taXNlc2AgZ2l2ZW4gdG8gYGFsbGAgYXJlIHJlamVjdGVkLCB0aGUgZmlyc3QgcHJvbWlzZVxuICB0aGF0IGlzIHJlamVjdGVkIHdpbGwgYmUgZ2l2ZW4gYXMgYW4gYXJndW1lbnQgdG8gdGhlIHJldHVybmVkIHByb21pc2VzJ3NcbiAgcmVqZWN0aW9uIGhhbmRsZXIuIEZvciBleGFtcGxlOlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSByZXNvbHZlKDEpO1xuICBsZXQgcHJvbWlzZTIgPSByZWplY3QobmV3IEVycm9yKFwiMlwiKSk7XG4gIGxldCBwcm9taXNlMyA9IHJlamVjdChuZXcgRXJyb3IoXCIzXCIpKTtcbiAgbGV0IHByb21pc2VzID0gWyBwcm9taXNlMSwgcHJvbWlzZTIsIHByb21pc2UzIF07XG5cbiAgUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zIGJlY2F1c2UgdGhlcmUgYXJlIHJlamVjdGVkIHByb21pc2VzIVxuICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgIC8vIGVycm9yLm1lc3NhZ2UgPT09IFwiMlwiXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIGFsbFxuICBAc3RhdGljXG4gIEBwYXJhbSB7QXJyYXl9IGVudHJpZXMgYXJyYXkgb2YgcHJvbWlzZXNcbiAgQHBhcmFtIHtTdHJpbmd9IGxhYmVsIG9wdGlvbmFsIHN0cmluZyBmb3IgbGFiZWxpbmcgdGhlIHByb21pc2UuXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aGVuIGFsbCBgcHJvbWlzZXNgIGhhdmUgYmVlblxuICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIGlmIGFueSBvZiB0aGVtIGJlY29tZSByZWplY3RlZC5cbiAgQHN0YXRpY1xuKi9cbmZ1bmN0aW9uIGFsbChlbnRyaWVzKSB7XG4gIHJldHVybiBuZXcgRW51bWVyYXRvcih0aGlzLCBlbnRyaWVzKS5wcm9taXNlO1xufVxuXG4vKipcbiAgYFByb21pc2UucmFjZWAgcmV0dXJucyBhIG5ldyBwcm9taXNlIHdoaWNoIGlzIHNldHRsZWQgaW4gdGhlIHNhbWUgd2F5IGFzIHRoZVxuICBmaXJzdCBwYXNzZWQgcHJvbWlzZSB0byBzZXR0bGUuXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZSgncHJvbWlzZSAxJyk7XG4gICAgfSwgMjAwKTtcbiAgfSk7XG5cbiAgbGV0IHByb21pc2UyID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDInKTtcbiAgICB9LCAxMDApO1xuICB9KTtcblxuICBQcm9taXNlLnJhY2UoW3Byb21pc2UxLCBwcm9taXNlMl0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAvLyByZXN1bHQgPT09ICdwcm9taXNlIDInIGJlY2F1c2UgaXQgd2FzIHJlc29sdmVkIGJlZm9yZSBwcm9taXNlMVxuICAgIC8vIHdhcyByZXNvbHZlZC5cbiAgfSk7XG4gIGBgYFxuXG4gIGBQcm9taXNlLnJhY2VgIGlzIGRldGVybWluaXN0aWMgaW4gdGhhdCBvbmx5IHRoZSBzdGF0ZSBvZiB0aGUgZmlyc3RcbiAgc2V0dGxlZCBwcm9taXNlIG1hdHRlcnMuIEZvciBleGFtcGxlLCBldmVuIGlmIG90aGVyIHByb21pc2VzIGdpdmVuIHRvIHRoZVxuICBgcHJvbWlzZXNgIGFycmF5IGFyZ3VtZW50IGFyZSByZXNvbHZlZCwgYnV0IHRoZSBmaXJzdCBzZXR0bGVkIHByb21pc2UgaGFzXG4gIGJlY29tZSByZWplY3RlZCBiZWZvcmUgdGhlIG90aGVyIHByb21pc2VzIGJlY2FtZSBmdWxmaWxsZWQsIHRoZSByZXR1cm5lZFxuICBwcm9taXNlIHdpbGwgYmVjb21lIHJlamVjdGVkOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDEnKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICBsZXQgcHJvbWlzZTIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlamVjdChuZXcgRXJyb3IoJ3Byb21pc2UgMicpKTtcbiAgICB9LCAxMDApO1xuICB9KTtcblxuICBQcm9taXNlLnJhY2UoW3Byb21pc2UxLCBwcm9taXNlMl0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVuc1xuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAncHJvbWlzZSAyJyBiZWNhdXNlIHByb21pc2UgMiBiZWNhbWUgcmVqZWN0ZWQgYmVmb3JlXG4gICAgLy8gcHJvbWlzZSAxIGJlY2FtZSBmdWxmaWxsZWRcbiAgfSk7XG4gIGBgYFxuXG4gIEFuIGV4YW1wbGUgcmVhbC13b3JsZCB1c2UgY2FzZSBpcyBpbXBsZW1lbnRpbmcgdGltZW91dHM6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBQcm9taXNlLnJhY2UoW2FqYXgoJ2Zvby5qc29uJyksIHRpbWVvdXQoNTAwMCldKVxuICBgYGBcblxuICBAbWV0aG9kIHJhY2VcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FycmF5fSBwcm9taXNlcyBhcnJheSBvZiBwcm9taXNlcyB0byBvYnNlcnZlXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHdoaWNoIHNldHRsZXMgaW4gdGhlIHNhbWUgd2F5IGFzIHRoZSBmaXJzdCBwYXNzZWRcbiAgcHJvbWlzZSB0byBzZXR0bGUuXG4qL1xuZnVuY3Rpb24gcmFjZShlbnRyaWVzKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgaWYgKCFpc0FycmF5KGVudHJpZXMpKSB7XG4gICAgcmV0dXJuIG5ldyBDb25zdHJ1Y3RvcihmdW5jdGlvbiAoXywgcmVqZWN0KSB7XG4gICAgICByZXR1cm4gcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBDb25zdHJ1Y3RvcihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yZWplY3RgIHJldHVybnMgYSBwcm9taXNlIHJlamVjdGVkIHdpdGggdGhlIHBhc3NlZCBgcmVhc29uYC5cbiAgSXQgaXMgc2hvcnRoYW5kIGZvciB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ1dIT09QUydcbiAgfSk7XG4gIGBgYFxuXG4gIEluc3RlYWQgb2Ygd3JpdGluZyB0aGUgYWJvdmUsIHlvdXIgY29kZSBub3cgc2ltcGx5IGJlY29tZXMgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdXSE9PUFMnKSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ1dIT09QUydcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgcmVqZWN0XG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBbnl9IHJlYXNvbiB2YWx1ZSB0aGF0IHRoZSByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aC5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgcmVqZWN0ZWQgd2l0aCB0aGUgZ2l2ZW4gYHJlYXNvbmAuXG4qL1xuZnVuY3Rpb24gcmVqZWN0JDEocmVhc29uKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG4gIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgcmV0dXJuIHByb21pc2U7XG59XG5cbmZ1bmN0aW9uIG5lZWRzUmVzb2x2ZXIoKSB7XG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbn1cblxuZnVuY3Rpb24gbmVlZHNOZXcoKSB7XG4gIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7XG59XG5cbi8qKlxuICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlIHJlYXNvblxuICB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICBUZXJtaW5vbG9neVxuICAtLS0tLS0tLS0tLVxuXG4gIC0gYHByb21pc2VgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB3aXRoIGEgYHRoZW5gIG1ldGhvZCB3aG9zZSBiZWhhdmlvciBjb25mb3JtcyB0byB0aGlzIHNwZWNpZmljYXRpb24uXG4gIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgLSBgdmFsdWVgIGlzIGFueSBsZWdhbCBKYXZhU2NyaXB0IHZhbHVlIChpbmNsdWRpbmcgdW5kZWZpbmVkLCBhIHRoZW5hYmxlLCBvciBhIHByb21pc2UpLlxuICAtIGBleGNlcHRpb25gIGlzIGEgdmFsdWUgdGhhdCBpcyB0aHJvd24gdXNpbmcgdGhlIHRocm93IHN0YXRlbWVudC5cbiAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAtIGBzZXR0bGVkYCB0aGUgZmluYWwgcmVzdGluZyBzdGF0ZSBvZiBhIHByb21pc2UsIGZ1bGZpbGxlZCBvciByZWplY3RlZC5cblxuICBBIHByb21pc2UgY2FuIGJlIGluIG9uZSBvZiB0aHJlZSBzdGF0ZXM6IHBlbmRpbmcsIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQuXG5cbiAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgc3RhdGUuICBQcm9taXNlcyB0aGF0IGFyZSByZWplY3RlZCBoYXZlIGEgcmVqZWN0aW9uIHJlYXNvbiBhbmQgYXJlIGluIHRoZVxuICByZWplY3RlZCBzdGF0ZS4gIEEgZnVsZmlsbG1lbnQgdmFsdWUgaXMgbmV2ZXIgYSB0aGVuYWJsZS5cblxuICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgcHJvbWlzZSwgdGhlbiB0aGUgb3JpZ2luYWwgcHJvbWlzZSdzIHNldHRsZWQgc3RhdGUgd2lsbCBtYXRjaCB0aGUgdmFsdWUnc1xuICBzZXR0bGVkIHN0YXRlLiAgU28gYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCByZWplY3RzIHdpbGxcbiAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICBpdHNlbGYgZnVsZmlsbC5cblxuXG4gIEJhc2ljIFVzYWdlOlxuICAtLS0tLS0tLS0tLS1cblxuICBgYGBqc1xuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICByZXNvbHZlKHZhbHVlKTtcblxuICAgIC8vIG9uIGZhaWx1cmVcbiAgICByZWplY3QocmVhc29uKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgLy8gb24gcmVqZWN0aW9uXG4gIH0pO1xuICBgYGBcblxuICBBZHZhbmNlZCBVc2FnZTpcbiAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgUHJvbWlzZXMgc2hpbmUgd2hlbiBhYnN0cmFjdGluZyBhd2F5IGFzeW5jaHJvbm91cyBpbnRlcmFjdGlvbnMgc3VjaCBhc1xuICBgWE1MSHR0cFJlcXVlc3Rgcy5cblxuICBgYGBqc1xuICBmdW5jdGlvbiBnZXRKU09OKHVybCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgbGV0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBoYW5kbGVyO1xuICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgeGhyLnNlbmQoKTtcblxuICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gdGhpcy5ET05FKSB7XG4gICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ2dldEpTT046IGAnICsgdXJsICsgJ2AgZmFpbGVkIHdpdGggc3RhdHVzOiBbJyArIHRoaXMuc3RhdHVzICsgJ10nKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0SlNPTignL3Bvc3RzLmpzb24nKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAvLyBvbiBmdWxmaWxsbWVudFxuICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAvLyBvbiByZWplY3Rpb25cbiAgfSk7XG4gIGBgYFxuXG4gIFVubGlrZSBjYWxsYmFja3MsIHByb21pc2VzIGFyZSBncmVhdCBjb21wb3NhYmxlIHByaW1pdGl2ZXMuXG5cbiAgYGBganNcbiAgUHJvbWlzZS5hbGwoW1xuICAgIGdldEpTT04oJy9wb3N0cycpLFxuICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gIF0pLnRoZW4oZnVuY3Rpb24odmFsdWVzKXtcbiAgICB2YWx1ZXNbMF0gLy8gPT4gcG9zdHNKU09OXG4gICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSk7XG4gIGBgYFxuXG4gIEBjbGFzcyBQcm9taXNlXG4gIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmVyXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQGNvbnN0cnVjdG9yXG4qL1xuXG52YXIgUHJvbWlzZSQxID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgdGhpc1tQUk9NSVNFX0lEXSA9IG5leHRJZCgpO1xuICAgIHRoaXMuX3Jlc3VsdCA9IHRoaXMuX3N0YXRlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3N1YnNjcmliZXJzID0gW107XG5cbiAgICBpZiAobm9vcCAhPT0gcmVzb2x2ZXIpIHtcbiAgICAgIHR5cGVvZiByZXNvbHZlciAhPT0gJ2Z1bmN0aW9uJyAmJiBuZWVkc1Jlc29sdmVyKCk7XG4gICAgICB0aGlzIGluc3RhbmNlb2YgUHJvbWlzZSA/IGluaXRpYWxpemVQcm9taXNlKHRoaXMsIHJlc29sdmVyKSA6IG5lZWRzTmV3KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gIFRoZSBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLFxuICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICByZWFzb24gd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG4gICBgYGBqc1xuICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgLy8gdXNlciBpcyBhdmFpbGFibGVcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyB1c2VyIGlzIHVuYXZhaWxhYmxlLCBhbmQgeW91IGFyZSBnaXZlbiB0aGUgcmVhc29uIHdoeVxuICB9KTtcbiAgYGBgXG4gICBDaGFpbmluZ1xuICAtLS0tLS0tLVxuICAgVGhlIHJldHVybiB2YWx1ZSBvZiBgdGhlbmAgaXMgaXRzZWxmIGEgcHJvbWlzZS4gIFRoaXMgc2Vjb25kLCAnZG93bnN0cmVhbSdcbiAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICBvciByZWplY3Rpb24gaGFuZGxlciwgb3IgcmVqZWN0ZWQgaWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHJldHVybiB1c2VyLm5hbWU7XG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICByZXR1cm4gJ2RlZmF1bHQgbmFtZSc7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHVzZXJOYW1lKSB7XG4gICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgIC8vIHdpbGwgYmUgYCdkZWZhdWx0IG5hbWUnYFxuICB9KTtcbiAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknKTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRocm93IG5ldyBFcnJvcignYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScpO1xuICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIC8vIGlmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgcmVhc29uYCB3aWxsIGJlICdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScuXG4gICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gIH0pO1xuICBgYGBcbiAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG4gICBgYGBqc1xuICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICB0aHJvdyBuZXcgUGVkYWdvZ2ljYWxFeGNlcHRpb24oJ1Vwc3RyZWFtIGVycm9yJyk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIC8vIFRoZSBgUGVkZ2Fnb2NpYWxFeGNlcHRpb25gIGlzIHByb3BhZ2F0ZWQgYWxsIHRoZSB3YXkgZG93biB0byBoZXJlXG4gIH0pO1xuICBgYGBcbiAgIEFzc2ltaWxhdGlvblxuICAtLS0tLS0tLS0tLS1cbiAgIFNvbWV0aW1lcyB0aGUgdmFsdWUgeW91IHdhbnQgdG8gcHJvcGFnYXRlIHRvIGEgZG93bnN0cmVhbSBwcm9taXNlIGNhbiBvbmx5IGJlXG4gIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgZnVsZmlsbG1lbnQgb3IgcmVqZWN0aW9uIGhhbmRsZXIuIFRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCB0aGVuIGJlIHBlbmRpbmdcbiAgdW50aWwgdGhlIHJldHVybmVkIHByb21pc2UgaXMgc2V0dGxlZC4gVGhpcyBpcyBjYWxsZWQgKmFzc2ltaWxhdGlvbiouXG4gICBgYGBqc1xuICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgLy8gVGhlIHVzZXIncyBjb21tZW50cyBhcmUgbm93IGF2YWlsYWJsZVxuICB9KTtcbiAgYGBgXG4gICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIHJlamVjdHMsIHdlJ2xsIGhhdmUgdGhlIHJlYXNvbiBoZXJlXG4gIH0pO1xuICBgYGBcbiAgIFNpbXBsZSBFeGFtcGxlXG4gIC0tLS0tLS0tLS0tLS0tXG4gICBTeW5jaHJvbm91cyBFeGFtcGxlXG4gICBgYGBqYXZhc2NyaXB0XG4gIGxldCByZXN1bHQ7XG4gICB0cnkge1xuICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAvLyBzdWNjZXNzXG4gIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgLy8gZmFpbHVyZVxuICB9XG4gIGBgYFxuICAgRXJyYmFjayBFeGFtcGxlXG4gICBgYGBqc1xuICBmaW5kUmVzdWx0KGZ1bmN0aW9uKHJlc3VsdCwgZXJyKXtcbiAgICBpZiAoZXJyKSB7XG4gICAgICAvLyBmYWlsdXJlXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHN1Y2Nlc3NcbiAgICB9XG4gIH0pO1xuICBgYGBcbiAgIFByb21pc2UgRXhhbXBsZTtcbiAgIGBgYGphdmFzY3JpcHRcbiAgZmluZFJlc3VsdCgpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAvLyBzdWNjZXNzXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gZmFpbHVyZVxuICB9KTtcbiAgYGBgXG4gICBBZHZhbmNlZCBFeGFtcGxlXG4gIC0tLS0tLS0tLS0tLS0tXG4gICBTeW5jaHJvbm91cyBFeGFtcGxlXG4gICBgYGBqYXZhc2NyaXB0XG4gIGxldCBhdXRob3IsIGJvb2tzO1xuICAgdHJ5IHtcbiAgICBhdXRob3IgPSBmaW5kQXV0aG9yKCk7XG4gICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAvLyBzdWNjZXNzXG4gIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgLy8gZmFpbHVyZVxuICB9XG4gIGBgYFxuICAgRXJyYmFjayBFeGFtcGxlXG4gICBgYGBqc1xuICAgZnVuY3Rpb24gZm91bmRCb29rcyhib29rcykge1xuICAgfVxuICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcbiAgIH1cbiAgIGZpbmRBdXRob3IoZnVuY3Rpb24oYXV0aG9yLCBlcnIpe1xuICAgIGlmIChlcnIpIHtcbiAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9IGVsc2Uge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmluZEJvb29rc0J5QXV0aG9yKGF1dGhvciwgZnVuY3Rpb24oYm9va3MsIGVycikge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAgICAgICBmYWlsdXJlKHJlYXNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgfVxuICAgICAgLy8gc3VjY2Vzc1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuICAgUHJvbWlzZSBFeGFtcGxlO1xuICAgYGBgamF2YXNjcmlwdFxuICBmaW5kQXV0aG9yKCkuXG4gICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgdGhlbihmdW5jdGlvbihib29rcyl7XG4gICAgICAvLyBmb3VuZCBib29rc1xuICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH0pO1xuICBgYGBcbiAgIEBtZXRob2QgdGhlblxuICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGVkXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuICAvKipcbiAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICBhcyB0aGUgY2F0Y2ggYmxvY2sgb2YgYSB0cnkvY2F0Y2ggc3RhdGVtZW50LlxuICBgYGBqc1xuICBmdW5jdGlvbiBmaW5kQXV0aG9yKCl7XG4gIHRocm93IG5ldyBFcnJvcignY291bGRuJ3QgZmluZCB0aGF0IGF1dGhvcicpO1xuICB9XG4gIC8vIHN5bmNocm9ub3VzXG4gIHRyeSB7XG4gIGZpbmRBdXRob3IoKTtcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfVxuICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gIGZpbmRBdXRob3IoKS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9KTtcbiAgYGBgXG4gIEBtZXRob2QgY2F0Y2hcbiAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3Rpb25cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG5cbiAgUHJvbWlzZS5wcm90b3R5cGUuY2F0Y2ggPSBmdW5jdGlvbiBfY2F0Y2gob25SZWplY3Rpb24pIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgfTtcblxuICAvKipcbiAgICBgZmluYWxseWAgd2lsbCBiZSBpbnZva2VkIHJlZ2FyZGxlc3Mgb2YgdGhlIHByb21pc2UncyBmYXRlIGp1c3QgYXMgbmF0aXZlXG4gICAgdHJ5L2NhdGNoL2ZpbmFsbHkgYmVoYXZlc1xuICBcbiAgICBTeW5jaHJvbm91cyBleGFtcGxlOlxuICBcbiAgICBgYGBqc1xuICAgIGZpbmRBdXRob3IoKSB7XG4gICAgICBpZiAoTWF0aC5yYW5kb20oKSA+IDAuNSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgQXV0aG9yKCk7XG4gICAgfVxuICBcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGZpbmRBdXRob3IoKTsgLy8gc3VjY2VlZCBvciBmYWlsXG4gICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgcmV0dXJuIGZpbmRPdGhlckF1dGhlcigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAvLyBhbHdheXMgcnVuc1xuICAgICAgLy8gZG9lc24ndCBhZmZlY3QgdGhlIHJldHVybiB2YWx1ZVxuICAgIH1cbiAgICBgYGBcbiAgXG4gICAgQXN5bmNocm9ub3VzIGV4YW1wbGU6XG4gIFxuICAgIGBgYGpzXG4gICAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICByZXR1cm4gZmluZE90aGVyQXV0aGVyKCk7XG4gICAgfSkuZmluYWxseShmdW5jdGlvbigpe1xuICAgICAgLy8gYXV0aG9yIHdhcyBlaXRoZXIgZm91bmQsIG9yIG5vdFxuICAgIH0pO1xuICAgIGBgYFxuICBcbiAgICBAbWV0aG9kIGZpbmFsbHlcbiAgICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cblxuICBQcm9taXNlLnByb3RvdHlwZS5maW5hbGx5ID0gZnVuY3Rpb24gX2ZpbmFsbHkoY2FsbGJhY2spIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG4gICAgdmFyIGNvbnN0cnVjdG9yID0gcHJvbWlzZS5jb25zdHJ1Y3RvcjtcblxuICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIGNvbnN0cnVjdG9yLnJlc29sdmUoY2FsbGJhY2soKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IHJlYXNvbjtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBQcm9taXNlO1xufSgpO1xuXG5Qcm9taXNlJDEucHJvdG90eXBlLnRoZW4gPSB0aGVuO1xuUHJvbWlzZSQxLmFsbCA9IGFsbDtcblByb21pc2UkMS5yYWNlID0gcmFjZTtcblByb21pc2UkMS5yZXNvbHZlID0gcmVzb2x2ZSQxO1xuUHJvbWlzZSQxLnJlamVjdCA9IHJlamVjdCQxO1xuUHJvbWlzZSQxLl9zZXRTY2hlZHVsZXIgPSBzZXRTY2hlZHVsZXI7XG5Qcm9taXNlJDEuX3NldEFzYXAgPSBzZXRBc2FwO1xuUHJvbWlzZSQxLl9hc2FwID0gYXNhcDtcblxuLypnbG9iYWwgc2VsZiovXG5mdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgdmFyIGxvY2FsID0gdm9pZCAwO1xuXG4gIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gZ2xvYmFsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gc2VsZjtcbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgbG9jYWwgPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncG9seWZpbGwgZmFpbGVkIGJlY2F1c2UgZ2xvYmFsIG9iamVjdCBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgdmFyIFAgPSBsb2NhbC5Qcm9taXNlO1xuXG4gIGlmIChQKSB7XG4gICAgdmFyIHByb21pc2VUb1N0cmluZyA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHByb21pc2VUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChQLnJlc29sdmUoKSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gc2lsZW50bHkgaWdub3JlZFxuICAgIH1cblxuICAgIGlmIChwcm9taXNlVG9TdHJpbmcgPT09ICdbb2JqZWN0IFByb21pc2VdJyAmJiAhUC5jYXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgbG9jYWwuUHJvbWlzZSA9IFByb21pc2UkMTtcbn1cblxuLy8gU3RyYW5nZSBjb21wYXQuLlxuUHJvbWlzZSQxLnBvbHlmaWxsID0gcG9seWZpbGw7XG5Qcm9taXNlJDEuUHJvbWlzZSA9IFByb21pc2UkMTtcblxucmV0dXJuIFByb21pc2UkMTtcblxufSkpKTtcblxuXG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWVzNi1wcm9taXNlLm1hcFxuIiwiLyoqXG4gKiBsb2Rhc2ggKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzIDxodHRwczovL2pxdWVyeS5vcmcvPlxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICovXG5cbi8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG52YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBOQU4gPSAwIC8gMDtcblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIHN5bWJvbFRhZyA9ICdbb2JqZWN0IFN5bWJvbF0nO1xuXG4vKiogVXNlZCB0byBtYXRjaCBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLiAqL1xudmFyIHJlVHJpbSA9IC9eXFxzK3xcXHMrJC9nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgYmFkIHNpZ25lZCBoZXhhZGVjaW1hbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCYWRIZXggPSAvXlstK10weFswLTlhLWZdKyQvaTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGJpbmFyeSBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCaW5hcnkgPSAvXjBiWzAxXSskL2k7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBvY3RhbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNPY3RhbCA9IC9eMG9bMC03XSskL2k7XG5cbi8qKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyB3aXRob3V0IGEgZGVwZW5kZW5jeSBvbiBgcm9vdGAuICovXG52YXIgZnJlZVBhcnNlSW50ID0gcGFyc2VJbnQ7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZ2xvYmFsYCBmcm9tIE5vZGUuanMuICovXG52YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsICYmIGdsb2JhbC5PYmplY3QgPT09IE9iamVjdCAmJiBnbG9iYWw7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgc2VsZmAuICovXG52YXIgZnJlZVNlbGYgPSB0eXBlb2Ygc2VsZiA9PSAnb2JqZWN0JyAmJiBzZWxmICYmIHNlbGYuT2JqZWN0ID09PSBPYmplY3QgJiYgc2VsZjtcblxuLyoqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QuICovXG52YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgZnJlZVNlbGYgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlXG4gKiBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcbiAgICBuYXRpdmVNaW4gPSBNYXRoLm1pbjtcblxuLyoqXG4gKiBHZXRzIHRoZSB0aW1lc3RhbXAgb2YgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2VcbiAqIHRoZSBVbml4IGVwb2NoICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMi40LjBcbiAqIEBjYXRlZ29yeSBEYXRlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSB0aW1lc3RhbXAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uZGVmZXIoZnVuY3Rpb24oc3RhbXApIHtcbiAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcbiAqIH0sIF8ubm93KCkpO1xuICogLy8gPT4gTG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgaW52b2NhdGlvbi5cbiAqL1xudmFyIG5vdyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gcm9vdC5EYXRlLm5vdygpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcbiAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xuICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxuICogZGVsYXllZCBgZnVuY2AgaW52b2NhdGlvbnMgYW5kIGEgYGZsdXNoYCBtZXRob2QgdG8gaW1tZWRpYXRlbHkgaW52b2tlIHRoZW0uXG4gKiBQcm92aWRlIGBvcHRpb25zYCB0byBpbmRpY2F0ZSB3aGV0aGVyIGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGVcbiAqIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBUaGUgYGZ1bmNgIGlzIGludm9rZWRcbiAqIHdpdGggdGhlIGxhc3QgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24uIFN1YnNlcXVlbnRcbiAqIGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgXG4gKiBpbnZvY2F0aW9uLlxuICpcbiAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXNcbiAqIGludm9rZWQgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uXG4gKiBpcyBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogSWYgYHdhaXRgIGlzIGAwYCBhbmQgYGxlYWRpbmdgIGlzIGBmYWxzZWAsIGBmdW5jYCBpbnZvY2F0aW9uIGlzIGRlZmVycmVkXG4gKiB1bnRpbCB0byB0aGUgbmV4dCB0aWNrLCBzaW1pbGFyIHRvIGBzZXRUaW1lb3V0YCB3aXRoIGEgdGltZW91dCBvZiBgMGAuXG4gKlxuICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vZGVib3VuY2luZy10aHJvdHRsaW5nLWV4cGxhaW5lZC1leGFtcGxlcy8pXG4gKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF1cbiAqICBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBBdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4LlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcbiAqXG4gKiAvLyBJbnZva2UgYHNlbmRNYWlsYCB3aGVuIGNsaWNrZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxscy5cbiAqIGpRdWVyeShlbGVtZW50KS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAqICAgJ2xlYWRpbmcnOiB0cnVlLFxuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSkpO1xuICpcbiAqIC8vIEVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHMuXG4gKiB2YXIgZGVib3VuY2VkID0gXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7ICdtYXhXYWl0JzogMTAwMCB9KTtcbiAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAqIGpRdWVyeShzb3VyY2UpLm9uKCdtZXNzYWdlJywgZGVib3VuY2VkKTtcbiAqXG4gKiAvLyBDYW5jZWwgdGhlIHRyYWlsaW5nIGRlYm91bmNlZCBpbnZvY2F0aW9uLlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3BvcHN0YXRlJywgZGVib3VuY2VkLmNhbmNlbCk7XG4gKi9cbmZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGxhc3RBcmdzLFxuICAgICAgbGFzdFRoaXMsXG4gICAgICBtYXhXYWl0LFxuICAgICAgcmVzdWx0LFxuICAgICAgdGltZXJJZCxcbiAgICAgIGxhc3RDYWxsVGltZSxcbiAgICAgIGxhc3RJbnZva2VUaW1lID0gMCxcbiAgICAgIGxlYWRpbmcgPSBmYWxzZSxcbiAgICAgIG1heGluZyA9IGZhbHNlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIHdhaXQgPSB0b051bWJlcih3YWl0KSB8fCAwO1xuICBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgbWF4aW5nID0gJ21heFdhaXQnIGluIG9wdGlvbnM7XG4gICAgbWF4V2FpdCA9IG1heGluZyA/IG5hdGl2ZU1heCh0b051bWJlcihvcHRpb25zLm1heFdhaXQpIHx8IDAsIHdhaXQpIDogbWF4V2FpdDtcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICB9XG5cbiAgZnVuY3Rpb24gaW52b2tlRnVuYyh0aW1lKSB7XG4gICAgdmFyIGFyZ3MgPSBsYXN0QXJncyxcbiAgICAgICAgdGhpc0FyZyA9IGxhc3RUaGlzO1xuXG4gICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICBsYXN0SW52b2tlVGltZSA9IHRpbWU7XG4gICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gbGVhZGluZ0VkZ2UodGltZSkge1xuICAgIC8vIFJlc2V0IGFueSBgbWF4V2FpdGAgdGltZXIuXG4gICAgbGFzdEludm9rZVRpbWUgPSB0aW1lO1xuICAgIC8vIFN0YXJ0IHRoZSB0aW1lciBmb3IgdGhlIHRyYWlsaW5nIGVkZ2UuXG4gICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0KTtcbiAgICAvLyBJbnZva2UgdGhlIGxlYWRpbmcgZWRnZS5cbiAgICByZXR1cm4gbGVhZGluZyA/IGludm9rZUZ1bmModGltZSkgOiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiByZW1haW5pbmdXYWl0KHRpbWUpIHtcbiAgICB2YXIgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lLFxuICAgICAgICB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lLFxuICAgICAgICByZXN1bHQgPSB3YWl0IC0gdGltZVNpbmNlTGFzdENhbGw7XG5cbiAgICByZXR1cm4gbWF4aW5nID8gbmF0aXZlTWluKHJlc3VsdCwgbWF4V2FpdCAtIHRpbWVTaW5jZUxhc3RJbnZva2UpIDogcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdWxkSW52b2tlKHRpbWUpIHtcbiAgICB2YXIgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lLFxuICAgICAgICB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lO1xuXG4gICAgLy8gRWl0aGVyIHRoaXMgaXMgdGhlIGZpcnN0IGNhbGwsIGFjdGl2aXR5IGhhcyBzdG9wcGVkIGFuZCB3ZSdyZSBhdCB0aGVcbiAgICAvLyB0cmFpbGluZyBlZGdlLCB0aGUgc3lzdGVtIHRpbWUgaGFzIGdvbmUgYmFja3dhcmRzIGFuZCB3ZSdyZSB0cmVhdGluZ1xuICAgIC8vIGl0IGFzIHRoZSB0cmFpbGluZyBlZGdlLCBvciB3ZSd2ZSBoaXQgdGhlIGBtYXhXYWl0YCBsaW1pdC5cbiAgICByZXR1cm4gKGxhc3RDYWxsVGltZSA9PT0gdW5kZWZpbmVkIHx8ICh0aW1lU2luY2VMYXN0Q2FsbCA+PSB3YWl0KSB8fFxuICAgICAgKHRpbWVTaW5jZUxhc3RDYWxsIDwgMCkgfHwgKG1heGluZyAmJiB0aW1lU2luY2VMYXN0SW52b2tlID49IG1heFdhaXQpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWVyRXhwaXJlZCgpIHtcbiAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgIGlmIChzaG91bGRJbnZva2UodGltZSkpIHtcbiAgICAgIHJldHVybiB0cmFpbGluZ0VkZ2UodGltZSk7XG4gICAgfVxuICAgIC8vIFJlc3RhcnQgdGhlIHRpbWVyLlxuICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgcmVtYWluaW5nV2FpdCh0aW1lKSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFpbGluZ0VkZ2UodGltZSkge1xuICAgIHRpbWVySWQgPSB1bmRlZmluZWQ7XG5cbiAgICAvLyBPbmx5IGludm9rZSBpZiB3ZSBoYXZlIGBsYXN0QXJnc2Agd2hpY2ggbWVhbnMgYGZ1bmNgIGhhcyBiZWVuXG4gICAgLy8gZGVib3VuY2VkIGF0IGxlYXN0IG9uY2UuXG4gICAgaWYgKHRyYWlsaW5nICYmIGxhc3RBcmdzKSB7XG4gICAgICByZXR1cm4gaW52b2tlRnVuYyh0aW1lKTtcbiAgICB9XG4gICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gY2FuY2VsKCkge1xuICAgIGlmICh0aW1lcklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICB9XG4gICAgbGFzdEludm9rZVRpbWUgPSAwO1xuICAgIGxhc3RBcmdzID0gbGFzdENhbGxUaW1lID0gbGFzdFRoaXMgPSB0aW1lcklkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgcmV0dXJuIHRpbWVySWQgPT09IHVuZGVmaW5lZCA/IHJlc3VsdCA6IHRyYWlsaW5nRWRnZShub3coKSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgdmFyIHRpbWUgPSBub3coKSxcbiAgICAgICAgaXNJbnZva2luZyA9IHNob3VsZEludm9rZSh0aW1lKTtcblxuICAgIGxhc3RBcmdzID0gYXJndW1lbnRzO1xuICAgIGxhc3RUaGlzID0gdGhpcztcbiAgICBsYXN0Q2FsbFRpbWUgPSB0aW1lO1xuXG4gICAgaWYgKGlzSW52b2tpbmcpIHtcbiAgICAgIGlmICh0aW1lcklkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGxlYWRpbmdFZGdlKGxhc3RDYWxsVGltZSk7XG4gICAgICB9XG4gICAgICBpZiAobWF4aW5nKSB7XG4gICAgICAgIC8vIEhhbmRsZSBpbnZvY2F0aW9ucyBpbiBhIHRpZ2h0IGxvb3AuXG4gICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgICAgIHJldHVybiBpbnZva2VGdW5jKGxhc3RDYWxsVGltZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aW1lcklkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcbiAgZGVib3VuY2VkLmZsdXNoID0gZmx1c2g7XG4gIHJldHVybiBkZWJvdW5jZWQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHRocm90dGxlZCBmdW5jdGlvbiB0aGF0IG9ubHkgaW52b2tlcyBgZnVuY2AgYXQgbW9zdCBvbmNlIHBlclxuICogZXZlcnkgYHdhaXRgIG1pbGxpc2Vjb25kcy4gVGhlIHRocm90dGxlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGBcbiAqIG1ldGhvZCB0byBjYW5jZWwgZGVsYXllZCBgZnVuY2AgaW52b2NhdGlvbnMgYW5kIGEgYGZsdXNoYCBtZXRob2QgdG9cbiAqIGltbWVkaWF0ZWx5IGludm9rZSB0aGVtLiBQcm92aWRlIGBvcHRpb25zYCB0byBpbmRpY2F0ZSB3aGV0aGVyIGBmdW5jYFxuICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YFxuICogdGltZW91dC4gVGhlIGBmdW5jYCBpcyBpbnZva2VkIHdpdGggdGhlIGxhc3QgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZVxuICogdGhyb3R0bGVkIGZ1bmN0aW9uLiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gcmV0dXJuIHRoZVxuICogcmVzdWx0IG9mIHRoZSBsYXN0IGBmdW5jYCBpbnZvY2F0aW9uLlxuICpcbiAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXNcbiAqIGludm9rZWQgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uXG4gKiBpcyBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogSWYgYHdhaXRgIGlzIGAwYCBhbmQgYGxlYWRpbmdgIGlzIGBmYWxzZWAsIGBmdW5jYCBpbnZvY2F0aW9uIGlzIGRlZmVycmVkXG4gKiB1bnRpbCB0byB0aGUgbmV4dCB0aWNrLCBzaW1pbGFyIHRvIGBzZXRUaW1lb3V0YCB3aXRoIGEgdGltZW91dCBvZiBgMGAuXG4gKlxuICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vZGVib3VuY2luZy10aHJvdHRsaW5nLWV4cGxhaW5lZC1leGFtcGxlcy8pXG4gKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLnRocm90dGxlYCBhbmQgYF8uZGVib3VuY2VgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gdGhyb3R0bGUuXG4gKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gdGhyb3R0bGUgaW52b2NhdGlvbnMgdG8uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz10cnVlXVxuICogIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgdGhyb3R0bGVkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBBdm9pZCBleGNlc3NpdmVseSB1cGRhdGluZyB0aGUgcG9zaXRpb24gd2hpbGUgc2Nyb2xsaW5nLlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3Njcm9sbCcsIF8udGhyb3R0bGUodXBkYXRlUG9zaXRpb24sIDEwMCkpO1xuICpcbiAqIC8vIEludm9rZSBgcmVuZXdUb2tlbmAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGJ1dCBub3QgbW9yZSB0aGFuIG9uY2UgZXZlcnkgNSBtaW51dGVzLlxuICogdmFyIHRocm90dGxlZCA9IF8udGhyb3R0bGUocmVuZXdUb2tlbiwgMzAwMDAwLCB7ICd0cmFpbGluZyc6IGZhbHNlIH0pO1xuICogalF1ZXJ5KGVsZW1lbnQpLm9uKCdjbGljaycsIHRocm90dGxlZCk7XG4gKlxuICogLy8gQ2FuY2VsIHRoZSB0cmFpbGluZyB0aHJvdHRsZWQgaW52b2NhdGlvbi5cbiAqIGpRdWVyeSh3aW5kb3cpLm9uKCdwb3BzdGF0ZScsIHRocm90dGxlZC5jYW5jZWwpO1xuICovXG5mdW5jdGlvbiB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBsZWFkaW5nID0gdHJ1ZSxcbiAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcblxuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgfVxuICBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gJ2xlYWRpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMubGVhZGluZyA6IGxlYWRpbmc7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgfVxuICByZXR1cm4gZGVib3VuY2UoZnVuYywgd2FpdCwge1xuICAgICdsZWFkaW5nJzogbGVhZGluZyxcbiAgICAnbWF4V2FpdCc6IHdhaXQsXG4gICAgJ3RyYWlsaW5nJzogdHJhaWxpbmdcbiAgfSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlXG4gKiBbbGFuZ3VhZ2UgdHlwZV0oaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLWVjbWFzY3JpcHQtbGFuZ3VhZ2UtdHlwZXMpXG4gKiBvZiBgT2JqZWN0YC4gKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KF8ubm9vcCk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLiBBIHZhbHVlIGlzIG9iamVjdC1saWtlIGlmIGl0J3Mgbm90IGBudWxsYFxuICogYW5kIGhhcyBhIGB0eXBlb2ZgIHJlc3VsdCBvZiBcIm9iamVjdFwiLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYFN5bWJvbGAgcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHN5bWJvbCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzU3ltYm9sKFN5bWJvbC5pdGVyYXRvcik7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc1N5bWJvbCgnYWJjJyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N5bWJvbCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdzeW1ib2wnIHx8XG4gICAgKGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gc3ltYm9sVGFnKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgbnVtYmVyLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgbnVtYmVyLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLnRvTnVtYmVyKDMuMik7XG4gKiAvLyA9PiAzLjJcbiAqXG4gKiBfLnRvTnVtYmVyKE51bWJlci5NSU5fVkFMVUUpO1xuICogLy8gPT4gNWUtMzI0XG4gKlxuICogXy50b051bWJlcihJbmZpbml0eSk7XG4gKiAvLyA9PiBJbmZpbml0eVxuICpcbiAqIF8udG9OdW1iZXIoJzMuMicpO1xuICogLy8gPT4gMy4yXG4gKi9cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKGlzU3ltYm9sKHZhbHVlKSkge1xuICAgIHJldHVybiBOQU47XG4gIH1cbiAgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgIHZhciBvdGhlciA9IHR5cGVvZiB2YWx1ZS52YWx1ZU9mID09ICdmdW5jdGlvbicgPyB2YWx1ZS52YWx1ZU9mKCkgOiB2YWx1ZTtcbiAgICB2YWx1ZSA9IGlzT2JqZWN0KG90aGVyKSA/IChvdGhlciArICcnKSA6IG90aGVyO1xuICB9XG4gIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdmFsdWUgPT09IDAgPyB2YWx1ZSA6ICt2YWx1ZTtcbiAgfVxuICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UocmVUcmltLCAnJyk7XG4gIHZhciBpc0JpbmFyeSA9IHJlSXNCaW5hcnkudGVzdCh2YWx1ZSk7XG4gIHJldHVybiAoaXNCaW5hcnkgfHwgcmVJc09jdGFsLnRlc3QodmFsdWUpKVxuICAgID8gZnJlZVBhcnNlSW50KHZhbHVlLnNsaWNlKDIpLCBpc0JpbmFyeSA/IDIgOiA4KVxuICAgIDogKHJlSXNCYWRIZXgudGVzdCh2YWx1ZSkgPyBOQU4gOiArdmFsdWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRocm90dGxlO1xuIiwidmFyIHdpbGRjYXJkID0gcmVxdWlyZSgnd2lsZGNhcmQnKTtcbnZhciByZU1pbWVQYXJ0U3BsaXQgPSAvW1xcL1xcK1xcLl0vO1xuXG4vKipcbiAgIyBtaW1lLW1hdGNoXG5cbiAgQSBzaW1wbGUgZnVuY3Rpb24gdG8gY2hlY2tlciB3aGV0aGVyIGEgdGFyZ2V0IG1pbWUgdHlwZSBtYXRjaGVzIGEgbWltZS10eXBlXG4gIHBhdHRlcm4gKGUuZy4gaW1hZ2UvanBlZyBtYXRjaGVzIGltYWdlL2pwZWcgT1IgaW1hZ2UvKikuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQsIHBhdHRlcm4pIHtcbiAgZnVuY3Rpb24gdGVzdChwYXR0ZXJuKSB7XG4gICAgdmFyIHJlc3VsdCA9IHdpbGRjYXJkKHBhdHRlcm4sIHRhcmdldCwgcmVNaW1lUGFydFNwbGl0KTtcblxuICAgIC8vIGVuc3VyZSB0aGF0IHdlIGhhdmUgYSB2YWxpZCBtaW1lIHR5cGUgKHNob3VsZCBoYXZlIHR3byBwYXJ0cylcbiAgICByZXR1cm4gcmVzdWx0ICYmIHJlc3VsdC5sZW5ndGggPj0gMjtcbiAgfVxuXG4gIHJldHVybiBwYXR0ZXJuID8gdGVzdChwYXR0ZXJuLnNwbGl0KCc7JylbMF0pIDogdGVzdDtcbn07XG4iLCIvKipcbiogQ3JlYXRlIGFuIGV2ZW50IGVtaXR0ZXIgd2l0aCBuYW1lc3BhY2VzXG4qIEBuYW1lIGNyZWF0ZU5hbWVzcGFjZUVtaXR0ZXJcbiogQGV4YW1wbGVcbiogdmFyIGVtaXR0ZXIgPSByZXF1aXJlKCcuL2luZGV4JykoKVxuKlxuKiBlbWl0dGVyLm9uKCcqJywgZnVuY3Rpb24gKCkge1xuKiAgIGNvbnNvbGUubG9nKCdhbGwgZXZlbnRzIGVtaXR0ZWQnLCB0aGlzLmV2ZW50KVxuKiB9KVxuKlxuKiBlbWl0dGVyLm9uKCdleGFtcGxlJywgZnVuY3Rpb24gKCkge1xuKiAgIGNvbnNvbGUubG9nKCdleGFtcGxlIGV2ZW50IGVtaXR0ZWQnKVxuKiB9KVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlTmFtZXNwYWNlRW1pdHRlciAoKSB7XG4gIHZhciBlbWl0dGVyID0ge31cbiAgdmFyIF9mbnMgPSBlbWl0dGVyLl9mbnMgPSB7fVxuXG4gIC8qKlxuICAqIEVtaXQgYW4gZXZlbnQuIE9wdGlvbmFsbHkgbmFtZXNwYWNlIHRoZSBldmVudC4gSGFuZGxlcnMgYXJlIGZpcmVkIGluIHRoZSBvcmRlciBpbiB3aGljaCB0aGV5IHdlcmUgYWRkZWQgd2l0aCBleGFjdCBtYXRjaGVzIHRha2luZyBwcmVjZWRlbmNlLiBTZXBhcmF0ZSB0aGUgbmFtZXNwYWNlIGFuZCBldmVudCB3aXRoIGEgYDpgXG4gICogQG5hbWUgZW1pdFxuICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCDigJMgdGhlIG5hbWUgb2YgdGhlIGV2ZW50LCB3aXRoIG9wdGlvbmFsIG5hbWVzcGFjZVxuICAqIEBwYXJhbSB7Li4uKn0gZGF0YSDigJMgdXAgdG8gNiBhcmd1bWVudHMgdGhhdCBhcmUgcGFzc2VkIHRvIHRoZSBldmVudCBsaXN0ZW5lclxuICAqIEBleGFtcGxlXG4gICogZW1pdHRlci5lbWl0KCdleGFtcGxlJylcbiAgKiBlbWl0dGVyLmVtaXQoJ2RlbW86dGVzdCcpXG4gICogZW1pdHRlci5lbWl0KCdkYXRhJywgeyBleGFtcGxlOiB0cnVlfSwgJ2Egc3RyaW5nJywgMSlcbiAgKi9cbiAgZW1pdHRlci5lbWl0ID0gZnVuY3Rpb24gZW1pdCAoZXZlbnQsIGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpIHtcbiAgICB2YXIgdG9FbWl0ID0gZ2V0TGlzdGVuZXJzKGV2ZW50KVxuXG4gICAgaWYgKHRvRW1pdC5sZW5ndGgpIHtcbiAgICAgIGVtaXRBbGwoZXZlbnQsIHRvRW1pdCwgW2FyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzZdKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENyZWF0ZSBlbiBldmVudCBsaXN0ZW5lci5cbiAgKiBAbmFtZSBvblxuICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICogQGV4YW1wbGVcbiAgKiBlbWl0dGVyLm9uKCdleGFtcGxlJywgZnVuY3Rpb24gKCkge30pXG4gICogZW1pdHRlci5vbignZGVtbycsIGZ1bmN0aW9uICgpIHt9KVxuICAqL1xuICBlbWl0dGVyLm9uID0gZnVuY3Rpb24gb24gKGV2ZW50LCBmbikge1xuICAgIGlmICghX2Zuc1tldmVudF0pIHtcbiAgICAgIF9mbnNbZXZlbnRdID0gW11cbiAgICB9XG5cbiAgICBfZm5zW2V2ZW50XS5wdXNoKGZuKVxuICB9XG5cbiAgLyoqXG4gICogQ3JlYXRlIGVuIGV2ZW50IGxpc3RlbmVyIHRoYXQgZmlyZXMgb25jZS5cbiAgKiBAbmFtZSBvbmNlXG4gICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgKiBAZXhhbXBsZVxuICAqIGVtaXR0ZXIub25jZSgnZXhhbXBsZScsIGZ1bmN0aW9uICgpIHt9KVxuICAqIGVtaXR0ZXIub25jZSgnZGVtbycsIGZ1bmN0aW9uICgpIHt9KVxuICAqL1xuICBlbWl0dGVyLm9uY2UgPSBmdW5jdGlvbiBvbmNlIChldmVudCwgZm4pIHtcbiAgICBmdW5jdGlvbiBvbmUgKCkge1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgZW1pdHRlci5vZmYoZXZlbnQsIG9uZSlcbiAgICB9XG4gICAgdGhpcy5vbihldmVudCwgb25lKVxuICB9XG5cbiAgLyoqXG4gICogU3RvcCBsaXN0ZW5pbmcgdG8gYW4gZXZlbnQuIFN0b3AgYWxsIGxpc3RlbmVycyBvbiBhbiBldmVudCBieSBvbmx5IHBhc3NpbmcgdGhlIGV2ZW50IG5hbWUuIFN0b3AgYSBzaW5nbGUgbGlzdGVuZXIgYnkgcGFzc2luZyB0aGF0IGV2ZW50IGhhbmRsZXIgYXMgYSBjYWxsYmFjay5cbiAgKiBZb3UgbXVzdCBiZSBleHBsaWNpdCBhYm91dCB3aGF0IHdpbGwgYmUgdW5zdWJzY3JpYmVkOiBgZW1pdHRlci5vZmYoJ2RlbW8nKWAgd2lsbCB1bnN1YnNjcmliZSBhbiBgZW1pdHRlci5vbignZGVtbycpYCBsaXN0ZW5lcixcbiAgKiBgZW1pdHRlci5vZmYoJ2RlbW86ZXhhbXBsZScpYCB3aWxsIHVuc3Vic2NyaWJlIGFuIGBlbWl0dGVyLm9uKCdkZW1vOmV4YW1wbGUnKWAgbGlzdGVuZXJcbiAgKiBAbmFtZSBvZmZcbiAgKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dIOKAkyB0aGUgc3BlY2lmaWMgaGFuZGxlclxuICAqIEBleGFtcGxlXG4gICogZW1pdHRlci5vZmYoJ2V4YW1wbGUnKVxuICAqIGVtaXR0ZXIub2ZmKCdkZW1vJywgZnVuY3Rpb24gKCkge30pXG4gICovXG4gIGVtaXR0ZXIub2ZmID0gZnVuY3Rpb24gb2ZmIChldmVudCwgZm4pIHtcbiAgICB2YXIga2VlcCA9IFtdXG5cbiAgICBpZiAoZXZlbnQgJiYgZm4pIHtcbiAgICAgIHZhciBmbnMgPSB0aGlzLl9mbnNbZXZlbnRdXG4gICAgICB2YXIgaSA9IDBcbiAgICAgIHZhciBsID0gZm5zID8gZm5zLmxlbmd0aCA6IDBcblxuICAgICAgZm9yIChpOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmIChmbnNbaV0gIT09IGZuKSB7XG4gICAgICAgICAga2VlcC5wdXNoKGZuc1tpXSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGtlZXAubGVuZ3RoID8gdGhpcy5fZm5zW2V2ZW50XSA9IGtlZXAgOiBkZWxldGUgdGhpcy5fZm5zW2V2ZW50XVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TGlzdGVuZXJzIChlKSB7XG4gICAgdmFyIG91dCA9IF9mbnNbZV0gPyBfZm5zW2VdIDogW11cbiAgICB2YXIgaWR4ID0gZS5pbmRleE9mKCc6JylcbiAgICB2YXIgYXJncyA9IChpZHggPT09IC0xKSA/IFtlXSA6IFtlLnN1YnN0cmluZygwLCBpZHgpLCBlLnN1YnN0cmluZyhpZHggKyAxKV1cblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoX2ZucylcbiAgICB2YXIgaSA9IDBcbiAgICB2YXIgbCA9IGtleXMubGVuZ3RoXG5cbiAgICBmb3IgKGk7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldXG4gICAgICBpZiAoa2V5ID09PSAnKicpIHtcbiAgICAgICAgb3V0ID0gb3V0LmNvbmNhdChfZm5zW2tleV0pXG4gICAgICB9XG5cbiAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMiAmJiBhcmdzWzBdID09PSBrZXkpIHtcbiAgICAgICAgb3V0ID0gb3V0LmNvbmNhdChfZm5zW2tleV0pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dFxuICB9XG5cbiAgZnVuY3Rpb24gZW1pdEFsbCAoZSwgZm5zLCBhcmdzKSB7XG4gICAgdmFyIGkgPSAwXG4gICAgdmFyIGwgPSBmbnMubGVuZ3RoXG5cbiAgICBmb3IgKGk7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmICghZm5zW2ldKSBicmVha1xuICAgICAgZm5zW2ldLmV2ZW50ID0gZVxuICAgICAgZm5zW2ldLmFwcGx5KGZuc1tpXSwgYXJncylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZW1pdHRlclxufVxuIiwiIWZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBmdW5jdGlvbiBWTm9kZSgpIHt9XG4gICAgZnVuY3Rpb24gaChub2RlTmFtZSwgYXR0cmlidXRlcykge1xuICAgICAgICB2YXIgbGFzdFNpbXBsZSwgY2hpbGQsIHNpbXBsZSwgaSwgY2hpbGRyZW4gPSBFTVBUWV9DSElMRFJFTjtcbiAgICAgICAgZm9yIChpID0gYXJndW1lbnRzLmxlbmd0aDsgaS0tID4gMjsgKSBzdGFjay5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzICYmIG51bGwgIT0gYXR0cmlidXRlcy5jaGlsZHJlbikge1xuICAgICAgICAgICAgaWYgKCFzdGFjay5sZW5ndGgpIHN0YWNrLnB1c2goYXR0cmlidXRlcy5jaGlsZHJlbik7XG4gICAgICAgICAgICBkZWxldGUgYXR0cmlidXRlcy5jaGlsZHJlbjtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSBpZiAoKGNoaWxkID0gc3RhY2sucG9wKCkpICYmIHZvaWQgMCAhPT0gY2hpbGQucG9wKSBmb3IgKGkgPSBjaGlsZC5sZW5ndGg7IGktLTsgKSBzdGFjay5wdXNoKGNoaWxkW2ldKTsgZWxzZSB7XG4gICAgICAgICAgICBpZiAoJ2Jvb2xlYW4nID09IHR5cGVvZiBjaGlsZCkgY2hpbGQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHNpbXBsZSA9ICdmdW5jdGlvbicgIT0gdHlwZW9mIG5vZGVOYW1lKSBpZiAobnVsbCA9PSBjaGlsZCkgY2hpbGQgPSAnJzsgZWxzZSBpZiAoJ251bWJlcicgPT0gdHlwZW9mIGNoaWxkKSBjaGlsZCA9IFN0cmluZyhjaGlsZCk7IGVsc2UgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBjaGlsZCkgc2ltcGxlID0gITE7XG4gICAgICAgICAgICBpZiAoc2ltcGxlICYmIGxhc3RTaW1wbGUpIGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdICs9IGNoaWxkOyBlbHNlIGlmIChjaGlsZHJlbiA9PT0gRU1QVFlfQ0hJTERSRU4pIGNoaWxkcmVuID0gWyBjaGlsZCBdOyBlbHNlIGNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgbGFzdFNpbXBsZSA9IHNpbXBsZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcCA9IG5ldyBWTm9kZSgpO1xuICAgICAgICBwLm5vZGVOYW1lID0gbm9kZU5hbWU7XG4gICAgICAgIHAuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICAgICAgcC5hdHRyaWJ1dGVzID0gbnVsbCA9PSBhdHRyaWJ1dGVzID8gdm9pZCAwIDogYXR0cmlidXRlcztcbiAgICAgICAgcC5rZXkgPSBudWxsID09IGF0dHJpYnV0ZXMgPyB2b2lkIDAgOiBhdHRyaWJ1dGVzLmtleTtcbiAgICAgICAgaWYgKHZvaWQgMCAhPT0gb3B0aW9ucy52bm9kZSkgb3B0aW9ucy52bm9kZShwKTtcbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGV4dGVuZChvYmosIHByb3BzKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gcHJvcHMpIG9ialtpXSA9IHByb3BzW2ldO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjbG9uZUVsZW1lbnQodm5vZGUsIHByb3BzKSB7XG4gICAgICAgIHJldHVybiBoKHZub2RlLm5vZGVOYW1lLCBleHRlbmQoZXh0ZW5kKHt9LCB2bm9kZS5hdHRyaWJ1dGVzKSwgcHJvcHMpLCBhcmd1bWVudHMubGVuZ3RoID4gMiA/IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSA6IHZub2RlLmNoaWxkcmVuKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZW5xdWV1ZVJlbmRlcihjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX19kICYmIChjb21wb25lbnQuX19kID0gITApICYmIDEgPT0gaXRlbXMucHVzaChjb21wb25lbnQpKSAob3B0aW9ucy5kZWJvdW5jZVJlbmRlcmluZyB8fCBkZWZlcikocmVyZW5kZXIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXJlbmRlcigpIHtcbiAgICAgICAgdmFyIHAsIGxpc3QgPSBpdGVtcztcbiAgICAgICAgaXRlbXMgPSBbXTtcbiAgICAgICAgd2hpbGUgKHAgPSBsaXN0LnBvcCgpKSBpZiAocC5fX2QpIHJlbmRlckNvbXBvbmVudChwKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNTYW1lTm9kZVR5cGUobm9kZSwgdm5vZGUsIGh5ZHJhdGluZykge1xuICAgICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZub2RlIHx8ICdudW1iZXInID09IHR5cGVvZiB2bm9kZSkgcmV0dXJuIHZvaWQgMCAhPT0gbm9kZS5zcGxpdFRleHQ7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2Ygdm5vZGUubm9kZU5hbWUpIHJldHVybiAhbm9kZS5fY29tcG9uZW50Q29uc3RydWN0b3IgJiYgaXNOYW1lZE5vZGUobm9kZSwgdm5vZGUubm9kZU5hbWUpOyBlbHNlIHJldHVybiBoeWRyYXRpbmcgfHwgbm9kZS5fY29tcG9uZW50Q29uc3RydWN0b3IgPT09IHZub2RlLm5vZGVOYW1lO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc05hbWVkTm9kZShub2RlLCBub2RlTmFtZSkge1xuICAgICAgICByZXR1cm4gbm9kZS5fX24gPT09IG5vZGVOYW1lIHx8IG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0Tm9kZVByb3BzKHZub2RlKSB7XG4gICAgICAgIHZhciBwcm9wcyA9IGV4dGVuZCh7fSwgdm5vZGUuYXR0cmlidXRlcyk7XG4gICAgICAgIHByb3BzLmNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW47XG4gICAgICAgIHZhciBkZWZhdWx0UHJvcHMgPSB2bm9kZS5ub2RlTmFtZS5kZWZhdWx0UHJvcHM7XG4gICAgICAgIGlmICh2b2lkIDAgIT09IGRlZmF1bHRQcm9wcykgZm9yICh2YXIgaSBpbiBkZWZhdWx0UHJvcHMpIGlmICh2b2lkIDAgPT09IHByb3BzW2ldKSBwcm9wc1tpXSA9IGRlZmF1bHRQcm9wc1tpXTtcbiAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjcmVhdGVOb2RlKG5vZGVOYW1lLCBpc1N2Zykge1xuICAgICAgICB2YXIgbm9kZSA9IGlzU3ZnID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIG5vZGVOYW1lKSA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobm9kZU5hbWUpO1xuICAgICAgICBub2RlLl9fbiA9IG5vZGVOYW1lO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVtb3ZlTm9kZShub2RlKSB7XG4gICAgICAgIHZhciBwYXJlbnROb2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICAgICBpZiAocGFyZW50Tm9kZSkgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0QWNjZXNzb3Iobm9kZSwgbmFtZSwgb2xkLCB2YWx1ZSwgaXNTdmcpIHtcbiAgICAgICAgaWYgKCdjbGFzc05hbWUnID09PSBuYW1lKSBuYW1lID0gJ2NsYXNzJztcbiAgICAgICAgaWYgKCdrZXknID09PSBuYW1lKSA7IGVsc2UgaWYgKCdyZWYnID09PSBuYW1lKSB7XG4gICAgICAgICAgICBpZiAob2xkKSBvbGQobnVsbCk7XG4gICAgICAgICAgICBpZiAodmFsdWUpIHZhbHVlKG5vZGUpO1xuICAgICAgICB9IGVsc2UgaWYgKCdjbGFzcycgPT09IG5hbWUgJiYgIWlzU3ZnKSBub2RlLmNsYXNzTmFtZSA9IHZhbHVlIHx8ICcnOyBlbHNlIGlmICgnc3R5bGUnID09PSBuYW1lKSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8ICdzdHJpbmcnID09IHR5cGVvZiB2YWx1ZSB8fCAnc3RyaW5nJyA9PSB0eXBlb2Ygb2xkKSBub2RlLnN0eWxlLmNzc1RleHQgPSB2YWx1ZSB8fCAnJztcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiAnb2JqZWN0JyA9PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIG9sZCkgZm9yICh2YXIgaSBpbiBvbGQpIGlmICghKGkgaW4gdmFsdWUpKSBub2RlLnN0eWxlW2ldID0gJyc7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiB2YWx1ZSkgbm9kZS5zdHlsZVtpXSA9ICdudW1iZXInID09IHR5cGVvZiB2YWx1ZVtpXSAmJiAhMSA9PT0gSVNfTk9OX0RJTUVOU0lPTkFMLnRlc3QoaSkgPyB2YWx1ZVtpXSArICdweCcgOiB2YWx1ZVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgnZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwnID09PSBuYW1lKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUpIG5vZGUuaW5uZXJIVE1MID0gdmFsdWUuX19odG1sIHx8ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKCdvJyA9PSBuYW1lWzBdICYmICduJyA9PSBuYW1lWzFdKSB7XG4gICAgICAgICAgICB2YXIgdXNlQ2FwdHVyZSA9IG5hbWUgIT09IChuYW1lID0gbmFtZS5yZXBsYWNlKC9DYXB0dXJlJC8sICcnKSk7XG4gICAgICAgICAgICBuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpLnN1YnN0cmluZygyKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICghb2xkKSBub2RlLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgZXZlbnRQcm94eSwgdXNlQ2FwdHVyZSk7XG4gICAgICAgICAgICB9IGVsc2Ugbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGV2ZW50UHJveHksIHVzZUNhcHR1cmUpO1xuICAgICAgICAgICAgKG5vZGUuX19sIHx8IChub2RlLl9fbCA9IHt9KSlbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmICgnbGlzdCcgIT09IG5hbWUgJiYgJ3R5cGUnICE9PSBuYW1lICYmICFpc1N2ZyAmJiBuYW1lIGluIG5vZGUpIHtcbiAgICAgICAgICAgIHNldFByb3BlcnR5KG5vZGUsIG5hbWUsIG51bGwgPT0gdmFsdWUgPyAnJyA6IHZhbHVlKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHZhbHVlIHx8ICExID09PSB2YWx1ZSkgbm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbnMgPSBpc1N2ZyAmJiBuYW1lICE9PSAobmFtZSA9IG5hbWUucmVwbGFjZSgvXnhsaW5rXFw6Py8sICcnKSk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSB8fCAhMSA9PT0gdmFsdWUpIGlmIChucykgbm9kZS5yZW1vdmVBdHRyaWJ1dGVOUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycsIG5hbWUudG9Mb3dlckNhc2UoKSk7IGVsc2Ugbm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7IGVsc2UgaWYgKCdmdW5jdGlvbicgIT0gdHlwZW9mIHZhbHVlKSBpZiAobnMpIG5vZGUuc2V0QXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCBuYW1lLnRvTG93ZXJDYXNlKCksIHZhbHVlKTsgZWxzZSBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0UHJvcGVydHkobm9kZSwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG5vZGVbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG4gICAgZnVuY3Rpb24gZXZlbnRQcm94eShlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9fbFtlLnR5cGVdKG9wdGlvbnMuZXZlbnQgJiYgb3B0aW9ucy5ldmVudChlKSB8fCBlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZmx1c2hNb3VudHMoKSB7XG4gICAgICAgIHZhciBjO1xuICAgICAgICB3aGlsZSAoYyA9IG1vdW50cy5wb3AoKSkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYWZ0ZXJNb3VudCkgb3B0aW9ucy5hZnRlck1vdW50KGMpO1xuICAgICAgICAgICAgaWYgKGMuY29tcG9uZW50RGlkTW91bnQpIGMuY29tcG9uZW50RGlkTW91bnQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBkaWZmKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsLCBwYXJlbnQsIGNvbXBvbmVudFJvb3QpIHtcbiAgICAgICAgaWYgKCFkaWZmTGV2ZWwrKykge1xuICAgICAgICAgICAgaXNTdmdNb2RlID0gbnVsbCAhPSBwYXJlbnQgJiYgdm9pZCAwICE9PSBwYXJlbnQub3duZXJTVkdFbGVtZW50O1xuICAgICAgICAgICAgaHlkcmF0aW5nID0gbnVsbCAhPSBkb20gJiYgISgnX19wcmVhY3RhdHRyXycgaW4gZG9tKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmV0ID0gaWRpZmYoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwsIGNvbXBvbmVudFJvb3QpO1xuICAgICAgICBpZiAocGFyZW50ICYmIHJldC5wYXJlbnROb2RlICE9PSBwYXJlbnQpIHBhcmVudC5hcHBlbmRDaGlsZChyZXQpO1xuICAgICAgICBpZiAoIS0tZGlmZkxldmVsKSB7XG4gICAgICAgICAgICBoeWRyYXRpbmcgPSAhMTtcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50Um9vdCkgZmx1c2hNb3VudHMoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBpZGlmZihkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCwgY29tcG9uZW50Um9vdCkge1xuICAgICAgICB2YXIgb3V0ID0gZG9tLCBwcmV2U3ZnTW9kZSA9IGlzU3ZnTW9kZTtcbiAgICAgICAgaWYgKG51bGwgPT0gdm5vZGUgfHwgJ2Jvb2xlYW4nID09IHR5cGVvZiB2bm9kZSkgdm5vZGUgPSAnJztcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZSB8fCAnbnVtYmVyJyA9PSB0eXBlb2Ygdm5vZGUpIHtcbiAgICAgICAgICAgIGlmIChkb20gJiYgdm9pZCAwICE9PSBkb20uc3BsaXRUZXh0ICYmIGRvbS5wYXJlbnROb2RlICYmICghZG9tLl9jb21wb25lbnQgfHwgY29tcG9uZW50Um9vdCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9tLm5vZGVWYWx1ZSAhPSB2bm9kZSkgZG9tLm5vZGVWYWx1ZSA9IHZub2RlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2bm9kZSk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZG9tLnBhcmVudE5vZGUpIGRvbS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChvdXQsIGRvbSk7XG4gICAgICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKGRvbSwgITApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dC5fX3ByZWFjdGF0dHJfID0gITA7XG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9XG4gICAgICAgIHZhciB2bm9kZU5hbWUgPSB2bm9kZS5ub2RlTmFtZTtcbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHZub2RlTmFtZSkgcmV0dXJuIGJ1aWxkQ29tcG9uZW50RnJvbVZOb2RlKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgaXNTdmdNb2RlID0gJ3N2ZycgPT09IHZub2RlTmFtZSA/ICEwIDogJ2ZvcmVpZ25PYmplY3QnID09PSB2bm9kZU5hbWUgPyAhMSA6IGlzU3ZnTW9kZTtcbiAgICAgICAgdm5vZGVOYW1lID0gU3RyaW5nKHZub2RlTmFtZSk7XG4gICAgICAgIGlmICghZG9tIHx8ICFpc05hbWVkTm9kZShkb20sIHZub2RlTmFtZSkpIHtcbiAgICAgICAgICAgIG91dCA9IGNyZWF0ZU5vZGUodm5vZGVOYW1lLCBpc1N2Z01vZGUpO1xuICAgICAgICAgICAgaWYgKGRvbSkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChkb20uZmlyc3RDaGlsZCkgb3V0LmFwcGVuZENoaWxkKGRvbS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9tLnBhcmVudE5vZGUpIGRvbS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChvdXQsIGRvbSk7XG4gICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoZG9tLCAhMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZjID0gb3V0LmZpcnN0Q2hpbGQsIHByb3BzID0gb3V0Ll9fcHJlYWN0YXR0cl8sIHZjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuO1xuICAgICAgICBpZiAobnVsbCA9PSBwcm9wcykge1xuICAgICAgICAgICAgcHJvcHMgPSBvdXQuX19wcmVhY3RhdHRyXyA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgYSA9IG91dC5hdHRyaWJ1dGVzLCBpID0gYS5sZW5ndGg7IGktLTsgKSBwcm9wc1thW2ldLm5hbWVdID0gYVtpXS52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWh5ZHJhdGluZyAmJiB2Y2hpbGRyZW4gJiYgMSA9PT0gdmNoaWxkcmVuLmxlbmd0aCAmJiAnc3RyaW5nJyA9PSB0eXBlb2YgdmNoaWxkcmVuWzBdICYmIG51bGwgIT0gZmMgJiYgdm9pZCAwICE9PSBmYy5zcGxpdFRleHQgJiYgbnVsbCA9PSBmYy5uZXh0U2libGluZykge1xuICAgICAgICAgICAgaWYgKGZjLm5vZGVWYWx1ZSAhPSB2Y2hpbGRyZW5bMF0pIGZjLm5vZGVWYWx1ZSA9IHZjaGlsZHJlblswXTtcbiAgICAgICAgfSBlbHNlIGlmICh2Y2hpbGRyZW4gJiYgdmNoaWxkcmVuLmxlbmd0aCB8fCBudWxsICE9IGZjKSBpbm5lckRpZmZOb2RlKG91dCwgdmNoaWxkcmVuLCBjb250ZXh0LCBtb3VudEFsbCwgaHlkcmF0aW5nIHx8IG51bGwgIT0gcHJvcHMuZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwpO1xuICAgICAgICBkaWZmQXR0cmlidXRlcyhvdXQsIHZub2RlLmF0dHJpYnV0ZXMsIHByb3BzKTtcbiAgICAgICAgaXNTdmdNb2RlID0gcHJldlN2Z01vZGU7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlubmVyRGlmZk5vZGUoZG9tLCB2Y2hpbGRyZW4sIGNvbnRleHQsIG1vdW50QWxsLCBpc0h5ZHJhdGluZykge1xuICAgICAgICB2YXIgaiwgYywgZiwgdmNoaWxkLCBjaGlsZCwgb3JpZ2luYWxDaGlsZHJlbiA9IGRvbS5jaGlsZE5vZGVzLCBjaGlsZHJlbiA9IFtdLCBrZXllZCA9IHt9LCBrZXllZExlbiA9IDAsIG1pbiA9IDAsIGxlbiA9IG9yaWdpbmFsQ2hpbGRyZW4ubGVuZ3RoLCBjaGlsZHJlbkxlbiA9IDAsIHZsZW4gPSB2Y2hpbGRyZW4gPyB2Y2hpbGRyZW4ubGVuZ3RoIDogMDtcbiAgICAgICAgaWYgKDAgIT09IGxlbikgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIF9jaGlsZCA9IG9yaWdpbmFsQ2hpbGRyZW5baV0sIHByb3BzID0gX2NoaWxkLl9fcHJlYWN0YXR0cl8sIGtleSA9IHZsZW4gJiYgcHJvcHMgPyBfY2hpbGQuX2NvbXBvbmVudCA/IF9jaGlsZC5fY29tcG9uZW50Ll9fayA6IHByb3BzLmtleSA6IG51bGw7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBrZXkpIHtcbiAgICAgICAgICAgICAgICBrZXllZExlbisrO1xuICAgICAgICAgICAgICAgIGtleWVkW2tleV0gPSBfY2hpbGQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BzIHx8ICh2b2lkIDAgIT09IF9jaGlsZC5zcGxpdFRleHQgPyBpc0h5ZHJhdGluZyA/IF9jaGlsZC5ub2RlVmFsdWUudHJpbSgpIDogITAgOiBpc0h5ZHJhdGluZykpIGNoaWxkcmVuW2NoaWxkcmVuTGVuKytdID0gX2NoaWxkO1xuICAgICAgICB9XG4gICAgICAgIGlmICgwICE9PSB2bGVuKSBmb3IgKHZhciBpID0gMDsgaSA8IHZsZW47IGkrKykge1xuICAgICAgICAgICAgdmNoaWxkID0gdmNoaWxkcmVuW2ldO1xuICAgICAgICAgICAgY2hpbGQgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGtleSA9IHZjaGlsZC5rZXk7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ZWRMZW4gJiYgdm9pZCAwICE9PSBrZXllZFtrZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkID0ga2V5ZWRba2V5XTtcbiAgICAgICAgICAgICAgICAgICAga2V5ZWRba2V5XSA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgICAgICAga2V5ZWRMZW4tLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFjaGlsZCAmJiBtaW4gPCBjaGlsZHJlbkxlbikgZm9yIChqID0gbWluOyBqIDwgY2hpbGRyZW5MZW47IGorKykgaWYgKHZvaWQgMCAhPT0gY2hpbGRyZW5bal0gJiYgaXNTYW1lTm9kZVR5cGUoYyA9IGNoaWxkcmVuW2pdLCB2Y2hpbGQsIGlzSHlkcmF0aW5nKSkge1xuICAgICAgICAgICAgICAgIGNoaWxkID0gYztcbiAgICAgICAgICAgICAgICBjaGlsZHJlbltqXSA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgICBpZiAoaiA9PT0gY2hpbGRyZW5MZW4gLSAxKSBjaGlsZHJlbkxlbi0tO1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBtaW4pIG1pbisrO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2hpbGQgPSBpZGlmZihjaGlsZCwgdmNoaWxkLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgICAgICBmID0gb3JpZ2luYWxDaGlsZHJlbltpXTtcbiAgICAgICAgICAgIGlmIChjaGlsZCAmJiBjaGlsZCAhPT0gZG9tICYmIGNoaWxkICE9PSBmKSBpZiAobnVsbCA9PSBmKSBkb20uYXBwZW5kQ2hpbGQoY2hpbGQpOyBlbHNlIGlmIChjaGlsZCA9PT0gZi5uZXh0U2libGluZykgcmVtb3ZlTm9kZShmKTsgZWxzZSBkb20uaW5zZXJ0QmVmb3JlKGNoaWxkLCBmKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoa2V5ZWRMZW4pIGZvciAodmFyIGkgaW4ga2V5ZWQpIGlmICh2b2lkIDAgIT09IGtleWVkW2ldKSByZWNvbGxlY3ROb2RlVHJlZShrZXllZFtpXSwgITEpO1xuICAgICAgICB3aGlsZSAobWluIDw9IGNoaWxkcmVuTGVuKSBpZiAodm9pZCAwICE9PSAoY2hpbGQgPSBjaGlsZHJlbltjaGlsZHJlbkxlbi0tXSkpIHJlY29sbGVjdE5vZGVUcmVlKGNoaWxkLCAhMSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlY29sbGVjdE5vZGVUcmVlKG5vZGUsIHVubW91bnRPbmx5KSB7XG4gICAgICAgIHZhciBjb21wb25lbnQgPSBub2RlLl9jb21wb25lbnQ7XG4gICAgICAgIGlmIChjb21wb25lbnQpIHVubW91bnRDb21wb25lbnQoY29tcG9uZW50KTsgZWxzZSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBub2RlLl9fcHJlYWN0YXR0cl8gJiYgbm9kZS5fX3ByZWFjdGF0dHJfLnJlZikgbm9kZS5fX3ByZWFjdGF0dHJfLnJlZihudWxsKTtcbiAgICAgICAgICAgIGlmICghMSA9PT0gdW5tb3VudE9ubHkgfHwgbnVsbCA9PSBub2RlLl9fcHJlYWN0YXR0cl8pIHJlbW92ZU5vZGUobm9kZSk7XG4gICAgICAgICAgICByZW1vdmVDaGlsZHJlbihub2RlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiByZW1vdmVDaGlsZHJlbihub2RlKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLmxhc3RDaGlsZDtcbiAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gbm9kZS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShub2RlLCAhMCk7XG4gICAgICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBkaWZmQXR0cmlidXRlcyhkb20sIGF0dHJzLCBvbGQpIHtcbiAgICAgICAgdmFyIG5hbWU7XG4gICAgICAgIGZvciAobmFtZSBpbiBvbGQpIGlmICgoIWF0dHJzIHx8IG51bGwgPT0gYXR0cnNbbmFtZV0pICYmIG51bGwgIT0gb2xkW25hbWVdKSBzZXRBY2Nlc3Nvcihkb20sIG5hbWUsIG9sZFtuYW1lXSwgb2xkW25hbWVdID0gdm9pZCAwLCBpc1N2Z01vZGUpO1xuICAgICAgICBmb3IgKG5hbWUgaW4gYXR0cnMpIGlmICghKCdjaGlsZHJlbicgPT09IG5hbWUgfHwgJ2lubmVySFRNTCcgPT09IG5hbWUgfHwgbmFtZSBpbiBvbGQgJiYgYXR0cnNbbmFtZV0gPT09ICgndmFsdWUnID09PSBuYW1lIHx8ICdjaGVja2VkJyA9PT0gbmFtZSA/IGRvbVtuYW1lXSA6IG9sZFtuYW1lXSkpKSBzZXRBY2Nlc3Nvcihkb20sIG5hbWUsIG9sZFtuYW1lXSwgb2xkW25hbWVdID0gYXR0cnNbbmFtZV0sIGlzU3ZnTW9kZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNvbGxlY3RDb21wb25lbnQoY29tcG9uZW50KSB7XG4gICAgICAgIHZhciBuYW1lID0gY29tcG9uZW50LmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgIChjb21wb25lbnRzW25hbWVdIHx8IChjb21wb25lbnRzW25hbWVdID0gW10pKS5wdXNoKGNvbXBvbmVudCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudChDdG9yLCBwcm9wcywgY29udGV4dCkge1xuICAgICAgICB2YXIgaW5zdCwgbGlzdCA9IGNvbXBvbmVudHNbQ3Rvci5uYW1lXTtcbiAgICAgICAgaWYgKEN0b3IucHJvdG90eXBlICYmIEN0b3IucHJvdG90eXBlLnJlbmRlcikge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBDdG9yKHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIENvbXBvbmVudC5jYWxsKGluc3QsIHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluc3QgPSBuZXcgQ29tcG9uZW50KHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGluc3QuY29uc3RydWN0b3IgPSBDdG9yO1xuICAgICAgICAgICAgaW5zdC5yZW5kZXIgPSBkb1JlbmRlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGlzdCkgZm9yICh2YXIgaSA9IGxpc3QubGVuZ3RoOyBpLS07ICkgaWYgKGxpc3RbaV0uY29uc3RydWN0b3IgPT09IEN0b3IpIHtcbiAgICAgICAgICAgIGluc3QuX19iID0gbGlzdFtpXS5fX2I7XG4gICAgICAgICAgICBsaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBkb1JlbmRlcihwcm9wcywgc3RhdGUsIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRDb21wb25lbnRQcm9wcyhjb21wb25lbnQsIHByb3BzLCBvcHRzLCBjb250ZXh0LCBtb3VudEFsbCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX3gpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX3ggPSAhMDtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19yID0gcHJvcHMucmVmKSBkZWxldGUgcHJvcHMucmVmO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fX2sgPSBwcm9wcy5rZXkpIGRlbGV0ZSBwcm9wcy5rZXk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5iYXNlIHx8IG1vdW50QWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsTW91bnQpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsTW91bnQoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGNvbXBvbmVudC5jb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuX19jKSBjb21wb25lbnQuX19jID0gY29tcG9uZW50LmNvbnRleHQ7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuX19wKSBjb21wb25lbnQuX19wID0gY29tcG9uZW50LnByb3BzO1xuICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJvcHM7XG4gICAgICAgICAgICBjb21wb25lbnQuX194ID0gITE7XG4gICAgICAgICAgICBpZiAoMCAhPT0gb3B0cykgaWYgKDEgPT09IG9wdHMgfHwgITEgIT09IG9wdGlvbnMuc3luY0NvbXBvbmVudFVwZGF0ZXMgfHwgIWNvbXBvbmVudC5iYXNlKSByZW5kZXJDb21wb25lbnQoY29tcG9uZW50LCAxLCBtb3VudEFsbCk7IGVsc2UgZW5xdWV1ZVJlbmRlcihjb21wb25lbnQpO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fX3IpIGNvbXBvbmVudC5fX3IoY29tcG9uZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiByZW5kZXJDb21wb25lbnQoY29tcG9uZW50LCBvcHRzLCBtb3VudEFsbCwgaXNDaGlsZCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX3gpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJlZCwgaW5zdCwgY2Jhc2UsIHByb3BzID0gY29tcG9uZW50LnByb3BzLCBzdGF0ZSA9IGNvbXBvbmVudC5zdGF0ZSwgY29udGV4dCA9IGNvbXBvbmVudC5jb250ZXh0LCBwcmV2aW91c1Byb3BzID0gY29tcG9uZW50Ll9fcCB8fCBwcm9wcywgcHJldmlvdXNTdGF0ZSA9IGNvbXBvbmVudC5fX3MgfHwgc3RhdGUsIHByZXZpb3VzQ29udGV4dCA9IGNvbXBvbmVudC5fX2MgfHwgY29udGV4dCwgaXNVcGRhdGUgPSBjb21wb25lbnQuYmFzZSwgbmV4dEJhc2UgPSBjb21wb25lbnQuX19iLCBpbml0aWFsQmFzZSA9IGlzVXBkYXRlIHx8IG5leHRCYXNlLCBpbml0aWFsQ2hpbGRDb21wb25lbnQgPSBjb21wb25lbnQuX2NvbXBvbmVudCwgc2tpcCA9ICExO1xuICAgICAgICAgICAgaWYgKGlzVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJldmlvdXNQcm9wcztcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuc3RhdGUgPSBwcmV2aW91c1N0YXRlO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jb250ZXh0ID0gcHJldmlvdXNDb250ZXh0O1xuICAgICAgICAgICAgICAgIGlmICgyICE9PSBvcHRzICYmIGNvbXBvbmVudC5zaG91bGRDb21wb25lbnRVcGRhdGUgJiYgITEgPT09IGNvbXBvbmVudC5zaG91bGRDb21wb25lbnRVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KSkgc2tpcCA9ICEwOyBlbHNlIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFVwZGF0ZSkgY29tcG9uZW50LmNvbXBvbmVudFdpbGxVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcHMgPSBwcm9wcztcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21wb25lbnQuX19wID0gY29tcG9uZW50Ll9fcyA9IGNvbXBvbmVudC5fX2MgPSBjb21wb25lbnQuX19iID0gbnVsbDtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX2QgPSAhMTtcbiAgICAgICAgICAgIGlmICghc2tpcCkge1xuICAgICAgICAgICAgICAgIHJlbmRlcmVkID0gY29tcG9uZW50LnJlbmRlcihwcm9wcywgc3RhdGUsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuZ2V0Q2hpbGRDb250ZXh0KSBjb250ZXh0ID0gZXh0ZW5kKGV4dGVuZCh7fSwgY29udGV4dCksIGNvbXBvbmVudC5nZXRDaGlsZENvbnRleHQoKSk7XG4gICAgICAgICAgICAgICAgdmFyIHRvVW5tb3VudCwgYmFzZSwgY2hpbGRDb21wb25lbnQgPSByZW5kZXJlZCAmJiByZW5kZXJlZC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgY2hpbGRDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkUHJvcHMgPSBnZXROb2RlUHJvcHMocmVuZGVyZWQpO1xuICAgICAgICAgICAgICAgICAgICBpbnN0ID0gaW5pdGlhbENoaWxkQ29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdCAmJiBpbnN0LmNvbnN0cnVjdG9yID09PSBjaGlsZENvbXBvbmVudCAmJiBjaGlsZFByb3BzLmtleSA9PSBpbnN0Ll9faykgc2V0Q29tcG9uZW50UHJvcHMoaW5zdCwgY2hpbGRQcm9wcywgMSwgY29udGV4dCwgITEpOyBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvVW5tb3VudCA9IGluc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuX2NvbXBvbmVudCA9IGluc3QgPSBjcmVhdGVDb21wb25lbnQoY2hpbGRDb21wb25lbnQsIGNoaWxkUHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdC5fX2IgPSBpbnN0Ll9fYiB8fCBuZXh0QmFzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3QuX191ID0gY29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q29tcG9uZW50UHJvcHMoaW5zdCwgY2hpbGRQcm9wcywgMCwgY29udGV4dCwgITEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyQ29tcG9uZW50KGluc3QsIDEsIG1vdW50QWxsLCAhMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYmFzZSA9IGluc3QuYmFzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYmFzZSA9IGluaXRpYWxCYXNlO1xuICAgICAgICAgICAgICAgICAgICB0b1VubW91bnQgPSBpbml0aWFsQ2hpbGRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b1VubW91bnQpIGNiYXNlID0gY29tcG9uZW50Ll9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5pdGlhbEJhc2UgfHwgMSA9PT0gb3B0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNiYXNlKSBjYmFzZS5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2UgPSBkaWZmKGNiYXNlLCByZW5kZXJlZCwgY29udGV4dCwgbW91bnRBbGwgfHwgIWlzVXBkYXRlLCBpbml0aWFsQmFzZSAmJiBpbml0aWFsQmFzZS5wYXJlbnROb2RlLCAhMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGluaXRpYWxCYXNlICYmIGJhc2UgIT09IGluaXRpYWxCYXNlICYmIGluc3QgIT09IGluaXRpYWxDaGlsZENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmFzZVBhcmVudCA9IGluaXRpYWxCYXNlLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiYXNlUGFyZW50ICYmIGJhc2UgIT09IGJhc2VQYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2VQYXJlbnQucmVwbGFjZUNoaWxkKGJhc2UsIGluaXRpYWxCYXNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdG9Vbm1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbEJhc2UuX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoaW5pdGlhbEJhc2UsICExKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodG9Vbm1vdW50KSB1bm1vdW50Q29tcG9uZW50KHRvVW5tb3VudCk7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmJhc2UgPSBiYXNlO1xuICAgICAgICAgICAgICAgIGlmIChiYXNlICYmICFpc0NoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb21wb25lbnRSZWYgPSBjb21wb25lbnQsIHQgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0ID0gdC5fX3UpIChjb21wb25lbnRSZWYgPSB0KS5iYXNlID0gYmFzZTtcbiAgICAgICAgICAgICAgICAgICAgYmFzZS5fY29tcG9uZW50ID0gY29tcG9uZW50UmVmO1xuICAgICAgICAgICAgICAgICAgICBiYXNlLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9IGNvbXBvbmVudFJlZi5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWlzVXBkYXRlIHx8IG1vdW50QWxsKSBtb3VudHMudW5zaGlmdChjb21wb25lbnQpOyBlbHNlIGlmICghc2tpcCkge1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50RGlkVXBkYXRlKSBjb21wb25lbnQuY29tcG9uZW50RGlkVXBkYXRlKHByZXZpb3VzUHJvcHMsIHByZXZpb3VzU3RhdGUsIHByZXZpb3VzQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuYWZ0ZXJVcGRhdGUpIG9wdGlvbnMuYWZ0ZXJVcGRhdGUoY29tcG9uZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsICE9IGNvbXBvbmVudC5fX2gpIHdoaWxlIChjb21wb25lbnQuX19oLmxlbmd0aCkgY29tcG9uZW50Ll9faC5wb3AoKS5jYWxsKGNvbXBvbmVudCk7XG4gICAgICAgICAgICBpZiAoIWRpZmZMZXZlbCAmJiAhaXNDaGlsZCkgZmx1c2hNb3VudHMoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBidWlsZENvbXBvbmVudEZyb21WTm9kZShkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCkge1xuICAgICAgICB2YXIgYyA9IGRvbSAmJiBkb20uX2NvbXBvbmVudCwgb3JpZ2luYWxDb21wb25lbnQgPSBjLCBvbGREb20gPSBkb20sIGlzRGlyZWN0T3duZXIgPSBjICYmIGRvbS5fY29tcG9uZW50Q29uc3RydWN0b3IgPT09IHZub2RlLm5vZGVOYW1lLCBpc093bmVyID0gaXNEaXJlY3RPd25lciwgcHJvcHMgPSBnZXROb2RlUHJvcHModm5vZGUpO1xuICAgICAgICB3aGlsZSAoYyAmJiAhaXNPd25lciAmJiAoYyA9IGMuX191KSkgaXNPd25lciA9IGMuY29uc3RydWN0b3IgPT09IHZub2RlLm5vZGVOYW1lO1xuICAgICAgICBpZiAoYyAmJiBpc093bmVyICYmICghbW91bnRBbGwgfHwgYy5fY29tcG9uZW50KSkge1xuICAgICAgICAgICAgc2V0Q29tcG9uZW50UHJvcHMoYywgcHJvcHMsIDMsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgICAgIGRvbSA9IGMuYmFzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChvcmlnaW5hbENvbXBvbmVudCAmJiAhaXNEaXJlY3RPd25lcikge1xuICAgICAgICAgICAgICAgIHVubW91bnRDb21wb25lbnQob3JpZ2luYWxDb21wb25lbnQpO1xuICAgICAgICAgICAgICAgIGRvbSA9IG9sZERvbSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjID0gY3JlYXRlQ29tcG9uZW50KHZub2RlLm5vZGVOYW1lLCBwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoZG9tICYmICFjLl9fYikge1xuICAgICAgICAgICAgICAgIGMuX19iID0gZG9tO1xuICAgICAgICAgICAgICAgIG9sZERvbSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhjLCBwcm9wcywgMSwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgZG9tID0gYy5iYXNlO1xuICAgICAgICAgICAgaWYgKG9sZERvbSAmJiBkb20gIT09IG9sZERvbSkge1xuICAgICAgICAgICAgICAgIG9sZERvbS5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShvbGREb20sICExKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbiAgICBmdW5jdGlvbiB1bm1vdW50Q29tcG9uZW50KGNvbXBvbmVudCkge1xuICAgICAgICBpZiAob3B0aW9ucy5iZWZvcmVVbm1vdW50KSBvcHRpb25zLmJlZm9yZVVubW91bnQoY29tcG9uZW50KTtcbiAgICAgICAgdmFyIGJhc2UgPSBjb21wb25lbnQuYmFzZTtcbiAgICAgICAgY29tcG9uZW50Ll9feCA9ICEwO1xuICAgICAgICBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxVbm1vdW50KSBjb21wb25lbnQuY29tcG9uZW50V2lsbFVubW91bnQoKTtcbiAgICAgICAgY29tcG9uZW50LmJhc2UgPSBudWxsO1xuICAgICAgICB2YXIgaW5uZXIgPSBjb21wb25lbnQuX2NvbXBvbmVudDtcbiAgICAgICAgaWYgKGlubmVyKSB1bm1vdW50Q29tcG9uZW50KGlubmVyKTsgZWxzZSBpZiAoYmFzZSkge1xuICAgICAgICAgICAgaWYgKGJhc2UuX19wcmVhY3RhdHRyXyAmJiBiYXNlLl9fcHJlYWN0YXR0cl8ucmVmKSBiYXNlLl9fcHJlYWN0YXR0cl8ucmVmKG51bGwpO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9fYiA9IGJhc2U7XG4gICAgICAgICAgICByZW1vdmVOb2RlKGJhc2UpO1xuICAgICAgICAgICAgY29sbGVjdENvbXBvbmVudChjb21wb25lbnQpO1xuICAgICAgICAgICAgcmVtb3ZlQ2hpbGRyZW4oYmFzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbXBvbmVudC5fX3IpIGNvbXBvbmVudC5fX3IobnVsbCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIENvbXBvbmVudChwcm9wcywgY29udGV4dCkge1xuICAgICAgICB0aGlzLl9fZCA9ICEwO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLnByb3BzID0gcHJvcHM7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLnN0YXRlIHx8IHt9O1xuICAgIH1cbiAgICBmdW5jdGlvbiByZW5kZXIodm5vZGUsIHBhcmVudCwgbWVyZ2UpIHtcbiAgICAgICAgcmV0dXJuIGRpZmYobWVyZ2UsIHZub2RlLCB7fSwgITEsIHBhcmVudCwgITEpO1xuICAgIH1cbiAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgIHZhciBzdGFjayA9IFtdO1xuICAgIHZhciBFTVBUWV9DSElMRFJFTiA9IFtdO1xuICAgIHZhciBkZWZlciA9ICdmdW5jdGlvbicgPT0gdHlwZW9mIFByb21pc2UgPyBQcm9taXNlLnJlc29sdmUoKS50aGVuLmJpbmQoUHJvbWlzZS5yZXNvbHZlKCkpIDogc2V0VGltZW91dDtcbiAgICB2YXIgSVNfTk9OX0RJTUVOU0lPTkFMID0gL2FjaXR8ZXgoPzpzfGd8bnxwfCQpfHJwaHxvd3N8bW5jfG50d3xpbmVbY2hdfHpvb3xeb3JkL2k7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdmFyIG1vdW50cyA9IFtdO1xuICAgIHZhciBkaWZmTGV2ZWwgPSAwO1xuICAgIHZhciBpc1N2Z01vZGUgPSAhMTtcbiAgICB2YXIgaHlkcmF0aW5nID0gITE7XG4gICAgdmFyIGNvbXBvbmVudHMgPSB7fTtcbiAgICBleHRlbmQoQ29tcG9uZW50LnByb3RvdHlwZSwge1xuICAgICAgICBzZXRTdGF0ZTogZnVuY3Rpb24oc3RhdGUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgcyA9IHRoaXMuc3RhdGU7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX19zKSB0aGlzLl9fcyA9IGV4dGVuZCh7fSwgcyk7XG4gICAgICAgICAgICBleHRlbmQocywgJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygc3RhdGUgPyBzdGF0ZShzLCB0aGlzLnByb3BzKSA6IHN0YXRlKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgKHRoaXMuX19oID0gdGhpcy5fX2ggfHwgW10pLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgZW5xdWV1ZVJlbmRlcih0aGlzKTtcbiAgICAgICAgfSxcbiAgICAgICAgZm9yY2VVcGRhdGU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spICh0aGlzLl9faCA9IHRoaXMuX19oIHx8IFtdKS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIHJlbmRlckNvbXBvbmVudCh0aGlzLCAyKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVuZGVyOiBmdW5jdGlvbigpIHt9XG4gICAgfSk7XG4gICAgdmFyIHByZWFjdCA9IHtcbiAgICAgICAgaDogaCxcbiAgICAgICAgY3JlYXRlRWxlbWVudDogaCxcbiAgICAgICAgY2xvbmVFbGVtZW50OiBjbG9uZUVsZW1lbnQsXG4gICAgICAgIENvbXBvbmVudDogQ29tcG9uZW50LFxuICAgICAgICByZW5kZXI6IHJlbmRlcixcbiAgICAgICAgcmVyZW5kZXI6IHJlcmVuZGVyLFxuICAgICAgICBvcHRpb25zOiBvcHRpb25zXG4gICAgfTtcbiAgICBpZiAoJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIG1vZHVsZSkgbW9kdWxlLmV4cG9ydHMgPSBwcmVhY3Q7IGVsc2Ugc2VsZi5wcmVhY3QgPSBwcmVhY3Q7XG59KCk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wcmVhY3QuanMubWFwIiwibW9kdWxlLmV4cG9ydHMgPSBwcmV0dGllckJ5dGVzXG5cbmZ1bmN0aW9uIHByZXR0aWVyQnl0ZXMgKG51bSkge1xuICBpZiAodHlwZW9mIG51bSAhPT0gJ251bWJlcicgfHwgaXNOYU4obnVtKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgbnVtYmVyLCBnb3QgJyArIHR5cGVvZiBudW0pXG4gIH1cblxuICB2YXIgbmVnID0gbnVtIDwgMFxuICB2YXIgdW5pdHMgPSBbJ0InLCAnS0InLCAnTUInLCAnR0InLCAnVEInLCAnUEInLCAnRUInLCAnWkInLCAnWUInXVxuXG4gIGlmIChuZWcpIHtcbiAgICBudW0gPSAtbnVtXG4gIH1cblxuICBpZiAobnVtIDwgMSkge1xuICAgIHJldHVybiAobmVnID8gJy0nIDogJycpICsgbnVtICsgJyBCJ1xuICB9XG5cbiAgdmFyIGV4cG9uZW50ID0gTWF0aC5taW4oTWF0aC5mbG9vcihNYXRoLmxvZyhudW0pIC8gTWF0aC5sb2coMTAwMCkpLCB1bml0cy5sZW5ndGggLSAxKVxuICBudW0gPSBOdW1iZXIobnVtIC8gTWF0aC5wb3coMTAwMCwgZXhwb25lbnQpKVxuICB2YXIgdW5pdCA9IHVuaXRzW2V4cG9uZW50XVxuXG4gIGlmIChudW0gPj0gMTAgfHwgbnVtICUgMSA9PT0gMCkge1xuICAgIC8vIERvIG5vdCBzaG93IGRlY2ltYWxzIHdoZW4gdGhlIG51bWJlciBpcyB0d28tZGlnaXQsIG9yIGlmIHRoZSBudW1iZXIgaGFzIG5vXG4gICAgLy8gZGVjaW1hbCBjb21wb25lbnQuXG4gICAgcmV0dXJuIChuZWcgPyAnLScgOiAnJykgKyBudW0udG9GaXhlZCgwKSArICcgJyArIHVuaXRcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKG5lZyA/ICctJyA6ICcnKSArIG51bS50b0ZpeGVkKDEpICsgJyAnICsgdW5pdFxuICB9XG59XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyB3aWxkY2FyZFxuXG4gIFZlcnkgc2ltcGxlIHdpbGRjYXJkIG1hdGNoaW5nLCB3aGljaCBpcyBkZXNpZ25lZCB0byBwcm92aWRlIHRoZSBzYW1lXG4gIGZ1bmN0aW9uYWxpdHkgdGhhdCBpcyBmb3VuZCBpbiB0aGVcbiAgW2V2ZV0oaHR0cHM6Ly9naXRodWIuY29tL2Fkb2JlLXdlYnBsYXRmb3JtL2V2ZSkgZXZlbnRpbmcgbGlicmFyeS5cblxuICAjIyBVc2FnZVxuXG4gIEl0IHdvcmtzIHdpdGggc3RyaW5nczpcblxuICA8PDwgZXhhbXBsZXMvc3RyaW5ncy5qc1xuXG4gIEFycmF5czpcblxuICA8PDwgZXhhbXBsZXMvYXJyYXlzLmpzXG5cbiAgT2JqZWN0cyAobWF0Y2hpbmcgYWdhaW5zdCBrZXlzKTpcblxuICA8PDwgZXhhbXBsZXMvb2JqZWN0cy5qc1xuXG4gIFdoaWxlIHRoZSBsaWJyYXJ5IHdvcmtzIGluIE5vZGUsIGlmIHlvdSBhcmUgYXJlIGxvb2tpbmcgZm9yIGZpbGUtYmFzZWRcbiAgd2lsZGNhcmQgbWF0Y2hpbmcgdGhlbiB5b3Ugc2hvdWxkIGhhdmUgYSBsb29rIGF0OlxuXG4gIDxodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL25vZGUtZ2xvYj5cbioqL1xuXG5mdW5jdGlvbiBXaWxkY2FyZE1hdGNoZXIodGV4dCwgc2VwYXJhdG9yKSB7XG4gIHRoaXMudGV4dCA9IHRleHQgPSB0ZXh0IHx8ICcnO1xuICB0aGlzLmhhc1dpbGQgPSB+dGV4dC5pbmRleE9mKCcqJyk7XG4gIHRoaXMuc2VwYXJhdG9yID0gc2VwYXJhdG9yO1xuICB0aGlzLnBhcnRzID0gdGV4dC5zcGxpdChzZXBhcmF0b3IpO1xufVxuXG5XaWxkY2FyZE1hdGNoZXIucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIG1hdGNoZXMgPSB0cnVlO1xuICB2YXIgcGFydHMgPSB0aGlzLnBhcnRzO1xuICB2YXIgaWk7XG4gIHZhciBwYXJ0c0NvdW50ID0gcGFydHMubGVuZ3RoO1xuICB2YXIgdGVzdFBhcnRzO1xuXG4gIGlmICh0eXBlb2YgaW5wdXQgPT0gJ3N0cmluZycgfHwgaW5wdXQgaW5zdGFuY2VvZiBTdHJpbmcpIHtcbiAgICBpZiAoIXRoaXMuaGFzV2lsZCAmJiB0aGlzLnRleHQgIT0gaW5wdXQpIHtcbiAgICAgIG1hdGNoZXMgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVzdFBhcnRzID0gKGlucHV0IHx8ICcnKS5zcGxpdCh0aGlzLnNlcGFyYXRvcik7XG4gICAgICBmb3IgKGlpID0gMDsgbWF0Y2hlcyAmJiBpaSA8IHBhcnRzQ291bnQ7IGlpKyspIHtcbiAgICAgICAgaWYgKHBhcnRzW2lpXSA9PT0gJyonKSAge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGlpIDwgdGVzdFBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgIG1hdGNoZXMgPSBwYXJ0c1tpaV0gPT09IHRlc3RQYXJ0c1tpaV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0Y2hlcyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIG1hdGNoZXMsIHRoZW4gcmV0dXJuIHRoZSBjb21wb25lbnQgcGFydHNcbiAgICAgIG1hdGNoZXMgPSBtYXRjaGVzICYmIHRlc3RQYXJ0cztcbiAgICB9XG4gIH1cbiAgZWxzZSBpZiAodHlwZW9mIGlucHV0LnNwbGljZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgbWF0Y2hlcyA9IFtdO1xuXG4gICAgZm9yIChpaSA9IGlucHV0Lmxlbmd0aDsgaWktLTsgKSB7XG4gICAgICBpZiAodGhpcy5tYXRjaChpbnB1dFtpaV0pKSB7XG4gICAgICAgIG1hdGNoZXNbbWF0Y2hlcy5sZW5ndGhdID0gaW5wdXRbaWldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT0gJ29iamVjdCcpIHtcbiAgICBtYXRjaGVzID0ge307XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gaW5wdXQpIHtcbiAgICAgIGlmICh0aGlzLm1hdGNoKGtleSkpIHtcbiAgICAgICAgbWF0Y2hlc1trZXldID0gaW5wdXRba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWF0Y2hlcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGV4dCwgdGVzdCwgc2VwYXJhdG9yKSB7XG4gIHZhciBtYXRjaGVyID0gbmV3IFdpbGRjYXJkTWF0Y2hlcih0ZXh0LCBzZXBhcmF0b3IgfHwgL1tcXC9cXC5dLyk7XG4gIGlmICh0eXBlb2YgdGVzdCAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBtYXRjaGVyLm1hdGNoKHRlc3QpO1xuICB9XG5cbiAgcmV0dXJuIG1hdGNoZXI7XG59O1xuIiwiY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWxzJylcbmNvbnN0IFRyYW5zbGF0b3IgPSByZXF1aXJlKCcuLi9jb3JlL1RyYW5zbGF0b3InKVxuY29uc3QgZWUgPSByZXF1aXJlKCduYW1lc3BhY2UtZW1pdHRlcicpXG5jb25zdCBjdWlkID0gcmVxdWlyZSgnY3VpZCcpXG5jb25zdCB0aHJvdHRsZSA9IHJlcXVpcmUoJ2xvZGFzaC50aHJvdHRsZScpXG5jb25zdCBwcmV0dHlCeXRlcyA9IHJlcXVpcmUoJ3ByZXR0aWVyLWJ5dGVzJylcbmNvbnN0IG1hdGNoID0gcmVxdWlyZSgnbWltZS1tYXRjaCcpXG5jb25zdCBEZWZhdWx0U3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZS9EZWZhdWx0U3RvcmUnKVxuXG4vKipcbiAqIFVwcHkgQ29yZSBtb2R1bGUuXG4gKiBNYW5hZ2VzIHBsdWdpbnMsIHN0YXRlIHVwZGF0ZXMsIGFjdHMgYXMgYW4gZXZlbnQgYnVzLFxuICogYWRkcy9yZW1vdmVzIGZpbGVzIGFuZCBtZXRhZGF0YS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0cyDigJQgVXBweSBvcHRpb25zXG4gKi9cbmNsYXNzIFVwcHkge1xuICBjb25zdHJ1Y3RvciAob3B0cykge1xuICAgIGNvbnN0IGRlZmF1bHRMb2NhbGUgPSB7XG4gICAgICBzdHJpbmdzOiB7XG4gICAgICAgIHlvdUNhbk9ubHlVcGxvYWRYOiB7XG4gICAgICAgICAgMDogJ1lvdSBjYW4gb25seSB1cGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZScsXG4gICAgICAgICAgMTogJ1lvdSBjYW4gb25seSB1cGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHlvdUhhdmVUb0F0TGVhc3RTZWxlY3RYOiB7XG4gICAgICAgICAgMDogJ1lvdSBoYXZlIHRvIHNlbGVjdCBhdCBsZWFzdCAle3NtYXJ0X2NvdW50fSBmaWxlJyxcbiAgICAgICAgICAxOiAnWW91IGhhdmUgdG8gc2VsZWN0IGF0IGxlYXN0ICV7c21hcnRfY291bnR9IGZpbGVzJ1xuICAgICAgICB9LFxuICAgICAgICBleGNlZWRzU2l6ZTogJ1RoaXMgZmlsZSBleGNlZWRzIG1heGltdW0gYWxsb3dlZCBzaXplIG9mJyxcbiAgICAgICAgeW91Q2FuT25seVVwbG9hZEZpbGVUeXBlczogJ1lvdSBjYW4gb25seSB1cGxvYWQ6JyxcbiAgICAgICAgdXBweVNlcnZlckVycm9yOiAnQ29ubmVjdGlvbiB3aXRoIFVwcHkgU2VydmVyIGZhaWxlZCdcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICBpZDogJ3VwcHknLFxuICAgICAgYXV0b1Byb2NlZWQ6IHRydWUsXG4gICAgICBkZWJ1ZzogZmFsc2UsXG4gICAgICByZXN0cmljdGlvbnM6IHtcbiAgICAgICAgbWF4RmlsZVNpemU6IGZhbHNlLFxuICAgICAgICBtYXhOdW1iZXJPZkZpbGVzOiBmYWxzZSxcbiAgICAgICAgbWluTnVtYmVyT2ZGaWxlczogZmFsc2UsXG4gICAgICAgIGFsbG93ZWRGaWxlVHlwZXM6IGZhbHNlXG4gICAgICB9LFxuICAgICAgbWV0YToge30sXG4gICAgICBvbkJlZm9yZUZpbGVBZGRlZDogKGN1cnJlbnRGaWxlLCBmaWxlcykgPT4gUHJvbWlzZS5yZXNvbHZlKCksXG4gICAgICBvbkJlZm9yZVVwbG9hZDogKGZpbGVzKSA9PiBQcm9taXNlLnJlc29sdmUoKSxcbiAgICAgIGxvY2FsZTogZGVmYXVsdExvY2FsZSxcbiAgICAgIHN0b3JlOiBuZXcgRGVmYXVsdFN0b3JlKClcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBzZXQgYnkgdXNlclxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuICAgIHRoaXMub3B0cy5yZXN0cmljdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucy5yZXN0cmljdGlvbnMsIHRoaXMub3B0cy5yZXN0cmljdGlvbnMpXG5cbiAgICB0aGlzLmxvY2FsZSA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUsIHRoaXMub3B0cy5sb2NhbGUpXG4gICAgdGhpcy5sb2NhbGUuc3RyaW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUuc3RyaW5ncywgdGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzKVxuXG4gICAgLy8gaTE4blxuICAgIHRoaXMudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKHtsb2NhbGU6IHRoaXMubG9jYWxlfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuXG4gICAgLy8gQ29udGFpbmVyIGZvciBkaWZmZXJlbnQgdHlwZXMgb2YgcGx1Z2luc1xuICAgIHRoaXMucGx1Z2lucyA9IHt9XG5cbiAgICB0aGlzLmdldFN0YXRlID0gdGhpcy5nZXRTdGF0ZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5nZXRQbHVnaW4gPSB0aGlzLmdldFBsdWdpbi5iaW5kKHRoaXMpXG4gICAgdGhpcy5zZXRGaWxlTWV0YSA9IHRoaXMuc2V0RmlsZU1ldGEuYmluZCh0aGlzKVxuICAgIHRoaXMuc2V0RmlsZVN0YXRlID0gdGhpcy5zZXRGaWxlU3RhdGUuYmluZCh0aGlzKVxuICAgIHRoaXMubG9nID0gdGhpcy5sb2cuYmluZCh0aGlzKVxuICAgIHRoaXMuaW5mbyA9IHRoaXMuaW5mby5iaW5kKHRoaXMpXG4gICAgdGhpcy5oaWRlSW5mbyA9IHRoaXMuaGlkZUluZm8uYmluZCh0aGlzKVxuICAgIHRoaXMuYWRkRmlsZSA9IHRoaXMuYWRkRmlsZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZW1vdmVGaWxlID0gdGhpcy5yZW1vdmVGaWxlLmJpbmQodGhpcylcbiAgICB0aGlzLnBhdXNlUmVzdW1lID0gdGhpcy5wYXVzZVJlc3VtZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5fY2FsY3VsYXRlUHJvZ3Jlc3MgPSB0aGlzLl9jYWxjdWxhdGVQcm9ncmVzcy5iaW5kKHRoaXMpXG4gICAgdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMgPSB0aGlzLnVwZGF0ZU9ubGluZVN0YXR1cy5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZXNldFByb2dyZXNzID0gdGhpcy5yZXNldFByb2dyZXNzLmJpbmQodGhpcylcblxuICAgIHRoaXMucGF1c2VBbGwgPSB0aGlzLnBhdXNlQWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnJlc3VtZUFsbCA9IHRoaXMucmVzdW1lQWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnJldHJ5QWxsID0gdGhpcy5yZXRyeUFsbC5iaW5kKHRoaXMpXG4gICAgdGhpcy5jYW5jZWxBbGwgPSB0aGlzLmNhbmNlbEFsbC5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZXRyeVVwbG9hZCA9IHRoaXMucmV0cnlVcGxvYWQuYmluZCh0aGlzKVxuICAgIHRoaXMudXBsb2FkID0gdGhpcy51cGxvYWQuYmluZCh0aGlzKVxuXG4gICAgdGhpcy5lbWl0dGVyID0gZWUoKVxuICAgIHRoaXMub24gPSB0aGlzLm9uLmJpbmQodGhpcylcbiAgICB0aGlzLm9mZiA9IHRoaXMub2ZmLmJpbmQodGhpcylcbiAgICB0aGlzLm9uY2UgPSB0aGlzLmVtaXR0ZXIub25jZS5iaW5kKHRoaXMuZW1pdHRlcilcbiAgICB0aGlzLmVtaXQgPSB0aGlzLmVtaXR0ZXIuZW1pdC5iaW5kKHRoaXMuZW1pdHRlcilcblxuICAgIHRoaXMucHJlUHJvY2Vzc29ycyA9IFtdXG4gICAgdGhpcy51cGxvYWRlcnMgPSBbXVxuICAgIHRoaXMucG9zdFByb2Nlc3NvcnMgPSBbXVxuXG4gICAgdGhpcy5zdG9yZSA9IHRoaXMub3B0cy5zdG9yZVxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgcGx1Z2luczoge30sXG4gICAgICBmaWxlczoge30sXG4gICAgICBjdXJyZW50VXBsb2Fkczoge30sXG4gICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgcmVzdW1hYmxlVXBsb2FkczogZmFsc2VcbiAgICAgIH0sXG4gICAgICB0b3RhbFByb2dyZXNzOiAwLFxuICAgICAgbWV0YTogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5vcHRzLm1ldGEpLFxuICAgICAgaW5mbzoge1xuICAgICAgICBpc0hpZGRlbjogdHJ1ZSxcbiAgICAgICAgdHlwZTogJ2luZm8nLFxuICAgICAgICBtZXNzYWdlOiAnJ1xuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLl9zdG9yZVVuc3Vic2NyaWJlID0gdGhpcy5zdG9yZS5zdWJzY3JpYmUoKHByZXZTdGF0ZSwgbmV4dFN0YXRlLCBwYXRjaCkgPT4ge1xuICAgICAgdGhpcy5lbWl0KCdzdGF0ZS11cGRhdGUnLCBwcmV2U3RhdGUsIG5leHRTdGF0ZSwgcGF0Y2gpXG4gICAgICB0aGlzLnVwZGF0ZUFsbChuZXh0U3RhdGUpXG4gICAgfSlcblxuICAgIC8vIGZvciBkZWJ1Z2dpbmcgYW5kIHRlc3RpbmdcbiAgICAvLyB0aGlzLnVwZGF0ZU51bSA9IDBcbiAgICBpZiAodGhpcy5vcHRzLmRlYnVnKSB7XG4gICAgICBnbG9iYWwudXBweUxvZyA9ICcnXG4gICAgICBnbG9iYWxbdGhpcy5vcHRzLmlkXSA9IHRoaXNcbiAgICB9XG4gIH1cblxuICBvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5lbWl0dGVyLm9uKGV2ZW50LCBjYWxsYmFjaylcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgb2ZmIChldmVudCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmVtaXR0ZXIub2ZmKGV2ZW50LCBjYWxsYmFjaylcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb24gYWxsIHBsdWdpbnMgYW5kIHJ1biBgdXBkYXRlYCBvbiB0aGVtLlxuICAgKiBDYWxsZWQgZWFjaCB0aW1lIHN0YXRlIGNoYW5nZXMuXG4gICAqXG4gICAqL1xuICB1cGRhdGVBbGwgKHN0YXRlKSB7XG4gICAgdGhpcy5pdGVyYXRlUGx1Z2lucyhwbHVnaW4gPT4ge1xuICAgICAgcGx1Z2luLnVwZGF0ZShzdGF0ZSlcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgc3RhdGVcbiAgICpcbiAgICogQHBhcmFtIHtwYXRjaH0gb2JqZWN0XG4gICAqL1xuICBzZXRTdGF0ZSAocGF0Y2gpIHtcbiAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHBhdGNoKVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgY3VycmVudCBzdGF0ZS5cbiAgICovXG4gIGdldFN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpXG4gIH1cblxuICAvKipcbiAgKiBCYWNrIGNvbXBhdCBmb3Igd2hlbiB0aGlzLnN0YXRlIGlzIHVzZWQgaW5zdGVhZCBvZiB0aGlzLmdldFN0YXRlKCkuXG4gICovXG4gIGdldCBzdGF0ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKVxuICB9XG5cbiAgLyoqXG4gICogU2hvcnRoYW5kIHRvIHNldCBzdGF0ZSBmb3IgYSBzcGVjaWZpYyBmaWxlLlxuICAqL1xuICBzZXRGaWxlU3RhdGUgKGZpbGVJRCwgc3RhdGUpIHtcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGZpbGVzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMsIHtcbiAgICAgICAgW2ZpbGVJRF06IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlc1tmaWxlSURdLCBzdGF0ZSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIHJlc2V0UHJvZ3Jlc3MgKCkge1xuICAgIGNvbnN0IGRlZmF1bHRQcm9ncmVzcyA9IHtcbiAgICAgIHBlcmNlbnRhZ2U6IDAsXG4gICAgICBieXRlc1VwbG9hZGVkOiAwLFxuICAgICAgdXBsb2FkQ29tcGxldGU6IGZhbHNlLFxuICAgICAgdXBsb2FkU3RhcnRlZDogZmFsc2VcbiAgICB9XG4gICAgY29uc3QgZmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0ge31cbiAgICBPYmplY3Qua2V5cyhmaWxlcykuZm9yRWFjaChmaWxlSUQgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlSURdKVxuICAgICAgdXBkYXRlZEZpbGUucHJvZ3Jlc3MgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZS5wcm9ncmVzcywgZGVmYXVsdFByb2dyZXNzKVxuICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSB1cGRhdGVkRmlsZVxuICAgIH0pXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGZpbGVzOiB1cGRhdGVkRmlsZXMsXG4gICAgICB0b3RhbFByb2dyZXNzOiAwXG4gICAgfSlcblxuICAgIC8vIFRPRE8gRG9jdW1lbnQgb24gdGhlIHdlYnNpdGVcbiAgICB0aGlzLmVtaXQoJ3Jlc2V0LXByb2dyZXNzJylcbiAgfVxuXG4gIGFkZFByZVByb2Nlc3NvciAoZm4pIHtcbiAgICB0aGlzLnByZVByb2Nlc3NvcnMucHVzaChmbilcbiAgfVxuXG4gIHJlbW92ZVByZVByb2Nlc3NvciAoZm4pIHtcbiAgICBjb25zdCBpID0gdGhpcy5wcmVQcm9jZXNzb3JzLmluZGV4T2YoZm4pXG4gICAgaWYgKGkgIT09IC0xKSB7XG4gICAgICB0aGlzLnByZVByb2Nlc3NvcnMuc3BsaWNlKGksIDEpXG4gICAgfVxuICB9XG5cbiAgYWRkUG9zdFByb2Nlc3NvciAoZm4pIHtcbiAgICB0aGlzLnBvc3RQcm9jZXNzb3JzLnB1c2goZm4pXG4gIH1cblxuICByZW1vdmVQb3N0UHJvY2Vzc29yIChmbikge1xuICAgIGNvbnN0IGkgPSB0aGlzLnBvc3RQcm9jZXNzb3JzLmluZGV4T2YoZm4pXG4gICAgaWYgKGkgIT09IC0xKSB7XG4gICAgICB0aGlzLnBvc3RQcm9jZXNzb3JzLnNwbGljZShpLCAxKVxuICAgIH1cbiAgfVxuXG4gIGFkZFVwbG9hZGVyIChmbikge1xuICAgIHRoaXMudXBsb2FkZXJzLnB1c2goZm4pXG4gIH1cblxuICByZW1vdmVVcGxvYWRlciAoZm4pIHtcbiAgICBjb25zdCBpID0gdGhpcy51cGxvYWRlcnMuaW5kZXhPZihmbilcbiAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgIHRoaXMudXBsb2FkZXJzLnNwbGljZShpLCAxKVxuICAgIH1cbiAgfVxuXG4gIHNldE1ldGEgKGRhdGEpIHtcbiAgICBjb25zdCB1cGRhdGVkTWV0YSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5tZXRhLCBkYXRhKVxuICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcblxuICAgIE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZm9yRWFjaCgoZmlsZUlEKSA9PiB7XG4gICAgICB1cGRhdGVkRmlsZXNbZmlsZUlEXSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLCB7XG4gICAgICAgIG1ldGE6IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLm1ldGEsIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB0aGlzLmxvZygnQWRkaW5nIG1ldGFkYXRhOicpXG4gICAgdGhpcy5sb2coZGF0YSlcblxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgbWV0YTogdXBkYXRlZE1ldGEsXG4gICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgfSlcbiAgfVxuXG4gIHNldEZpbGVNZXRhIChmaWxlSUQsIGRhdGEpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgaWYgKCF1cGRhdGVkRmlsZXNbZmlsZUlEXSkge1xuICAgICAgdGhpcy5sb2coJ1dhcyB0cnlpbmcgdG8gc2V0IG1ldGFkYXRhIGZvciBhIGZpbGUgdGhhdOKAmXMgbm90IHdpdGggdXMgYW55bW9yZTogJywgZmlsZUlEKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbnN0IG5ld01ldGEgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZUlEXS5tZXRhLCBkYXRhKVxuICAgIHVwZGF0ZWRGaWxlc1tmaWxlSURdID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0sIHtcbiAgICAgIG1ldGE6IG5ld01ldGFcbiAgICB9KVxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGZpbGUgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlEIFRoZSBJRCBvZiB0aGUgZmlsZSBvYmplY3QgdG8gcmV0dXJuLlxuICAgKi9cbiAgZ2V0RmlsZSAoZmlsZUlEKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKS5maWxlc1tmaWxlSURdXG4gIH1cblxuICAvKipcbiAgKiBDaGVjayBpZiBtaW5OdW1iZXJPZkZpbGVzIHJlc3RyaWN0aW9uIGlzIHJlYWNoZWQgYmVmb3JlIHVwbG9hZGluZy5cbiAgKlxuICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2NoZWNrTWluTnVtYmVyT2ZGaWxlcyAoKSB7XG4gICAgY29uc3Qge21pbk51bWJlck9mRmlsZXN9ID0gdGhpcy5vcHRzLnJlc3RyaWN0aW9uc1xuICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLmdldFN0YXRlKCkuZmlsZXMpLmxlbmd0aCA8IG1pbk51bWJlck9mRmlsZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHt0aGlzLmkxOG4oJ3lvdUhhdmVUb0F0TGVhc3RTZWxlY3RYJywgeyBzbWFydF9jb3VudDogbWluTnVtYmVyT2ZGaWxlcyB9KX1gKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENoZWNrIGlmIGZpbGUgcGFzc2VzIGEgc2V0IG9mIHJlc3RyaWN0aW9ucyBzZXQgaW4gb3B0aW9uczogbWF4RmlsZVNpemUsXG4gICogbWF4TnVtYmVyT2ZGaWxlcyBhbmQgYWxsb3dlZEZpbGVUeXBlcy5cbiAgKlxuICAqIEBwYXJhbSB7b2JqZWN0fSBmaWxlIG9iamVjdCB0byBjaGVja1xuICAqIEBwcml2YXRlXG4gICovXG4gIF9jaGVja1Jlc3RyaWN0aW9ucyAoZmlsZSkge1xuICAgIGNvbnN0IHttYXhGaWxlU2l6ZSwgbWF4TnVtYmVyT2ZGaWxlcywgYWxsb3dlZEZpbGVUeXBlc30gPSB0aGlzLm9wdHMucmVzdHJpY3Rpb25zXG5cbiAgICBpZiAobWF4TnVtYmVyT2ZGaWxlcykge1xuICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuZ2V0U3RhdGUoKS5maWxlcykubGVuZ3RoICsgMSA+IG1heE51bWJlck9mRmlsZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXMuaTE4bigneW91Q2FuT25seVVwbG9hZFgnLCB7IHNtYXJ0X2NvdW50OiBtYXhOdW1iZXJPZkZpbGVzIH0pfWApXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFsbG93ZWRGaWxlVHlwZXMpIHtcbiAgICAgIGNvbnN0IGlzQ29ycmVjdEZpbGVUeXBlID0gYWxsb3dlZEZpbGVUeXBlcy5maWx0ZXIoKHR5cGUpID0+IHtcbiAgICAgICAgaWYgKCFmaWxlLnR5cGUpIHJldHVybiBmYWxzZVxuICAgICAgICByZXR1cm4gbWF0Y2goZmlsZS50eXBlLCB0eXBlKVxuICAgICAgfSkubGVuZ3RoID4gMFxuXG4gICAgICBpZiAoIWlzQ29ycmVjdEZpbGVUeXBlKSB7XG4gICAgICAgIGNvbnN0IGFsbG93ZWRGaWxlVHlwZXNTdHJpbmcgPSBhbGxvd2VkRmlsZVR5cGVzLmpvaW4oJywgJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXMuaTE4bigneW91Q2FuT25seVVwbG9hZEZpbGVUeXBlcycpfSAke2FsbG93ZWRGaWxlVHlwZXNTdHJpbmd9YClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF4RmlsZVNpemUpIHtcbiAgICAgIGlmIChmaWxlLmRhdGEuc2l6ZSA+IG1heEZpbGVTaXplKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHt0aGlzLmkxOG4oJ2V4Y2VlZHNTaXplJyl9ICR7cHJldHR5Qnl0ZXMobWF4RmlsZVNpemUpfWApXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQWRkIGEgbmV3IGZpbGUgdG8gYHN0YXRlLmZpbGVzYC4gVGhpcyB3aWxsIHJ1biBgb25CZWZvcmVGaWxlQWRkZWRgLFxuICAqIHRyeSB0byBndWVzcyBmaWxlIHR5cGUgaW4gYSBjbGV2ZXIgd2F5LCBjaGVjayBmaWxlIGFnYWluc3QgcmVzdHJpY3Rpb25zLFxuICAqIGFuZCBzdGFydCBhbiB1cGxvYWQgaWYgYGF1dG9Qcm9jZWVkID09PSB0cnVlYC5cbiAgKlxuICAqIEBwYXJhbSB7b2JqZWN0fSBmaWxlIG9iamVjdCB0byBhZGRcbiAgKi9cbiAgYWRkRmlsZSAoZmlsZSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLy8gV3JhcCB0aGlzIGluIGEgUHJvbWlzZSBgLnRoZW4oKWAgaGFuZGxlciBzbyBlcnJvcnMgd2lsbCByZWplY3QgdGhlIFByb21pc2VcbiAgICAgIC8vIGluc3RlYWQgb2YgdGhyb3dpbmcuXG4gICAgICAudGhlbigoKSA9PiB0aGlzLm9wdHMub25CZWZvcmVGaWxlQWRkZWQoZmlsZSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKSlcbiAgICAgIC50aGVuKCgpID0+IFV0aWxzLmdldEZpbGVUeXBlKGZpbGUpKVxuICAgICAgLnRoZW4oKGZpbGVUeXBlKSA9PiB7XG4gICAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICAgICAgbGV0IGZpbGVOYW1lXG4gICAgICAgIGlmIChmaWxlLm5hbWUpIHtcbiAgICAgICAgICBmaWxlTmFtZSA9IGZpbGUubmFtZVxuICAgICAgICB9IGVsc2UgaWYgKGZpbGVUeXBlLnNwbGl0KCcvJylbMF0gPT09ICdpbWFnZScpIHtcbiAgICAgICAgICBmaWxlTmFtZSA9IGZpbGVUeXBlLnNwbGl0KCcvJylbMF0gKyAnLicgKyBmaWxlVHlwZS5zcGxpdCgnLycpWzFdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZmlsZU5hbWUgPSAnbm9uYW1lJ1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZpbGVFeHRlbnNpb24gPSBVdGlscy5nZXRGaWxlTmFtZUFuZEV4dGVuc2lvbihmaWxlTmFtZSkuZXh0ZW5zaW9uXG4gICAgICAgIGNvbnN0IGlzUmVtb3RlID0gZmlsZS5pc1JlbW90ZSB8fCBmYWxzZVxuXG4gICAgICAgIGNvbnN0IGZpbGVJRCA9IFV0aWxzLmdlbmVyYXRlRmlsZUlEKGZpbGUpXG5cbiAgICAgICAgY29uc3QgbmV3RmlsZSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZpbGUuc291cmNlIHx8ICcnLFxuICAgICAgICAgIGlkOiBmaWxlSUQsXG4gICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBmaWxlRXh0ZW5zaW9uIHx8ICcnLFxuICAgICAgICAgIG1ldGE6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5tZXRhLCB7XG4gICAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICAgIHR5cGU6IGZpbGVUeXBlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgdHlwZTogZmlsZVR5cGUsXG4gICAgICAgICAgZGF0YTogZmlsZS5kYXRhLFxuICAgICAgICAgIHByb2dyZXNzOiB7XG4gICAgICAgICAgICBwZXJjZW50YWdlOiAwLFxuICAgICAgICAgICAgYnl0ZXNVcGxvYWRlZDogMCxcbiAgICAgICAgICAgIGJ5dGVzVG90YWw6IGZpbGUuZGF0YS5zaXplIHx8IDAsXG4gICAgICAgICAgICB1cGxvYWRDb21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICB1cGxvYWRTdGFydGVkOiBmYWxzZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2l6ZTogZmlsZS5kYXRhLnNpemUgfHwgMCxcbiAgICAgICAgICBpc1JlbW90ZTogaXNSZW1vdGUsXG4gICAgICAgICAgcmVtb3RlOiBmaWxlLnJlbW90ZSB8fCAnJyxcbiAgICAgICAgICBwcmV2aWV3OiBmaWxlLnByZXZpZXdcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NoZWNrUmVzdHJpY3Rpb25zKG5ld0ZpbGUpXG5cbiAgICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSBuZXdGaWxlXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgICAgIHRoaXMuZW1pdCgnZmlsZS1hZGRlZCcsIG5ld0ZpbGUpXG4gICAgICAgIHRoaXMubG9nKGBBZGRlZCBmaWxlOiAke2ZpbGVOYW1lfSwgJHtmaWxlSUR9LCBtaW1lIHR5cGU6ICR7ZmlsZVR5cGV9YClcblxuICAgICAgICBpZiAodGhpcy5vcHRzLmF1dG9Qcm9jZWVkICYmICF0aGlzLnNjaGVkdWxlZEF1dG9Qcm9jZWVkKSB7XG4gICAgICAgICAgdGhpcy5zY2hlZHVsZWRBdXRvUHJvY2VlZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZWRBdXRvUHJvY2VlZCA9IG51bGxcbiAgICAgICAgICAgIHRoaXMudXBsb2FkKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVyci5zdGFjayB8fCBlcnIubWVzc2FnZSB8fCBlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0sIDQpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gdHlwZW9mIGVyciA9PT0gJ29iamVjdCcgPyBlcnIubWVzc2FnZSA6IGVyclxuICAgICAgICB0aGlzLmxvZyhtZXNzYWdlKVxuICAgICAgICB0aGlzLmluZm8obWVzc2FnZSwgJ2Vycm9yJywgNTAwMClcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHR5cGVvZiBlcnIgPT09ICdvYmplY3QnID8gZXJyIDogbmV3IEVycm9yKGVycikpXG4gICAgICB9KVxuICB9XG5cbiAgcmVtb3ZlRmlsZSAoZmlsZUlEKSB7XG4gICAgY29uc3QgeyBmaWxlcywgY3VycmVudFVwbG9hZHMgfSA9IHRoaXMuc3RhdGVcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlcylcbiAgICBjb25zdCByZW1vdmVkRmlsZSA9IHVwZGF0ZWRGaWxlc1tmaWxlSURdXG4gICAgZGVsZXRlIHVwZGF0ZWRGaWxlc1tmaWxlSURdXG5cbiAgICAvLyBSZW1vdmUgdGhpcyBmaWxlIGZyb20gaXRzIGBjdXJyZW50VXBsb2FkYC5cbiAgICBjb25zdCB1cGRhdGVkVXBsb2FkcyA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzKVxuICAgIGNvbnN0IHJlbW92ZVVwbG9hZHMgPSBbXVxuICAgIE9iamVjdC5rZXlzKHVwZGF0ZWRVcGxvYWRzKS5mb3JFYWNoKCh1cGxvYWRJRCkgPT4ge1xuICAgICAgY29uc3QgbmV3RmlsZUlEcyA9IGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXS5maWxlSURzLmZpbHRlcigodXBsb2FkRmlsZUlEKSA9PiB1cGxvYWRGaWxlSUQgIT09IGZpbGVJRClcbiAgICAgIC8vIFJlbW92ZSB0aGUgdXBsb2FkIGlmIG5vIGZpbGVzIGFyZSBhc3NvY2lhdGVkIHdpdGggaXQgYW55bW9yZS5cbiAgICAgIGlmIChuZXdGaWxlSURzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZW1vdmVVcGxvYWRzLnB1c2godXBsb2FkSUQpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB1cGRhdGVkVXBsb2Fkc1t1cGxvYWRJRF0gPSBPYmplY3QuYXNzaWduKHt9LCBjdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0sIHtcbiAgICAgICAgZmlsZUlEczogbmV3RmlsZUlEc1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBjdXJyZW50VXBsb2FkczogdXBkYXRlZFVwbG9hZHMsXG4gICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgfSlcblxuICAgIHJlbW92ZVVwbG9hZHMuZm9yRWFjaCgodXBsb2FkSUQpID0+IHtcbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZCh1cGxvYWRJRClcbiAgICB9KVxuXG4gICAgdGhpcy5fY2FsY3VsYXRlVG90YWxQcm9ncmVzcygpXG4gICAgdGhpcy5lbWl0KCdmaWxlLXJlbW92ZWQnLCByZW1vdmVkRmlsZSlcbiAgICB0aGlzLmxvZyhgRmlsZSByZW1vdmVkOiAke3JlbW92ZWRGaWxlLmlkfWApXG5cbiAgICAvLyBDbGVhbiB1cCBvYmplY3QgVVJMcy5cbiAgICBpZiAocmVtb3ZlZEZpbGUucHJldmlldyAmJiBVdGlscy5pc09iamVjdFVSTChyZW1vdmVkRmlsZS5wcmV2aWV3KSkge1xuICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChyZW1vdmVkRmlsZS5wcmV2aWV3KVxuICAgIH1cblxuICAgIHRoaXMubG9nKGBSZW1vdmVkIGZpbGU6ICR7ZmlsZUlEfWApXG4gIH1cblxuICBwYXVzZVJlc3VtZSAoZmlsZUlEKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuXG4gICAgaWYgKHVwZGF0ZWRGaWxlc1tmaWxlSURdLnVwbG9hZENvbXBsZXRlKSByZXR1cm5cblxuICAgIGNvbnN0IHdhc1BhdXNlZCA9IHVwZGF0ZWRGaWxlc1tmaWxlSURdLmlzUGF1c2VkIHx8IGZhbHNlXG4gICAgY29uc3QgaXNQYXVzZWQgPSAhd2FzUGF1c2VkXG5cbiAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLCB7XG4gICAgICBpc1BhdXNlZDogaXNQYXVzZWRcbiAgICB9KVxuXG4gICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSB1cGRhdGVkRmlsZVxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgdGhpcy5lbWl0KCd1cGxvYWQtcGF1c2UnLCBmaWxlSUQsIGlzUGF1c2VkKVxuXG4gICAgcmV0dXJuIGlzUGF1c2VkXG4gIH1cblxuICBwYXVzZUFsbCAoKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgIGNvbnN0IGluUHJvZ3Jlc3NVcGRhdGVkRmlsZXMgPSBPYmplY3Qua2V5cyh1cGRhdGVkRmlsZXMpLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuICF1cGRhdGVkRmlsZXNbZmlsZV0ucHJvZ3Jlc3MudXBsb2FkQ29tcGxldGUgJiZcbiAgICAgICAgICAgICB1cGRhdGVkRmlsZXNbZmlsZV0ucHJvZ3Jlc3MudXBsb2FkU3RhcnRlZFxuICAgIH0pXG5cbiAgICBpblByb2dyZXNzVXBkYXRlZEZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVdLCB7XG4gICAgICAgIGlzUGF1c2VkOiB0cnVlXG4gICAgICB9KVxuICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdID0gdXBkYXRlZEZpbGVcbiAgICB9KVxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgdGhpcy5lbWl0KCdwYXVzZS1hbGwnKVxuICB9XG5cbiAgcmVzdW1lQWxsICgpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgaW5Qcm9ncmVzc1VwZGF0ZWRGaWxlcyA9IE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gIXVwZGF0ZWRGaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRDb21wbGV0ZSAmJlxuICAgICAgICAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRTdGFydGVkXG4gICAgfSlcblxuICAgIGluUHJvZ3Jlc3NVcGRhdGVkRmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZV0sIHtcbiAgICAgICAgaXNQYXVzZWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcjogbnVsbFxuICAgICAgfSlcbiAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlXSA9IHVwZGF0ZWRGaWxlXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtmaWxlczogdXBkYXRlZEZpbGVzfSlcblxuICAgIHRoaXMuZW1pdCgncmVzdW1lLWFsbCcpXG4gIH1cblxuICByZXRyeUFsbCAoKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgIGNvbnN0IGZpbGVzVG9SZXRyeSA9IE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZmlsdGVyKGZpbGUgPT4ge1xuICAgICAgcmV0dXJuIHVwZGF0ZWRGaWxlc1tmaWxlXS5lcnJvclxuICAgIH0pXG5cbiAgICBmaWxlc1RvUmV0cnkuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZV0sIHtcbiAgICAgICAgaXNQYXVzZWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcjogbnVsbFxuICAgICAgfSlcbiAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlXSA9IHVwZGF0ZWRGaWxlXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGZpbGVzOiB1cGRhdGVkRmlsZXMsXG4gICAgICBlcnJvcjogbnVsbFxuICAgIH0pXG5cbiAgICB0aGlzLmVtaXQoJ3JldHJ5LWFsbCcsIGZpbGVzVG9SZXRyeSlcblxuICAgIGNvbnN0IHVwbG9hZElEID0gdGhpcy5fY3JlYXRlVXBsb2FkKGZpbGVzVG9SZXRyeSlcbiAgICByZXR1cm4gdGhpcy5fcnVuVXBsb2FkKHVwbG9hZElEKVxuICB9XG5cbiAgY2FuY2VsQWxsICgpIHtcbiAgICB0aGlzLmVtaXQoJ2NhbmNlbC1hbGwnKVxuXG4gICAgLy8gVE9ETyBPciBzaG91bGQgd2UganVzdCBjYWxsIHJlbW92ZUZpbGUgb24gYWxsIGZpbGVzP1xuICAgIGNvbnN0IHsgY3VycmVudFVwbG9hZHMgfSA9IHRoaXMuZ2V0U3RhdGUoKVxuICAgIGNvbnN0IHVwbG9hZElEcyA9IE9iamVjdC5rZXlzKGN1cnJlbnRVcGxvYWRzKVxuXG4gICAgdXBsb2FkSURzLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICB0aGlzLl9yZW1vdmVVcGxvYWQoaWQpXG4gICAgfSlcblxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IHt9LFxuICAgICAgdG90YWxQcm9ncmVzczogMFxuICAgIH0pXG4gIH1cblxuICByZXRyeVVwbG9hZCAoZmlsZUlEKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgIGNvbnN0IHVwZGF0ZWRGaWxlID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0sXG4gICAgICB7IGVycm9yOiBudWxsLCBpc1BhdXNlZDogZmFsc2UgfVxuICAgIClcbiAgICB1cGRhdGVkRmlsZXNbZmlsZUlEXSA9IHVwZGF0ZWRGaWxlXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgfSlcblxuICAgIHRoaXMuZW1pdCgndXBsb2FkLXJldHJ5JywgZmlsZUlEKVxuXG4gICAgY29uc3QgdXBsb2FkSUQgPSB0aGlzLl9jcmVhdGVVcGxvYWQoWyBmaWxlSUQgXSlcbiAgICByZXR1cm4gdGhpcy5fcnVuVXBsb2FkKHVwbG9hZElEKVxuICB9XG5cbiAgcmVzZXQgKCkge1xuICAgIHRoaXMuY2FuY2VsQWxsKClcbiAgfVxuXG4gIF9jYWxjdWxhdGVQcm9ncmVzcyAoZmlsZSwgZGF0YSkge1xuICAgIGlmICghdGhpcy5nZXRGaWxlKGZpbGUuaWQpKSB7XG4gICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbW92ZWQ6ICR7ZmlsZS5pZH1gKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5zZXRGaWxlU3RhdGUoZmlsZS5pZCwge1xuICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0RmlsZShmaWxlLmlkKS5wcm9ncmVzcywge1xuICAgICAgICBieXRlc1VwbG9hZGVkOiBkYXRhLmJ5dGVzVXBsb2FkZWQsXG4gICAgICAgIGJ5dGVzVG90YWw6IGRhdGEuYnl0ZXNUb3RhbCxcbiAgICAgICAgcGVyY2VudGFnZTogTWF0aC5mbG9vcigoZGF0YS5ieXRlc1VwbG9hZGVkIC8gZGF0YS5ieXRlc1RvdGFsICogMTAwKS50b0ZpeGVkKDIpKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5fY2FsY3VsYXRlVG90YWxQcm9ncmVzcygpXG4gIH1cblxuICBfY2FsY3VsYXRlVG90YWxQcm9ncmVzcyAoKSB7XG4gICAgLy8gY2FsY3VsYXRlIHRvdGFsIHByb2dyZXNzLCB1c2luZyB0aGUgbnVtYmVyIG9mIGZpbGVzIGN1cnJlbnRseSB1cGxvYWRpbmcsXG4gICAgLy8gbXVsdGlwbGllZCBieSAxMDAgYW5kIHRoZSBzdW1tIG9mIGluZGl2aWR1YWwgcHJvZ3Jlc3Mgb2YgZWFjaCBmaWxlXG4gICAgY29uc3QgZmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG5cbiAgICBjb25zdCBpblByb2dyZXNzID0gT2JqZWN0LmtleXMoZmlsZXMpLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuIGZpbGVzW2ZpbGVdLnByb2dyZXNzLnVwbG9hZFN0YXJ0ZWRcbiAgICB9KVxuICAgIGNvbnN0IHByb2dyZXNzTWF4ID0gaW5Qcm9ncmVzcy5sZW5ndGggKiAxMDBcbiAgICBsZXQgcHJvZ3Jlc3NBbGwgPSAwXG4gICAgaW5Qcm9ncmVzcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBwcm9ncmVzc0FsbCA9IHByb2dyZXNzQWxsICsgZmlsZXNbZmlsZV0ucHJvZ3Jlc3MucGVyY2VudGFnZVxuICAgIH0pXG5cbiAgICBjb25zdCB0b3RhbFByb2dyZXNzID0gcHJvZ3Jlc3NNYXggPT09IDAgPyAwIDogTWF0aC5mbG9vcigocHJvZ3Jlc3NBbGwgKiAxMDAgLyBwcm9ncmVzc01heCkudG9GaXhlZCgyKSlcblxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgdG90YWxQcm9ncmVzczogdG90YWxQcm9ncmVzc1xuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGxpc3RlbmVycyBmb3IgYWxsIGdsb2JhbCBhY3Rpb25zLCBsaWtlOlxuICAgKiBgZXJyb3JgLCBgZmlsZS1yZW1vdmVkYCwgYHVwbG9hZC1wcm9ncmVzc2BcbiAgICpcbiAgICovXG4gIGFjdGlvbnMgKCkge1xuICAgIC8vIGNvbnN0IGxvZyA9IHRoaXMubG9nXG4gICAgLy8gdGhpcy5vbignKicsIGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgLy8gICBsb2coYFtDb3JlXSBFdmVudDogJHt0aGlzLmV2ZW50fWApXG4gICAgLy8gICBsb2cocGF5bG9hZClcbiAgICAvLyB9KVxuXG4gICAgLy8gc3RyZXNzLXRlc3QgcmUtcmVuZGVyaW5nXG4gICAgLy8gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgIC8vICAgdGhpcy5zZXRTdGF0ZSh7YmxhOiAnYmxhJ30pXG4gICAgLy8gfSwgMjApXG5cbiAgICB0aGlzLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pXG4gICAgfSlcblxuICAgIHRoaXMub24oJ3VwbG9hZC1lcnJvcicsIChmaWxlLCBlcnJvcikgPT4ge1xuICAgICAgdGhpcy5zZXRGaWxlU3RhdGUoZmlsZS5pZCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KVxuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pXG5cbiAgICAgIGxldCBtZXNzYWdlID0gYEZhaWxlZCB0byB1cGxvYWQgJHtmaWxlLm5hbWV9YFxuICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgZXJyb3IubWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlID0geyBtZXNzYWdlOiBtZXNzYWdlLCBkZXRhaWxzOiBlcnJvci5tZXNzYWdlIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuaW5mbyhtZXNzYWdlLCAnZXJyb3InLCA1MDAwKVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCd1cGxvYWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLnNldFN0YXRlKHsgZXJyb3I6IG51bGwgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigndXBsb2FkLXN0YXJ0ZWQnLCAoZmlsZSwgdXBsb2FkKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuZ2V0RmlsZShmaWxlLmlkKSkge1xuICAgICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbW92ZWQ6ICR7ZmlsZS5pZH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0RmlsZVN0YXRlKGZpbGUuaWQsIHtcbiAgICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0RmlsZShmaWxlLmlkKSwge1xuICAgICAgICAgIHVwbG9hZFN0YXJ0ZWQ6IERhdGUubm93KCksXG4gICAgICAgICAgdXBsb2FkQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgIHBlcmNlbnRhZ2U6IDAsXG4gICAgICAgICAgYnl0ZXNVcGxvYWRlZDogMCxcbiAgICAgICAgICBieXRlc1RvdGFsOiBmaWxlLnNpemVcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIHVwbG9hZCBwcm9ncmVzcyBldmVudHMgY2FuIG9jY3VyIGZyZXF1ZW50bHksIGVzcGVjaWFsbHkgd2hlbiB5b3UgaGF2ZSBhIGdvb2RcbiAgICAvLyBjb25uZWN0aW9uIHRvIHRoZSByZW1vdGUgc2VydmVyLiBUaGVyZWZvcmUsIHdlIGFyZSB0aHJvdHRlbGluZyB0aGVtIHRvXG4gICAgLy8gcHJldmVudCBhY2Nlc3NpdmUgZnVuY3Rpb24gY2FsbHMuXG4gICAgLy8gc2VlIGFsc286IGh0dHBzOi8vZ2l0aHViLmNvbS90dXMvdHVzLWpzLWNsaWVudC9jb21taXQvOTk0MGYyN2IyMzYxZmQ3ZTEwYmE1OGIwOWI2MGQ4MjQyMjE4M2JiYlxuICAgIGNvbnN0IF90aHJvdHRsZWRDYWxjdWxhdGVQcm9ncmVzcyA9IHRocm90dGxlKHRoaXMuX2NhbGN1bGF0ZVByb2dyZXNzLCAxMDAsIHsgbGVhZGluZzogdHJ1ZSwgdHJhaWxpbmc6IHRydWUgfSlcblxuICAgIHRoaXMub24oJ3VwbG9hZC1wcm9ncmVzcycsIF90aHJvdHRsZWRDYWxjdWxhdGVQcm9ncmVzcylcblxuICAgIHRoaXMub24oJ3VwbG9hZC1zdWNjZXNzJywgKGZpbGUsIHVwbG9hZFJlc3AsIHVwbG9hZFVSTCkgPT4ge1xuICAgICAgdGhpcy5zZXRGaWxlU3RhdGUoZmlsZS5pZCwge1xuICAgICAgICBwcm9ncmVzczogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRGaWxlKGZpbGUuaWQpLnByb2dyZXNzLCB7XG4gICAgICAgICAgdXBsb2FkQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgcGVyY2VudGFnZTogMTAwXG4gICAgICAgIH0pLFxuICAgICAgICB1cGxvYWRVUkw6IHVwbG9hZFVSTCxcbiAgICAgICAgaXNQYXVzZWQ6IGZhbHNlXG4gICAgICB9KVxuXG4gICAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncHJlcHJvY2Vzcy1wcm9ncmVzcycsIChmaWxlLCBwcm9ncmVzcykgPT4ge1xuICAgICAgaWYgKCF0aGlzLmdldEZpbGUoZmlsZS5pZCkpIHtcbiAgICAgICAgdGhpcy5sb2coYE5vdCBzZXR0aW5nIHByb2dyZXNzIGZvciBhIGZpbGUgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke2ZpbGUuaWR9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldEZpbGUoZmlsZS5pZCkucHJvZ3Jlc3MsIHtcbiAgICAgICAgICBwcmVwcm9jZXNzOiBwcm9ncmVzc1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncHJlcHJvY2Vzcy1jb21wbGV0ZScsIChmaWxlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuZ2V0RmlsZShmaWxlLmlkKSkge1xuICAgICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbW92ZWQ6ICR7ZmlsZS5pZH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGNvbnN0IGZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgICAgZmlsZXNbZmlsZS5pZF0gPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlLmlkXSwge1xuICAgICAgICBwcm9ncmVzczogT2JqZWN0LmFzc2lnbih7fSwgZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MpXG4gICAgICB9KVxuICAgICAgZGVsZXRlIGZpbGVzW2ZpbGUuaWRdLnByb2dyZXNzLnByZXByb2Nlc3NcblxuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGZpbGVzOiBmaWxlcyB9KVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCdwb3N0cHJvY2Vzcy1wcm9ncmVzcycsIChmaWxlLCBwcm9ncmVzcykgPT4ge1xuICAgICAgaWYgKCF0aGlzLmdldEZpbGUoZmlsZS5pZCkpIHtcbiAgICAgICAgdGhpcy5sb2coYE5vdCBzZXR0aW5nIHByb2dyZXNzIGZvciBhIGZpbGUgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke2ZpbGUuaWR9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MsIHtcbiAgICAgICAgICBwb3N0cHJvY2VzczogcHJvZ3Jlc3NcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHRoaXMub24oJ3Bvc3Rwcm9jZXNzLWNvbXBsZXRlJywgKGZpbGUpID0+IHtcbiAgICAgIGlmICghdGhpcy5nZXRGaWxlKGZpbGUuaWQpKSB7XG4gICAgICAgIHRoaXMubG9nKGBOb3Qgc2V0dGluZyBwcm9ncmVzcyBmb3IgYSBmaWxlIHRoYXQgaGFzIGJlZW4gcmVtb3ZlZDogJHtmaWxlLmlkfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY29uc3QgZmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgICBmaWxlc1tmaWxlLmlkXSA9IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzW2ZpbGUuaWRdLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlLmlkXS5wcm9ncmVzcylcbiAgICAgIH0pXG4gICAgICBkZWxldGUgZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MucG9zdHByb2Nlc3NcbiAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHNldCBzb21lIGtpbmQgb2YgYGZ1bGx5Q29tcGxldGVgIHByb3BlcnR5IG9uIHRoZSBmaWxlIG9iamVjdFxuICAgICAgLy8gc28gaXQncyBlYXNpZXIgdG8gc2VlIHRoYXQgdGhlIGZpbGUgaXMgdXBsb2Fk4oCmZnVsbHkgY29tcGxldGXigKZyYXRoZXIgdGhhblxuICAgICAgLy8gd2hhdCB3ZSBoYXZlIHRvIGRvIG5vdyAoYHVwbG9hZENvbXBsZXRlICYmICFwb3N0cHJvY2Vzc2ApXG5cbiAgICAgIHRoaXMuc2V0U3RhdGUoeyBmaWxlczogZmlsZXMgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncmVzdG9yZWQnLCAoKSA9PiB7XG4gICAgICAvLyBGaWxlcyBtYXkgaGF2ZSBjaGFuZ2VkLS1lbnN1cmUgcHJvZ3Jlc3MgaXMgc3RpbGwgYWNjdXJhdGUuXG4gICAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB9KVxuXG4gICAgLy8gc2hvdyBpbmZvcm1lciBpZiBvZmZsaW5lXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25saW5lJywgKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSlcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvZmZsaW5lJywgKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSlcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSwgMzAwMClcbiAgICB9XG4gIH1cblxuICB1cGRhdGVPbmxpbmVTdGF0dXMgKCkge1xuICAgIGNvbnN0IG9ubGluZSA9XG4gICAgICB0eXBlb2Ygd2luZG93Lm5hdmlnYXRvci5vbkxpbmUgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gd2luZG93Lm5hdmlnYXRvci5vbkxpbmVcbiAgICAgICAgOiB0cnVlXG4gICAgaWYgKCFvbmxpbmUpIHtcbiAgICAgIHRoaXMuZW1pdCgnaXMtb2ZmbGluZScpXG4gICAgICB0aGlzLmluZm8oJ05vIGludGVybmV0IGNvbm5lY3Rpb24nLCAnZXJyb3InLCAwKVxuICAgICAgdGhpcy53YXNPZmZsaW5lID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVtaXQoJ2lzLW9ubGluZScpXG4gICAgICBpZiAodGhpcy53YXNPZmZsaW5lKSB7XG4gICAgICAgIHRoaXMuZW1pdCgnYmFjay1vbmxpbmUnKVxuICAgICAgICB0aGlzLmluZm8oJ0Nvbm5lY3RlZCEnLCAnc3VjY2VzcycsIDMwMDApXG4gICAgICAgIHRoaXMud2FzT2ZmbGluZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0SUQgKCkge1xuICAgIHJldHVybiB0aGlzLm9wdHMuaWRcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBwbHVnaW4gd2l0aCBDb3JlLlxuICAgKlxuICAgKiBAcGFyYW0ge0NsYXNzfSBQbHVnaW4gb2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9iamVjdCB0aGF0IHdpbGwgYmUgcGFzc2VkIHRvIFBsdWdpbiBsYXRlclxuICAgKiBAcmV0dXJuIHtPYmplY3R9IHNlbGYgZm9yIGNoYWluaW5nXG4gICAqL1xuICB1c2UgKFBsdWdpbiwgb3B0cykge1xuICAgIGlmICh0eXBlb2YgUGx1Z2luICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBsZXQgbXNnID0gYEV4cGVjdGVkIGEgcGx1Z2luIGNsYXNzLCBidXQgZ290ICR7UGx1Z2luID09PSBudWxsID8gJ251bGwnIDogdHlwZW9mIFBsdWdpbn0uYCArXG4gICAgICAgICcgUGxlYXNlIHZlcmlmeSB0aGF0IHRoZSBwbHVnaW4gd2FzIGltcG9ydGVkIGFuZCBzcGVsbGVkIGNvcnJlY3RseS4nXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1zZylcbiAgICB9XG5cbiAgICAvLyBJbnN0YW50aWF0ZVxuICAgIGNvbnN0IHBsdWdpbiA9IG5ldyBQbHVnaW4odGhpcywgb3B0cylcbiAgICBjb25zdCBwbHVnaW5JZCA9IHBsdWdpbi5pZFxuICAgIHRoaXMucGx1Z2luc1twbHVnaW4udHlwZV0gPSB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdIHx8IFtdXG5cbiAgICBpZiAoIXBsdWdpbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdXIgcGx1Z2luIG11c3QgaGF2ZSBhbiBpZCcpXG4gICAgfVxuXG4gICAgaWYgKCFwbHVnaW4udHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3VyIHBsdWdpbiBtdXN0IGhhdmUgYSB0eXBlJylcbiAgICB9XG5cbiAgICBsZXQgZXhpc3RzUGx1Z2luQWxyZWFkeSA9IHRoaXMuZ2V0UGx1Z2luKHBsdWdpbklkKVxuICAgIGlmIChleGlzdHNQbHVnaW5BbHJlYWR5KSB7XG4gICAgICBsZXQgbXNnID0gYEFscmVhZHkgZm91bmQgYSBwbHVnaW4gbmFtZWQgJyR7ZXhpc3RzUGx1Z2luQWxyZWFkeS5pZH0nLlxuICAgICAgICBUcmllZCB0byB1c2U6ICcke3BsdWdpbklkfScuXG4gICAgICAgIFVwcHkgaXMgY3VycmVudGx5IGxpbWl0ZWQgdG8gcnVubmluZyBvbmUgb2YgZXZlcnkgcGx1Z2luLlxuICAgICAgICBTaGFyZSB5b3VyIHVzZSBjYXNlIHdpdGggdXMgb3ZlciBhdFxuICAgICAgICBodHRwczovL2dpdGh1Yi5jb20vdHJhbnNsb2FkaXQvdXBweS9pc3N1ZXMvXG4gICAgICAgIGlmIHlvdSB3YW50IHVzIHRvIHJlY29uc2lkZXIuYFxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZylcbiAgICB9XG5cbiAgICB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdLnB1c2gocGx1Z2luKVxuICAgIHBsdWdpbi5pbnN0YWxsKClcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogRmluZCBvbmUgUGx1Z2luIGJ5IG5hbWUuXG4gICAqXG4gICAqIEBwYXJhbSBzdHJpbmcgbmFtZSBkZXNjcmlwdGlvblxuICAgKi9cbiAgZ2V0UGx1Z2luIChuYW1lKSB7XG4gICAgbGV0IGZvdW5kUGx1Z2luID0gZmFsc2VcbiAgICB0aGlzLml0ZXJhdGVQbHVnaW5zKChwbHVnaW4pID0+IHtcbiAgICAgIGNvbnN0IHBsdWdpbk5hbWUgPSBwbHVnaW4uaWRcbiAgICAgIGlmIChwbHVnaW5OYW1lID09PSBuYW1lKSB7XG4gICAgICAgIGZvdW5kUGx1Z2luID0gcGx1Z2luXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvdW5kUGx1Z2luXG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSB0aHJvdWdoIGFsbCBgdXNlYGQgcGx1Z2lucy5cbiAgICpcbiAgICogQHBhcmFtIGZ1bmN0aW9uIG1ldGhvZCBkZXNjcmlwdGlvblxuICAgKi9cbiAgaXRlcmF0ZVBsdWdpbnMgKG1ldGhvZCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMucGx1Z2lucykuZm9yRWFjaChwbHVnaW5UeXBlID0+IHtcbiAgICAgIHRoaXMucGx1Z2luc1twbHVnaW5UeXBlXS5mb3JFYWNoKG1ldGhvZClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFVuaW5zdGFsbCBhbmQgcmVtb3ZlIGEgcGx1Z2luLlxuICAgKlxuICAgKiBAcGFyYW0ge1BsdWdpbn0gaW5zdGFuY2UgVGhlIHBsdWdpbiBpbnN0YW5jZSB0byByZW1vdmUuXG4gICAqL1xuICByZW1vdmVQbHVnaW4gKGluc3RhbmNlKSB7XG4gICAgY29uc3QgbGlzdCA9IHRoaXMucGx1Z2luc1tpbnN0YW5jZS50eXBlXVxuXG4gICAgaWYgKGluc3RhbmNlLnVuaW5zdGFsbCkge1xuICAgICAgaW5zdGFuY2UudW5pbnN0YWxsKClcbiAgICB9XG5cbiAgICBjb25zdCBpbmRleCA9IGxpc3QuaW5kZXhPZihpbnN0YW5jZSlcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBsaXN0LnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVW5pbnN0YWxsIGFsbCBwbHVnaW5zIGFuZCBjbG9zZSBkb3duIHRoaXMgVXBweSBpbnN0YW5jZS5cbiAgICovXG4gIGNsb3NlICgpIHtcbiAgICB0aGlzLnJlc2V0KClcblxuICAgIHRoaXMuX3N0b3JlVW5zdWJzY3JpYmUoKVxuXG4gICAgdGhpcy5pdGVyYXRlUGx1Z2lucygocGx1Z2luKSA9PiB7XG4gICAgICBwbHVnaW4udW5pbnN0YWxsKClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICogU2V0IGluZm8gbWVzc2FnZSBpbiBgc3RhdGUuaW5mb2AsIHNvIHRoYXQgVUkgcGx1Z2lucyBsaWtlIGBJbmZvcm1lcmBcbiAgKiBjYW4gZGlzcGxheSB0aGUgbWVzc2FnZS5cbiAgKlxuICAqIEBwYXJhbSB7c3RyaW5nfSBtc2cgTWVzc2FnZSB0byBiZSBkaXNwbGF5ZWQgYnkgdGhlIGluZm9ybWVyXG4gICovXG5cbiAgaW5mbyAobWVzc2FnZSwgdHlwZSA9ICdpbmZvJywgZHVyYXRpb24gPSAzMDAwKSB7XG4gICAgY29uc3QgaXNDb21wbGV4TWVzc2FnZSA9IHR5cGVvZiBtZXNzYWdlID09PSAnb2JqZWN0J1xuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBpbmZvOiB7XG4gICAgICAgIGlzSGlkZGVuOiBmYWxzZSxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgbWVzc2FnZTogaXNDb21wbGV4TWVzc2FnZSA/IG1lc3NhZ2UubWVzc2FnZSA6IG1lc3NhZ2UsXG4gICAgICAgIGRldGFpbHM6IGlzQ29tcGxleE1lc3NhZ2UgPyBtZXNzYWdlLmRldGFpbHMgOiBudWxsXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMuZW1pdCgnaW5mby12aXNpYmxlJylcblxuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5pbmZvVGltZW91dElEKVxuICAgIGlmIChkdXJhdGlvbiA9PT0gMCkge1xuICAgICAgdGhpcy5pbmZvVGltZW91dElEID0gdW5kZWZpbmVkXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBoaWRlIHRoZSBpbmZvcm1lciBhZnRlciBgZHVyYXRpb25gIG1pbGxpc2Vjb25kc1xuICAgIHRoaXMuaW5mb1RpbWVvdXRJRCA9IHNldFRpbWVvdXQodGhpcy5oaWRlSW5mbywgZHVyYXRpb24pXG4gIH1cblxuICBoaWRlSW5mbyAoKSB7XG4gICAgY29uc3QgbmV3SW5mbyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5pbmZvLCB7XG4gICAgICBpc0hpZGRlbjogdHJ1ZVxuICAgIH0pXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBpbmZvOiBuZXdJbmZvXG4gICAgfSlcbiAgICB0aGlzLmVtaXQoJ2luZm8taGlkZGVuJylcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIHN0dWZmIHRvIGNvbnNvbGUsIG9ubHkgaWYgYGRlYnVnYCBpcyBzZXQgdG8gdHJ1ZS4gU2lsZW50IGluIHByb2R1Y3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gbXNnIHRvIGxvZ1xuICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBvcHRpb25hbCBgZXJyb3JgIG9yIGB3YXJuaW5nYFxuICAgKi9cbiAgbG9nIChtc2csIHR5cGUpIHtcbiAgICBpZiAoIXRoaXMub3B0cy5kZWJ1Zykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgbGV0IG1lc3NhZ2UgPSBgW1VwcHldIFske1V0aWxzLmdldFRpbWVTdGFtcCgpfV0gJHttc2d9YFxuXG4gICAgZ2xvYmFsLnVwcHlMb2cgPSBnbG9iYWwudXBweUxvZyArICdcXG4nICsgJ0RFQlVHIExPRzogJyArIG1zZ1xuXG4gICAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICh0eXBlID09PSAnd2FybmluZycpIHtcbiAgICAgIGNvbnNvbGUud2FybihtZXNzYWdlKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKG1zZyA9PT0gYCR7bXNnfWApIHtcbiAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpXG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UgPSBgW1VwcHldIFske1V0aWxzLmdldFRpbWVTdGFtcCgpfV1gXG4gICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKVxuICAgICAgY29uc29sZS5kaXIobXNnKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBhY3Rpb25zLlxuICAgKlxuICAgKi9cbiAgcnVuICgpIHtcbiAgICB0aGlzLmxvZygnQ29yZSBpcyBydW4sIGluaXRpYWxpemluZyBhY3Rpb25zLi4uJylcbiAgICB0aGlzLmFjdGlvbnMoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXN0b3JlIGFuIHVwbG9hZCBieSBpdHMgSUQuXG4gICAqL1xuICByZXN0b3JlICh1cGxvYWRJRCkge1xuICAgIHRoaXMubG9nKGBDb3JlOiBhdHRlbXB0aW5nIHRvIHJlc3RvcmUgdXBsb2FkIFwiJHt1cGxvYWRJRH1cImApXG5cbiAgICBpZiAoIXRoaXMuZ2V0U3RhdGUoKS5jdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0pIHtcbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZCh1cGxvYWRJRClcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ05vbmV4aXN0ZW50IHVwbG9hZCcpKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9ydW5VcGxvYWQodXBsb2FkSUQpXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIHVwbG9hZCBmb3IgYSBidW5jaCBvZiBmaWxlcy5cbiAgICpcbiAgICogQHBhcmFtIHtBcnJheTxzdHJpbmc+fSBmaWxlSURzIEZpbGUgSURzIHRvIGluY2x1ZGUgaW4gdGhpcyB1cGxvYWQuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gSUQgb2YgdGhpcyB1cGxvYWQuXG4gICAqL1xuICBfY3JlYXRlVXBsb2FkIChmaWxlSURzKSB7XG4gICAgY29uc3QgdXBsb2FkSUQgPSBjdWlkKClcblxuICAgIHRoaXMuZW1pdCgndXBsb2FkJywge1xuICAgICAgaWQ6IHVwbG9hZElELFxuICAgICAgZmlsZUlEczogZmlsZUlEc1xuICAgIH0pXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHMsIHtcbiAgICAgICAgW3VwbG9hZElEXToge1xuICAgICAgICAgIGZpbGVJRHM6IGZpbGVJRHMsXG4gICAgICAgICAgc3RlcDogMCxcbiAgICAgICAgICByZXN1bHQ6IHt9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiB1cGxvYWRJRFxuICB9XG5cbiAgX2dldFVwbG9hZCAodXBsb2FkSUQpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpLmN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBkYXRhIHRvIGFuIHVwbG9hZCdzIHJlc3VsdCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJRCBUaGUgSUQgb2YgdGhlIHVwbG9hZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgRGF0YSBwcm9wZXJ0aWVzIHRvIGFkZCB0byB0aGUgcmVzdWx0IG9iamVjdC5cbiAgICovXG4gIGFkZFJlc3VsdERhdGEgKHVwbG9hZElELCBkYXRhKSB7XG4gICAgaWYgKCF0aGlzLl9nZXRVcGxvYWQodXBsb2FkSUQpKSB7XG4gICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcmVzdWx0IGZvciBhbiB1cGxvYWQgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke3VwbG9hZElEfWApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgY3VycmVudFVwbG9hZHMgPSB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHNcbiAgICBjb25zdCBjdXJyZW50VXBsb2FkID0gT2JqZWN0LmFzc2lnbih7fSwgY3VycmVudFVwbG9hZHNbdXBsb2FkSURdLCB7XG4gICAgICByZXN1bHQ6IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXS5yZXN1bHQsIGRhdGEpXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBPYmplY3QuYXNzaWduKHt9LCBjdXJyZW50VXBsb2Fkcywge1xuICAgICAgICBbdXBsb2FkSURdOiBjdXJyZW50VXBsb2FkXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFuIHVwbG9hZCwgZWcuIGlmIGl0IGhhcyBiZWVuIGNhbmNlbGVkIG9yIGNvbXBsZXRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElEIFRoZSBJRCBvZiB0aGUgdXBsb2FkLlxuICAgKi9cbiAgX3JlbW92ZVVwbG9hZCAodXBsb2FkSUQpIHtcbiAgICBjb25zdCBjdXJyZW50VXBsb2FkcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5jdXJyZW50VXBsb2FkcylcbiAgICBkZWxldGUgY3VycmVudFVwbG9hZHNbdXBsb2FkSURdXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBjdXJyZW50VXBsb2Fkc1xuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUnVuIGFuIHVwbG9hZC4gVGhpcyBwaWNrcyB1cCB3aGVyZSBpdCBsZWZ0IG9mZiBpbiBjYXNlIHRoZSB1cGxvYWQgaXMgYmVpbmcgcmVzdG9yZWQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcnVuVXBsb2FkICh1cGxvYWRJRCkge1xuICAgIGNvbnN0IHVwbG9hZERhdGEgPSB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHNbdXBsb2FkSURdXG4gICAgY29uc3QgZmlsZUlEcyA9IHVwbG9hZERhdGEuZmlsZUlEc1xuICAgIGNvbnN0IHJlc3RvcmVTdGVwID0gdXBsb2FkRGF0YS5zdGVwXG5cbiAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgIC4uLnRoaXMucHJlUHJvY2Vzc29ycyxcbiAgICAgIC4uLnRoaXMudXBsb2FkZXJzLFxuICAgICAgLi4udGhpcy5wb3N0UHJvY2Vzc29yc1xuICAgIF1cbiAgICBsZXQgbGFzdFN0ZXAgPSBQcm9taXNlLnJlc29sdmUoKVxuICAgIHN0ZXBzLmZvckVhY2goKGZuLCBzdGVwKSA9PiB7XG4gICAgICAvLyBTa2lwIHRoaXMgc3RlcCBpZiB3ZSBhcmUgcmVzdG9yaW5nIGFuZCBoYXZlIGFscmVhZHkgY29tcGxldGVkIHRoaXMgc3RlcCBiZWZvcmUuXG4gICAgICBpZiAoc3RlcCA8IHJlc3RvcmVTdGVwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBsYXN0U3RlcCA9IGxhc3RTdGVwLnRoZW4oKCkgPT4ge1xuICAgICAgICBjb25zdCB7IGN1cnJlbnRVcGxvYWRzIH0gPSB0aGlzLmdldFN0YXRlKClcbiAgICAgICAgY29uc3QgY3VycmVudFVwbG9hZCA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXSwge1xuICAgICAgICAgIHN0ZXA6IHN0ZXBcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgY3VycmVudFVwbG9hZHM6IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzLCB7XG4gICAgICAgICAgICBbdXBsb2FkSURdOiBjdXJyZW50VXBsb2FkXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLy8gVE9ETyBnaXZlIHRoaXMgdGhlIGBjdXJyZW50VXBsb2FkYCBvYmplY3QgYXMgaXRzIG9ubHkgcGFyYW1ldGVyIG1heWJlP1xuICAgICAgICAvLyBPdGhlcndpc2Ugd2hlbiBtb3JlIG1ldGFkYXRhIG1heSBiZSBhZGRlZCB0byB0aGUgdXBsb2FkIHRoaXMgd291bGQga2VlcCBnZXR0aW5nIG1vcmUgcGFyYW1ldGVyc1xuICAgICAgICByZXR1cm4gZm4oZmlsZUlEcywgdXBsb2FkSUQpXG4gICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIE5vdCByZXR1cm5pbmcgdGhlIGBjYXRjaGBlZCBwcm9taXNlLCBiZWNhdXNlIHdlIHN0aWxsIHdhbnQgdG8gcmV0dXJuIGEgcmVqZWN0ZWRcbiAgICAvLyBwcm9taXNlIGZyb20gdGhpcyBtZXRob2QgaWYgdGhlIHVwbG9hZCBmYWlsZWQuXG4gICAgbGFzdFN0ZXAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycilcblxuICAgICAgdGhpcy5fcmVtb3ZlVXBsb2FkKHVwbG9hZElEKVxuICAgIH0pXG5cbiAgICByZXR1cm4gbGFzdFN0ZXAudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IGZpbGVJRHMubWFwKChmaWxlSUQpID0+IHRoaXMuZ2V0RmlsZShmaWxlSUQpKVxuICAgICAgY29uc3Qgc3VjY2Vzc2Z1bCA9IGZpbGVzLmZpbHRlcigoZmlsZSkgPT4gZmlsZSAmJiAhZmlsZS5lcnJvcilcbiAgICAgIGNvbnN0IGZhaWxlZCA9IGZpbGVzLmZpbHRlcigoZmlsZSkgPT4gZmlsZSAmJiBmaWxlLmVycm9yKVxuICAgICAgdGhpcy5hZGRSZXN1bHREYXRhKHVwbG9hZElELCB7IHN1Y2Nlc3NmdWwsIGZhaWxlZCwgdXBsb2FkSUQgfSlcblxuICAgICAgY29uc3QgeyBjdXJyZW50VXBsb2FkcyB9ID0gdGhpcy5nZXRTdGF0ZSgpXG4gICAgICBpZiAoIWN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXSkge1xuICAgICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcmVzdWx0IGZvciBhbiB1cGxvYWQgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke3VwbG9hZElEfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBjdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0ucmVzdWx0XG4gICAgICB0aGlzLmVtaXQoJ2NvbXBsZXRlJywgcmVzdWx0KVxuXG4gICAgICB0aGlzLl9yZW1vdmVVcGxvYWQodXBsb2FkSUQpXG5cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9KVxuICB9XG5cbiAgICAvKipcbiAgICogU3RhcnQgYW4gdXBsb2FkIGZvciBhbGwgdGhlIGZpbGVzIHRoYXQgYXJlIG5vdCBjdXJyZW50bHkgYmVpbmcgdXBsb2FkZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqL1xuICB1cGxvYWQgKCkge1xuICAgIGlmICghdGhpcy5wbHVnaW5zLnVwbG9hZGVyKSB7XG4gICAgICB0aGlzLmxvZygnTm8gdXBsb2FkZXIgdHlwZSBwbHVnaW5zIGFyZSB1c2VkJywgJ3dhcm5pbmcnKVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLm9uQmVmb3JlVXBsb2FkKHRoaXMuZ2V0U3RhdGUoKS5maWxlcykpXG4gICAgICAudGhlbigoKSA9PiB0aGlzLl9jaGVja01pbk51bWJlck9mRmlsZXMoKSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgY29uc3QgeyBjdXJyZW50VXBsb2FkcyB9ID0gdGhpcy5nZXRTdGF0ZSgpXG4gICAgICAgIC8vIGdldCBhIGxpc3Qgb2YgZmlsZXMgdGhhdCBhcmUgY3VycmVudGx5IGFzc2lnbmVkIHRvIHVwbG9hZHNcbiAgICAgICAgY29uc3QgY3VycmVudGx5VXBsb2FkaW5nRmlsZXMgPSBPYmplY3Qua2V5cyhjdXJyZW50VXBsb2FkcykucmVkdWNlKChwcmV2LCBjdXJyKSA9PiBwcmV2LmNvbmNhdChjdXJyZW50VXBsb2Fkc1tjdXJyXS5maWxlSURzKSwgW10pXG5cbiAgICAgICAgY29uc3Qgd2FpdGluZ0ZpbGVJRHMgPSBbXVxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmdldFN0YXRlKCkuZmlsZXMpLmZvckVhY2goKGZpbGVJRCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmdldEZpbGUoZmlsZUlEKVxuICAgICAgICAgIC8vIGlmIHRoZSBmaWxlIGhhc24ndCBzdGFydGVkIHVwbG9hZGluZyBhbmQgaGFzbid0IGFscmVhZHkgYmVlbiBhc3NpZ25lZCB0byBhbiB1cGxvYWQuLlxuICAgICAgICAgIGlmICgoIWZpbGUucHJvZ3Jlc3MudXBsb2FkU3RhcnRlZCkgJiYgKGN1cnJlbnRseVVwbG9hZGluZ0ZpbGVzLmluZGV4T2YoZmlsZUlEKSA9PT0gLTEpKSB7XG4gICAgICAgICAgICB3YWl0aW5nRmlsZUlEcy5wdXNoKGZpbGUuaWQpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGNvbnN0IHVwbG9hZElEID0gdGhpcy5fY3JlYXRlVXBsb2FkKHdhaXRpbmdGaWxlSURzKVxuICAgICAgICByZXR1cm4gdGhpcy5fcnVuVXBsb2FkKHVwbG9hZElEKVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0eXBlb2YgZXJyID09PSAnb2JqZWN0JyA/IGVyci5tZXNzYWdlIDogZXJyXG4gICAgICAgIHRoaXMubG9nKG1lc3NhZ2UpXG4gICAgICAgIHRoaXMuaW5mbyhtZXNzYWdlLCAnZXJyb3InLCA0MDAwKVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QodHlwZW9mIGVyciA9PT0gJ29iamVjdCcgPyBlcnIgOiBuZXcgRXJyb3IoZXJyKSlcbiAgICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IFVwcHkob3B0cylcbn1cbi8vIEV4cG9zZSBjbGFzcyBjb25zdHJ1Y3Rvci5cbm1vZHVsZS5leHBvcnRzLlVwcHkgPSBVcHB5XG4iLCJjb25zdCBwcmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKVxuY29uc3QgeyBmaW5kRE9NRWxlbWVudCB9ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5cbi8qKlxuICogQm9pbGVycGxhdGUgdGhhdCBhbGwgUGx1Z2lucyBzaGFyZSAtIGFuZCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGRpcmVjdGx5LiBJdCBhbHNvIHNob3dzIHdoaWNoIG1ldGhvZHMgZmluYWwgcGx1Z2lucyBzaG91bGQgaW1wbGVtZW50L292ZXJyaWRlLFxuICogdGhpcyBkZWNpZGluZyBvbiBzdHJ1Y3R1cmUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG1haW4gVXBweSBjb3JlIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdCB3aXRoIHBsdWdpbiBvcHRpb25zXG4gKiBAcmV0dXJuIHthcnJheSB8IHN0cmluZ30gZmlsZXMgb3Igc3VjY2Vzcy9mYWlsIG1lc3NhZ2VcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHRoaXMudXBweSA9IHVwcHlcbiAgICB0aGlzLm9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcylcbiAgICB0aGlzLm1vdW50ID0gdGhpcy5tb3VudC5iaW5kKHRoaXMpXG4gICAgdGhpcy5pbnN0YWxsID0gdGhpcy5pbnN0YWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnVuaW5zdGFsbCA9IHRoaXMudW5pbnN0YWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIGdldFBsdWdpblN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy51cHB5LnN0YXRlLnBsdWdpbnNbdGhpcy5pZF1cbiAgfVxuXG4gIHNldFBsdWdpblN0YXRlICh1cGRhdGUpIHtcbiAgICBjb25zdCBwbHVnaW5zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy51cHB5LnN0YXRlLnBsdWdpbnMpXG4gICAgcGx1Z2luc1t0aGlzLmlkXSA9IE9iamVjdC5hc3NpZ24oe30sIHBsdWdpbnNbdGhpcy5pZF0sIHVwZGF0ZSlcblxuICAgIHRoaXMudXBweS5zZXRTdGF0ZSh7XG4gICAgICBwbHVnaW5zOiBwbHVnaW5zXG4gICAgfSlcbiAgfVxuXG4gIHVwZGF0ZSAoc3RhdGUpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuZWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodGhpcy51cGRhdGVVSSkge1xuICAgICAgdGhpcy51cGRhdGVVSShzdGF0ZSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgc3VwcGxpZWQgYHRhcmdldGAgaXMgYSBET00gZWxlbWVudCBvciBhbiBgb2JqZWN0YC5cbiAgICogSWYgaXTigJlzIGFuIG9iamVjdCDigJQgdGFyZ2V0IGlzIGEgcGx1Z2luLCBhbmQgd2Ugc2VhcmNoIGBwbHVnaW5zYFxuICAgKiBmb3IgYSBwbHVnaW4gd2l0aCBzYW1lIG5hbWUgYW5kIHJldHVybiBpdHMgdGFyZ2V0LlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHRhcmdldFxuICAgKlxuICAgKi9cbiAgbW91bnQgKHRhcmdldCwgcGx1Z2luKSB7XG4gICAgY29uc3QgY2FsbGVyUGx1Z2luTmFtZSA9IHBsdWdpbi5pZFxuXG4gICAgY29uc3QgdGFyZ2V0RWxlbWVudCA9IGZpbmRET01FbGVtZW50KHRhcmdldClcblxuICAgIGlmICh0YXJnZXRFbGVtZW50KSB7XG4gICAgICB0aGlzLnVwZGF0ZVVJID0gKHN0YXRlKSA9PiB7XG4gICAgICAgIHRoaXMuZWwgPSBwcmVhY3QucmVuZGVyKHRoaXMucmVuZGVyKHN0YXRlKSwgdGFyZ2V0RWxlbWVudCwgdGhpcy5lbClcbiAgICAgIH1cblxuICAgICAgdGhpcy51cHB5LmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvIGEgRE9NIGVsZW1lbnRgKVxuXG4gICAgICAvLyBjbGVhciBldmVyeXRoaW5nIGluc2lkZSB0aGUgdGFyZ2V0IGNvbnRhaW5lclxuICAgICAgaWYgKHRoaXMub3B0cy5yZXBsYWNlVGFyZ2V0Q29udGVudCkge1xuICAgICAgICB0YXJnZXRFbGVtZW50LmlubmVySFRNTCA9ICcnXG4gICAgICB9XG5cbiAgICAgIHRoaXMuZWwgPSBwcmVhY3QucmVuZGVyKHRoaXMucmVuZGVyKHRoaXMudXBweS5zdGF0ZSksIHRhcmdldEVsZW1lbnQpXG5cbiAgICAgIHJldHVybiB0aGlzLmVsXG4gICAgfVxuXG4gICAgbGV0IHRhcmdldFBsdWdpblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0JyAmJiB0YXJnZXQgaW5zdGFuY2VvZiBQbHVnaW4pIHtcbiAgICAgIC8vIFRhcmdldGluZyBhIHBsdWdpbiAqaW5zdGFuY2UqXG4gICAgICB0YXJnZXRQbHVnaW4gPSB0YXJnZXRcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIFRhcmdldGluZyBhIHBsdWdpbiB0eXBlXG4gICAgICBjb25zdCBUYXJnZXQgPSB0YXJnZXRcbiAgICAgIC8vIEZpbmQgdGhlIHRhcmdldCBwbHVnaW4gaW5zdGFuY2UuXG4gICAgICB0aGlzLnVwcHkuaXRlcmF0ZVBsdWdpbnMoKHBsdWdpbikgPT4ge1xuICAgICAgICBpZiAocGx1Z2luIGluc3RhbmNlb2YgVGFyZ2V0KSB7XG4gICAgICAgICAgdGFyZ2V0UGx1Z2luID0gcGx1Z2luXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKHRhcmdldFBsdWdpbikge1xuICAgICAgY29uc3QgdGFyZ2V0UGx1Z2luTmFtZSA9IHRhcmdldFBsdWdpbi5pZFxuICAgICAgdGhpcy51cHB5LmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvICR7dGFyZ2V0UGx1Z2luTmFtZX1gKVxuICAgICAgdGhpcy5lbCA9IHRhcmdldFBsdWdpbi5hZGRUYXJnZXQocGx1Z2luKVxuICAgICAgcmV0dXJuIHRoaXMuZWxcbiAgICB9XG5cbiAgICB0aGlzLnVwcHkubG9nKGBOb3QgaW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9YClcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdGFyZ2V0IG9wdGlvbiBnaXZlbiB0byAke2NhbGxlclBsdWdpbk5hbWV9YClcbiAgfVxuXG4gIHJlbmRlciAoc3RhdGUpIHtcbiAgICB0aHJvdyAobmV3IEVycm9yKCdFeHRlbmQgdGhlIHJlbmRlciBtZXRob2QgdG8gYWRkIHlvdXIgcGx1Z2luIHRvIGEgRE9NIGVsZW1lbnQnKSlcbiAgfVxuXG4gIGFkZFRhcmdldCAocGx1Z2luKSB7XG4gICAgdGhyb3cgKG5ldyBFcnJvcignRXh0ZW5kIHRoZSBhZGRUYXJnZXQgbWV0aG9kIHRvIGFkZCB5b3VyIHBsdWdpbiB0byBhbm90aGVyIHBsdWdpblxcJ3MgdGFyZ2V0JykpXG4gIH1cblxuICB1bm1vdW50ICgpIHtcbiAgICBpZiAodGhpcy5lbCAmJiB0aGlzLmVsLnBhcmVudE5vZGUpIHtcbiAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsKVxuICAgIH1cbiAgICAvLyB0aGlzLnRhcmdldCA9IG51bGxcbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuXG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudW5tb3VudCgpXG4gIH1cbn1cbiIsIi8qKlxuICogVHJhbnNsYXRlcyBzdHJpbmdzIHdpdGggaW50ZXJwb2xhdGlvbiAmIHBsdXJhbGl6YXRpb24gc3VwcG9ydC5cbiAqIEV4dGVuc2libGUgd2l0aCBjdXN0b20gZGljdGlvbmFyaWVzIGFuZCBwbHVyYWxpemF0aW9uIGZ1bmN0aW9ucy5cbiAqXG4gKiBCb3Jyb3dzIGhlYXZpbHkgZnJvbSBhbmQgaW5zcGlyZWQgYnkgUG9seWdsb3QgaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcyxcbiAqIGJhc2ljYWxseSBhIHN0cmlwcGVkLWRvd24gdmVyc2lvbiBvZiBpdC4gRGlmZmVyZW5jZXM6IHBsdXJhbGl6YXRpb24gZnVuY3Rpb25zIGFyZSBub3QgaGFyZGNvZGVkXG4gKiBhbmQgY2FuIGJlIGVhc2lseSBhZGRlZCBhbW9uZyB3aXRoIGRpY3Rpb25hcmllcywgbmVzdGVkIG9iamVjdHMgYXJlIHVzZWQgZm9yIHBsdXJhbGl6YXRpb25cbiAqIGFzIG9wcG9zZWQgdG8gYHx8fHxgIGRlbGltZXRlclxuICpcbiAqIFVzYWdlIGV4YW1wbGU6IGB0cmFuc2xhdG9yLnRyYW5zbGF0ZSgnZmlsZXNfY2hvc2VuJywge3NtYXJ0X2NvdW50OiAzfSlgXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBUcmFuc2xhdG9yIHtcbiAgY29uc3RydWN0b3IgKG9wdHMpIHtcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIGxvY2FsZToge1xuICAgICAgICBzdHJpbmdzOiB7fSxcbiAgICAgICAgcGx1cmFsaXplOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgIGlmIChuID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gMFxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gMVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG4gICAgdGhpcy5sb2NhbGUgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucy5sb2NhbGUsIG9wdHMubG9jYWxlKVxuXG4gICAgLy8gY29uc29sZS5sb2codGhpcy5vcHRzLmxvY2FsZSlcblxuICAgIC8vIHRoaXMubG9jYWxlLnBsdXJhbGl6ZSA9IHRoaXMubG9jYWxlID8gdGhpcy5sb2NhbGUucGx1cmFsaXplIDogZGVmYXVsdFBsdXJhbGl6ZVxuICAgIC8vIHRoaXMubG9jYWxlLnN0cmluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBlbl9VUy5zdHJpbmdzLCB0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3MpXG4gIH1cblxuLyoqXG4gKiBUYWtlcyBhIHN0cmluZyB3aXRoIHBsYWNlaG9sZGVyIHZhcmlhYmxlcyBsaWtlIGAle3NtYXJ0X2NvdW50fSBmaWxlIHNlbGVjdGVkYFxuICogYW5kIHJlcGxhY2VzIGl0IHdpdGggdmFsdWVzIGZyb20gb3B0aW9ucyBge3NtYXJ0X2NvdW50OiA1fWBcbiAqXG4gKiBAbGljZW5zZSBodHRwczovL2dpdGh1Yi5jb20vYWlyYm5iL3BvbHlnbG90LmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAqIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcy9ibG9iL21hc3Rlci9saWIvcG9seWdsb3QuanMjTDI5OVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwaHJhc2UgdGhhdCBuZWVkcyBpbnRlcnBvbGF0aW9uLCB3aXRoIHBsYWNlaG9sZGVyc1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgd2l0aCB2YWx1ZXMgdGhhdCB3aWxsIGJlIHVzZWQgdG8gcmVwbGFjZSBwbGFjZWhvbGRlcnNcbiAqIEByZXR1cm4ge3N0cmluZ30gaW50ZXJwb2xhdGVkXG4gKi9cbiAgaW50ZXJwb2xhdGUgKHBocmFzZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2VcbiAgICBjb25zdCBkb2xsYXJSZWdleCA9IC9cXCQvZ1xuICAgIGNvbnN0IGRvbGxhckJpbGxzWWFsbCA9ICckJCQkJ1xuXG4gICAgZm9yIChsZXQgYXJnIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmIChhcmcgIT09ICdfJyAmJiBvcHRpb25zLmhhc093blByb3BlcnR5KGFyZykpIHtcbiAgICAgICAgLy8gRW5zdXJlIHJlcGxhY2VtZW50IHZhbHVlIGlzIGVzY2FwZWQgdG8gcHJldmVudCBzcGVjaWFsICQtcHJlZml4ZWRcbiAgICAgICAgLy8gcmVnZXggcmVwbGFjZSB0b2tlbnMuIHRoZSBcIiQkJCRcIiBpcyBuZWVkZWQgYmVjYXVzZSBlYWNoIFwiJFwiIG5lZWRzIHRvXG4gICAgICAgIC8vIGJlIGVzY2FwZWQgd2l0aCBcIiRcIiBpdHNlbGYsIGFuZCB3ZSBuZWVkIHR3byBpbiB0aGUgcmVzdWx0aW5nIG91dHB1dC5cbiAgICAgICAgdmFyIHJlcGxhY2VtZW50ID0gb3B0aW9uc1thcmddXG4gICAgICAgIGlmICh0eXBlb2YgcmVwbGFjZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmVwbGFjZW1lbnQgPSByZXBsYWNlLmNhbGwob3B0aW9uc1thcmddLCBkb2xsYXJSZWdleCwgZG9sbGFyQmlsbHNZYWxsKVxuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGNyZWF0ZSBhIG5ldyBgUmVnRXhwYCBlYWNoIHRpbWUgaW5zdGVhZCBvZiB1c2luZyBhIG1vcmUtZWZmaWNpZW50XG4gICAgICAgIC8vIHN0cmluZyByZXBsYWNlIHNvIHRoYXQgdGhlIHNhbWUgYXJndW1lbnQgY2FuIGJlIHJlcGxhY2VkIG11bHRpcGxlIHRpbWVzXG4gICAgICAgIC8vIGluIHRoZSBzYW1lIHBocmFzZS5cbiAgICAgICAgcGhyYXNlID0gcmVwbGFjZS5jYWxsKHBocmFzZSwgbmV3IFJlZ0V4cCgnJVxcXFx7JyArIGFyZyArICdcXFxcfScsICdnJyksIHJlcGxhY2VtZW50KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGhyYXNlXG4gIH1cblxuLyoqXG4gKiBQdWJsaWMgdHJhbnNsYXRlIG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHdpdGggdmFsdWVzIHRoYXQgd2lsbCBiZSB1c2VkIGxhdGVyIHRvIHJlcGxhY2UgcGxhY2Vob2xkZXJzIGluIHN0cmluZ1xuICogQHJldHVybiB7c3RyaW5nfSB0cmFuc2xhdGVkIChhbmQgaW50ZXJwb2xhdGVkKVxuICovXG4gIHRyYW5zbGF0ZSAoa2V5LCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5zbWFydF9jb3VudCkge1xuICAgICAgdmFyIHBsdXJhbCA9IHRoaXMubG9jYWxlLnBsdXJhbGl6ZShvcHRpb25zLnNtYXJ0X2NvdW50KVxuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJwb2xhdGUodGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzW2tleV1bcGx1cmFsXSwgb3B0aW9ucylcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5pbnRlcnBvbGF0ZSh0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3Nba2V5XSwgb3B0aW9ucylcbiAgfVxufVxuIiwiY29uc3QgZWUgPSByZXF1aXJlKCduYW1lc3BhY2UtZW1pdHRlcicpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVXBweVNvY2tldCB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSBbXVxuICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB0aGlzLnNvY2tldCA9IG5ldyBXZWJTb2NrZXQob3B0cy50YXJnZXQpXG4gICAgdGhpcy5lbWl0dGVyID0gZWUoKVxuXG4gICAgdGhpcy5zb2NrZXQub25vcGVuID0gKGUpID0+IHtcbiAgICAgIHRoaXMuaXNPcGVuID0gdHJ1ZVxuXG4gICAgICB3aGlsZSAodGhpcy5xdWV1ZWQubGVuZ3RoID4gMCAmJiB0aGlzLmlzT3Blbikge1xuICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXMucXVldWVkWzBdXG4gICAgICAgIHRoaXMuc2VuZChmaXJzdC5hY3Rpb24sIGZpcnN0LnBheWxvYWQpXG4gICAgICAgIHRoaXMucXVldWVkID0gdGhpcy5xdWV1ZWQuc2xpY2UoMSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNvY2tldC5vbmNsb3NlID0gKGUpID0+IHtcbiAgICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLl9oYW5kbGVNZXNzYWdlID0gdGhpcy5faGFuZGxlTWVzc2FnZS5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLl9oYW5kbGVNZXNzYWdlXG5cbiAgICB0aGlzLmNsb3NlID0gdGhpcy5jbG9zZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5lbWl0ID0gdGhpcy5lbWl0LmJpbmQodGhpcylcbiAgICB0aGlzLm9uID0gdGhpcy5vbi5iaW5kKHRoaXMpXG4gICAgdGhpcy5vbmNlID0gdGhpcy5vbmNlLmJpbmQodGhpcylcbiAgICB0aGlzLnNlbmQgPSB0aGlzLnNlbmQuYmluZCh0aGlzKVxuICB9XG5cbiAgY2xvc2UgKCkge1xuICAgIHJldHVybiB0aGlzLnNvY2tldC5jbG9zZSgpXG4gIH1cblxuICBzZW5kIChhY3Rpb24sIHBheWxvYWQpIHtcbiAgICAvLyBhdHRhY2ggdXVpZFxuXG4gICAgaWYgKCF0aGlzLmlzT3Blbikge1xuICAgICAgdGhpcy5xdWV1ZWQucHVzaCh7YWN0aW9uLCBwYXlsb2FkfSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgYWN0aW9uLFxuICAgICAgcGF5bG9hZFxuICAgIH0pKVxuICB9XG5cbiAgb24gKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIGNvbnNvbGUubG9nKGFjdGlvbilcbiAgICB0aGlzLmVtaXR0ZXIub24oYWN0aW9uLCBoYW5kbGVyKVxuICB9XG5cbiAgZW1pdCAoYWN0aW9uLCBwYXlsb2FkKSB7XG4gICAgY29uc29sZS5sb2coYWN0aW9uKVxuICAgIHRoaXMuZW1pdHRlci5lbWl0KGFjdGlvbiwgcGF5bG9hZClcbiAgfVxuXG4gIG9uY2UgKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIHRoaXMuZW1pdHRlci5vbmNlKGFjdGlvbiwgaGFuZGxlcilcbiAgfVxuXG4gIF9oYW5kbGVNZXNzYWdlIChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSlcbiAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpXG4gICAgICB0aGlzLmVtaXQobWVzc2FnZS5hY3Rpb24sIG1lc3NhZ2UucGF5bG9hZClcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICB9XG4gIH1cbn1cbiIsImNvbnN0IHRocm90dGxlID0gcmVxdWlyZSgnbG9kYXNoLnRocm90dGxlJylcbi8vIHdlIGlubGluZSBmaWxlLXR5cGUgbW9kdWxlLCBhcyBvcHBvc2VkIHRvIHVzaW5nIHRoZSBOUE0gdmVyc2lvbixcbi8vIGJlY2F1c2Ugb2YgdGhpcyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL2ZpbGUtdHlwZS9pc3N1ZXMvNzhcbi8vIGFuZCBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL2NvcHktdGV4dC10by1jbGlwYm9hcmQvaXNzdWVzLzVcbmNvbnN0IGZpbGVUeXBlID0gcmVxdWlyZSgnLi4vdmVuZG9yL2ZpbGUtdHlwZScpXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHNtYWxsIHV0aWxpdHkgZnVuY3Rpb25zIHRoYXQgaGVscCB3aXRoIGRvbSBtYW5pcHVsYXRpb24sIGFkZGluZyBsaXN0ZW5lcnMsXG4gKiBwcm9taXNlcyBhbmQgb3RoZXIgZ29vZCB0aGluZ3MuXG4gKlxuICogQG1vZHVsZSBVdGlsc1xuICovXG5cbmZ1bmN0aW9uIGlzVG91Y2hEZXZpY2UgKCkge1xuICByZXR1cm4gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8IC8vIHdvcmtzIG9uIG1vc3QgYnJvd3NlcnNcbiAgICAgICAgICBuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgICAvLyB3b3JrcyBvbiBJRTEwLzExIGFuZCBTdXJmYWNlXG59XG5cbmZ1bmN0aW9uIHRydW5jYXRlU3RyaW5nIChzdHIsIGxlbmd0aCkge1xuICBpZiAoc3RyLmxlbmd0aCA+IGxlbmd0aCkge1xuICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIGxlbmd0aCAvIDIpICsgJy4uLicgKyBzdHIuc3Vic3RyKHN0ci5sZW5ndGggLSBsZW5ndGggLyA0LCBzdHIubGVuZ3RoKVxuICB9XG4gIHJldHVybiBzdHJcblxuICAvLyBtb3JlIHByZWNpc2UgdmVyc2lvbiBpZiBuZWVkZWRcbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODMxNTgzXG59XG5cbmZ1bmN0aW9uIHNlY29uZHNUb1RpbWUgKHJhd1NlY29uZHMpIHtcbiAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHJhd1NlY29uZHMgLyAzNjAwKSAlIDI0XG4gIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKHJhd1NlY29uZHMgLyA2MCkgJSA2MFxuICBjb25zdCBzZWNvbmRzID0gTWF0aC5mbG9vcihyYXdTZWNvbmRzICUgNjApXG5cbiAgcmV0dXJuIHsgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMgfVxufVxuXG4vKipcbiAqIENvbnZlcnRzIGxpc3QgaW50byBhcnJheVxuKi9cbmZ1bmN0aW9uIHRvQXJyYXkgKGxpc3QpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGxpc3QgfHwgW10sIDApXG59XG5cbi8qKlxuICogUmV0dXJucyBhIHRpbWVzdGFtcCBpbiB0aGUgZm9ybWF0IG9mIGBob3VyczptaW51dGVzOnNlY29uZHNgXG4qL1xuZnVuY3Rpb24gZ2V0VGltZVN0YW1wICgpIHtcbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpXG4gIHZhciBob3VycyA9IHBhZChkYXRlLmdldEhvdXJzKCkudG9TdHJpbmcoKSlcbiAgdmFyIG1pbnV0ZXMgPSBwYWQoZGF0ZS5nZXRNaW51dGVzKCkudG9TdHJpbmcoKSlcbiAgdmFyIHNlY29uZHMgPSBwYWQoZGF0ZS5nZXRTZWNvbmRzKCkudG9TdHJpbmcoKSlcbiAgcmV0dXJuIGhvdXJzICsgJzonICsgbWludXRlcyArICc6JyArIHNlY29uZHNcbn1cblxuLyoqXG4gKiBBZGRzIHplcm8gdG8gc3RyaW5ncyBzaG9ydGVyIHRoYW4gdHdvIGNoYXJhY3RlcnNcbiovXG5mdW5jdGlvbiBwYWQgKHN0cikge1xuICByZXR1cm4gc3RyLmxlbmd0aCAhPT0gMiA/IDAgKyBzdHIgOiBzdHJcbn1cblxuLyoqXG4gKiBUYWtlcyBhIGZpbGUgb2JqZWN0IGFuZCB0dXJucyBpdCBpbnRvIGZpbGVJRCwgYnkgY29udmVydGluZyBmaWxlLm5hbWUgdG8gbG93ZXJjYXNlLFxuICogcmVtb3ZpbmcgZXh0cmEgY2hhcmFjdGVycyBhbmQgYWRkaW5nIHR5cGUsIHNpemUgYW5kIGxhc3RNb2RpZmllZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHRoZSBmaWxlSURcbiAqXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZUlEIChmaWxlKSB7XG4gIC8vIGZpbHRlciBpcyBuZWVkZWQgdG8gbm90IGpvaW4gZW1wdHkgdmFsdWVzIHdpdGggYC1gXG4gIHJldHVybiBbXG4gICAgJ3VwcHknLFxuICAgIGZpbGUubmFtZSA/IGZpbGUubmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teQS1aMC05XS9pZywgJycpIDogJycsXG4gICAgZmlsZS50eXBlLFxuICAgIGZpbGUuZGF0YS5zaXplLFxuICAgIGZpbGUuZGF0YS5sYXN0TW9kaWZpZWRcbiAgXS5maWx0ZXIodmFsID0+IHZhbCkuam9pbignLScpXG59XG5cbi8qKlxuICogUnVucyBhbiBhcnJheSBvZiBwcm9taXNlLXJldHVybmluZyBmdW5jdGlvbnMgaW4gc2VxdWVuY2UuXG4gKi9cbmZ1bmN0aW9uIHJ1blByb21pc2VTZXF1ZW5jZSAoZnVuY3Rpb25zLCAuLi5hcmdzKSB7XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKClcbiAgZnVuY3Rpb25zLmZvckVhY2goKGZ1bmMpID0+IHtcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCgpID0+IGZ1bmMoLi4uYXJncykpXG4gIH0pXG4gIHJldHVybiBwcm9taXNlXG59XG5cbmZ1bmN0aW9uIGlzUHJldmlld1N1cHBvcnRlZCAoZmlsZVR5cGUpIHtcbiAgaWYgKCFmaWxlVHlwZSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGZpbGVUeXBlU3BlY2lmaWMgPSBmaWxlVHlwZS5zcGxpdCgnLycpWzFdXG4gIC8vIGxpc3Qgb2YgaW1hZ2VzIHRoYXQgYnJvd3NlcnMgY2FuIHByZXZpZXdcbiAgaWYgKC9eKGpwZWd8Z2lmfHBuZ3xzdmd8c3ZnXFwreG1sfGJtcCkkLy50ZXN0KGZpbGVUeXBlU3BlY2lmaWMpKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuZnVuY3Rpb24gZ2V0QXJyYXlCdWZmZXIgKGNodW5rKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAvLyBlLnRhcmdldC5yZXN1bHQgaXMgYW4gQXJyYXlCdWZmZXJcbiAgICAgIHJlc29sdmUoZS50YXJnZXQucmVzdWx0KVxuICAgIH0pXG4gICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignRmlsZVJlYWRlciBlcnJvcicgKyBlcnIpXG4gICAgICByZWplY3QoZXJyKVxuICAgIH0pXG4gICAgLy8gZmlsZS10eXBlIG9ubHkgbmVlZHMgdGhlIGZpcnN0IDQxMDAgYnl0ZXNcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoY2h1bmspXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGdldEZpbGVUeXBlIChmaWxlKSB7XG4gIGNvbnN0IGV4dGVuc2lvbnNUb01pbWUgPSB7XG4gICAgJ21kJzogJ3RleHQvbWFya2Rvd24nLFxuICAgICdtYXJrZG93bic6ICd0ZXh0L21hcmtkb3duJyxcbiAgICAnbXA0JzogJ3ZpZGVvL21wNCcsXG4gICAgJ21wMyc6ICdhdWRpby9tcDMnLFxuICAgICdzdmcnOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgJ2pwZyc6ICdpbWFnZS9qcGVnJyxcbiAgICAncG5nJzogJ2ltYWdlL3BuZycsXG4gICAgJ2dpZic6ICdpbWFnZS9naWYnLFxuICAgICd5YW1sJzogJ3RleHQveWFtbCcsXG4gICAgJ3ltbCc6ICd0ZXh0L3lhbWwnXG4gIH1cblxuICBjb25zdCBmaWxlRXh0ZW5zaW9uID0gZmlsZS5uYW1lID8gZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24oZmlsZS5uYW1lKS5leHRlbnNpb24gOiBudWxsXG5cbiAgaWYgKGZpbGUuaXNSZW1vdGUpIHtcbiAgICAvLyBzb21lIHJlbW90ZSBwcm92aWRlcnMgZG8gbm90IHN1cHBvcnQgZmlsZSB0eXBlc1xuICAgIGNvbnN0IG1pbWUgPSBmaWxlLnR5cGUgPyBmaWxlLnR5cGUgOiBleHRlbnNpb25zVG9NaW1lW2ZpbGVFeHRlbnNpb25dXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShtaW1lKVxuICB9XG5cbiAgLy8gMS4gdHJ5IHRvIGRldGVybWluZSBmaWxlIHR5cGUgZnJvbSBtYWdpYyBieXRlcyB3aXRoIGZpbGUtdHlwZSBtb2R1bGVcbiAgLy8gdGhpcyBzaG91bGQgYmUgdGhlIG1vc3QgdHJ1c3R3b3J0aHkgd2F5XG4gIGNvbnN0IGNodW5rID0gZmlsZS5kYXRhLnNsaWNlKDAsIDQxMDApXG4gIHJldHVybiBnZXRBcnJheUJ1ZmZlcihjaHVuaylcbiAgICAudGhlbigoYnVmZmVyKSA9PiB7XG4gICAgICBjb25zdCB0eXBlID0gZmlsZVR5cGUoYnVmZmVyKVxuICAgICAgaWYgKHR5cGUgJiYgdHlwZS5taW1lKSB7XG4gICAgICAgIHJldHVybiB0eXBlLm1pbWVcbiAgICAgIH1cblxuICAgICAgLy8gMi4gaWYgdGhhdOKAmXMgbm8gZ29vZCwgY2hlY2sgaWYgbWltZSB0eXBlIGlzIHNldCBpbiB0aGUgZmlsZSBvYmplY3RcbiAgICAgIGlmIChmaWxlLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGZpbGUudHlwZVxuICAgICAgfVxuXG4gICAgICAvLyAzLiBpZiB0aGF04oCZcyBubyBnb29kLCBzZWUgaWYgd2UgY2FuIG1hcCBleHRlbnNpb24gdG8gYSBtaW1lIHR5cGVcbiAgICAgIGlmIChmaWxlRXh0ZW5zaW9uICYmIGV4dGVuc2lvbnNUb01pbWVbZmlsZUV4dGVuc2lvbl0pIHtcbiAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnNUb01pbWVbZmlsZUV4dGVuc2lvbl1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgYWxsIGZhaWxzLCB3ZWxsLCByZXR1cm4gZW1wdHlcbiAgICAgIHJldHVybiBudWxsXG4gICAgfSlcbiAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9KVxufVxuXG4vLyBUT0RPIENoZWNrIHdoaWNoIHR5cGVzIGFyZSBhY3R1YWxseSBzdXBwb3J0ZWQgaW4gYnJvd3NlcnMuIENocm9tZSBsaWtlcyB3ZWJtXG4vLyBmcm9tIG15IHRlc3RpbmcsIGJ1dCB3ZSBtYXkgbmVlZCBtb3JlLlxuLy8gV2UgY291bGQgdXNlIGEgbGlicmFyeSBidXQgdGhleSB0ZW5kIHRvIGNvbnRhaW4gZG96ZW5zIG9mIEtCcyBvZiBtYXBwaW5ncyxcbi8vIG1vc3Qgb2Ygd2hpY2ggd2lsbCBnbyB1bnVzZWQsIHNvIG5vdCBzdXJlIGlmIHRoYXQncyB3b3J0aCBpdC5cbmNvbnN0IG1pbWVUb0V4dGVuc2lvbnMgPSB7XG4gICd2aWRlby9vZ2cnOiAnb2d2JyxcbiAgJ2F1ZGlvL29nZyc6ICdvZ2cnLFxuICAndmlkZW8vd2VibSc6ICd3ZWJtJyxcbiAgJ2F1ZGlvL3dlYm0nOiAnd2VibScsXG4gICd2aWRlby9tcDQnOiAnbXA0JyxcbiAgJ2F1ZGlvL21wMyc6ICdtcDMnXG59XG5cbmZ1bmN0aW9uIGdldEZpbGVUeXBlRXh0ZW5zaW9uIChtaW1lVHlwZSkge1xuICByZXR1cm4gbWltZVRvRXh0ZW5zaW9uc1ttaW1lVHlwZV0gfHwgbnVsbFxufVxuXG4vKipcbiogVGFrZXMgYSBmdWxsIGZpbGVuYW1lIHN0cmluZyBhbmQgcmV0dXJucyBhbiBvYmplY3Qge25hbWUsIGV4dGVuc2lvbn1cbipcbiogQHBhcmFtIHtzdHJpbmd9IGZ1bGxGaWxlTmFtZVxuKiBAcmV0dXJuIHtvYmplY3R9IHtuYW1lLCBleHRlbnNpb259XG4qL1xuZnVuY3Rpb24gZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24gKGZ1bGxGaWxlTmFtZSkge1xuICB2YXIgcmUgPSAvKD86XFwuKFteLl0rKSk/JC9cbiAgdmFyIGZpbGVFeHQgPSByZS5leGVjKGZ1bGxGaWxlTmFtZSlbMV1cbiAgdmFyIGZpbGVOYW1lID0gZnVsbEZpbGVOYW1lLnJlcGxhY2UoJy4nICsgZmlsZUV4dCwgJycpXG4gIHJldHVybiB7XG4gICAgbmFtZTogZmlsZU5hbWUsXG4gICAgZXh0ZW5zaW9uOiBmaWxlRXh0XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIFVSTCBzdHJpbmcgaXMgYW4gb2JqZWN0IFVSTCBmcm9tIGBVUkwuY3JlYXRlT2JqZWN0VVJMYC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdFVSTCAodXJsKSB7XG4gIHJldHVybiB1cmwuaW5kZXhPZignYmxvYjonKSA9PT0gMFxufVxuXG5mdW5jdGlvbiBnZXRQcm9wb3J0aW9uYWxIZWlnaHQgKGltZywgd2lkdGgpIHtcbiAgY29uc3QgYXNwZWN0ID0gaW1nLndpZHRoIC8gaW1nLmhlaWdodFxuICByZXR1cm4gTWF0aC5yb3VuZCh3aWR0aCAvIGFzcGVjdClcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSB0aHVtYm5haWwgZm9yIHRoZSBnaXZlbiBVcHB5IGZpbGUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7e2RhdGE6IEJsb2J9fSBmaWxlXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVRodW1ibmFpbCAoZmlsZSwgdGFyZ2V0V2lkdGgpIHtcbiAgY29uc3Qgb3JpZ2luYWxVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUuZGF0YSlcbiAgY29uc3Qgb25sb2FkID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKClcbiAgICBpbWFnZS5zcmMgPSBvcmlnaW5hbFVybFxuICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob3JpZ2luYWxVcmwpXG4gICAgICByZXNvbHZlKGltYWdlKVxuICAgIH1cbiAgICBpbWFnZS5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgLy8gVGhlIG9uZXJyb3IgZXZlbnQgaXMgdG90YWxseSB1c2VsZXNzIHVuZm9ydHVuYXRlbHksIGFzIGZhciBhcyBJIGtub3dcbiAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob3JpZ2luYWxVcmwpXG4gICAgICByZWplY3QobmV3IEVycm9yKCdDb3VsZCBub3QgY3JlYXRlIHRodW1ibmFpbCcpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gb25sb2FkLnRoZW4oKGltYWdlKSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0SGVpZ2h0ID0gZ2V0UHJvcG9ydGlvbmFsSGVpZ2h0KGltYWdlLCB0YXJnZXRXaWR0aClcbiAgICBjb25zdCBjYW52YXMgPSByZXNpemVJbWFnZShpbWFnZSwgdGFyZ2V0V2lkdGgsIHRhcmdldEhlaWdodClcbiAgICByZXR1cm4gY2FudmFzVG9CbG9iKGNhbnZhcywgJ2ltYWdlL3BuZycpXG4gIH0pLnRoZW4oKGJsb2IpID0+IHtcbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKVxuICB9KVxufVxuXG4vKipcbiAqIFJlc2l6ZSBhbiBpbWFnZSB0byB0aGUgdGFyZ2V0IGB3aWR0aGAgYW5kIGBoZWlnaHRgLlxuICpcbiAqIFJldHVybnMgYSBDYW52YXMgd2l0aCB0aGUgcmVzaXplZCBpbWFnZSBvbiBpdC5cbiAqL1xuZnVuY3Rpb24gcmVzaXplSW1hZ2UgKGltYWdlLCB0YXJnZXRXaWR0aCwgdGFyZ2V0SGVpZ2h0KSB7XG4gIGxldCBzb3VyY2VXaWR0aCA9IGltYWdlLndpZHRoXG4gIGxldCBzb3VyY2VIZWlnaHQgPSBpbWFnZS5oZWlnaHRcblxuICBpZiAodGFyZ2V0SGVpZ2h0IDwgaW1hZ2UuaGVpZ2h0IC8gMikge1xuICAgIGNvbnN0IHN0ZXBzID0gTWF0aC5mbG9vcihNYXRoLmxvZyhpbWFnZS53aWR0aCAvIHRhcmdldFdpZHRoKSAvIE1hdGgubG9nKDIpKVxuICAgIGNvbnN0IHN0ZXBTY2FsZWQgPSBkb3duU2NhbGVJblN0ZXBzKGltYWdlLCBzdGVwcylcbiAgICBpbWFnZSA9IHN0ZXBTY2FsZWQuaW1hZ2VcbiAgICBzb3VyY2VXaWR0aCA9IHN0ZXBTY2FsZWQuc291cmNlV2lkdGhcbiAgICBzb3VyY2VIZWlnaHQgPSBzdGVwU2NhbGVkLnNvdXJjZUhlaWdodFxuICB9XG5cbiAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgY2FudmFzLndpZHRoID0gdGFyZ2V0V2lkdGhcbiAgY2FudmFzLmhlaWdodCA9IHRhcmdldEhlaWdodFxuXG4gIGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICBjb250ZXh0LmRyYXdJbWFnZShpbWFnZSxcbiAgICAwLCAwLCBzb3VyY2VXaWR0aCwgc291cmNlSGVpZ2h0LFxuICAgIDAsIDAsIHRhcmdldFdpZHRoLCB0YXJnZXRIZWlnaHQpXG5cbiAgcmV0dXJuIGNhbnZhc1xufVxuXG4vKipcbiAqIERvd25zY2FsZSBhbiBpbWFnZSBieSA1MCUgYHN0ZXBzYCB0aW1lcy5cbiAqL1xuZnVuY3Rpb24gZG93blNjYWxlSW5TdGVwcyAoaW1hZ2UsIHN0ZXBzKSB7XG4gIGxldCBzb3VyY2UgPSBpbWFnZVxuICBsZXQgY3VycmVudFdpZHRoID0gc291cmNlLndpZHRoXG4gIGxldCBjdXJyZW50SGVpZ2h0ID0gc291cmNlLmhlaWdodFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHM7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gICAgY29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY2FudmFzLndpZHRoID0gY3VycmVudFdpZHRoIC8gMlxuICAgIGNhbnZhcy5oZWlnaHQgPSBjdXJyZW50SGVpZ2h0IC8gMlxuICAgIGNvbnRleHQuZHJhd0ltYWdlKHNvdXJjZSxcbiAgICAgIC8vIFRoZSBlbnRpcmUgc291cmNlIGltYWdlLiBXZSBwYXNzIHdpZHRoIGFuZCBoZWlnaHQgaGVyZSxcbiAgICAgIC8vIGJlY2F1c2Ugd2UgcmV1c2UgdGhpcyBjYW52YXMsIGFuZCBzaG91bGQgb25seSBzY2FsZSBkb3duXG4gICAgICAvLyB0aGUgcGFydCBvZiB0aGUgY2FudmFzIHRoYXQgY29udGFpbnMgdGhlIHByZXZpb3VzIHNjYWxlIHN0ZXAuXG4gICAgICAwLCAwLCBjdXJyZW50V2lkdGgsIGN1cnJlbnRIZWlnaHQsXG4gICAgICAvLyBEcmF3IHRvIDUwJSBzaXplXG4gICAgICAwLCAwLCBjdXJyZW50V2lkdGggLyAyLCBjdXJyZW50SGVpZ2h0IC8gMilcbiAgICBjdXJyZW50V2lkdGggLz0gMlxuICAgIGN1cnJlbnRIZWlnaHQgLz0gMlxuICAgIHNvdXJjZSA9IGNhbnZhc1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbWFnZTogc291cmNlLFxuICAgIHNvdXJjZVdpZHRoOiBjdXJyZW50V2lkdGgsXG4gICAgc291cmNlSGVpZ2h0OiBjdXJyZW50SGVpZ2h0XG4gIH1cbn1cblxuLyoqXG4gKiBTYXZlIGEgPGNhbnZhcz4gZWxlbWVudCdzIGNvbnRlbnQgdG8gYSBCbG9iIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxDYW52YXNFbGVtZW50fSBjYW52YXNcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNhbnZhc1RvQmxvYiAoY2FudmFzLCB0eXBlLCBxdWFsaXR5KSB7XG4gIGlmIChjYW52YXMudG9CbG9iKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICBjYW52YXMudG9CbG9iKHJlc29sdmUsIHR5cGUsIHF1YWxpdHkpXG4gICAgfSlcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgcmV0dXJuIGRhdGFVUkl0b0Jsb2IoY2FudmFzLnRvRGF0YVVSTCh0eXBlLCBxdWFsaXR5KSwge30pXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGRhdGFVUkl0b0Jsb2IgKGRhdGFVUkksIG9wdHMsIHRvRmlsZSkge1xuICAvLyBnZXQgdGhlIGJhc2U2NCBkYXRhXG4gIHZhciBkYXRhID0gZGF0YVVSSS5zcGxpdCgnLCcpWzFdXG5cbiAgLy8gdXNlciBtYXkgcHJvdmlkZSBtaW1lIHR5cGUsIGlmIG5vdCBnZXQgaXQgZnJvbSBkYXRhIFVSSVxuICB2YXIgbWltZVR5cGUgPSBvcHRzLm1pbWVUeXBlIHx8IGRhdGFVUkkuc3BsaXQoJywnKVswXS5zcGxpdCgnOicpWzFdLnNwbGl0KCc7JylbMF1cblxuICAvLyBkZWZhdWx0IHRvIHBsYWluL3RleHQgaWYgZGF0YSBVUkkgaGFzIG5vIG1pbWVUeXBlXG4gIGlmIChtaW1lVHlwZSA9PSBudWxsKSB7XG4gICAgbWltZVR5cGUgPSAncGxhaW4vdGV4dCdcbiAgfVxuXG4gIHZhciBiaW5hcnkgPSBhdG9iKGRhdGEpXG4gIHZhciBhcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYmluYXJ5Lmxlbmd0aDsgaSsrKSB7XG4gICAgYXJyYXkucHVzaChiaW5hcnkuY2hhckNvZGVBdChpKSlcbiAgfVxuXG4gIC8vIENvbnZlcnQgdG8gYSBGaWxlP1xuICBpZiAodG9GaWxlKSB7XG4gICAgcmV0dXJuIG5ldyBGaWxlKFtuZXcgVWludDhBcnJheShhcnJheSldLCBvcHRzLm5hbWUgfHwgJycsIHt0eXBlOiBtaW1lVHlwZX0pXG4gIH1cblxuICByZXR1cm4gbmV3IEJsb2IoW25ldyBVaW50OEFycmF5KGFycmF5KV0sIHt0eXBlOiBtaW1lVHlwZX0pXG59XG5cbmZ1bmN0aW9uIGRhdGFVUkl0b0ZpbGUgKGRhdGFVUkksIG9wdHMpIHtcbiAgcmV0dXJuIGRhdGFVUkl0b0Jsb2IoZGF0YVVSSSwgb3B0cywgdHJ1ZSlcbn1cblxuLyoqXG4gKiBDb3BpZXMgdGV4dCB0byBjbGlwYm9hcmQgYnkgY3JlYXRpbmcgYW4gYWxtb3N0IGludmlzaWJsZSB0ZXh0YXJlYSxcbiAqIGFkZGluZyB0ZXh0IHRoZXJlLCB0aGVuIHJ1bm5pbmcgZXhlY0NvbW1hbmQoJ2NvcHknKS5cbiAqIEZhbGxzIGJhY2sgdG8gcHJvbXB0KCkgd2hlbiB0aGUgZWFzeSB3YXkgZmFpbHMgKGhlbGxvLCBTYWZhcmkhKVxuICogRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zMDgxMDMyMlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0VG9Db3B5XG4gKiBAcGFyYW0ge1N0cmluZ30gZmFsbGJhY2tTdHJpbmdcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNvcHlUb0NsaXBib2FyZCAodGV4dFRvQ29weSwgZmFsbGJhY2tTdHJpbmcpIHtcbiAgZmFsbGJhY2tTdHJpbmcgPSBmYWxsYmFja1N0cmluZyB8fCAnQ29weSB0aGUgVVJMIGJlbG93J1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRleHRBcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKVxuICAgIHRleHRBcmVhLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCB7XG4gICAgICBwb3NpdGlvbjogJ2ZpeGVkJyxcbiAgICAgIHRvcDogMCxcbiAgICAgIGxlZnQ6IDAsXG4gICAgICB3aWR0aDogJzJlbScsXG4gICAgICBoZWlnaHQ6ICcyZW0nLFxuICAgICAgcGFkZGluZzogMCxcbiAgICAgIGJvcmRlcjogJ25vbmUnLFxuICAgICAgb3V0bGluZTogJ25vbmUnLFxuICAgICAgYm94U2hhZG93OiAnbm9uZScsXG4gICAgICBiYWNrZ3JvdW5kOiAndHJhbnNwYXJlbnQnXG4gICAgfSlcblxuICAgIHRleHRBcmVhLnZhbHVlID0gdGV4dFRvQ29weVxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGV4dEFyZWEpXG4gICAgdGV4dEFyZWEuc2VsZWN0KClcblxuICAgIGNvbnN0IG1hZ2ljQ29weUZhaWxlZCA9ICgpID0+IHtcbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgICB3aW5kb3cucHJvbXB0KGZhbGxiYWNrU3RyaW5nLCB0ZXh0VG9Db3B5KVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN1Y2Nlc3NmdWwgPSBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpXG4gICAgICBpZiAoIXN1Y2Nlc3NmdWwpIHtcbiAgICAgICAgcmV0dXJuIG1hZ2ljQ29weUZhaWxlZCgnY29weSBjb21tYW5kIHVuYXZhaWxhYmxlJylcbiAgICAgIH1cbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgICByZXR1cm4gcmVzb2x2ZSgpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKVxuICAgICAgcmV0dXJuIG1hZ2ljQ29weUZhaWxlZChlcnIpXG4gICAgfVxuICB9KVxufVxuXG5mdW5jdGlvbiBnZXRTcGVlZCAoZmlsZVByb2dyZXNzKSB7XG4gIGlmICghZmlsZVByb2dyZXNzLmJ5dGVzVXBsb2FkZWQpIHJldHVybiAwXG5cbiAgY29uc3QgdGltZUVsYXBzZWQgPSAobmV3IERhdGUoKSkgLSBmaWxlUHJvZ3Jlc3MudXBsb2FkU3RhcnRlZFxuICBjb25zdCB1cGxvYWRTcGVlZCA9IGZpbGVQcm9ncmVzcy5ieXRlc1VwbG9hZGVkIC8gKHRpbWVFbGFwc2VkIC8gMTAwMClcbiAgcmV0dXJuIHVwbG9hZFNwZWVkXG59XG5cbmZ1bmN0aW9uIGdldEJ5dGVzUmVtYWluaW5nIChmaWxlUHJvZ3Jlc3MpIHtcbiAgcmV0dXJuIGZpbGVQcm9ncmVzcy5ieXRlc1RvdGFsIC0gZmlsZVByb2dyZXNzLmJ5dGVzVXBsb2FkZWRcbn1cblxuZnVuY3Rpb24gZ2V0RVRBIChmaWxlUHJvZ3Jlc3MpIHtcbiAgaWYgKCFmaWxlUHJvZ3Jlc3MuYnl0ZXNVcGxvYWRlZCkgcmV0dXJuIDBcblxuICBjb25zdCB1cGxvYWRTcGVlZCA9IGdldFNwZWVkKGZpbGVQcm9ncmVzcylcbiAgY29uc3QgYnl0ZXNSZW1haW5pbmcgPSBnZXRCeXRlc1JlbWFpbmluZyhmaWxlUHJvZ3Jlc3MpXG4gIGNvbnN0IHNlY29uZHNSZW1haW5pbmcgPSBNYXRoLnJvdW5kKGJ5dGVzUmVtYWluaW5nIC8gdXBsb2FkU3BlZWQgKiAxMCkgLyAxMFxuXG4gIHJldHVybiBzZWNvbmRzUmVtYWluaW5nXG59XG5cbmZ1bmN0aW9uIHByZXR0eUVUQSAoc2Vjb25kcykge1xuICBjb25zdCB0aW1lID0gc2Vjb25kc1RvVGltZShzZWNvbmRzKVxuXG4gIC8vIE9ubHkgZGlzcGxheSBob3VycyBhbmQgbWludXRlcyBpZiB0aGV5IGFyZSBncmVhdGVyIHRoYW4gMCBidXQgYWx3YXlzXG4gIC8vIGRpc3BsYXkgbWludXRlcyBpZiBob3VycyBpcyBiZWluZyBkaXNwbGF5ZWRcbiAgLy8gRGlzcGxheSBhIGxlYWRpbmcgemVybyBpZiB0aGUgdGhlcmUgaXMgYSBwcmVjZWRpbmcgdW5pdDogMW0gMDVzLCBidXQgNXNcbiAgY29uc3QgaG91cnNTdHIgPSB0aW1lLmhvdXJzID8gdGltZS5ob3VycyArICdoICcgOiAnJ1xuICBjb25zdCBtaW51dGVzVmFsID0gdGltZS5ob3VycyA/ICgnMCcgKyB0aW1lLm1pbnV0ZXMpLnN1YnN0cigtMikgOiB0aW1lLm1pbnV0ZXNcbiAgY29uc3QgbWludXRlc1N0ciA9IG1pbnV0ZXNWYWwgPyBtaW51dGVzVmFsICsgJ20gJyA6ICcnXG4gIGNvbnN0IHNlY29uZHNWYWwgPSBtaW51dGVzVmFsID8gKCcwJyArIHRpbWUuc2Vjb25kcykuc3Vic3RyKC0yKSA6IHRpbWUuc2Vjb25kc1xuICBjb25zdCBzZWNvbmRzU3RyID0gc2Vjb25kc1ZhbCArICdzJ1xuXG4gIHJldHVybiBgJHtob3Vyc1N0cn0ke21pbnV0ZXNTdHJ9JHtzZWNvbmRzU3RyfWBcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhbiBvYmplY3QgaXMgYSBET00gZWxlbWVudC4gRHVjay10eXBpbmcgYmFzZWQgb24gYG5vZGVUeXBlYC5cbiAqXG4gKiBAcGFyYW0geyp9IG9ialxuICovXG5mdW5jdGlvbiBpc0RPTUVsZW1lbnQgKG9iaikge1xuICByZXR1cm4gb2JqICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iai5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREVcbn1cblxuLyoqXG4gKiBGaW5kIGEgRE9NIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfHN0cmluZ30gZWxlbWVudFxuICogQHJldHVybiB7Tm9kZXxudWxsfVxuICovXG5mdW5jdGlvbiBmaW5kRE9NRWxlbWVudCAoZWxlbWVudCkge1xuICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudClcbiAgfVxuXG4gIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ29iamVjdCcgJiYgaXNET01FbGVtZW50KGVsZW1lbnQpKSB7XG4gICAgcmV0dXJuIGVsZW1lbnRcbiAgfVxufVxuXG4vKipcbiAqIEZpbmQgb25lIG9yIG1vcmUgRE9NIGVsZW1lbnRzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBlbGVtZW50XG4gKiBAcmV0dXJuIHtBcnJheXxudWxsfVxuICovXG5mdW5jdGlvbiBmaW5kQWxsRE9NRWxlbWVudHMgKGVsZW1lbnQpIHtcbiAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgIGNvbnN0IGVsZW1lbnRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGVsZW1lbnQpKVxuICAgIHJldHVybiBlbGVtZW50cy5sZW5ndGggPiAwID8gZWxlbWVudHMgOiBudWxsXG4gIH1cblxuICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdvYmplY3QnICYmIGlzRE9NRWxlbWVudChlbGVtZW50KSkge1xuICAgIHJldHVybiBbZWxlbWVudF1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTb2NrZXRIb3N0ICh1cmwpIHtcbiAgLy8gZ2V0IHRoZSBob3N0IGRvbWFpblxuICB2YXIgcmVnZXggPSAvXig/Omh0dHBzPzpcXC9cXC98XFwvXFwvKT8oPzpbXkBcXG5dK0ApPyg/Ond3d1xcLik/KFteXFxuXSspL1xuICB2YXIgaG9zdCA9IHJlZ2V4LmV4ZWModXJsKVsxXVxuICB2YXIgc29ja2V0UHJvdG9jb2wgPSBsb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgPyAnd3NzJyA6ICd3cydcblxuICByZXR1cm4gYCR7c29ja2V0UHJvdG9jb2x9Oi8vJHtob3N0fWBcbn1cblxuZnVuY3Rpb24gX2VtaXRTb2NrZXRQcm9ncmVzcyAodXBsb2FkZXIsIHByb2dyZXNzRGF0YSwgZmlsZSkge1xuICBjb25zdCB7IHByb2dyZXNzLCBieXRlc1VwbG9hZGVkLCBieXRlc1RvdGFsIH0gPSBwcm9ncmVzc0RhdGFcbiAgaWYgKHByb2dyZXNzKSB7XG4gICAgdXBsb2FkZXIudXBweS5sb2coYFVwbG9hZCBwcm9ncmVzczogJHtwcm9ncmVzc31gKVxuICAgIHVwbG9hZGVyLnVwcHkuZW1pdCgndXBsb2FkLXByb2dyZXNzJywgZmlsZSwge1xuICAgICAgdXBsb2FkZXIsXG4gICAgICBieXRlc1VwbG9hZGVkOiBieXRlc1VwbG9hZGVkLFxuICAgICAgYnl0ZXNUb3RhbDogYnl0ZXNUb3RhbFxuICAgIH0pXG4gIH1cbn1cblxuY29uc3QgZW1pdFNvY2tldFByb2dyZXNzID0gdGhyb3R0bGUoX2VtaXRTb2NrZXRQcm9ncmVzcywgMzAwLCB7bGVhZGluZzogdHJ1ZSwgdHJhaWxpbmc6IHRydWV9KVxuXG5mdW5jdGlvbiBzZXR0bGUgKHByb21pc2VzKSB7XG4gIGNvbnN0IHJlc29sdXRpb25zID0gW11cbiAgY29uc3QgcmVqZWN0aW9ucyA9IFtdXG4gIGZ1bmN0aW9uIHJlc29sdmVkICh2YWx1ZSkge1xuICAgIHJlc29sdXRpb25zLnB1c2godmFsdWUpXG4gIH1cbiAgZnVuY3Rpb24gcmVqZWN0ZWQgKGVycm9yKSB7XG4gICAgcmVqZWN0aW9ucy5wdXNoKGVycm9yKVxuICB9XG5cbiAgY29uc3Qgd2FpdCA9IFByb21pc2UuYWxsKFxuICAgIHByb21pc2VzLm1hcCgocHJvbWlzZSkgPT4gcHJvbWlzZS50aGVuKHJlc29sdmVkLCByZWplY3RlZCkpXG4gIClcblxuICByZXR1cm4gd2FpdC50aGVuKCgpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2Vzc2Z1bDogcmVzb2x1dGlvbnMsXG4gICAgICBmYWlsZWQ6IHJlamVjdGlvbnNcbiAgICB9XG4gIH0pXG59XG5cbi8qKlxuICogTGltaXQgdGhlIGFtb3VudCBvZiBzaW11bHRhbmVvdXNseSBwZW5kaW5nIFByb21pc2VzLlxuICogUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gcGFzc2VkIGEgZnVuY3Rpb24gYGZuYCxcbiAqIHdpbGwgbWFrZSBzdXJlIHRoYXQgYXQgbW9zdCBgbGltaXRgIGNhbGxzIHRvIGBmbmAgYXJlIHBlbmRpbmcuXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0XG4gKiBAcmV0dXJuIHtmdW5jdGlvbigpfVxuICovXG5mdW5jdGlvbiBsaW1pdFByb21pc2VzIChsaW1pdCkge1xuICBsZXQgcGVuZGluZyA9IDBcbiAgY29uc3QgcXVldWUgPSBbXVxuICByZXR1cm4gKGZuKSA9PiB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICBjb25zdCBjYWxsID0gKCkgPT4ge1xuICAgICAgICBwZW5kaW5nKytcbiAgICAgICAgY29uc3QgcHJvbWlzZSA9IGZuKC4uLmFyZ3MpXG4gICAgICAgIHByb21pc2UudGhlbihvbmZpbmlzaCwgb25maW5pc2gpXG4gICAgICAgIHJldHVybiBwcm9taXNlXG4gICAgICB9XG5cbiAgICAgIGlmIChwZW5kaW5nID49IGxpbWl0KSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgcXVldWUucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICBjYWxsKCkudGhlbihyZXNvbHZlLCByZWplY3QpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYWxsKClcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gb25maW5pc2ggKCkge1xuICAgIHBlbmRpbmctLVxuICAgIGNvbnN0IG5leHQgPSBxdWV1ZS5zaGlmdCgpXG4gICAgaWYgKG5leHQpIG5leHQoKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZW5lcmF0ZUZpbGVJRCxcbiAgdG9BcnJheSxcbiAgZ2V0VGltZVN0YW1wLFxuICBydW5Qcm9taXNlU2VxdWVuY2UsXG4gIGlzVG91Y2hEZXZpY2UsXG4gIGdldEZpbGVOYW1lQW5kRXh0ZW5zaW9uLFxuICB0cnVuY2F0ZVN0cmluZyxcbiAgZ2V0RmlsZVR5cGVFeHRlbnNpb24sXG4gIGdldEZpbGVUeXBlLFxuICBnZXRBcnJheUJ1ZmZlcixcbiAgaXNQcmV2aWV3U3VwcG9ydGVkLFxuICBpc09iamVjdFVSTCxcbiAgY3JlYXRlVGh1bWJuYWlsLFxuICBzZWNvbmRzVG9UaW1lLFxuICBkYXRhVVJJdG9CbG9iLFxuICBkYXRhVVJJdG9GaWxlLFxuICBjYW52YXNUb0Jsb2IsXG4gIGdldFNwZWVkLFxuICBnZXRCeXRlc1JlbWFpbmluZyxcbiAgZ2V0RVRBLFxuICBjb3B5VG9DbGlwYm9hcmQsXG4gIHByZXR0eUVUQSxcbiAgZmluZERPTUVsZW1lbnQsXG4gIGZpbmRBbGxET01FbGVtZW50cyxcbiAgZ2V0U29ja2V0SG9zdCxcbiAgZW1pdFNvY2tldFByb2dyZXNzLFxuICBzZXR0bGUsXG4gIGxpbWl0UHJvbWlzZXNcbn1cbiIsImNvbnN0IFBsdWdpbiA9IHJlcXVpcmUoJy4uL2NvcmUvUGx1Z2luJylcbmNvbnN0IHsgdG9BcnJheSB9ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5jb25zdCBUcmFuc2xhdG9yID0gcmVxdWlyZSgnLi4vY29yZS9UcmFuc2xhdG9yJylcbmNvbnN0IHsgaCB9ID0gcmVxdWlyZSgncHJlYWN0JylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBGaWxlSW5wdXQgZXh0ZW5kcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHN1cGVyKHVwcHksIG9wdHMpXG4gICAgdGhpcy5pZCA9IHRoaXMub3B0cy5pZCB8fCAnRmlsZUlucHV0J1xuICAgIHRoaXMudGl0bGUgPSAnRmlsZSBJbnB1dCdcbiAgICB0aGlzLnR5cGUgPSAnYWNxdWlyZXInXG5cbiAgICBjb25zdCBkZWZhdWx0TG9jYWxlID0ge1xuICAgICAgc3RyaW5nczoge1xuICAgICAgICBjaG9vc2VGaWxlczogJ0Nob29zZSBmaWxlcydcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIHRhcmdldDogbnVsbCxcbiAgICAgIGFsbG93TXVsdGlwbGVGaWxlczogdHJ1ZSxcbiAgICAgIHByZXR0eTogdHJ1ZSxcbiAgICAgIGlucHV0TmFtZTogJ2ZpbGVzW10nLFxuICAgICAgbG9jYWxlOiBkZWZhdWx0TG9jYWxlXG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIHRoaXMubG9jYWxlID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdExvY2FsZSwgdGhpcy5vcHRzLmxvY2FsZSlcbiAgICB0aGlzLmxvY2FsZS5zdHJpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdExvY2FsZS5zdHJpbmdzLCB0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3MpXG5cbiAgICAvLyBpMThuXG4gICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3Ioe2xvY2FsZTogdGhpcy5sb2NhbGV9KVxuICAgIHRoaXMuaTE4biA9IHRoaXMudHJhbnNsYXRvci50cmFuc2xhdGUuYmluZCh0aGlzLnRyYW5zbGF0b3IpXG5cbiAgICB0aGlzLnJlbmRlciA9IHRoaXMucmVuZGVyLmJpbmQodGhpcylcbiAgICB0aGlzLmhhbmRsZUlucHV0Q2hhbmdlID0gdGhpcy5oYW5kbGVJbnB1dENoYW5nZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5oYW5kbGVDbGljayA9IHRoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzKVxuICB9XG5cbiAgaGFuZGxlSW5wdXRDaGFuZ2UgKGV2KSB7XG4gICAgdGhpcy51cHB5LmxvZygnW0ZpbGVJbnB1dF0gU29tZXRoaW5nIHNlbGVjdGVkIHRocm91Z2ggaW5wdXQuLi4nKVxuXG4gICAgY29uc3QgZmlsZXMgPSB0b0FycmF5KGV2LnRhcmdldC5maWxlcylcblxuICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIHRoaXMudXBweS5hZGRGaWxlKHtcbiAgICAgICAgc291cmNlOiB0aGlzLmlkLFxuICAgICAgICBuYW1lOiBmaWxlLm5hbWUsXG4gICAgICAgIHR5cGU6IGZpbGUudHlwZSxcbiAgICAgICAgZGF0YTogZmlsZVxuICAgICAgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAvLyBJZ25vcmVcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGhhbmRsZUNsaWNrIChldikge1xuICAgIHRoaXMuaW5wdXQuY2xpY2soKVxuICB9XG5cbiAgcmVuZGVyIChzdGF0ZSkge1xuICAgIGNvbnN0IGhpZGRlbklucHV0U3R5bGUgPSB7XG4gICAgICB3aWR0aDogJzAuMXB4JyxcbiAgICAgIGhlaWdodDogJzAuMXB4JyxcbiAgICAgIG9wYWNpdHk6IDAsXG4gICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgIHpJbmRleDogLTFcbiAgICB9XG5cbiAgICByZXR1cm4gPGRpdiBjbGFzcz1cInVwcHkgdXBweS1GaWxlSW5wdXQtY29udGFpbmVyXCI+XG4gICAgICA8aW5wdXQgY2xhc3M9XCJ1cHB5LUZpbGVJbnB1dC1pbnB1dFwiXG4gICAgICAgIHN0eWxlPXt0aGlzLm9wdHMucHJldHR5ICYmIGhpZGRlbklucHV0U3R5bGV9XG4gICAgICAgIHR5cGU9XCJmaWxlXCJcbiAgICAgICAgbmFtZT17dGhpcy5vcHRzLmlucHV0TmFtZX1cbiAgICAgICAgb25jaGFuZ2U9e3RoaXMuaGFuZGxlSW5wdXRDaGFuZ2V9XG4gICAgICAgIG11bHRpcGxlPXt0aGlzLm9wdHMuYWxsb3dNdWx0aXBsZUZpbGVzfVxuICAgICAgICByZWY9eyhpbnB1dCkgPT4geyB0aGlzLmlucHV0ID0gaW5wdXQgfX0gLz5cbiAgICAgIHt0aGlzLm9wdHMucHJldHR5ICYmXG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJ1cHB5LUZpbGVJbnB1dC1idG5cIiB0eXBlPVwiYnV0dG9uXCIgb25jbGljaz17dGhpcy5oYW5kbGVDbGlja30+XG4gICAgICAgICAge3RoaXMuaTE4bignY2hvb3NlRmlsZXMnKX1cbiAgICAgICAgPC9idXR0b24+XG4gICAgICB9XG4gICAgPC9kaXY+XG4gIH1cblxuICBpbnN0YWxsICgpIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm9wdHMudGFyZ2V0XG4gICAgaWYgKHRhcmdldCkge1xuICAgICAgdGhpcy5tb3VudCh0YXJnZXQsIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgdW5pbnN0YWxsICgpIHtcbiAgICB0aGlzLnVubW91bnQoKVxuICB9XG59XG4iLCJjb25zdCBQbHVnaW4gPSByZXF1aXJlKCcuLi9jb3JlL1BsdWdpbicpXG5jb25zdCB7IGggfSA9IHJlcXVpcmUoJ3ByZWFjdCcpXG5cbi8qKlxuICogUHJvZ3Jlc3MgYmFyXG4gKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFByb2dyZXNzQmFyIGV4dGVuZHMgUGx1Z2luIHtcbiAgY29uc3RydWN0b3IgKHVwcHksIG9wdHMpIHtcbiAgICBzdXBlcih1cHB5LCBvcHRzKVxuICAgIHRoaXMuaWQgPSB0aGlzLm9wdHMuaWQgfHwgJ1Byb2dyZXNzQmFyJ1xuICAgIHRoaXMudGl0bGUgPSAnUHJvZ3Jlc3MgQmFyJ1xuICAgIHRoaXMudHlwZSA9ICdwcm9ncmVzc2luZGljYXRvcidcblxuICAgIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIHRhcmdldDogJ2JvZHknLFxuICAgICAgcmVwbGFjZVRhcmdldENvbnRlbnQ6IGZhbHNlLFxuICAgICAgZml4ZWQ6IGZhbHNlLFxuICAgICAgaGlkZUFmdGVyRmluaXNoOiB0cnVlXG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKVxuICB9XG5cbiAgcmVuZGVyIChzdGF0ZSkge1xuICAgIGNvbnN0IHByb2dyZXNzID0gc3RhdGUudG90YWxQcm9ncmVzcyB8fCAwXG4gICAgY29uc3QgaXNIaWRkZW4gPSBwcm9ncmVzcyA9PT0gMTAwICYmIHRoaXMub3B0cy5oaWRlQWZ0ZXJGaW5pc2hcbiAgICByZXR1cm4gPGRpdiBjbGFzcz1cInVwcHkgdXBweS1Qcm9ncmVzc0JhclwiIHN0eWxlPXt7IHBvc2l0aW9uOiB0aGlzLm9wdHMuZml4ZWQgPyAnZml4ZWQnIDogJ2luaXRpYWwnIH19IGFyaWEtaGlkZGVuPXtpc0hpZGRlbn0+XG4gICAgICA8ZGl2IGNsYXNzPVwidXBweS1Qcm9ncmVzc0Jhci1pbm5lclwiIHN0eWxlPXt7IHdpZHRoOiBwcm9ncmVzcyArICclJyB9fSAvPlxuICAgICAgPGRpdiBjbGFzcz1cInVwcHktUHJvZ3Jlc3NCYXItcGVyY2VudGFnZVwiPntwcm9ncmVzc308L2Rpdj5cbiAgICA8L2Rpdj5cbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMub3B0cy50YXJnZXRcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICB0aGlzLm1vdW50KHRhcmdldCwgdGhpcylcbiAgICB9XG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudW5tb3VudCgpXG4gIH1cbn1cbiIsImNvbnN0IFBsdWdpbiA9IHJlcXVpcmUoJy4uL2NvcmUvUGx1Z2luJylcbmNvbnN0IGN1aWQgPSByZXF1aXJlKCdjdWlkJylcbmNvbnN0IFRyYW5zbGF0b3IgPSByZXF1aXJlKCcuLi9jb3JlL1RyYW5zbGF0b3InKVxuY29uc3QgVXBweVNvY2tldCA9IHJlcXVpcmUoJy4uL2NvcmUvVXBweVNvY2tldCcpXG5jb25zdCB7XG4gIGVtaXRTb2NrZXRQcm9ncmVzcyxcbiAgZ2V0U29ja2V0SG9zdCxcbiAgc2V0dGxlLFxuICBsaW1pdFByb21pc2VzXG59ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5cbmZ1bmN0aW9uIGJ1aWxkUmVzcG9uc2VFcnJvciAoeGhyLCBlcnJvcikge1xuICAvLyBObyBlcnJvciBtZXNzYWdlXG4gIGlmICghZXJyb3IpIGVycm9yID0gbmV3IEVycm9yKCdVcGxvYWQgZXJyb3InKVxuICAvLyBHb3QgYW4gZXJyb3IgbWVzc2FnZSBzdHJpbmdcbiAgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ3N0cmluZycpIGVycm9yID0gbmV3IEVycm9yKGVycm9yKVxuICAvLyBHb3Qgc29tZXRoaW5nIGVsc2VcbiAgaWYgKCEoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikpIHtcbiAgICBlcnJvciA9IE9iamVjdC5hc3NpZ24obmV3IEVycm9yKCdVcGxvYWQgZXJyb3InKSwgeyBkYXRhOiBlcnJvciB9KVxuICB9XG5cbiAgZXJyb3IucmVxdWVzdCA9IHhoclxuICByZXR1cm4gZXJyb3Jcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBYSFJVcGxvYWQgZXh0ZW5kcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHN1cGVyKHVwcHksIG9wdHMpXG4gICAgdGhpcy50eXBlID0gJ3VwbG9hZGVyJ1xuICAgIHRoaXMuaWQgPSAnWEhSVXBsb2FkJ1xuICAgIHRoaXMudGl0bGUgPSAnWEhSVXBsb2FkJ1xuXG4gICAgY29uc3QgZGVmYXVsdExvY2FsZSA9IHtcbiAgICAgIHN0cmluZ3M6IHtcbiAgICAgICAgdGltZWRPdXQ6ICdVcGxvYWQgc3RhbGxlZCBmb3IgJXtzZWNvbmRzfSBzZWNvbmRzLCBhYm9ydGluZy4nXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICBmb3JtRGF0YTogdHJ1ZSxcbiAgICAgIGZpZWxkTmFtZTogJ2ZpbGVzW10nLFxuICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICBtZXRhRmllbGRzOiBudWxsLFxuICAgICAgcmVzcG9uc2VVcmxGaWVsZE5hbWU6ICd1cmwnLFxuICAgICAgYnVuZGxlOiBmYWxzZSxcbiAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgbG9jYWxlOiBkZWZhdWx0TG9jYWxlLFxuICAgICAgdGltZW91dDogMzAgKiAxMDAwLFxuICAgICAgbGltaXQ6IDAsXG4gICAgICAvKipcbiAgICAgICAqIEB0eXBlZGVmIHJlc3BPYmpcbiAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSByZXNwb25zZVRleHRcbiAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzdGF0dXNcbiAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzdGF0dXNUZXh0XG4gICAgICAgKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCBzdHJpbmc+fSBoZWFkZXJzXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlQ29udGVudCB0aGUgcmVzcG9uc2UgYm9keVxuICAgICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdCB8IHJlc3BPYmp9IHJlc3BvbnNlT2JqZWN0IHRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgICAqL1xuICAgICAgZ2V0UmVzcG9uc2VEYXRhIChyZXNwb25zZUNvbnRlbnQsIHJlc3BvbnNlT2JqZWN0KSB7XG4gICAgICAgIGxldCByZXNwb25zZSA9IHt9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHJlc3BvbnNlQ29udGVudClcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlXG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlQ29udGVudCB0aGUgcmVzcG9uc2UgYm9keVxuICAgICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdCB8IHJlc3BPYmp9IHJlc3BvbnNlT2JqZWN0IHRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgICAqL1xuICAgICAgZ2V0UmVzcG9uc2VFcnJvciAocmVzcG9uc2VDb250ZW50LCByZXNwb25zZU9iamVjdCkge1xuICAgICAgICByZXR1cm4gbmV3IEVycm9yKCdVcGxvYWQgZXJyb3InKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIHNldCBieSB1c2VyXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG4gICAgdGhpcy5sb2NhbGUgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0TG9jYWxlLCB0aGlzLm9wdHMubG9jYWxlKVxuICAgIHRoaXMubG9jYWxlLnN0cmluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0TG9jYWxlLnN0cmluZ3MsIHRoaXMub3B0cy5sb2NhbGUuc3RyaW5ncylcblxuICAgIC8vIGkxOG5cbiAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih7IGxvY2FsZTogdGhpcy5sb2NhbGUgfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuXG4gICAgdGhpcy5oYW5kbGVVcGxvYWQgPSB0aGlzLmhhbmRsZVVwbG9hZC5iaW5kKHRoaXMpXG5cbiAgICAvLyBTaW11bHRhbmVvdXMgdXBsb2FkIGxpbWl0aW5nIGlzIHNoYXJlZCBhY3Jvc3MgYWxsIHVwbG9hZHMgd2l0aCB0aGlzIHBsdWdpbi5cbiAgICBpZiAodHlwZW9mIHRoaXMub3B0cy5saW1pdCA9PT0gJ251bWJlcicgJiYgdGhpcy5vcHRzLmxpbWl0ICE9PSAwKSB7XG4gICAgICB0aGlzLmxpbWl0VXBsb2FkcyA9IGxpbWl0UHJvbWlzZXModGhpcy5vcHRzLmxpbWl0KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxpbWl0VXBsb2FkcyA9IChmbikgPT4gZm5cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRzLmJ1bmRsZSAmJiAhdGhpcy5vcHRzLmZvcm1EYXRhKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BvcHRzLmZvcm1EYXRhYCBtdXN0IGJlIHRydWUgd2hlbiBgb3B0cy5idW5kbGVgIGlzIGVuYWJsZWQuJylcbiAgICB9XG4gIH1cblxuICBnZXRPcHRpb25zIChmaWxlKSB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sXG4gICAgICB0aGlzLm9wdHMsXG4gICAgICB0aGlzLnVwcHkuc3RhdGUueGhyVXBsb2FkIHx8IHt9LFxuICAgICAgZmlsZS54aHJVcGxvYWQgfHwge31cbiAgICApXG4gICAgb3B0cy5oZWFkZXJzID0ge31cbiAgICBPYmplY3QuYXNzaWduKG9wdHMuaGVhZGVycywgdGhpcy5vcHRzLmhlYWRlcnMpXG4gICAgaWYgKHRoaXMudXBweS5zdGF0ZS54aHJVcGxvYWQpIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0cy5oZWFkZXJzLCB0aGlzLnVwcHkuc3RhdGUueGhyVXBsb2FkLmhlYWRlcnMpXG4gICAgfVxuICAgIGlmIChmaWxlLnhoclVwbG9hZCkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRzLmhlYWRlcnMsIGZpbGUueGhyVXBsb2FkLmhlYWRlcnMpXG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHNcbiAgfVxuXG4gIC8vIEhlbHBlciB0byBhYm9ydCB1cGxvYWQgcmVxdWVzdHMgaWYgdGhlcmUgaGFzIG5vdCBiZWVuIGFueSBwcm9ncmVzcyBmb3IgYHRpbWVvdXRgIG1zLlxuICAvLyBDcmVhdGUgYW4gaW5zdGFuY2UgdXNpbmcgYHRpbWVyID0gY3JlYXRlUHJvZ3Jlc3NUaW1lb3V0KDEwMDAwLCBvblRpbWVvdXQpYFxuICAvLyBDYWxsIGB0aW1lci5wcm9ncmVzcygpYCB0byBzaWduYWwgdGhhdCB0aGVyZSBoYXMgYmVlbiBwcm9ncmVzcyBvZiBhbnkga2luZC5cbiAgLy8gQ2FsbCBgdGltZXIuZG9uZSgpYCB3aGVuIHRoZSB1cGxvYWQgaGFzIGNvbXBsZXRlZC5cbiAgY3JlYXRlUHJvZ3Jlc3NUaW1lb3V0ICh0aW1lb3V0LCB0aW1lb3V0SGFuZGxlcikge1xuICAgIGNvbnN0IHVwcHkgPSB0aGlzLnVwcHlcbiAgICBjb25zdCBzZWxmID0gdGhpc1xuICAgIGZ1bmN0aW9uIG9uVGltZWRPdXQgKCkge1xuICAgICAgdXBweS5sb2coYFtYSFJVcGxvYWRdIHRpbWVkIG91dGApXG4gICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihzZWxmLmkxOG4oJ3RpbWVkT3V0JywgeyBzZWNvbmRzOiBNYXRoLmNlaWwodGltZW91dCAvIDEwMDApIH0pKVxuICAgICAgdGltZW91dEhhbmRsZXIoZXJyb3IpXG4gICAgfVxuXG4gICAgbGV0IGFsaXZlVGltZXIgPSBudWxsXG4gICAgZnVuY3Rpb24gcHJvZ3Jlc3MgKCkge1xuICAgICAgaWYgKHRpbWVvdXQgPiAwKSB7XG4gICAgICAgIGRvbmUoKVxuICAgICAgICBhbGl2ZVRpbWVyID0gc2V0VGltZW91dChvblRpbWVkT3V0LCB0aW1lb3V0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRvbmUgKCkge1xuICAgICAgaWYgKGFsaXZlVGltZXIpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGFsaXZlVGltZXIpXG4gICAgICAgIGFsaXZlVGltZXIgPSBudWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2dyZXNzLFxuICAgICAgZG9uZVxuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUZvcm1EYXRhVXBsb2FkIChmaWxlLCBvcHRzKSB7XG4gICAgY29uc3QgZm9ybVBvc3QgPSBuZXcgRm9ybURhdGEoKVxuXG4gICAgY29uc3QgbWV0YUZpZWxkcyA9IEFycmF5LmlzQXJyYXkob3B0cy5tZXRhRmllbGRzKVxuICAgICAgPyBvcHRzLm1ldGFGaWVsZHNcbiAgICAgIC8vIFNlbmQgYWxvbmcgYWxsIGZpZWxkcyBieSBkZWZhdWx0LlxuICAgICAgOiBPYmplY3Qua2V5cyhmaWxlLm1ldGEpXG4gICAgbWV0YUZpZWxkcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBmb3JtUG9zdC5hcHBlbmQoaXRlbSwgZmlsZS5tZXRhW2l0ZW1dKVxuICAgIH0pXG5cbiAgICBmb3JtUG9zdC5hcHBlbmQob3B0cy5maWVsZE5hbWUsIGZpbGUuZGF0YSlcblxuICAgIHJldHVybiBmb3JtUG9zdFxuICB9XG5cbiAgY3JlYXRlQmFyZVVwbG9hZCAoZmlsZSwgb3B0cykge1xuICAgIHJldHVybiBmaWxlLmRhdGFcbiAgfVxuXG4gIHVwbG9hZCAoZmlsZSwgY3VycmVudCwgdG90YWwpIHtcbiAgICBjb25zdCBvcHRzID0gdGhpcy5nZXRPcHRpb25zKGZpbGUpXG5cbiAgICB0aGlzLnVwcHkubG9nKGB1cGxvYWRpbmcgJHtjdXJyZW50fSBvZiAke3RvdGFsfWApXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSBvcHRzLmZvcm1EYXRhXG4gICAgICAgID8gdGhpcy5jcmVhdGVGb3JtRGF0YVVwbG9hZChmaWxlLCBvcHRzKVxuICAgICAgICA6IHRoaXMuY3JlYXRlQmFyZVVwbG9hZChmaWxlLCBvcHRzKVxuXG4gICAgICBjb25zdCB0aW1lciA9IHRoaXMuY3JlYXRlUHJvZ3Jlc3NUaW1lb3V0KG9wdHMudGltZW91dCwgKGVycm9yKSA9PiB7XG4gICAgICAgIHhoci5hYm9ydCgpXG4gICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtZXJyb3InLCBmaWxlLCBlcnJvcilcbiAgICAgICAgcmVqZWN0KGVycm9yKVxuICAgICAgfSlcblxuICAgICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgIGNvbnN0IGlkID0gY3VpZCgpXG5cbiAgICAgIHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZHN0YXJ0JywgKGV2KSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coYFtYSFJVcGxvYWRdICR7aWR9IHN0YXJ0ZWRgKVxuICAgICAgICAvLyBCZWdpbiBjaGVja2luZyBmb3IgdGltZW91dHMgd2hlbiBsb2FkaW5nIHN0YXJ0cy5cbiAgICAgICAgdGltZXIucHJvZ3Jlc3MoKVxuICAgICAgfSlcblxuICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIChldikgPT4ge1xuICAgICAgICB0aGlzLnVwcHkubG9nKGBbWEhSVXBsb2FkXSAke2lkfSBwcm9ncmVzczogJHtldi5sb2FkZWR9IC8gJHtldi50b3RhbH1gKVxuICAgICAgICB0aW1lci5wcm9ncmVzcygpXG5cbiAgICAgICAgaWYgKGV2Lmxlbmd0aENvbXB1dGFibGUpIHtcbiAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXByb2dyZXNzJywgZmlsZSwge1xuICAgICAgICAgICAgdXBsb2FkZXI6IHRoaXMsXG4gICAgICAgICAgICBieXRlc1VwbG9hZGVkOiBldi5sb2FkZWQsXG4gICAgICAgICAgICBieXRlc1RvdGFsOiBldi50b3RhbFxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKGV2KSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coYFtYSFJVcGxvYWRdICR7aWR9IGZpbmlzaGVkYClcbiAgICAgICAgdGltZXIuZG9uZSgpXG5cbiAgICAgICAgaWYgKGV2LnRhcmdldC5zdGF0dXMgPj0gMjAwICYmIGV2LnRhcmdldC5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICBjb25zdCBib2R5ID0gb3B0cy5nZXRSZXNwb25zZURhdGEoeGhyLnJlc3BvbnNlVGV4dCwgeGhyKVxuICAgICAgICAgIGNvbnN0IHVwbG9hZFVSTCA9IGJvZHlbb3B0cy5yZXNwb25zZVVybEZpZWxkTmFtZV1cblxuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3RhdHVzOiBldi50YXJnZXQuc3RhdHVzLFxuICAgICAgICAgICAgYm9keSxcbiAgICAgICAgICAgIHVwbG9hZFVSTFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMudXBweS5zZXRGaWxlU3RhdGUoZmlsZS5pZCwgeyByZXNwb25zZSB9KVxuXG4gICAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdWNjZXNzJywgZmlsZSwgYm9keSwgdXBsb2FkVVJMKVxuXG4gICAgICAgICAgaWYgKHVwbG9hZFVSTCkge1xuICAgICAgICAgICAgdGhpcy51cHB5LmxvZyhgRG93bmxvYWQgJHtmaWxlLm5hbWV9IGZyb20gJHtmaWxlLnVwbG9hZFVSTH1gKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiByZXNvbHZlKGZpbGUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgYm9keSA9IG9wdHMuZ2V0UmVzcG9uc2VEYXRhKHhoci5yZXNwb25zZVRleHQsIHhocilcbiAgICAgICAgICBjb25zdCBlcnJvciA9IGJ1aWxkUmVzcG9uc2VFcnJvcih4aHIsIG9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpKVxuXG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB7XG4gICAgICAgICAgICBzdGF0dXM6IGV2LnRhcmdldC5zdGF0dXMsXG4gICAgICAgICAgICBib2R5XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy51cHB5LnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7IHJlc3BvbnNlIH0pXG5cbiAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLWVycm9yJywgZmlsZSwgZXJyb3IpXG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnJvcilcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgeGhyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGV2KSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coYFtYSFJVcGxvYWRdICR7aWR9IGVycm9yZWRgKVxuICAgICAgICB0aW1lci5kb25lKClcblxuICAgICAgICBjb25zdCBlcnJvciA9IGJ1aWxkUmVzcG9uc2VFcnJvcih4aHIsIG9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpKVxuICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLWVycm9yJywgZmlsZSwgZXJyb3IpXG4gICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpXG4gICAgICB9KVxuXG4gICAgICB4aHIub3BlbihvcHRzLm1ldGhvZC50b1VwcGVyQ2FzZSgpLCBvcHRzLmVuZHBvaW50LCB0cnVlKVxuXG4gICAgICBPYmplY3Qua2V5cyhvcHRzLmhlYWRlcnMpLmZvckVhY2goKGhlYWRlcikgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIsIG9wdHMuaGVhZGVyc1toZWFkZXJdKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQoZGF0YSlcblxuICAgICAgdGhpcy51cHB5Lm9uKCdmaWxlLXJlbW92ZWQnLCAocmVtb3ZlZEZpbGUpID0+IHtcbiAgICAgICAgaWYgKHJlbW92ZWRGaWxlLmlkID09PSBmaWxlLmlkKSB7XG4gICAgICAgICAgdGltZXIuZG9uZSgpXG4gICAgICAgICAgeGhyLmFib3J0KClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdGhpcy51cHB5Lm9uKCd1cGxvYWQtY2FuY2VsJywgKGZpbGVJRCkgPT4ge1xuICAgICAgICBpZiAoZmlsZUlEID09PSBmaWxlLmlkKSB7XG4gICAgICAgICAgdGltZXIuZG9uZSgpXG4gICAgICAgICAgeGhyLmFib3J0KClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdGhpcy51cHB5Lm9uKCdjYW5jZWwtYWxsJywgKCkgPT4ge1xuICAgICAgICAvLyBjb25zdCBmaWxlcyA9IHRoaXMudXBweS5nZXRTdGF0ZSgpLmZpbGVzXG4gICAgICAgIC8vIGlmICghZmlsZXNbZmlsZS5pZF0pIHJldHVyblxuICAgICAgICB4aHIuYWJvcnQoKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgdXBsb2FkUmVtb3RlIChmaWxlLCBjdXJyZW50LCB0b3RhbCkge1xuICAgIGNvbnN0IG9wdHMgPSB0aGlzLmdldE9wdGlvbnMoZmlsZSlcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgZmllbGRzID0ge31cbiAgICAgIGNvbnN0IG1ldGFGaWVsZHMgPSBBcnJheS5pc0FycmF5KG9wdHMubWV0YUZpZWxkcylcbiAgICAgICAgPyBvcHRzLm1ldGFGaWVsZHNcbiAgICAgICAgLy8gU2VuZCBhbG9uZyBhbGwgZmllbGRzIGJ5IGRlZmF1bHQuXG4gICAgICAgIDogT2JqZWN0LmtleXMoZmlsZS5tZXRhKVxuXG4gICAgICBtZXRhRmllbGRzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgICAgZmllbGRzW25hbWVdID0gZmlsZS5tZXRhW25hbWVdXG4gICAgICB9KVxuXG4gICAgICBmZXRjaChmaWxlLnJlbW90ZS51cmwsIHtcbiAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgIGNyZWRlbnRpYWxzOiAnaW5jbHVkZScsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoT2JqZWN0LmFzc2lnbih7fSwgZmlsZS5yZW1vdGUuYm9keSwge1xuICAgICAgICAgIGVuZHBvaW50OiBvcHRzLmVuZHBvaW50LFxuICAgICAgICAgIHNpemU6IGZpbGUuZGF0YS5zaXplLFxuICAgICAgICAgIGZpZWxkbmFtZTogb3B0cy5maWVsZE5hbWUsXG4gICAgICAgICAgbWV0YWRhdGE6IGZpZWxkcyxcbiAgICAgICAgICBoZWFkZXJzOiBvcHRzLmhlYWRlcnNcbiAgICAgICAgfSkpXG4gICAgICB9KVxuICAgICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBpZiAocmVzLnN0YXR1cyA8IDIwMCAmJiByZXMuc3RhdHVzID4gMzAwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChyZXMuc3RhdHVzVGV4dClcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy5qc29uKCkudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHRva2VuID0gZGF0YS50b2tlblxuICAgICAgICAgIGNvbnN0IGhvc3QgPSBnZXRTb2NrZXRIb3N0KGZpbGUucmVtb3RlLmhvc3QpXG4gICAgICAgICAgY29uc3Qgc29ja2V0ID0gbmV3IFVwcHlTb2NrZXQoeyB0YXJnZXQ6IGAke2hvc3R9L2FwaS8ke3Rva2VufWAgfSlcblxuICAgICAgICAgIHNvY2tldC5vbigncHJvZ3Jlc3MnLCAocHJvZ3Jlc3NEYXRhKSA9PiBlbWl0U29ja2V0UHJvZ3Jlc3ModGhpcywgcHJvZ3Jlc3NEYXRhLCBmaWxlKSlcblxuICAgICAgICAgIHNvY2tldC5vbignc3VjY2VzcycsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXNwID0gb3B0cy5nZXRSZXNwb25zZURhdGEoZGF0YS5yZXNwb25zZS5yZXNwb25zZVRleHQsIGRhdGEucmVzcG9uc2UpXG4gICAgICAgICAgICBjb25zdCB1cGxvYWRVUkwgPSByZXNwW29wdHMucmVzcG9uc2VVcmxGaWVsZE5hbWVdXG4gICAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXN1Y2Nlc3MnLCBmaWxlLCByZXNwLCB1cGxvYWRVUkwpXG4gICAgICAgICAgICBzb2NrZXQuY2xvc2UoKVxuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVyckRhdGEpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBlcnJEYXRhLnJlc3BvbnNlXG4gICAgICAgICAgICBjb25zdCBlcnJvciA9IHJlc3AgPyBvcHRzLmdldFJlc3BvbnNlRXJyb3IocmVzcC5yZXNwb25zZVRleHQsIHJlc3ApIDogbmV3IEVycm9yKGVyckRhdGEuZXJyb3IpXG4gICAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLWVycm9yJywgZmlsZSwgZXJyb3IpXG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGVyckRhdGEuZXJyb3IpKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICB1cGxvYWRCdW5kbGUgKGZpbGVzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGVuZHBvaW50ID0gdGhpcy5vcHRzLmVuZHBvaW50XG4gICAgICBjb25zdCBtZXRob2QgPSB0aGlzLm9wdHMubWV0aG9kXG5cbiAgICAgIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKClcbiAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUsIGkpID0+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuZ2V0T3B0aW9ucyhmaWxlKVxuICAgICAgICBmb3JtRGF0YS5hcHBlbmQob3B0cy5maWVsZE5hbWUsIGZpbGUuZGF0YSlcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5jcmVhdGVQcm9ncmVzc1RpbWVvdXQodGhpcy5vcHRzLnRpbWVvdXQsIChlcnJvcikgPT4ge1xuICAgICAgICB4aHIuYWJvcnQoKVxuICAgICAgICBlbWl0RXJyb3IoZXJyb3IpXG4gICAgICAgIHJlamVjdChlcnJvcilcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IGVtaXRFcnJvciA9IChlcnJvcikgPT4ge1xuICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1lcnJvcicsIGZpbGUsIGVycm9yKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRzdGFydCcsIChldikgPT4ge1xuICAgICAgICB0aGlzLnVwcHkubG9nKCdbWEhSVXBsb2FkXSBzdGFydGVkIHVwbG9hZGluZyBidW5kbGUnKVxuICAgICAgICB0aW1lci5wcm9ncmVzcygpXG4gICAgICB9KVxuXG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2KSA9PiB7XG4gICAgICAgIHRpbWVyLnByb2dyZXNzKClcblxuICAgICAgICBpZiAoIWV2Lmxlbmd0aENvbXB1dGFibGUpIHJldHVyblxuXG4gICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXByb2dyZXNzJywgZmlsZSwge1xuICAgICAgICAgICAgdXBsb2FkZXI6IHRoaXMsXG4gICAgICAgICAgICBieXRlc1VwbG9hZGVkOiBldi5sb2FkZWQsXG4gICAgICAgICAgICBieXRlc1RvdGFsOiBldi50b3RhbFxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldikgPT4ge1xuICAgICAgICB0aW1lci5kb25lKClcblxuICAgICAgICBpZiAoZXYudGFyZ2V0LnN0YXR1cyA+PSAyMDAgJiYgZXYudGFyZ2V0LnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgIGNvbnN0IHJlc3AgPSB0aGlzLm9wdHMuZ2V0UmVzcG9uc2VEYXRhKHhoci5yZXNwb25zZVRleHQsIHhocilcbiAgICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXN1Y2Nlc3MnLCBmaWxlLCByZXNwKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUoKVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXJyb3IgPSB0aGlzLm9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpIHx8IG5ldyBFcnJvcignVXBsb2FkIGVycm9yJylcbiAgICAgICAgZXJyb3IucmVxdWVzdCA9IHhoclxuICAgICAgICBlbWl0RXJyb3IoZXJyb3IpXG4gICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpXG4gICAgICB9KVxuXG4gICAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoZXYpID0+IHtcbiAgICAgICAgdGltZXIuZG9uZSgpXG5cbiAgICAgICAgY29uc3QgZXJyb3IgPSB0aGlzLm9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpIHx8IG5ldyBFcnJvcignVXBsb2FkIGVycm9yJylcbiAgICAgICAgZW1pdEVycm9yKGVycm9yKVxuICAgICAgICByZXR1cm4gcmVqZWN0KGVycm9yKVxuICAgICAgfSlcblxuICAgICAgdGhpcy51cHB5Lm9uKCdjYW5jZWwtYWxsJywgKCkgPT4ge1xuICAgICAgICB4aHIuYWJvcnQoKVxuICAgICAgfSlcblxuICAgICAgeGhyLm9wZW4obWV0aG9kLnRvVXBwZXJDYXNlKCksIGVuZHBvaW50LCB0cnVlKVxuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLm9wdHMuaGVhZGVycykuZm9yRWFjaCgoaGVhZGVyKSA9PiB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlciwgdGhpcy5vcHRzLmhlYWRlcnNbaGVhZGVyXSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKGZvcm1EYXRhKVxuXG4gICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtc3RhcnRlZCcsIGZpbGUpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICB1cGxvYWRGaWxlcyAoZmlsZXMpIHtcbiAgICBjb25zdCBhY3Rpb25zID0gZmlsZXMubWFwKChmaWxlLCBpKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gcGFyc2VJbnQoaSwgMTApICsgMVxuICAgICAgY29uc3QgdG90YWwgPSBmaWxlcy5sZW5ndGhcblxuICAgICAgaWYgKGZpbGUuZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuICgpID0+IFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihmaWxlLmVycm9yKSlcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5pc1JlbW90ZSkge1xuICAgICAgICAvLyBXZSBlbWl0IHVwbG9hZC1zdGFydGVkIGhlcmUsIHNvIHRoYXQgaXQncyBhbHNvIGVtaXR0ZWQgZm9yIGZpbGVzXG4gICAgICAgIC8vIHRoYXQgaGF2ZSB0byB3YWl0IGR1ZSB0byB0aGUgYGxpbWl0YCBvcHRpb24uXG4gICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtc3RhcnRlZCcsIGZpbGUpXG4gICAgICAgIHJldHVybiB0aGlzLnVwbG9hZFJlbW90ZS5iaW5kKHRoaXMsIGZpbGUsIGN1cnJlbnQsIHRvdGFsKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdGFydGVkJywgZmlsZSlcbiAgICAgICAgcmV0dXJuIHRoaXMudXBsb2FkLmJpbmQodGhpcywgZmlsZSwgY3VycmVudCwgdG90YWwpXG4gICAgICB9XG4gICAgfSlcblxuICAgIGNvbnN0IHByb21pc2VzID0gYWN0aW9ucy5tYXAoKGFjdGlvbikgPT4ge1xuICAgICAgY29uc3QgbGltaXRlZEFjdGlvbiA9IHRoaXMubGltaXRVcGxvYWRzKGFjdGlvbilcbiAgICAgIHJldHVybiBsaW1pdGVkQWN0aW9uKClcbiAgICB9KVxuXG4gICAgcmV0dXJuIHNldHRsZShwcm9taXNlcylcbiAgfVxuXG4gIGhhbmRsZVVwbG9hZCAoZmlsZUlEcykge1xuICAgIGlmIChmaWxlSURzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy51cHB5LmxvZygnW1hIUlVwbG9hZF0gTm8gZmlsZXMgdG8gdXBsb2FkIScpXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICB9XG5cbiAgICB0aGlzLnVwcHkubG9nKCdbWEhSVXBsb2FkXSBVcGxvYWRpbmcuLi4nKVxuICAgIGNvbnN0IGZpbGVzID0gZmlsZUlEcy5tYXAoKGZpbGVJRCkgPT4gdGhpcy51cHB5LmdldEZpbGUoZmlsZUlEKSlcblxuICAgIGlmICh0aGlzLm9wdHMuYnVuZGxlKSB7XG4gICAgICByZXR1cm4gdGhpcy51cGxvYWRCdW5kbGUoZmlsZXMpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudXBsb2FkRmlsZXMoZmlsZXMpLnRoZW4oKCkgPT4gbnVsbClcbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuICAgIHRoaXMudXBweS5hZGRVcGxvYWRlcih0aGlzLmhhbmRsZVVwbG9hZClcbiAgfVxuXG4gIHVuaW5zdGFsbCAoKSB7XG4gICAgdGhpcy51cHB5LnJlbW92ZVVwbG9hZGVyKHRoaXMuaGFuZGxlVXBsb2FkKVxuICB9XG59XG4iLCIvKipcbiAqIERlZmF1bHQgc3RvcmUgdGhhdCBrZWVwcyBzdGF0ZSBpbiBhIHNpbXBsZSBvYmplY3QuXG4gKi9cbmNsYXNzIERlZmF1bHRTdG9yZSB7XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLnN0YXRlID0ge31cbiAgICB0aGlzLmNhbGxiYWNrcyA9IFtdXG4gIH1cblxuICBnZXRTdGF0ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVcbiAgfVxuXG4gIHNldFN0YXRlIChwYXRjaCkge1xuICAgIGNvbnN0IHByZXZTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUpXG4gICAgY29uc3QgbmV4dFN0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZSwgcGF0Y2gpXG5cbiAgICB0aGlzLnN0YXRlID0gbmV4dFN0YXRlXG4gICAgdGhpcy5fcHVibGlzaChwcmV2U3RhdGUsIG5leHRTdGF0ZSwgcGF0Y2gpXG4gIH1cblxuICBzdWJzY3JpYmUgKGxpc3RlbmVyKSB7XG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChsaXN0ZW5lcilcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgLy8gUmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICAgIHRoaXMuY2FsbGJhY2tzLnNwbGljZShcbiAgICAgICAgdGhpcy5jYWxsYmFja3MuaW5kZXhPZihsaXN0ZW5lciksXG4gICAgICAgIDFcbiAgICAgIClcbiAgICB9XG4gIH1cblxuICBfcHVibGlzaCAoLi4uYXJncykge1xuICAgIHRoaXMuY2FsbGJhY2tzLmZvckVhY2goKGxpc3RlbmVyKSA9PiB7XG4gICAgICBsaXN0ZW5lciguLi5hcmdzKVxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWZhdWx0U3RvcmUgKCkge1xuICByZXR1cm4gbmV3IERlZmF1bHRTdG9yZSgpXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gaW5wdXQgPT4ge1xuXHRjb25zdCBidWYgPSBuZXcgVWludDhBcnJheShpbnB1dCk7XG5cblx0aWYgKCEoYnVmICYmIGJ1Zi5sZW5ndGggPiAxKSkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0Y29uc3QgY2hlY2sgPSAoaGVhZGVyLCBvcHRzKSA9PiB7XG5cdFx0b3B0cyA9IE9iamVjdC5hc3NpZ24oe1xuXHRcdFx0b2Zmc2V0OiAwXG5cdFx0fSwgb3B0cyk7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGhlYWRlci5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGhlYWRlcltpXSAhPT0gYnVmW2kgKyBvcHRzLm9mZnNldF0pIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdGlmIChjaGVjayhbMHhGRiwgMHhEOCwgMHhGRl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2pwZycsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvanBlZydcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDg5LCAweDUwLCAweDRFLCAweDQ3LCAweDBELCAweDBBLCAweDFBLCAweDBBXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAncG5nJyxcblx0XHRcdG1pbWU6ICdpbWFnZS9wbmcnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0NywgMHg0OSwgMHg0Nl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2dpZicsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvZ2lmJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NTcsIDB4NDUsIDB4NDIsIDB4NTBdLCB7b2Zmc2V0OiA4fSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnd2VicCcsXG5cdFx0XHRtaW1lOiAnaW1hZ2Uvd2VicCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQ2LCAweDRDLCAweDQ5LCAweDQ2XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZmxpZicsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvZmxpZidcblx0XHR9O1xuXHR9XG5cblx0Ly8gTmVlZHMgdG8gYmUgYmVmb3JlIGB0aWZgIGNoZWNrXG5cdGlmIChcblx0XHQoY2hlY2soWzB4NDksIDB4NDksIDB4MkEsIDB4MF0pIHx8IGNoZWNrKFsweDRELCAweDRELCAweDAsIDB4MkFdKSkgJiZcblx0XHRjaGVjayhbMHg0MywgMHg1Ml0sIHtvZmZzZXQ6IDh9KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnY3IyJyxcblx0XHRcdG1pbWU6ICdpbWFnZS94LWNhbm9uLWNyMidcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDQ5LCAweDQ5LCAweDJBLCAweDBdKSB8fFxuXHRcdGNoZWNrKFsweDRELCAweDRELCAweDAsIDB4MkFdKVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAndGlmJyxcblx0XHRcdG1pbWU6ICdpbWFnZS90aWZmJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NDIsIDB4NERdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdibXAnLFxuXHRcdFx0bWltZTogJ2ltYWdlL2JtcCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQ5LCAweDQ5LCAweEJDXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnanhyJyxcblx0XHRcdG1pbWU6ICdpbWFnZS92bmQubXMtcGhvdG8nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgzOCwgMHg0MiwgMHg1MCwgMHg1M10pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3BzZCcsXG5cdFx0XHRtaW1lOiAnaW1hZ2Uvdm5kLmFkb2JlLnBob3Rvc2hvcCdcblx0XHR9O1xuXHR9XG5cblx0Ly8gTmVlZHMgdG8gYmUgYmVmb3JlIHRoZSBgemlwYCBjaGVja1xuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NTAsIDB4NEIsIDB4MywgMHg0XSkgJiZcblx0XHRjaGVjayhbMHg2RCwgMHg2OSwgMHg2RCwgMHg2NSwgMHg3NCwgMHg3OSwgMHg3MCwgMHg2NSwgMHg2MSwgMHg3MCwgMHg3MCwgMHg2QywgMHg2OSwgMHg2MywgMHg2MSwgMHg3NCwgMHg2OSwgMHg2RiwgMHg2RSwgMHgyRiwgMHg2NSwgMHg3MCwgMHg3NSwgMHg2MiwgMHgyQiwgMHg3QSwgMHg2OSwgMHg3MF0sIHtvZmZzZXQ6IDMwfSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2VwdWInLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL2VwdWIremlwJ1xuXHRcdH07XG5cdH1cblxuXHQvLyBOZWVkcyB0byBiZSBiZWZvcmUgYHppcGAgY2hlY2tcblx0Ly8gQXNzdW1lcyBzaWduZWQgYC54cGlgIGZyb20gYWRkb25zLm1vemlsbGEub3JnXG5cdGlmIChcblx0XHRjaGVjayhbMHg1MCwgMHg0QiwgMHgzLCAweDRdKSAmJlxuXHRcdGNoZWNrKFsweDRELCAweDQ1LCAweDU0LCAweDQxLCAweDJELCAweDQ5LCAweDRFLCAweDQ2LCAweDJGLCAweDZELCAweDZGLCAweDdBLCAweDY5LCAweDZDLCAweDZDLCAweDYxLCAweDJFLCAweDcyLCAweDczLCAweDYxXSwge29mZnNldDogMzB9KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAneHBpJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXhwaW5zdGFsbCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDUwLCAweDRCXSkgJiZcblx0XHQoYnVmWzJdID09PSAweDMgfHwgYnVmWzJdID09PSAweDUgfHwgYnVmWzJdID09PSAweDcpICYmXG5cdFx0KGJ1ZlszXSA9PT0gMHg0IHx8IGJ1ZlszXSA9PT0gMHg2IHx8IGJ1ZlszXSA9PT0gMHg4KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnemlwJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi96aXAnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg3NSwgMHg3MywgMHg3NCwgMHg2MSwgMHg3Ml0sIHtvZmZzZXQ6IDI1N30pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3RhcicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC10YXInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg1MiwgMHg2MSwgMHg3MiwgMHgyMSwgMHgxQSwgMHg3XSkgJiZcblx0XHQoYnVmWzZdID09PSAweDAgfHwgYnVmWzZdID09PSAweDEpXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdyYXInLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtcmFyLWNvbXByZXNzZWQnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgxRiwgMHg4QiwgMHg4XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZ3onLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL2d6aXAnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0MiwgMHg1QSwgMHg2OF0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2J6MicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1iemlwMidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDM3LCAweDdBLCAweEJDLCAweEFGLCAweDI3LCAweDFDXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnN3onLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtN3otY29tcHJlc3NlZCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDc4LCAweDAxXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZG1nJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWFwcGxlLWRpc2tpbWFnZSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdChcblx0XHRcdGNoZWNrKFsweDAsIDB4MCwgMHgwXSkgJiZcblx0XHRcdChidWZbM10gPT09IDB4MTggfHwgYnVmWzNdID09PSAweDIwKSAmJlxuXHRcdFx0Y2hlY2soWzB4NjYsIDB4NzQsIDB4NzksIDB4NzBdLCB7b2Zmc2V0OiA0fSlcblx0XHQpIHx8XG5cdFx0Y2hlY2soWzB4MzMsIDB4NjcsIDB4NzAsIDB4MzVdKSB8fFxuXHRcdChcblx0XHRcdGNoZWNrKFsweDAsIDB4MCwgMHgwLCAweDFDLCAweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDZELCAweDcwLCAweDM0LCAweDMyXSkgJiZcblx0XHRcdGNoZWNrKFsweDZELCAweDcwLCAweDM0LCAweDMxLCAweDZELCAweDcwLCAweDM0LCAweDMyLCAweDY5LCAweDczLCAweDZGLCAweDZEXSwge29mZnNldDogMTZ9KVxuXHRcdCkgfHxcblx0XHRjaGVjayhbMHgwLCAweDAsIDB4MCwgMHgxQywgMHg2NiwgMHg3NCwgMHg3OSwgMHg3MCwgMHg2OSwgMHg3MywgMHg2RiwgMHg2RF0pIHx8XG5cdFx0Y2hlY2soWzB4MCwgMHgwLCAweDAsIDB4MUMsIDB4NjYsIDB4NzQsIDB4NzksIDB4NzAsIDB4NkQsIDB4NzAsIDB4MzQsIDB4MzIsIDB4MCwgMHgwLCAweDAsIDB4MF0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtcDQnLFxuXHRcdFx0bWltZTogJ3ZpZGVvL21wNCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAsIDB4MCwgMHgwLCAweDFDLCAweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDRELCAweDM0LCAweDU2XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbTR2Jyxcblx0XHRcdG1pbWU6ICd2aWRlby94LW00didcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDRELCAweDU0LCAweDY4LCAweDY0XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbWlkJyxcblx0XHRcdG1pbWU6ICdhdWRpby9taWRpJ1xuXHRcdH07XG5cdH1cblxuXHQvLyBodHRwczovL2dpdGh1Yi5jb20vdGhyZWF0c3RhY2svbGlibWFnaWMvYmxvYi9tYXN0ZXIvbWFnaWMvTWFnZGlyL21hdHJvc2thXG5cdGlmIChjaGVjayhbMHgxQSwgMHg0NSwgMHhERiwgMHhBM10pKSB7XG5cdFx0Y29uc3Qgc2xpY2VkID0gYnVmLnN1YmFycmF5KDQsIDQgKyA0MDk2KTtcblx0XHRjb25zdCBpZFBvcyA9IHNsaWNlZC5maW5kSW5kZXgoKGVsLCBpLCBhcnIpID0+IGFycltpXSA9PT0gMHg0MiAmJiBhcnJbaSArIDFdID09PSAweDgyKTtcblxuXHRcdGlmIChpZFBvcyA+PSAwKSB7XG5cdFx0XHRjb25zdCBkb2NUeXBlUG9zID0gaWRQb3MgKyAzO1xuXHRcdFx0Y29uc3QgZmluZERvY1R5cGUgPSB0eXBlID0+IEFycmF5LmZyb20odHlwZSkuZXZlcnkoKGMsIGkpID0+IHNsaWNlZFtkb2NUeXBlUG9zICsgaV0gPT09IGMuY2hhckNvZGVBdCgwKSk7XG5cblx0XHRcdGlmIChmaW5kRG9jVHlwZSgnbWF0cm9za2EnKSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ21rdicsXG5cdFx0XHRcdFx0bWltZTogJ3ZpZGVvL3gtbWF0cm9za2EnXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChmaW5kRG9jVHlwZSgnd2VibScpKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnd2VibScsXG5cdFx0XHRcdFx0bWltZTogJ3ZpZGVvL3dlYm0nXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAsIDB4MCwgMHgwLCAweDE0LCAweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDcxLCAweDc0LCAweDIwLCAweDIwXSkgfHxcblx0XHRjaGVjayhbMHg2NiwgMHg3MiwgMHg2NSwgMHg2NV0sIHtvZmZzZXQ6IDR9KSB8fFxuXHRcdGNoZWNrKFsweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDcxLCAweDc0LCAweDIwLCAweDIwXSwge29mZnNldDogNH0pIHx8XG5cdFx0Y2hlY2soWzB4NkQsIDB4NjQsIDB4NjEsIDB4NzRdLCB7b2Zmc2V0OiA0fSkgfHwgLy8gTUpQRUdcblx0XHRjaGVjayhbMHg3NywgMHg2OSwgMHg2NCwgMHg2NV0sIHtvZmZzZXQ6IDR9KSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtb3YnLFxuXHRcdFx0bWltZTogJ3ZpZGVvL3F1aWNrdGltZSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDUyLCAweDQ5LCAweDQ2LCAweDQ2XSkgJiZcblx0XHRjaGVjayhbMHg0MSwgMHg1NiwgMHg0OV0sIHtvZmZzZXQ6IDh9KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnYXZpJyxcblx0XHRcdG1pbWU6ICd2aWRlby94LW1zdmlkZW8nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgzMCwgMHgyNiwgMHhCMiwgMHg3NSwgMHg4RSwgMHg2NiwgMHhDRiwgMHgxMSwgMHhBNiwgMHhEOV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3dtdicsXG5cdFx0XHRtaW1lOiAndmlkZW8veC1tcy13bXYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgwLCAweDAsIDB4MSwgMHhCQV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ21wZycsXG5cdFx0XHRtaW1lOiAndmlkZW8vbXBlZydcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDQ5LCAweDQ0LCAweDMzXSkgfHxcblx0XHRjaGVjayhbMHhGRiwgMHhGQl0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtcDMnLFxuXHRcdFx0bWltZTogJ2F1ZGlvL21wZWcnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg2NiwgMHg3NCwgMHg3OSwgMHg3MCwgMHg0RCwgMHgzNCwgMHg0MV0sIHtvZmZzZXQ6IDR9KSB8fFxuXHRcdGNoZWNrKFsweDRELCAweDM0LCAweDQxLCAweDIwXSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ200YScsXG5cdFx0XHRtaW1lOiAnYXVkaW8vbTRhJ1xuXHRcdH07XG5cdH1cblxuXHQvLyBOZWVkcyB0byBiZSBiZWZvcmUgYG9nZ2AgY2hlY2tcblx0aWYgKGNoZWNrKFsweDRGLCAweDcwLCAweDc1LCAweDczLCAweDQ4LCAweDY1LCAweDYxLCAweDY0XSwge29mZnNldDogMjh9KSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdvcHVzJyxcblx0XHRcdG1pbWU6ICdhdWRpby9vcHVzJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NEYsIDB4NjcsIDB4NjcsIDB4NTNdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdvZ2cnLFxuXHRcdFx0bWltZTogJ2F1ZGlvL29nZydcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDY2LCAweDRDLCAweDYxLCAweDQzXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZmxhYycsXG5cdFx0XHRtaW1lOiAnYXVkaW8veC1mbGFjJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NTIsIDB4NDksIDB4NDYsIDB4NDZdKSAmJlxuXHRcdGNoZWNrKFsweDU3LCAweDQxLCAweDU2LCAweDQ1XSwge29mZnNldDogOH0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd3YXYnLFxuXHRcdFx0bWltZTogJ2F1ZGlvL3gtd2F2J1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MjMsIDB4MjEsIDB4NDEsIDB4NEQsIDB4NTIsIDB4MEFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdhbXInLFxuXHRcdFx0bWltZTogJ2F1ZGlvL2Ftcidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDI1LCAweDUwLCAweDQ0LCAweDQ2XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAncGRmJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9wZGYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0RCwgMHg1QV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2V4ZScsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1tc2Rvd25sb2FkJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0KGJ1ZlswXSA9PT0gMHg0MyB8fCBidWZbMF0gPT09IDB4NDYpICYmXG5cdFx0Y2hlY2soWzB4NTcsIDB4NTNdLCB7b2Zmc2V0OiAxfSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3N3ZicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2gnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg3QiwgMHg1QywgMHg3MiwgMHg3NCwgMHg2Nl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3J0ZicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vcnRmJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MDAsIDB4NjEsIDB4NzMsIDB4NkRdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd3YXNtJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi93YXNtJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NzcsIDB4NEYsIDB4NDYsIDB4NDZdKSAmJlxuXHRcdChcblx0XHRcdGNoZWNrKFsweDAwLCAweDAxLCAweDAwLCAweDAwXSwge29mZnNldDogNH0pIHx8XG5cdFx0XHRjaGVjayhbMHg0RiwgMHg1NCwgMHg1NCwgMHg0Rl0sIHtvZmZzZXQ6IDR9KVxuXHRcdClcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3dvZmYnLFxuXHRcdFx0bWltZTogJ2ZvbnQvd29mZidcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDc3LCAweDRGLCAweDQ2LCAweDMyXSkgJiZcblx0XHQoXG5cdFx0XHRjaGVjayhbMHgwMCwgMHgwMSwgMHgwMCwgMHgwMF0sIHtvZmZzZXQ6IDR9KSB8fFxuXHRcdFx0Y2hlY2soWzB4NEYsIDB4NTQsIDB4NTQsIDB4NEZdLCB7b2Zmc2V0OiA0fSlcblx0XHQpXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd3b2ZmMicsXG5cdFx0XHRtaW1lOiAnZm9udC93b2ZmMidcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDRDLCAweDUwXSwge29mZnNldDogMzR9KSAmJlxuXHRcdChcblx0XHRcdGNoZWNrKFsweDAwLCAweDAwLCAweDAxXSwge29mZnNldDogOH0pIHx8XG5cdFx0XHRjaGVjayhbMHgwMSwgMHgwMCwgMHgwMl0sIHtvZmZzZXQ6IDh9KSB8fFxuXHRcdFx0Y2hlY2soWzB4MDIsIDB4MDAsIDB4MDJdLCB7b2Zmc2V0OiA4fSlcblx0XHQpXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdlb3QnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAwLCAweDAxLCAweDAwLCAweDAwLCAweDAwXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAndHRmJyxcblx0XHRcdG1pbWU6ICdmb250L3R0Zidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDRGLCAweDU0LCAweDU0LCAweDRGLCAweDAwXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnb3RmJyxcblx0XHRcdG1pbWU6ICdmb250L290Zidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAwLCAweDAwLCAweDAxLCAweDAwXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnaWNvJyxcblx0XHRcdG1pbWU6ICdpbWFnZS94LWljb24nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0NiwgMHg0QywgMHg1NiwgMHgwMV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2ZsdicsXG5cdFx0XHRtaW1lOiAndmlkZW8veC1mbHYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgyNSwgMHgyMV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3BzJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9wb3N0c2NyaXB0J1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4RkQsIDB4MzcsIDB4N0EsIDB4NTgsIDB4NUEsIDB4MDBdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd4eicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC14eidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDUzLCAweDUxLCAweDRDLCAweDY5XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnc3FsaXRlJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXNxbGl0ZTMnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0RSwgMHg0NSwgMHg1MywgMHgxQV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ25lcycsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1uaW50ZW5kby1uZXMtcm9tJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NDMsIDB4NzIsIDB4MzIsIDB4MzRdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdjcngnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtZ29vZ2xlLWNocm9tZS1leHRlbnNpb24nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg0RCwgMHg1MywgMHg0MywgMHg0Nl0pIHx8XG5cdFx0Y2hlY2soWzB4NDksIDB4NTMsIDB4NjMsIDB4MjhdKVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnY2FiJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi92bmQubXMtY2FiLWNvbXByZXNzZWQnXG5cdFx0fTtcblx0fVxuXG5cdC8vIE5lZWRzIHRvIGJlIGJlZm9yZSBgYXJgIGNoZWNrXG5cdGlmIChjaGVjayhbMHgyMSwgMHgzQywgMHg2MSwgMHg3MiwgMHg2MywgMHg2OCwgMHgzRSwgMHgwQSwgMHg2NCwgMHg2NSwgMHg2MiwgMHg2OSwgMHg2MSwgMHg2RSwgMHgyRCwgMHg2MiwgMHg2OSwgMHg2RSwgMHg2MSwgMHg3MiwgMHg3OV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2RlYicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1kZWInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgyMSwgMHgzQywgMHg2MSwgMHg3MiwgMHg2MywgMHg2OCwgMHgzRV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2FyJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXVuaXgtYXJjaGl2ZSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweEVELCAweEFCLCAweEVFLCAweERCXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAncnBtJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXJwbSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDFGLCAweEEwXSkgfHxcblx0XHRjaGVjayhbMHgxRiwgMHg5RF0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdaJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWNvbXByZXNzJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NEMsIDB4NUEsIDB4NDksIDB4NTBdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdseicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1semlwJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4RDAsIDB4Q0YsIDB4MTEsIDB4RTAsIDB4QTEsIDB4QjEsIDB4MUEsIDB4RTFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtc2knLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtbXNpJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MDYsIDB4MEUsIDB4MkIsIDB4MzQsIDB4MDIsIDB4MDUsIDB4MDEsIDB4MDEsIDB4MEQsIDB4MDEsIDB4MDIsIDB4MDEsIDB4MDEsIDB4MDJdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdteGYnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL214Zidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQ3XSwge29mZnNldDogNH0pICYmIChjaGVjayhbMHg0N10sIHtvZmZzZXQ6IDE5Mn0pIHx8IGNoZWNrKFsweDQ3XSwge29mZnNldDogMTk2fSkpKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ210cycsXG5cdFx0XHRtaW1lOiAndmlkZW8vbXAydCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQyLCAweDRDLCAweDQ1LCAweDRFLCAweDQ0LCAweDQ1LCAweDUyXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnYmxlbmQnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYmxlbmRlcidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQyLCAweDUwLCAweDQ3LCAweEZCXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnYnBnJyxcblx0XHRcdG1pbWU6ICdpbWFnZS9icGcnXG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiBudWxsO1xufTsiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiY29uc3QgVXBweSA9IHJlcXVpcmUoJ3VwcHkvbGliL2NvcmUvQ29yZScpXG5jb25zdCBGaWxlSW5wdXQgPSByZXF1aXJlKCd1cHB5L2xpYi9wbHVnaW5zL0ZpbGVJbnB1dCcpXG5jb25zdCBYSFJVcGxvYWQgPSByZXF1aXJlKCd1cHB5L2xpYi9wbHVnaW5zL1hIUlVwbG9hZCcpXG5jb25zdCBQcm9ncmVzc0JhciA9IHJlcXVpcmUoJ3VwcHkvbGliL3BsdWdpbnMvUHJvZ3Jlc3NCYXInKVxuXG5jb25zdCB1cHB5ID0gbmV3IFVwcHkoeyBkZWJ1ZzogdHJ1ZSwgYXV0b1Byb2NlZWQ6IHRydWUgfSlcbnVwcHkudXNlKEZpbGVJbnB1dCwgeyB0YXJnZXQ6ICcuVXBweUZvcm0nLCByZXBsYWNlVGFyZ2V0Q29udGVudDogdHJ1ZSB9KVxudXBweS51c2UoWEhSVXBsb2FkLCB7XG4gIGVuZHBvaW50OiAnLy9hcGkyLnRyYW5zbG9hZGl0LmNvbScsXG4gIGZvcm1EYXRhOiB0cnVlLFxuICBmaWVsZE5hbWU6ICdmaWxlc1tdJ1xufSlcbnVwcHkudXNlKFByb2dyZXNzQmFyLCB7XG4gIHRhcmdldDogJ2JvZHknLFxuICBmaXhlZDogdHJ1ZSxcbiAgaGlkZUFmdGVyRmluaXNoOiBmYWxzZVxufSlcbnVwcHkucnVuKClcblxuY29uc29sZS5sb2coJ1VwcHkgd2l0aCBGb3JtdGFnIGFuZCBYSFJVcGxvYWQgaXMgbG9hZGVkJylcbiJdfQ==
