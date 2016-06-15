'use strict';

var stream = require('stream');
var Writable = stream.Writable;
var Transform = stream.Transform;
var http = require('http');
var util = require('util');
var Url = require('url2');
var _ = require('lodash');

var App = module.exports = function(url){
	if (!(this instanceof App)) return new App(url);
	this.url = Url(url);
	this.post = this.post.bind(this);
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
	// Return promise pattren omitting url.
	// var promise = req.post(object);
	else if (arguments.length === 1 && typeof arguments[0] === 'object') {
		return this.post('', arguments[0]);
	}
	// Return curried pattren with Writable.
	// var promise = req.post(string);
	// var writable = req.post(string);
	// var curried = req.post(string);
	// var promise = curried(object);
	else if (arguments.length === 1 && typeof arguments[0] === 'string') {
		url = arguments[0];
		var write = function(data){
			return this.post(url, data);
		}.bind(this);
		// extend Writable interface.
		var Post = function(){
			Writable.call(this, {objectMode: true, write: write});
		};
		util.inherits(Post, Writable);
		var post = new Post();
		for (var i in post) {
			if (typeof post[i] === 'function') write[i] = post[i].bind(post);
			else write[i] = post[i];
		}
		return write;
	}
	// Invalid arguments.
	else throw Error('invalid arguments.');

	// post a request.
	var urlObj = this.url.resolve(url);
	var reqestOptions = _.defaults({method: 'POST', headers: {'Content-Type': 'application/json'}}, urlObj);
	var options = _.defaults(this.options || {}, {encoding: 'utf8'});
	return new Promise(function(resolve, reject){
		var req = http.request(reqestOptions, function(res){
			// console.log(`STATUS: ${res.statusCode}`);
			// console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
			res.setEncoding(options.encoding);
			var data = [];
			res.on('data', function(chunk){
				data = data.push(chunk);
			});
			res.on('end', function(){
				resolve(data.join(''));
			});
		});

		req.on('error', function(e){
			reject(e);
		});

		// write data to request body
		req.write(JSON.stringify(data));
		req.end();
	});
};
