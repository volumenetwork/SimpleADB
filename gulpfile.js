var gulp          = require('gulp'),
    sourcemaps    = require('gulp-sourcemaps'),
    babel         = require('gulp-babel'),
    del           = require('del'),
    plumber       = require('gulp-plumber');

var paths = {
    scripts: ['src/**/*.es6']
};

gulp.task('clean', function() {
    return del(['build']);
});

gulp.task('build', function() {
    gulp.src(paths.scripts)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['babel-preset-es2015']
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('build'));
});


gulp.task('watch', function() {
    gulp.watch(paths.scripts, ['build']);
});

gulp.task('default', ['watch', 'build']);