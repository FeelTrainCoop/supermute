'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      app: {
        src: ['lib/**/*.js', 'js/*.js', '*.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      app: {
        files: '<%= jshint.app.src %>',
        tasks: ['jshint:app', 'express:dev'],
        options: {
          spawn: false
        }
      }
    },
    express: {
      dev: {
        options: {
          script: 'index.js'
        }
      }
    }
  });

  // These plugins provide necessary tasks!
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express-server');

  // Default task.
  //grunt.registerTask('default', ['jshint', 'express:dev', 'watch']);
  grunt.registerTask('default', '', function() {
    var taskList = [
      'jshint'
    ];
    grunt.task.run(taskList);
  });
};
