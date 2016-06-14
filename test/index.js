'use strict';

var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

var express = require('express')
var server = express()
.post('/api/user', function(req, res){
	console.log(req.body)
	res.send(req.body);
})
.listen(3000);

var stream = require('stream');

var Req = require('../');

describe('req', function(){
	describe('#post', function(){
		it('should ', function(){
			var req = Req('http://localhost:3000/api');

			var data = [
				{username: 'user1'},
				{username: 'user2'}
			]
			new stream.Readable({
				read: function(){
					this.push(data.shift())
				}
			})
			.pipe(req.post('user'))
			.then(function(res){
				res.body.should.deep.equal(data[0])
			})
		});
	});
});
