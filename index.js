'use strict';

var http = require('http');
var util = require('util');
var Url = require('url2');
var querystring = require('querystring');
var request = require('request');
var _ = require('lodash');
var defaultsDeep = require('lodash/defaultsDeep');
var cloneDeep = require('lodash/cloneDeep');
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
var readable = function(data){
  return es.readArray([data]);
}

var App = module.exports = function (url, options){
  if (!(this instanceof App)) return new App(url, options);

  options = defaultsDeep(options || {}, defaults);
  this.url = url instanceof Url ? url : Url(url);

  // inherit context.
  this.headers = cloneDeep(options.headers);
  this.jar = options.jar || new CookieJar();

  // bind
  var stream = this.stream;
  this.stream = {};
  this.stream.request = stream.request.bind(this);
  this.stream.post = stream.post.bind(this);
  this.stream.put = stream.put.bind(this);
  this.stream.get = stream.get.bind(this);
  this.post = this.post.bind(this);
  this.put = this.put.bind(this);
  this.get = this.get.bind(this);
};

App.prototype.contentType = function(type){
  if (type === undefined) return this.headers['Content-Type'];
  this.headers['Content-Type'] = type;
  return this;
};

App.prototype.header = function(key, value){
  if (key === undefined) return this.headers;
  else if (typeof key === 'object') this.headers = key;
  else this.headers[key] = value;
  return this;
};

App.prototype.cd = function(to){
  return App(this.url.cd(to), {jar: this.jar, headers: this.headers});
};

/**

overload

- ([String url]) -> Promise
- ([String url, ]Object data) -> Promise
- (String url, String data) -> Promise
- (String url, String number) -> Promise
 */
var overload = function(args){
  if (typeof args[0] === 'number') args[0] = String(args[0]);
  if (typeof args[1] === 'number') args[1] = String(args[1]);

  // - ([String url]) -> Promise
  if ((args.length === 0)
    || (args.length === 1 && typeof args[0] === 'string')) {
    return {
      url: args[0],
      data: undefined
    };
  }
  // - ([String url, ]Object data) -> Promise
  // - (String url, String data) -> Promise
  // - (String url, String number) -> Promise
  else if ((args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'object')
    || (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string')) {
    return {
      url: args[0],
      data: args[1]
    };
  }
  else if (args.length === 1 && typeof args[0] === 'object') {
    return {
      url: undefined,
      data: args[0]
    };
  }
  // Invalid arguments.
  throw Error('invalid arguments.');
}

App.prototype.receive = function(res){
  //console.log(`STATUS: ${res.statusCode}`);
  saveCookies(this.jar, res);
  var charset = 'utf8';

  if (res.headers['Content-Type']) {
    var contentType = ContentType.parse(res);
    if (contentType.parameters.charset) charset = contentType.parameters.charset;

    // json
    if (_.includes(['application/json', 'text/javascript+json'], contentType.type)) {
      res.body = JSON.parse(String(res.body, charset));
    }
    // text
    else if (/^text\//.test(contentType.type)) {
      res.body = String(res.body, charset);
    }
    else throw new Error(`not supported Content-Type: ${contentType.type}`);
  }
  else {
    res.body = jsonify(String(res.body, charset));
  }
  return res;
}

/**
 * stream I/F
 *
 */
App.prototype.stream = {};
App.prototype.stream.request = function(method, url){
  // attach cookies.
  var headers = cloneDeep(this.headers);
  var urlObj = this.url.cd(url);
  var options = {method: method, headers: headers};
  options = _.defaults(urlObj, options);
  attachCookies(this.jar, urlObj, headers);
  return request(options);
};
App.prototype.stream.post = function(url){
  return this.stream.request('post', url);
};
App.prototype.stream.put = function(url){
  return this.stream.request('put', url);
};
App.prototype.stream.get = function(url){
  return this.stream.request('get', url);
};

/**
post

- ([String url]) -> Promise
- ([String url, ]Object data) -> Promise
- (String url, String data) -> Promise
- (String url, String number) -> Promise
 */

/**
 * post
 *
 */
App.prototype.post = function(){
  var args = overload(arguments);

  if (args.data != undefined && this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
    var query = querystring.stringify(args.data);
    if (args.url === undefined) args.url = '?' + query;
    else args.url += '?' + query;
    args.data = undefined;
  }

  var stream;
  if (typeof args.data === 'string') {
    stream = readable(args.data);
  }
  else if (typeof args.data === 'object') {
    stream = readable(JSON.stringify(args.data));
  }
  else {
    stream = readable('');
  }

  var duplex = this.stream.post(args.url);
  return new Promise(function(resolve, reject){
    stream.pipe(duplex)
    .pipe(es.map(resolve))
    .on('error', reject)
  })
  .then(this.receive.bind(this));
};

/**
 * put
 *
 */
App.prototype.put = function(){
  var args = overload(arguments);

  if (args.data != undefined && this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
    var query = querystring.stringify(args.data);
    if (args.url === undefined) args.url = '?' + query;
    else args.url += '?' + query;
    args.data = undefined;
  }

  var stream;
  if (typeof args.data === 'string') {
    stream = readable(args.data);
  }
  else if (typeof args.data === 'object') {
    stream = readable(JSON.stringify(args.data));
  }
  else {
    stream = readable('');
  }

  var duplex = this.stream.put(args.url);
  return new Promise(function(resolve, reject){
    stream.pipe(duplex)
    .pipe(es.map(resolve))
    .on('error', reject)
  })
  .then(this.receive.bind(this));
};

/**
 * get
 *
 */
App.prototype.get = function(){
  var args = overload(arguments);

  var query = querystring.stringify(args.data);
  if (args.url === undefined) args.url = '?' + query;
  else args.url += '?' + query;
  args.data = undefined;

  var stream = readable('');

  var duplex = this.stream.get(args.url);
  return new Promise(function(resolve, reject){
    stream.pipe(duplex)
    .pipe(es.map(resolve))
    .on('error', reject)
  })
  .then(this.receive.bind(this));

  var args = overload(arguments);
  if (args.url != '' && args.data === undefined) {
    var get = this.get.bind(this, args.url);
    var transform = es.map(function(data, next){
      get(data).then(function(data){
        next(null, data);
      })
    });
    // return curried function.
    return _.assignIn(get, transform);
  }
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
