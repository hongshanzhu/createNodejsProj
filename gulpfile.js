'use strict'

const gulp = require('gulp');
const sequence = require('run-sequence');
const mocha = require('gulp-mocha');
const typescript = require('gulp-typescript');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const merge = require('merge-stream');
const tsfmt = require('gulp-tsfmt');
const tsconfigUpdate = require('gulp-tsconfig-files');
const tslint = require("gulp-tslint");
const istanbul = require('gulp-istanbul');
const remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');
const typedoc = require('gulp-typedoc');
const yargs = require('yargs');

Error.stackTraceLimit = Infinity;

const tsconfig = typescript.createProject('tsconfig.json', { typescript: require('typescript') });
const tsCompileContext = ['./src/**/*.ts', './test/**/*.ts', './typings/tsd.d.ts'];
const tsSourceCode = ['src/**/*.ts', 'test/**/*.ts'];

const argv = yargs
  .usage(`Usage:
    gulp <task> [options]
    gulp test [-m <case>] | bunyan -l <level>`)
  .command('build')
  .command('lint')
  .command('test')
  // .command('doc', 'Generate document')
  .command('prepublish', 'Prepare for a release')
  .option('m', {
    alias: 'match',
    describe: 'Run test cases with matched name. (cmd: test)',
    type: 'string'
  })
  .help('help')
  .argv;

// Available tasks:
// - clean
// - format
// - build
// - lint
// - test [-m <name>]
// - testcoverage
// - prepublish
// - doc
// - ci

gulp.task('default', ['lint', 'test']);

gulp.task('ci', (done) => {
  sequence('lint', 'testcoverage', 'prepublish', done);
});

// clean generated files
gulp.task('clean', () => {
  return del(['lib', 'build', 'reports']);
});

// populate files array in tsconfig.json
gulp.task('tsconfig:files', function () {
  return gulp.src(tsCompileContext)
    .pipe(tsconfigUpdate({ posix: true }));
});

// reformat TypeScript source code
gulp.task('format', () => {
  return gulp.src(tsSourceCode, { base: "./" })
    .pipe(tsfmt({options: {IndentSize: 2}}))
    .pipe(gulp.dest('.'));
});

// TypeScript transpile
gulp.task('build', ['clean', 'format', 'tsconfig:files'], () => {
  const result = gulp.src(tsCompileContext)
    .pipe(sourcemaps.init())
    .pipe(typescript(tsconfig));
  const jsStream = result.js
    .pipe(babel({presets: ['es2015-node5']}))
    .pipe(sourcemaps.write('.', {includeContent:true, sourceRoot: './'}))
    .pipe(gulp.dest('./build'));
  const dtsStream = result.dts
    .pipe(gulp.dest('./build'));
  return merge(jsStream, dtsStream);
});


// unit test, give option '-m <name>' to run specific test case
//
// If your test suite doesn't exit, it might be because you still have a lingering callback,
// most often caused by an open database connection, or httpserver does not shut down.
// https://www.npmjs.com/package/gulp-mocha#test-suite-not-exiting
gulp.task('test', ['build'], () => {
  const pattern = argv.m ? argv.m : '';
  return gulp.src([`build/test/**/test-*${pattern}*.js`])
    .pipe(mocha({ require: ['source-map-support/register'] }))
});


// instrument source for test coverage
gulp.task('instrument', ['build'], () => {
  return gulp.src(['build/src/**/*.js'])
    .pipe(istanbul({includeUntested: true}))
    .pipe(istanbul.hookRequire())
});

gulp.task('run-test', () => {
  return gulp.src(['build/test/**/test-*.js'])
    .pipe(mocha({ require: ['source-map-support/register'] }))
    .pipe(istanbul.writeReports({
      reporters: ['json'],
      dir: 'reports/coverage'
    }));
});

// remap coverage report base on source maps
gulp.task('remap-istanbul', () => {
  return gulp.src('reports/coverage/coverage-final.json')
    .pipe(remapIstanbul({
      basePath: './',
      reports: {
        'text': null,
        'html': 'reports/coverage/html'
      }
    }))
});

// unit test with coverage report
// stack trace line number is incorrect: https://github.com/gotwarlost/istanbul/issues/274
gulp.task('testcoverage', (done) => {
  sequence('instrument', 'run-test', done);
});


// lint (code checking)
gulp.task('lint', ['format'], () => {
  return gulp.src(tsSourceCode)
    // workaround of https://github.com/panuhorsmalahti/gulp-tslint/issues/55
    .pipe(tslint({rulesDirectory: 'node_modules/tslint-eslint-rules/dist/rules'}))
    .pipe(tslint.report('full', { summarizeFailureOutput: true, emitError: false}));
});


gulp.task("doc", ['clean:doc'], function () {
  return gulp.src(['src', 'typings'])
    .pipe(typedoc({
      module: "commonjs",
      target: "es6",
      out: "docs/",
      experimentalAsyncFunctions: true,
      version: true
    }));
});

gulp.task('clean:doc', () => {
  return del(['docs']);
});

gulp.task('prepublish', () => {
  return gulp.src(['build/src/**/*']).pipe(gulp.dest('lib'));
});

gulp.doneCallback = function (err) {
  process.exit(err ? 1 : 0);
};
