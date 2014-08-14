(function (name, lib) {
	if (typeof define == 'function') {
		define(lib);
	} else if (typeof module != 'undefined') {
		module.exports = lib;
	} else {
		if (typeof this[name] === 'undefined')
			this[name] = lib;
	}
}('Promise', function () {

	var Promise = function Promise(executor) {
		this.state = Promise.State.PENDING;
		this.value = undefined;
		this.deferred = [];

		var promise = this;

		try {
			executor(function (x) {
				promise.resolve(x);
			}, function (r) {
				promise.reject(r);
			});
		} catch (e) {
			promise.reject(e);
		}
	};

	Promise.State = {
		RESOLVED: 0,
		REJECTED: 1,
		PENDING: 2
	};

	Promise.reject = function (r) {
		return new Promise(function (resolve, reject) {
			reject(r);
		});
	};

	Promise.resolve = function (x) {
		return new Promise(function (resolve, reject) {
			resolve(x);
		});
	};

	Promise.prototype.resolve = function resolve(x) {
		var promise = this;

		if (promise.state === Promise.State.PENDING) {
			if (x === promise) {
				throw new TypeError('Promise resolved with itself.');
			}

			var called = false;

			try {
				var then = x && x['then'];

				if (x !== null && typeof x === 'object' && typeof then === 'function') {
					then.call(x, function (x) {
						if (!called) {
							promise.resolve(x);
						}
						called = true;

					}, function (r) {
						if (!called) {
							promise.reject(r);
						}
						called = true;
					});
					return;
				}
			} catch (e) {
				if (!called) {
					promise.reject(e);
				}
				return;
			}
			promise.state = Promise.State.RESOLVED;
			promise.value = x;
			promise.notify();
		}
	};

	Promise.prototype.reject = function reject(reason) {
		var promise = this;

		if (promise.state === Promise.State.PENDING) {
			if (reason === promise) {
				throw new TypeError('Promise rejected with itself.');
			}

			promise.state = Promise.State.REJECTED;
			promise.value = reason;
			promise.notify();
		}
	};

	Promise.prototype.defer = function defer() {
		return new Promise(function(){})
	};

	/**
	 * Notify all handlers of a change in state.
	 * @private
	 */
	Promise.prototype.notify = function notify() {
		var promise = this;

		setTimeout(function () {
			if (promise.state !== Promise.State.PENDING) {
				while (promise.deferred.length) {
					var deferred = promise.deferred.shift(),
						onResolved = deferred[0],
						onRejected = deferred[1],
						resolve = deferred[2],
						reject = deferred[3];

					try {
						if (promise.state === Promise.State.RESOLVED) {
							if (typeof onResolved === 'function') {
								resolve(onResolved.call(undefined, promise.value));
							} else {
								resolve(promise.value);
							}
						} else if (promise.state === Promise.State.REJECTED) {
							if (typeof onRejected === 'function') {
								resolve(onRejected.call(undefined, promise.value));
							} else {
								reject(promise.value);
							}
						}
					} catch (e) {
						reject(e);
					}
				}
			}
		}, 0);
	};

	Promise.prototype.catch = function (onRejected) {
		return this.then(undefined, onRejected);
	};

	/**
	 * @param {function(*):*=} onResolved Called when this Promise is resolved.
	 * @param {function(*):*=} onRejected Called when this Promise is rejected.
	 * @return {!Promise}
	 */
	Promise.prototype.then = function then(onResolved, onRejected) {
		var promise = this;

		return new Promise(function (resolve, reject) {
			promise.deferred.push([onResolved, onRejected, resolve, reject]);
			promise.notify();
		});
	};

	/**
	 * Returns a promise that resolves when all of the promises in iterable have resolved. The result is passed an array
	 * of values from all the promises. If any of the passed in promises rejects, the all Promise immediately rejects
	 * with the value of the promise that rejected, discarding all the other promises whether or not they have resolved.
	 *
	 * @param {Array.<!Promise>} iterable
	 * @return {!Promise}
	 */
	Promise.all = function all(iterable) {
		return new Promise(function (resolve, reject) {
			var count = 0,
				result = [];

			if (iterable.length === 0) {
				resolve(result);
			}

			function resolver(i) {
				return function (x) {
					result[i] = x;
					count += 1;

					if (count === iterable.length) {
						resolve(result);
					}
				};
			}

			for (var i = 0; i < iterable.length; i += 1) {
				iterable[i].then(resolver(i), reject);
			}
		});
	};

	/**
	 * Returns a promise that resolves or rejects as soon as one of the promises in the iterable resolves or rejects, with the value or reason from that promise.
	 *
	 * @param {Array.<!Promise>} iterable
	 * @return {!Promise}
	 */
	Promise.race = function race(iterable) {
		return new Promise(function (resolve, reject) {
			for (var i = 0; i < iterable.length; i += 1) {
				iterable[i].then(resolve, reject);
			}
		});
	};

	Promise.prototype.lastly = Promise.prototype["finally"] = function lastly(onFulfilledOrRejected) {
		return this.then(
			function (value) {
				try {
					onFulfilledOrRejected();
				} catch (e) {
				}

				return value;
			},
			function (reason) {
				try {
					onFulfilledOrRejected();
				} catch (e) {
				}

				throw reason;
			});
	};

	Promise.prototype.spread = function spread(fulfilled, rejected) {
		return this.then(function (array) {
			return fulfilled.apply(void 0, array);
		}, rejected);
	};

	return Promise;
}()));