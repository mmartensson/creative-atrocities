'use strict';

/* ------------------------------------------------------------- *\
\* ------------------------------------------------------------- */

var gulp = require('gulp');  
var gutil = require('gulp-util');

var fs = require('fs')
var frontMatter = require('gulp-front-matter');
var map = require('map-stream');

var concat = require('gulp-concat');  
var imagemin = require('gulp-imagemin');
var changed = require('gulp-changed');

var uglify = require('gulp-uglify');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');

var refresh = require('gulp-livereload');  
var lr = require('tiny-lr');  
var server = lr();

var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');

var header = fs.readFileSync('app/partials/header.html', 'utf8')
var footer = fs.readFileSync('app/partials/footer.html', 'utf8')

gulp.task('scripts', function() {  
    gulp.src(['app/bower_components/jquery/jquery.js',
              'app/bower_components/jquery-mobile-min/jquery.mobile.js',
              'app/bower_components/jquery.qrcode/src/qrcode.js',
              'app/bower_components/jquery.qrcode/src/jquery.qrcode.js',
              'app/bower_components/url-parser/purl.js'])
        .pipe(concat('vendor.js'))
        .pipe(uglify())
        .pipe(gulp.dest('public/scripts'))
        .pipe(refresh(server));

    gulp.src(['app/scripts/*.js'])
        .pipe(uglify())
        .pipe(gulp.dest('public/scripts'))
        .pipe(refresh(server));
})

gulp.task('styles', function() {  
    gulp.src(['app/styles/*.css',
              'app/bower_components/jquery-mobile-min/jquery.mobile.css'])
        .pipe(concat('styles.css'))
	.pipe(minifyCss())
        .pipe(gulp.dest('public/styles'))
        .pipe(refresh(server))
})

gulp.task('images', function() {
    gulp.src('app/bower_components/jquery-mobile-min/images/*.{png,jpg}')
        .pipe(changed('public/styles/images'))
        .pipe(imagemin({optimizationLevel: 5}))
        .pipe(gulp.dest('public/styles/images'))
        .pipe(refresh(server))
});

gulp.task('favicon', function() {
    gulp.src('app/favicon.ico')
        .pipe(gulp.dest('public/'))
});

gulp.task('pages', function() {
    gulp.src('app/*.html')
        .pipe(frontMatter({
             property: 'data',
             remove: true
        }))
        .pipe(map(function gzip (file, cb) {
             file.data.file = file;
	     file.contents = Buffer.concat([
	        new Buffer(gutil.template(header, file.data)),
	        file.contents,
	        new Buffer(gutil.template(footer, file.data))
	     ]);

             cb(null, file);
        }))
        //.pipe(minifyHtml())
        .pipe(gulp.dest('public'))
        .pipe(refresh(server))
});

gulp.task('lint', function() {
    gulp.src(['server.js', 'lib/**/*.js', 'app/scripts/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter(stylish))
});

gulp.task('lr-server', function() {  
    server.listen(35729, function(err) {
        if (err) return console.log(err);
    });
})

gulp.task('default', [ 'lr-server', 'scripts', 'styles', 'images', 'favicon', 'pages', 'lint' ], function() { 
    gulp.watch('app/scripts/*.js', ['scripts']);
    gulp.watch('app/styles/*.css', ['styles']);
    gulp.watch('app/**.html', ['pages']);
    gulp.watch(['server.js', 'lib/**/*.js', 'app/scripts/*.js'], ['lint']);
})
