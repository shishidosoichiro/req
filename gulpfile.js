var gulp = require('gulp');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var plumber = require('gulp-plumber');

gulp.task('pre-test', function () {
  return gulp.src(['./index.js'])
    .pipe(plumber())
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function() {
  return gulp.src('test/**/*.js', {read: false})
  .pipe(plumber())
  .pipe(mocha())
  // Creating the reports after tests ran
  .pipe(istanbul.writeReports())
  // Enforce a coverage of at least 90%
  .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
})

gulp.task('watch', function(){
	gulp.watch(['index.js', 'test/**/*.js'], ['test']);
});

gulp.task('default', ['watch', 'test']);
