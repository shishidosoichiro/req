var stream = require('stream');
var http = require('http');
var Url = require('url2');

var App = module.exports = function(url){
	this.url = Url(url);
};

/**
var promise = req.post(data);
var promise = req.post(url, data);
var promise = req.post(url);
var writable = req.post(url);
var curried = req.post(url);
var promise = curried(data);

 */
App.prototype.post = function(url, data){
	//if (arguments.length === 1 && typefo url === 'string')　
	//else if (arguments.length === 1 && typeof url === 'object')
	var urlObj = this.url.resolve(url);
	var options = _.defaults({method: 'post'}, urlObj);
	var req = http.request(options);

};
