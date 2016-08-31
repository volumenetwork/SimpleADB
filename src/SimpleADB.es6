'use strict';

import bunyan from 'bunyan';
import ChildProcess from 'child_process';
import os from 'os';
import _ from 'lodash';
import commandExists from 'command-exists';
import detect from 'async/detect';

var potentialCommands = [
    'adb',
    '/usr/local/android/android-sdk-linux/platform-tools/adb',
    '/usr/local/android-sdk/tools/adb',
    '/usr/local/android/platform-tools/adb',
    '/bin/adb'
];

/**
 * @class SimpleADB
 */
export class SimpleADB {

    /**
     *
     * @constructor
     *
     * @param {bunyan} [opts.logger]
     * @param {string} [opts.logLevel]
     *
     * @public
     */
    constructor (opts) {
        opts = opts || {};

        this.logger = opts.logger || bunyan.createLogger({
            name: 'SimpleADB',
            stream: process.stdout,
            level: opts.logLevel || 'info' 
        });

        if (opts.path) {
            potentialCommands.push(opts.path);
        }

    }

    fetchAdbCommand () {
        return new Promise( (resolve, reject) => {
            detect(potentialCommands, (v, cb) => {

                commandExists(v, (err, result) => {
                    if (err) {
                        return cb(err);
                    }

                    return cb(null, result);
                });

                
            }, (err, result) => {
                if (err) {
                    return reject(err);
                }

                return resolve(result);
            });
            
        });
    }

    /**
     * @method connect
     *
     * @param {string} ipAddress
     *
     * @return {Promise}
     *
     * @public
     */
    connect (ipAddress) {
        var self = this;

        //make sure that adb is disconnected first!
        return self.disconnect()
            .then(function () {
                return self.execAdbCommand(['connect', ipAddress]);
            });
    }

    /**
     * @method disconnect
     *
     * @return {Promise}
     *
     * @public
     */
    disconnect () {
        return this.execAdbCommand(['disconnect']);
    }

    /**
     *
     * @method startApp
     *
     * @param {string} packageName
     * @param {string} launchName
     *
     * @return {Promise}
     *
     * @public
     */
    startApp (packageName, launchName) {
        var appName = packageName + '/' + launchName;

        this.logger.info('Starting App: ' + appName);

        return this.execAdbShellCommand(['am', 'start', appName]);
    }

    /**
     * @method forceStopApp
     *
     * @param {string} packageName
     *
     * @return {Promise}
     *
     * @public
     */
    forceStopApp (packageName) {
        this.logger.info('Force stopping: ' + packageName);
        return this.execAdbShellCommand(['am', 'force-stop', packageName]);
    }

    /**
     * Method to restart an app
     *
     * @method restartApp
     *
     * @param {string} packageName
     * @param {string} launchName
     *
     * @return {Promise}
     *
     * @public
     */
    restartApp (packageName, launchName) {
        var self = this;

        this.logger.info('Restarting App: ' + packageName + '/' + launchName);

        return self.forceStopApp(packageName)
            .then(function () {
                self.startApp(packageName, launchName);
            });
    }

    /**
     * @method reboot
     *
     * @return {Promise}
     *
     * @public
     */
    reboot () {
        this.logger.info('Rebooting');
        return this.execAdbCommand(['reboot']);
    }

    /**
     * @method shutdown
     *
     * @return {Promise}
     *
     * @public
     */
    shutdown () {
        this.logger.info('Shutting down');
        return this.execShellAdbCommand(['input', 'keyevent', 'KEYCODE_POWER']);
    }


    /**
     * copy file from android device to local machien
     *
     * @method pull
     * 
     * @param String filePath
     * @param String to
     *
     * @return {Promise}
     *
     * @public
     */
    pull (filePath, to) {
        this.logger.info('Copying file from "' + filePath + '" on device to "' + to + '"' );
        return this.execAdbCommand(['pull', filePath, to]);
    }

    /**
     * copy file from local machine to android device
     *
     * @method push
     * 
     * @param String filePath
     * @param String to
     *
     * @return {Promise}
     *
     * @public
     */
    push (filePath, to) {
        this.logger.info('Copying file from "' + filePath + '" to "' + to + '" on device' );
        return this.execAdbCommand(['push', filePath, to]);
    }

    /**
     * @method ls
     * 
     * @return {Promise}
     *
     * TODO: 
     *
     * @public
     */
    ls (dir) {
        this.logger.info('ls for dir: ' + dir);
        return this.execAdbShellCommandAndCaptureOutput(['ls', dir]);
    }

    /**
     * @method captureScreenshot
     *
     * @param String to
     *
     * @return {Promise}
     *
     * @public
     */
    captureScreenshot (to) {
        var self = this;
        to = to || os.homedir(); 

        this.logger.info('taking a screenshot');
        return this.execAdbShellCommand(['screencap', '-p', '/sdcard/screen.png'])
            .then( () => {
                return self.pull('/sdcard/screen.png', to)
            })
            .then( () => {
                return self.rm('/sdcard/screen.png');
            });
    }

    /**
     * Method to delete a file from the connected device
     *
     * @method rm
     * 
     * @param filePath String
     *
     * @return {Promise}
     *
     * @public
     */
    rm (filePath) {
        this.logger.info('deleting file on device: ' + filePath);
        return this.execAdbShellCommand(['rm', filePath]);
    }

    /**
     * @method execAdbShellCommand
     * 
     * @param args Array
     *
     * @return {Promise}
     *
     * @public
     */
    execAdbShellCommand(args) {
        return this.execAdbCommand(['shell'].concat(args));
    }

    /**
     * @method execAdbShellCommandAndCaptureOutput
     * 
     * @param args Array
     *
     * @return {Promise}
     *
     * @public
     */
    execAdbShellCommandAndCaptureOutput(args) {
        return this.execAdbCommandAndCaptureOutput(['shell'].concat(args));
    }

    /**
     *
     * @method execAdbCommand
     *
     * @param {Array} [args]
     *
     * @return {Promise}
     *
     * @public
     */
    execAdbCommandAndCaptureOutput (args) {
        var self = this;

        return new Promise(function (resolve, reject) {

            self.fetchAdbCommand()
                .then( cmd => {

                    var result  = [];
                    var proc    = ChildProcess.spawn(cmd, args || null);

                    proc.stdout.on('data', data => {
                        data = data.toString().split('\n');
                        
                        //remove blank lines
                        result = _.reject(result.concat(data), v => {
                            return v === ''
                        });

                        //remove \n at the end of lines
                        result = _.map (result, v => {
                            return v.trim('\n');
                        });
                    });

                    proc.on('close', code => {
                        if (parseInt(code) !== 0) {
                            self.logger.error('ADB command `adb ' + args.join(' ') + '` exited with code:' + code);
                        }

                        return parseInt(code) === 0 ? resolve(result) : reject();
                    });

                });
        });

    };

    /**
     *
     * @method execAdbCommand
     *
     * @param {Array} [args]
     *
     * @return {Promise}
     *
     * @public
     */
    execAdbCommand (args) {
        var self = this;

        return new Promise(function (resolve, reject) {

            self.fetchAdbCommand()
                .then( cmd => {

                    var proc = ChildProcess.spawn(cmd, args || null);

                    proc.on('close', (code) => {
                        if (parseInt(code) !== 0) {
                            self.logger.error('ADB command `adb ' + args.join(' ') + '` exited with code:' + code);
                        }

                        return parseInt(code) === 0 ? resolve() : reject();
                    });

                });
            
        });

    };
}
