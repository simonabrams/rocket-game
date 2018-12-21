let gulp = require("gulp");
let browserSync = require("browser-sync").create();

gulp.task("browserSync", () => {
	browserSync.init({
		server: {
			baseDir: "src"
		}
	});
});

gulp.task("watch", gulp.parallel("browserSync"), () => {
	gulp.watch("src/*.html", browserSync.reload);
	gulp.watch("src/js/**/*.js", browserSync.reload);
});

gulp.task("default", gulp.series("watch", "browserSync"));
