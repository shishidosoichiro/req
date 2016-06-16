'use strict';

var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var express = require('express')
var bodyParser = require('body-parser');
var _ = require('highland');

var server = express()
.use(bodyParser.json())
.use(bodyParser.urlencoded({ extended: true }))
.post('/api/user', function(req, res){
	console.log('yes!')
	console.log(req.body)
	res.send(req.body);
})
.listen(3000);

var stream = require('stream');

var Req = require('../');

var array = function(data){
	return new stream.Readable({
		objectMode: true,
		read: function(){
			this.push(data.shift())
		}
	});
};

describe('req', function(){
	describe('#post', function(){
		it('should ', function(done){
			var req = Req('http://localhost:3000/api');

			var data = [{username: 'user1'}, {username: 'user2'}];
			_(data)
			.pipe(req.post('api/user'))
			.pipe(_.pipeline(_.map(function(x){
				console.log('done!!!!')
				return x;
			})))
			//.then(function(res){
			//	res.body.should.deep.equal(data[0])
			//})
		});
	});
});
