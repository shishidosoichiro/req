# req
[![Build Status](https://travis-ci.org/shishidosoichiro/req.svg?branch=master)](https://travis-ci.org/shishidosoichiro/req)
[![Coverage Status](https://coveralls.io/repos/github/shishidosoichiro/req/badge.svg?branch=master)](https://coveralls.io/github/shishidosoichiro/req?branch=master)

Functional HTTP client for gulp

## How to use

### Stream style

```js
var flow = require('gulp-flow');
var Req = require('req');

var req = Req('http://localhost:3000/api');

src('./data/user/*.json')
.pipe(flow(
	String,
	JSON.parse,
	req.post('user')
))
```

### Promise style

```js
req.post('user', {username: 'user1', ...})
.then(console.log.bind(console, 'done.'))
```

## Why

### extend Writable

### extend Promise
