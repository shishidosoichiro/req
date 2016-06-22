'use strict';

var stream = require('stream');
var http = require('http');
var util = require('util');
var Url = require('url2');
var _ = require('lodash');
var es = require('event-stream');
var ContentType = require('content-type');
//var cookie = require('cookie');

var defaults = {
	headers: {
		'Content-Type': 'application/json'
	}
};

var App = module.exports = function(url){
	if (!(this instanceof App)) return new App(url);
	this.url = Url(url);
	this.post = this.post.bind(this);
	this._headers = _.cloneDeep(defaults.headers);
};

App.prototype.contentType = function(type){
	if (type === undefined) return this._headers['Content-Type'];
	this._headers['Content-Type'] = type;
	return this;
};

App.prototype.headers = function(key, value){
	if (key === undefined) return this._headers;
	else if (typeof key === 'object') this._headers = key;
	else this._headers[key] = value;
	return this;
};

/**
 * post
 *
 * Return Promise pattern.
 *
 * ```js
 * var promise = req.post(string, object);
 * ```
 *
 *
 * Return Promise pattren omitting url.
 *
 * ```js
 * var promise = req.post(object);
 * ```
 *
 *
 * Return curried pattren with Writable.
 *
 * ```js
 * var writable = req.post(string);
 * var curried = req.post(string);
 * var promise = curried(object);
 * ```
 *
 */
App.prototype.post = function(url, data){
	// Return promise pattern.
	// var promise = req.post(string, object);
	if (arguments.length === 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'object') {
		// Follows 'if ... else ...' clauses.
	}
	else if (arguments.length === 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'string') {
		// Follows 'if ... else ...' clauses.
	}
	// Return promise pattren omitting url.
	// var promise = req.post(object);
	else if (arguments.length === 1 && typeof arguments[0] === 'object') {
		data = arguments[0];
		url = '';
	}
	// Return promise pattren omitting url.
	// var promise = req.post(object);
	else if (arguments.length === 0) {
		return this.post('');
	}
	// Return curried pattren with Writable.
	// var promise = req.post(string);
	// var writable = req.post(string);
	// var curried = req.post(string);
	// var promise = curried(object);
	else if (arguments.length === 1 && typeof arguments[0] === 'string') {
		url = arguments[0];
		var post = this.post.bind(this, url);
		var transform = es.map(function(data, next){
			post(data).then(function(data){
				next(null, data);
			})
		});
		// return curried function.
		return _.assignIn(post, transform);
	}
	// Invalid arguments.
	else throw Error('invalid arguments.');

	// post a request.
	var urlObj = this.url.cd(url);
	if (this._headers['Content-Type'] === 'application/x-www-form-urlencoded') {
		urlObj.query = data;
	}
	var reqestOptions = _.defaults({method: 'POST', headers: this._headers}, urlObj);
	return new Promise(function(resolve, reject){
		var req = http.request(reqestOptions, function(res){
			// console.log(`STATUS: ${res.statusCode}`);
			//console.log(res.headers)
			var chunks = [];
			var push = chunks.push.bind(chunks);
			var join = chunks.join.bind(chunks, '');
			resolve = resolve.bind(null, res);
			var body = _.set.bind(_, res, 'body');

			if (res.headers['Content-Type']) {
				var contentType = ContentType.parse(res);
				if (contentType.parameters.charset) res.setEncoding(contentType.parameters.charset);
				// json
				if (_.includes(['application/json', 'text/javascript+json'], contentType.type)) {
					res.on('data', push);
					res.on('end', _.flow(join, JSON.parse, body, resolve));
				}
				// text
				else if (/^text\//.test(contentType.type)) {
					res.on('data', push);
					res.on('end', _.flow(join, body, resolve));
				}
				else reject(new Error(`not supported Content-Type: ${contentType.type}`))
			}
			else {
				res.on('data', push);
				res.on('end', _.flow(join, body, resolve));
			}
		});

		req.on('error', reject);

		if (this._headers['Content-Type'] === 'application/x-www-form-urlencoded') {
		}
		// write data to request body
		else if (typeof data === 'object') {
			req.write(JSON.stringify(data));
		}
		else if (typeof data === 'string') {
			req.write(data);
		}
		else return reject(new Error(`not supported data type: ${typeof data}`));

		req.end();
	}.bind(this));
};
