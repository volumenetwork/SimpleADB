'use strict';

const   gulp          = require('gulp'),
        sourcemaps    = require('gulp-sourcemaps'),
        babel         = require('gulp-babel'),
        mocha         = require('gulp-mocha'),
        del           = require('del'),
        plumber       = require('gulp-plumber'),
        util          = require('gulp-util'),
        babelRegister = require('babel-core/register');

let paths = {
    scripts: ['src/**/*.es6'],
    tests: ['test/**/*.js']
};

gulp.task('clean', () => {
    return del(['build']);
});

gulp.task('test', function () {
    return gulp.src(paths.tests, { read: false })
        .pipe(mocha({
            require: 'babel-register',
            reporter: 'list'
        }))
        .on('error', util.log);
});


gulp.task('build', () => {
    gulp.src(paths.scripts)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['babel-preset-es2015']
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('build'));
});

gulp.task('watch', () => {
    gulp.watch(paths.scripts, ['build']);
});

gulp.task('default', ['clean', 'test', 'build']);
gulp.task('prepublish', ['clean', 'test', 'build']);