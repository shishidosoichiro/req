var gulp = require('gulp');
var data = require('gulp-data2');
var _ = require('lodash');
var path = require('path');

var Req = require('req');
var root = Req('http://localhost:8080/icon')
var security = root.cd('j_spring_security_check').contentType('application/x-www-form-urlencoded');
var sysadmin = root.cd('services/systemservice').contentType('application/json');

var props = ['req.method', 'req.path', 'req._headers.cookie', 'statusCode', 'headers', 'body'];
var log = flow(
	_.bind(_.at, _, _, props),
	_.bind(_.zipObject, _, props),
	_.bind(JSON.stringify, JSON, _, null, 2),
	console.log.bind(console)
);

var slice = function(array, begin, end){
	return Array.prototype.slice.call(array, begin, end);
};
var functionalize = function(src){
	return typeof src === 'function' ? src : function(){return src};
};

var flow = function(functions){
	if (arguments.length > 1 && !(functions instanceof Array)) functions = slice(arguments);
	functions = functions.map(functionalize);
	return function(arg){
		var that = this;
		return functions.reduce(function(arg, f){
			if (arg instanceof Promise) return arg.then(f.bind(that));
			return f.call(that, arg);
		}, arg);
	};
};

/*
1. ファイルの追加・変更を検知する
2. そのファイルを読み込む
3. idで検索する
	* データがある
		1. ファイルとデータを比較する
			* 同じの場合、何もしない
			* 異なる場合、 put する
	* データがない
		1. post する
4. 結果を保存する 1. に戻るが、何も起こらない

*/

gulp.task('login', function(){
	return gulp.src('auth.json')
	.pipe(data(
		String,
		JSON.parse,
		security.post,
		log
	));
});

gulp.task('site', ['login'], function(){
	return gulp.src('site/*.json')
	.pipe(data(
		String,
		JSON.parse,
		sysadmin.post('services/systemservice/sites'),
		log
	));
});

var login = function(){
	return flow(
		readFileSync,
		String,
		JSON.parse,
		security.post,
	)(path || 'auth.json');
};

var defaultsOfRestful = {
	id: function(data){
		return data['id'];
	},
	validate: _.noop,
	serialize: _.noop,
	deserialize: _.noop
};
var Restful = function(options){
	options = _.defaults(options, defaultsOfRestful);
	var restful = {
		req: options.req,
		id: options.id,
		validate: options.validate,
		serialize: options.serialize,
		deserialize: options.deserialize
	};

	// var promise = restful.insert(object);
	restful.insert = flow(
		restful.validate,
		restful.serialize,
		restful.req.post
	);

	// var promise = restful.update(object);
	restful.update = function(data){
		data = restful.validate(data);
		data = restful.serialize(data);
		return restful.req.put(restful.id(data), data);
	};

	// var promise = restful.removeById(id);
	// var promise = restful.remove(object);
	restful.removeById = function(id){
		return restful.req.remove(id);
	};
	restful.remove = function(data){
		return restful.removebyId(restful.id(data));
	};

	// var promise = restful.byId(object);
	restful.byId = flow(
		restful.id,
		restful.req.get,
		restful.deserialize
	);

	// var promise = restful.get(object);
	restful.get = flow(
		restful.id,
		restful.byId
	);

	// var boolean = restful.hasId(data);
	restful.hasId = flow(
		restful.id,
		_.isEmpty
	);

	// var promise = restful.save(data);
	restful.save = function(){
		if (site.hasId(data)) {
			return site.get(data)
			.then(function(old){
				if (_.isEqual(old, data)) return Promise.reject('same object.');
				return site.update(data);
			})
		}
		else {
			return site.insert(data);
		}
	};
}

var site = Restful({
	req: sysadmin.cd('sites'),
	id: function(data){
		return data['siteId'];
	}
})

gulp.task('watch', function(){
	var watcher = gulp.watch('site/*.json', function(e){
		console.log(`${e.path} was ${e.type}.`);
		switch (e.type) {
		case 'added':
		case 'changed':
			login()
			.then(flow(
				e.path,
				readFileSync,
				String,
				JSON.parse,
				site.save
			))
			.then(log)
			break;
		}
	})
});

gulp.task('default', ['site']);
