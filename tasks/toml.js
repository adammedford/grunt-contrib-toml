/*
 * grunt-contrib-toml
 * https://github.com/adammedford/grunt-contrib-toml
 *
 * Copyright (c) 2018 Adam Medford
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');
var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var toml = require('toml');

module.exports = function (grunt) {
  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('toml', 'Compile TOML files to JSON', function () {
    var done = this.async();


    var options = this.options({
      errorFormatFn: null
    });

    if (this.files.length < 1) {
      grunt.verbose.warn('Destination not written because no source files were provided.');
    }

    var convertedFileCount = 0;

    async.eachSeries(this.files, function (f, nextFileObj) {
      var destFile = f.dest;

      var files = f.src.filter(function (filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        }
        return true;
      });

      if (files.length === 0) {
        if (f.src.length < 1) {
          grunt.log.warn('Destination ' + chalk.cyan(destFile) + ' not written because no source files were found.');
        }

        // No src files, goto next target. Warn would have been issued above.
        return nextFileObj();
      }

      var compiled = [];

      async.concatSeries(files, function (file, next) {
        compileTOML(file, destFile, options)
          .then(function (output) {
              compiled.push(output);
              process.nextTick(next);
            },
            function (err) {
              nextFileObj(err);
            });
      }, function () {
        if (compiled.length < 1) {
          grunt.log.warn('Destination ' + chalk.cyan(destFile) + ' not written because compiled files were empty.');
        } else {
          var allCss = compiled.join(options.compress ? '' : grunt.util.normalizelf(grunt.util.linefeed));
          grunt.file.write(destFile, allCss);
          grunt.verbose.writeln('File ' + chalk.cyan(destFile) + ' converted');
          convertedFileCount++;
        }
        nextFileObj();
      });

    }, function () {
      if (convertedFileCount) {
        grunt.log.ok(convertedFileCount + ' ' + grunt.util.pluralize(convertedFileCount, 'document/documents') + ' converted.');
      }

      done();
    });
  });

  var compileTOML = function (srcFile, destFile, options) {
    options = _.assign({
      filename: srcFile
    }, options);
    options.paths = options.paths || [path.dirname(srcFile)];

    if (typeof options.paths === 'function') {
      try {
        options.paths = options.paths(srcFile);
      } catch (e) {
        grunt.fail.warn(wrapError(e, 'Generating paths failed.'));
      }
    }

    var srcCode = grunt.file.read(srcFile);

    return new Promise((resolve, reject) => {
      try {
        var output = JSON.stringify(toml.parse(srcCode));
        resolve(output);
      } catch (err) {
        tomlError(err, srcFile);
        reject(err);
      }
    });
  };

  var formatTOMLError = function (e) {
    var pos = '[' + 'L' + e.line + ':' + ('C' + e.column) + ']';
    return e.filename + ': ' + pos + ' ' + e.message;
  };

  var tomlError = function (e, file) {
    var message = options.errorFormatFn ? options.errorFormatFn(e) : formatTOMLError(e);

    grunt.log.error(message);
    grunt.fail.warn('Error compiling ' + file);
  };

  var wrapError = function (e, message) {
    var err = new Error(message);
    err.origError = e;
    return err;
  };

};
