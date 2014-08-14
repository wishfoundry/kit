(function (name, lib) {
	if (typeof define == 'function') {
		define(lib);
	} else if (typeof module != 'undefined') {
		module.exports = lib;
	} else {
		if (typeof this[name] === 'undefined')
			this[name] = lib;
	}
}('http', function () {
	'use strict';

	function parse(xhr) {
		var result = {};
		if('response' in xhr) {
			result = xhr.response;
		} else {
			try {
				result.data = JSON.parse(xhr.responseText);
			} catch (e) {
				result.data = xhr.responseText;
			}
		}
		return result;
	};

	function createXHR() {
		return window.XMLHttpRequest ?
			new XMLHttpRequest():
			new ActiveXObject('Microsoft.XMLHTTP');
	}
	function isSuccess(status) {
		return 200 <= status && status < 300;
	}

	function http(options) {
		var xhr = createXHR();
		var deferred = Promise.defer();
		var manuallyAborted = false
		Object.extend(this.config, options || {});


		xhr.open(this.config.method, this.config.url, true);

		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				var responseHeaders = manuallyAborted ? null : xhr.getAllResponseHeaders();

				if (isSuccess(xhr.status)) {
					deferred.resolve(parse(xhr));
				} else {
					deferred.reject(parse(xhr));
				}
			}
		};

		xhr.send(this.config.data);

		if(this.config.timeout) {
			setTimeout(function(){
				manuallyAborted = true;
				xhr.abort();
			}, this.config.timeout)
		}

		deferred.promise.cancel = function() {
			xhr.abort();
			return deferred.reject(new Error('XHR aborted'));
		};

		deferred.promise.progress = function(fun) {
			xhr.addEventListener('progress', fun);
			return this;
		};

		deferred.promise.error = deferred.promise.catch;
		deferred.promise.success = deferred.promise.then;

		return deferred.promise;
	}

	http.config = {
		headers: {},
		method: 'get',
		url: '',
		data: null,
		timeout: null,
		preprocessors: [], //TODO: implement
		postprocessors: [] //TODO: implement
	};

	http.addHeaders = function(headers) {
		Object.extend(this.config.headers, headers);
	};
	'get delete'.split(' ').forEach(function (method) {
		http[method] = function (url, config) {
			return http(Object.extend(config || {}, {
				method: method.toUpperCase(),
				url: url
			}));
		};
	});
	'put post patch'.split(' ').forEach(function (method) {
		http[method] = function (url, data, config) {
			return http(Object.extend(config || {}, {
				method: method.toUpperCase(),
				url: url,
				data: data
			}));
		};
	});

	return http;

}()));