'use strict';

var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var express = require('express')
var Router = express.Router;
var bodyParser = require('body-parser');
var es = require('event-stream');
var _ = require('lodash');

var json = bodyParser.json({ type: 'application/json' });
var text = bodyParser.text({ type: 'text/plain' });

var app = express()
.post('/api/user', json, function(req, res){
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.send(_.defaults(req.query, req.body));
})
.post('/api/user/:id', json, function(req, res){
  req.body.id = parseInt(req.params.id);
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.send(req.body);
})
.put('/api/user', json, function(req, res){
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.send(req.body);
})
.put('/api/user/:id', json, function(req, res){
  req.body.id = parseInt(req.params.id);
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.send(req.body);
})
.get('/api/user', json, function(req, res){
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.send(req.query);
})
.get('/api/user/:id', json, function(req, res){
  req.query.id = parseInt(req.params.id);
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.send(req.query);
})
.post('/api/echo', text, function(req, res){
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  res.send(req.body);
})

app.listen(3000);


/*
var serv = express()

serv.route('/user')
.use(bodyParser.json({ type: 'application/json' }))
*/

var Req = require('../');

describe('req', function(){
  describe('#contentType', function(){
    it('should set and get \'Content-Type\' header.', function(){
      var req = Req('http://localhost:3000/api');
      req.contentType('text/plain').should.equal(req);
      req.contentType().should.equal('text/plain');
    });
    it('should is set \'application/json\' as default', function(){
      var req = Req('http://localhost:3000/api');
      req.contentType().should.equal('application/json');
    });
    it('should be chain method', function(done){
      var req = Req('http://localhost:3000/api');
      req.contentType('text/plain')
      .post('echo', 'hello, world.')
      .then(function(res){
        res.body.should.equal('hello, world.');
      })
      .then(done, done)
    });
  });

  describe('#headers', function(){
    it('should set and get HTTP headers.', function(){
      var req = Req('http://localhost:3000/api');
      req.headers('Keyword', 'Value').should.equal(req);
      req.headers().should.include.keys('Keyword');
      req.headers()['Keyword'].should.equal('Value');
    });
    it('should is set \'Content-Type: application/json\' as default', function(){
      var req = Req('http://localhost:3000/api');
      req.headers().should.include.keys('Content-Type');
      req.headers()['Content-Type'].should.equal('application/json');
    });
    it('should set headers object.', function(){
      var req = Req('http://localhost:3000/api');
      req.headers({'A': 'B'}).should.equal(req);
      req.headers().should.deep.equal({'A': 'B'});
    });
  });

  describe('#cd', function(){
    it('should create req object that changes pathname ant keeps context.', function(){
      var root = Req('http://localhost:3000/api').contentType('text/plain');
      var echo = root.cd('echo');
      var user = root.cd('user').contentType('application/json');
      root.url.href.should.equal('http://localhost:3000/api');
      root.contentType().should.equal('text/plain');
      echo.url.href.should.equal('http://localhost:3000/api/echo');
      echo.contentType().should.equal('text/plain');
      user.url.href.should.equal('http://localhost:3000/api/user');
      user.contentType().should.equal('application/json');
      echo.jar.should.deep.equal(root.jar);
      user.jar.should.deep.equal(root.jar);
    });
  });

  describe('#stream', function(){
    var data = [{username: 'user1'}, {username: 'user2'}];
    var req = Req('http://localhost:3000/api');

    it('should be a Duplex and post data to a server.', function(done){
      var string = JSON.stringify(data[0]);
      es.readArray([string])
      .pipe(req.stream.post('user'))
      .pipe(es.map(function(res){
        res.body.toString().should.equal(string);
        done();
      }))
      .on('error', done)
    });

    it('should be a Duplex and put data to a server.', function(done){
      var string = JSON.stringify(data[0]);
      es.readArray([string])
      .pipe(req.stream.put('user'))
      .pipe(es.map(function(res){
        res.body.toString().should.equal(string);
        done();
      }))
      .on('error', done)
    });
  });

  describe('(json)', function(){
    describe('#post', function(){
      var data = [{username: 'user1'}, {username: 'user2'}];
      var req = Req('http://localhost:3000/api');
      var post = req.post('user');

      it('should post data to a server and return Promise, if params are [String, Object].', function(done){
        req.post('user', data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should post data to a server and return Promise, if params are [Number, Object].', function(done){
        var user = req.cd('user');
        user.post(12345, data[0])
        .then(function(res){
          should.equal(res.body.id, 12345);
          delete res.body.id;
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should post data to a server and return Promise, if a param is [Object].', function(done){
        var req = Req('http://localhost:3000/api/user');
        req.post(data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should post data to a server and return Promise, if a param is [String].', function(done){
        var req = Req('http://localhost:3000/api/user');
        req.post('12345')
        .then(function(res){
          res.body.should.deep.equal({id: 12345});
        })
        .then(done, done);
      });

      it('should post data to a server and return Promise, if a param is none.', function(done){
        var req = Req('http://localhost:3000/api/user');
        req.post()
        .then(function(res){
          res.body.should.deep.equal({});
        })
        .then(done, done);
      });

      it('should , if \'application/x-www-form-urlencoded\'.', function(done){
        var req = Req('http://localhost:3000/api/user')
        .contentType('application/x-www-form-urlencoded');
        req.post({key: '54321'})
        .then(function(res){
          res.body.should.deep.equal({key: '54321'});
        })
        .then(done, done);
      });
    });

    describe('#put', function(){
      var data = [{username: 'user1'}, {username: 'user2'}];
      var req = Req('http://localhost:3000/api');
      var put = req.put('user');

      it('should return Promise and put data to a server.', function(done){
        req.put('user', data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should regard number as string.', function(done){
        var user = req.cd('user');
        user.put(12345, data[0])
        .then(function(res){
          should.equal(res.body.id, 12345);
          delete res.body.id;
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should return Promise and put data to a server.', function(done){
        var req = Req('http://localhost:3000/api/user');
        req.put(data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should be a curried function and put data to a server.', function(done){
        put(data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });
    });

    describe('#get', function(){
      var data = [{username: 'user1'}, {username: 'user2'}];
      var req = Req('http://localhost:3000/api');
      var get = req.get('user');

      it('should return Promise and get data to a server.', function(done){
        req.get('user', data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should regard number as string.', function(done){
        var user = req.cd('user');
        user.get(12345, data[0])
        .then(function(res){
          should.equal(res.body.id, 12345);
          delete res.body.id;
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should return Promise and get data to a server.', function(done){
        var req = Req('http://localhost:3000/api/user');
        req.get(data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });

      it('should be a curried function and get data to a server.', function(done){
        get(data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });
    });
  })
  describe('(text)', function(){
    describe('#post', function(){
      var data = ['text1', 'text2'];
      var req = Req('http://localhost:3000/api').contentType('text/plain');
      var post = req.post('echo');

      it('should return Promise and post data to a server.', function(done){
        req.post('echo', data[0])
        .then(function(res){
          res.body.should.deep.equal(data[0]);
        })
        .then(done, done);
      });
    });
  })
});
