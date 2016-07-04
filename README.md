# req
[![Build Status](https://travis-ci.org/shishidosoichiro/req.svg?branch=master)](https://travis-ci.org/shishidosoichiro/req)
[![Coverage Status](https://coveralls.io/repos/github/shishidosoichiro/req/badge.svg?branch=master)](https://coveralls.io/github/shishidosoichiro/req?branch=master)

Contextual HTTP client. 

```js
var flow = require('gulp-flow');
var Req = require('req');

var req = Req('http://localhost:3000/api').contentType('application/json');

src('./data/user/*.json')
.pipe(flow(
	String,
	req.post('user'),  // post json to http://localhost:3000/api/user
	Buffer
))
.pipe(log)
```

## Usage

### `post, put, get, remove`

send http request with each method. return Promise(nodejs Response) and Stream(nodejs Response)
these methods are overloaded.

* `Promise post(String pathname, Object data)`
* `Promise post(Object data)`
* `Stream post(String pathname)`


### `cd(String pathname)`

return new Req object that has defferent url and context with caller req object.

```js
var api = Req('http://localhost:3000/api').contentType('application/json');

// target url is 'http://localhost:3000/api/user'.
var user = api.cd('user');

// target url is 'http://localhost:3000/api/tweet'.
var tweet = api.cd('tweet');

// target url is 'http://localhost:3000/dashboard'.
var dashboard = api.cd('../dashboard').contentType('text/html')
```

### `contentType(String type)`

set and get 

