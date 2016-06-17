'use strict';

var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var express = require('express')
var bodyParser = require('body-parser');
var es = require('event-stream');

var server = express()
.use(bodyParser.json())
.use(bodyParser.urlencoded({ extended: true }))
.post('/api/user', function(req, res){
	res.send(req.body);
})
.listen(3000);

var Req = require('../');

describe('req', function(){
	describe('#contentType', function(){
		it('should set and get \'Content-Type\' header.', function(){
			var req = Req('http://localhost:3000/api');
			req.contentType('text/html').should.equal(req);
			req.contentType().should.equal('text/html');
		});
		it('should is set \'application/json\' as default', function(){
			var req = Req('http://localhost:3000/api');
			req.contentType().should.equal('application/json');
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
				.then(done);
			});

			it('should return Promise and post data to a server.', function(done){
				var req = Req('http://localhost:3000/api/user');
				req.post(data[0])
				.then(function(res){
					res.body.should.deep.equal(data[0]);
				})
				.then(done);
			});

			it('should be a curried function and post data to a server.', function(done){
				post(data[0])
				.then(function(res){
					res.body.should.deep.equal(data[0]);
				})
				.then(done);
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
