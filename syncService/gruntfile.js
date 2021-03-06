'use strict';

module.exports = function (grunt) {

    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        env: {
            dev: {
                NODE_ENV: 'testing',
                PORT: '8081'
            }
        },
        clean: ['testResult/*.*'],
        mochaTest: {
            test: {
                options: {
                    reporter: 'xunit',
                    captureFile: 'testResult/xunit.xml', // Optionally capture the reporter output to a file
                    quiet: true, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: false, // Optionally clear the require cache before running tests (defaults to false),
                    timeout: 20000,
                    nodeOptions: ['--preserve-symlinks']
                },
                src: ['test/test/**/*.js']
            }
        },
        sonarRunner: {
            analysis: {
                options: {
                    separator: '\n',
                    sonar: {
                        projectKey: 'javascript-sonar-runner-myzel-server',
                        projectName: 'Myzel Server',
                        projectVersion: '0.1',
                        sources: 'controllers, models, server.js',
                        sourceEncoding: 'UTF-8',
                        language: 'js',
                        jdbc: {
                            url: 'jdbc:postgresql://localhost/sonarqube',
                            username: 'postgres',
                            password: ''
                        },
                        javascript: {
                            lcov: {
                                reportPath: 'coverage/lcov.info'
                            }
                        },
                        exclusions: ''
                    }
                }
            }
        },
        mocha_istanbul: {
            coverage: {
                src: ['test/test/**/*.js'],
                options: {
                    coverage: true,
                    coverageFolder: 'coverage',
                    reportFormats: ['lcovonly'],
                    timeout: 20000,
                    nodeOptions: ['--preserve-symlinks']
                }
            }
        }
    });

    grunt.registerTask('test', ['env:dev', 'clean', 'mochaTest:test']);
    grunt.registerTask('coverage', ['env:dev', 'clean', 'mocha_istanbul:coverage']);
    grunt.registerTask('analysis', ['sonarRunner:analysis']);

    let outputFile = process.env.MOCHA_OUTPUT_FILE || 'testResult/xunit.xml';
    grunt.registerTask('cleanXunitFile', 'Remove Mocha output from xunit file', function() {
        if (grunt.file.exists('./' + outputFile)) {
            let file = grunt.file.read('./' + outputFile);
            if (file.indexOf("<testsuite")) {
                grunt.file.write('./' + outputFile, file.substring(file.indexOf("<testsuite")));
            }
        }
        else {
            grunt.log.error("'cleanXunitFile' task was specified but file " + outputFile + " does not exist.");
        }
    });
};
