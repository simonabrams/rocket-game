let gulp = require('gulp');
let browserSync = require('browser-sync');

const server = browserSync.create();

const paths = {
	scripts: {
		src: 'src/**/*.js',
		dest: 'dist/js/'
	},
	html: 'src/*.html'
}

function reload(done) {
	server.reload();
	done();
};

function serve(done) {
	server.init({
		server: {
			baseDir: 'src'
		}
	});
	done();
}

const watch = () => gulp.watch([paths.scripts.src, paths.html], gulp.series(reload));

gulp.task("default", gulp.series(serve, watch));
