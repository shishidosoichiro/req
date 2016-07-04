'use strict';

var stream = require('stream');
var http = require('http');
var util = require('util');
var Url = require('url2');
var request = require('request');
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
  this.put = this.put.bind(this);
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

var overload = function(args){
  if (typeof args[0] === 'number') args[0] = String(args[0]);
  if (typeof args[1] === 'number') args[1] = String(args[1]);

  // Return promise pattern.
  // Promise = req.post(String url, Object data);
  if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'object') {
    return {
      url: args[0],
      data: args[1]
    };
  }
  // Promise = req.post(String url, String data);
  else if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
    return {
      url: args[0],
      data: args[1]
    };
  }
  // Return promise pattren omitting url.
  // Promise = req.post(Object data);
  else if (args.length === 1 && typeof args[0] === 'object') {
    return {
      url: undefined,
      data: args[0]
    };
  }
  // Return promise pattren omitting url and data.
  // Promise = req.post();
  else if (args.length === 0) {
    return {
      url: undefined,
      data: undefined
    };
  }
  // Return curried pattren with Writable.
  // Promise = req.post(String url);
  // Writable = req.post(String url);
  // curried = req.post(String url);
  // Promise = curried(Object data);
  else if (args.length === 1 && typeof args[0] === 'string') {
    return {
      url: args[0],
      data: undefined
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
 * post
 *
 * Return Promise pattern.
 *
 * ```js
 * Promise = req.post(String url, Object data);
 * Promise = req.post(String url, String data);
 * ```
 *
 *
 * Return Promise pattren omitting url.
 *
 * ```js
 * Promise = req.post(Object data);
 * ```
 *
 *
 * Return curried pattren with Writable.
 *
 * ```js
 * var writable = req.post(String url);
 * var curried = req.post(String url);
 * Promise = curried(Object data);
 * ```
 *
 * If string aruments is number, it is converted to string.
 *
 */

/**
 * post
 *
 */
App.prototype.post = function(){
  var args = overload(arguments);
  if (args.url != '' && args.data === undefined) {
    var post = this.post.bind(this, args.url);
    var transform = es.map(function(data, next){
      post(data).then(function(data){
        next(null, data);
      })
    });
    // return curried function.
    return _.assignIn(post, transform);
  }

  var data = args.data;
  var headers = this._headers;
  var urlObj = this.url.cd(args.url);
  var options = {method: 'post', headers: headers};

  // attach cookies.
  attachCookies(this.jar, urlObj, headers);

  if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
    urlObj.query = data;
    data = es.readArray([]);
  }
  else if (data instanceof stream) {
  }
  else if (typeof data === 'string') {
    data = es.readArray([data]);
  }
  else if (typeof data === 'object') {
    data = es.readArray([JSON.stringify(data)]);
  }

  options = _.defaults(options, urlObj);
  return new Promise(function(resolve, reject){
    data.pipe(request(options))
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
  if (args.url != '' && args.data === undefined) {
    var put = this.put.bind(this, args.url);
    var transform = es.map(function(data, next){
      put(data).then(function(data){
        next(null, data);
      })
    });
    // return curried function.
    return _.assignIn(put, transform);
  }

  var data = args.data;
  var headers = this._headers;
  var urlObj = this.url.cd(args.url);
  var options = {method: 'put', headers: headers};

  // attach cookies.
  attachCookies(this.jar, urlObj, headers);

  if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
    urlObj.query = data;
    data = es.readArray([]);
  }
  else if (data instanceof stream) {
  }
  else if (typeof data === 'string') {
    data = es.readArray([data]);
  }
  else if (typeof data === 'object') {
    data = es.readArray([JSON.stringify(data)]);
  }

  options = _.defaults(options, urlObj);
  return new Promise(function(resolve, reject){
    data.pipe(request(options))
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

  var headers = this._headers;
  var urlObj = this.url.cd(args.url);
  var options = {method: 'get', headers: headers};
  urlObj.query = args.data;

  // attach cookies.
  attachCookies(this.jar, urlObj, headers);

  options = _.defaults(options, urlObj);
  return new Promise(function(resolve, reject){
    var req = request(options);
    req.pipe(es.map(resolve))
    .on('error', reject)
    req.end();
  })
  .then(this.receive.bind(this));
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
