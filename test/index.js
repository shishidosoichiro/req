'use strict';

var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var express = require('express')
var bodyParser = require('body-parser');
var es = require('event-stream');

var server = express()
.use(bodyParser.json({ type: 'application/json' }))
.use(bodyParser.text({ type: 'text/plain' }))
.post('/api/user', function(req, res){
	res.send(req.body);
})
.post('/api/user/:id', function(req, res){
	req.body.id = parseInt(req.params.id);
	res.send(req.body);
})
.post('/api/echo', function(req, res){
	res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
	res.send(req.body);
})
.listen(3000);

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

	describe('(json)', function(){
		describe('#post', function(){
			var data = [{username: 'user1'}, {username: 'user2'}];
			var req = Req('http://localhost:3000/api');
			var post = req.post('user');

			it('should return Promise and post data to a server.', function(done){
				req.post('user', data[0])
				.then(function(res){
					res.body.should.deep.equal(data[0]);
				})
				.then(done, done);
			});

			it('should regard number as string.', function(done){
				var user = req.cd('user');
				user.post(12345, data[0])
				.then(function(res){
					should.equal(res.body.id, 12345);
					delete res.body.id;
					res.body.should.deep.equal(data[0]);
				})
				.then(done, done);
			});

			it('should return Promise and post data to a server.', function(done){
				var req = Req('http://localhost:3000/api/user');
				req.post(data[0])
				.then(function(res){
					res.body.should.deep.equal(data[0]);
				})
				.then(done, done);
			});

			it('should be a curried function and post data to a server.', function(done){
				post(data[0])
				.then(function(res){
					res.body.should.deep.equal(data[0]);
				})
				.then(done, done);
			});

			it('should be a Transform and post data to a server.', function(done){
				var i = 0;
				es.readArray(data)
				.pipe(post)
				.pipe(es.map(function(res, cb){
					res.body.should.deep.equal(data[i++]);
					cb(null, res);
				}))
				.on('error', done)
				.on('end', done)
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
			it('should be a Transform and post data to a server.', function(done){
				var i = 0;
				es.readArray(data)
				.pipe(post)
				.pipe(es.map(function(res, cb){
					res.body.should.deep.equal(data[i++]);
					cb(null, res);
				}))
				.on('error', done)
				.on('end', done)
			});
		});
	})
});
