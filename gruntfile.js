// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

module.exports = function(grunt) {
  // Load the grunt related dev deps listed in package.json.
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // Load our custom tasks.
  grunt.loadTasks('./build/tasks/');

  var browsers = grunt.option('browsers');
  if (browsers) {
    browsers = browsers.split(/\s*,\s*/g);
  } else {
    browsers = ['PhantomJS'];
  }

  grunt.initConfig({
    clean: {
      all: ['tmp', 'dist']
    },

    'closure-compiler': {
      check: {
        cwd: 'lib/',
        js: ['**/*.js',
             '../third_party/closure-compiler/contrib/externs/jasmine.js',
             '../third_party/closure-compiler/contrib/externs/fs.js',
             '../third_party/closure-compiler/contrib/externs/buffer.js',
             '../third_party/closure-compiler/contrib/externs/stream.js',
             '../third_party/closure-compiler/contrib/externs/events.js'
            ],
        jsOutputFile: 'tmp/closure/out.js',
        options: require('./build/closure-options.json')
      }
    },

    make_dir_module: {
      wash: {
        strip: 2,
        dest: 'lib/wash/exe_modules.js',
        cwd: 'lib',
        modules: ['wash/exe/*.js']
      }
    },

    make_main_module: {
      test: {
        require: '__axiomRequire__',
        dest: 'tmp/test/test_main.js',
        cwd: 'lib/',
        modules: ['**/*.test.js']
      }
    },

    concat: {
      axiom: {
        src: ['loader/axiom_amd.js',
              'tmp/amd/lib/axiom/**/*.js',
              '!tmp/amd/lib/axiom/**/*.test.js'],
        dest: 'tmp/dist/axiom.concat.amd.js'
      },
      wash: {
        src: ['tmp/amd/lib/wash/**/*.js',
              '!tmp/amd/lib/wash/**/*.test.js'],
        dest: 'tmp/dist/wash.concat.amd.js',
      }
    },

    copy: {
      samples_web_app_files: {
        files: [{
          expand: true,
          cwd: 'tmp/dist/',
          src: ['**/*.js'],
          dest: 'tmp/samples/web_app/js/'
        },
        {
          expand: true,
          cwd: 'node_modules/hterm/dist/amd/lib/',
          src: ['hterm.amd.js'],
          dest: 'tmp/samples/web_app/js/'
        },
        {
          expand: true,
          cwd: 'samples/web_app/boot/',
          src: ['**/*.js',
                '**/*.js.map'
          ],
          dest: 'tmp/samples/web_app/js/boot'
        },
        {
          expand: true,
          cwd: 'samples/web_app/css/',
          src: ['**/*.css'],
          dest: 'tmp/samples/web_app/css'
        }]
      },
      samples_use_globals_files: {
        files: [{
          expand: true,
          cwd: 'tmp/dist/',
          src: ['**/*.js'],
          dest: 'tmp/samples/use_globals/js/'
        },
        {
          expand: true,
          cwd: 'samples/use_globals/css/',
          src: ['**/*.css'],
          dest: 'tmp/samples/use_globals/css'
        },
        {
          expand: true,
          cwd: 'samples/use_globals/',
          src: ['**/*.html'],
          dest: 'tmp/samples/use_globals/'
        }]
      }
    },

    make_html_index: {
      samples_web_app: {
        dest: 'tmp/samples/web_app/index.html',
        title: 'Console',
        cwd: 'tmp/samples/web_app/',
        scriptrefs: [
          'js/axiom.concat.amd.js',
          'js/wash.concat.amd.js',
          'js/*.js',
          'js/shell/**/*.js',
          'js/boot/startup.js' // last entry since we are synchronous (for now)
        ],
        cssrefs: [
          'css/**/*.css'
        ]
      }
    },

    watch: {
      check: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js'],
        tasks: ['check']
      },
      test: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js', 'test/**/*.js'],
        tasks: ['transpile', 'make_main_module:test', 'karma:once']
      },
      check_test: {
        options: {
          atBegin: true
        },
        files: ['lib/**/*.js', 'test/**/*.js'],
        tasks: ['check', 'transpile', 'make_main_module:test', 'karma:once']
      }
    },

    es6_transpile: {
      amd: {
        type: "amd",
        fileResolver: ['lib/'],
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
          dest: 'tmp/amd/lib/'
        }]
      },
      cjs: {
        type: "cjs",
        fileResolver: ['lib/'],
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
          dest: 'tmp/cjs/lib/'
        }]
      },
      samples_web_app: {
        type: "amd",
        fileResolver: ['lib/',
                       'node_modules/hterm/dist/stub/',
                       'samples/web_app/lib'],
        files: [{
          expand: true,
          cwd: 'samples/web_app/lib/',
          src: ['**/*.js'],
          dest: 'tmp/samples/web_app/js/'
        }]
      }
    },

    karma: {
      options: {
        browsers: browsers,
        frameworks: ['jasmine'],
        files: [
          'node_modules/es6-collections/index.js',
          'node_modules/es6-promise/dist/es6-promise.js',
          'polyfill/promise.js',
          'polyfill/bind.js',
          'loader/axiom_amd.js',
          'tmp/amd/lib/**/*.js',
          'tmp/test/test_main.js',
        ]
      },
      once: {
        singleRun: true
      }
    },

    run_wash: {
      main: {}
    }
  });

  // Just transpile.
  grunt.registerTask('transpile', ['clean',
                                   'make_dir_module',
                                   'es6_transpile']);

  // Static check with closure compiler.
  grunt.registerTask('check', ['make_dir_module', 'closure-compiler:check']);
  grunt.registerTask('check-watch', ['watch:check']);

  grunt.registerTask('dist', ['transpile',
                              'concat:axiom', 
                              'concat:wash']);

  // Transpile and test.
  grunt.registerTask('test', ['transpile',
                              'make_main_module:test',
                              'karma:once']);
  grunt.registerTask('test-watch', ['clean',
                                    'watch:test']);

  // Static check, transpile, test, repeat on changes.
  grunt.registerTask('check-test-watch', ['clean', 'watch:check_test']);

  // Build, then run wash from node.js
  grunt.registerTask('wash', ['clean', 'make_dir_module', 'es6_transpile:cjs',
                              'run_wash']);

  grunt.registerTask('default', ['check', 'test']);

  // Sample apps
  grunt.registerTask('samples_use_globals', ['copy:samples_use_globals_files']);

  grunt.registerTask('samples_web_app', ['copy:samples_web_app_files',
                                         'make_html_index:samples_web_app']);

  grunt.registerTask('samples', ['dist',
                                 'samples_web_app',
                                 'samples_use_globals']);
};