'use strict';

var stream = require('stream');
var http = require('http');
var util = require('util');
var Url = require('url2');
var _ = require('lodash');
var es = require('event-stream');
var ContentType = require('content-type');
var CookieJar = require('cookiejar').CookieJar;
var CookieAccess = require('cookiejar').CookieAccessInfo;

var defaults = {
	headers: {
		'Content-Type': 'application/json'
	}
};
var jsonify = function(body){
	try {
		return JSON.parse(body);
	}
	catch(e){
		return body;
	}
};

var App = module.exports = function(url, options){
	if (!(this instanceof App)) return new App(url, options);

	options = _.defaultsDeep(options || {}, defaults);
	this.url = url instanceof Url ? url : Url(url);

	// inherit context.
	this._headers = _.cloneDeep(options.headers);
	this.jar = options.jar || new CookieJar();

	// bind
	this.post = this.post.bind(this);
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

App.prototype.cd = function(to){
	return App(this.url.cd(to), {jar: this.jar, headers: this.headers()});
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
 * If string aruments is number, it is converted to string.
 *
 */
App.prototype.post = function(url, data){
	if (typeof arguments[0] === 'number') arguments[0] = String(arguments[0]);
	if (typeof arguments[1] === 'number') arguments[1] = String(arguments[1]);

	// Return promise pattern.
	// var promise = req.post(string, object);
	if (arguments.length === 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'object') {
		url = arguments[0];
		data = arguments[1];
	}
	else if (arguments.length === 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'string') {
		url = arguments[0];
		data = arguments[1];
	}
	// Return promise pattren omitting url.
	// var promise = req.post(object);
	else if (arguments.length === 1 && typeof arguments[0] === 'object') {
		data = arguments[0];
		url = undefined;
	}
	// Return promise pattren omitting url.
	// var promise = req.post(object);
	else if (arguments.length === 0) {
		// continue.
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

	// set url.
	var urlObj = this.url.cd(url)
	if (this._headers['Content-Type'] === 'application/x-www-form-urlencoded') {
		urlObj.query = data;
	}

	// attach cookies.
	attachCookies(this.jar, urlObj, this._headers);

	// post a request.
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

			// save cookies.
			saveCookies(this.jar, res);

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
				res.on('end', _.flow(join, jsonify, body, resolve));
			}
		}.bind(this));

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

/**
 * Save the cookies in the given `res` to
 * the agent's cookie jar for persistence.
 *
 * @param {Response} res
 * @api private
 */

var saveCookies = function(jar, res){
	var cookies = res.headers['set-cookie'];
	if (cookies) jar.setCookies(cookies);
};

/**
 * Attach cookies when available to the given `req`.
 *
 * @param {Request} req
 * @api private
 */
var attachCookies = function(jar, url, headers){
	var access = CookieAccess(url.hostname, url.pathname, 'https:' == url.protocol);
	var cookie = jar.getCookies(access).toValueString();
	headers['Cookie'] = cookie;
};
