'use strict';

import bunyan from 'bunyan';
import ChildProcess from 'child_process';
import os from 'os';
import _ from 'lodash';
import commandExists from 'command-exists';
import detect from 'async/detect';
import Promise from 'bluebird';

let potentialCommands = [
    'adb',
    '/usr/local/android/android-sdk-linux/platform-tools/adb',
    '/usr/local/android-sdk/tools/adb',
    '/usr/local/android/platform-tools/adb',
    '/bin/adb'
];

const timeoutMs = 5000;
const defaultAdbPort = 5555;

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

        this.adbDevice = '';

        if (opts.path) {
            potentialCommands.push(opts.path);
        }

    }

    /**
     * Method to get what the command is for adb as it can vary!
     *
     * @method fetchAdbCommand
     *
     * @return {Promise}
     *
     * @private
     *
     * @async
     */
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
        this.adbDevice = `${ ipAddress }:${ defaultAdbPort }`;

        return this.execAdbCommand(['connect', ipAddress]);
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
        let appName = packageName + '/' + launchName;

        this.logger.info('Starting App: ' + appName);

        return this.execAdbShellCommand(['am', 'start', appName]);
    }

    /**
     * Method to start an app when you do not know the launch name
     *
     * @method startAppByPackageName
     *
     * @param {String} packageName
     *
     * @return {Promise}
     *
     * @public
     */
    startAppByPackageName (packageName) {
        this.logger.info('Starting App by packagename: ' + packageName);

        return this.execAdbShellCommand([
            'monkey',
            '-p',
            packageName,
            '-c',
            'android.intent.category.LAUNCHER',
            '1;'
        ])
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
        let self = this;

        this.logger.info('Restarting App: ' + packageName + '/' + launchName);

        return self.forceStopApp(packageName)
            .then(function () {
                return self.startApp(packageName, launchName);
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
        let self = this;
        this.logger.info('Rebooting');

        return new Promise( function (resolve) {
                self.execAdbCommand(['reboot']);

                return setTimeout(resolve, 1000 * 30);
        });

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
     * @param {String} filePath
     * @param {String} to
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
     * @param {String} filePath
     * @param {String} to
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
     * @param {String} to
     *
     * @return {Promise}
     *
     * @public
     */
    captureScreenshot (to) {
        let self = this;
        to = to || os.homedir() + 'screenshot.png';

        let fileName = to.split('/').pop();

        this.logger.info('taking a screenshot');
        return this.execAdbShellCommand(['screencap', '-p', '/sdcard/' + fileName])
            .then( () => {
                return self.pull('/sdcard/' + fileName, to.substring(0, to.lastIndexOf("/")) + '/');
            })
            .then( () => {
                return self.rm('/sdcard/' + fileName);
            });
    }

    /**
     * Method to delete a folder and it's contents from the connected device
     *
     * @method rmDir
     *
     * @param folderPath String
     *
     * @return {Promise}
     *
     * @public
     */
    rmDir (folderPath) {
        this.logger.info('deleting folder on device: ' + folderPath);
        return this.execAdbShellCommand(['rm', '-Rf', folderPath]);
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
        return this.execAdbShellCommand(['rm', '-f', filePath]);
    }

    /**
     * Method to move a file or folder
     *
     * @method mv
     *
     * @param {String} from - path from
     * @param {String} to - path to
     *
     * @return {Promise}
     *
     * @public
     */
    mv (from, to) {
        this.logger.info('moving: ' + from + 'to: ' + to);
        return this.execAdbShellCommand(['mv', from, to]);
    }

    /**
     * Method to change owner of a file or folder
     *
     * @method chown
     *
     * @param {String} path - path of file or folder
     * @param {String} user - user that will own the file or folder
     * @param {Boolean} opts.recursive - set to true if operation should be performed recursively
     *
     * @return {Promise}
     *
     * @public
     */
    chown (path, user, group, opts) {
        opts = opts || {
            recursive: true,
            busybox: true
        };

        let args = [];

        if (opts.busybox) {
            args.push('busybox');
        }

        args.push('chown');


        if (opts.recursive === true) {
            args.push('-R');
        }

        args.push(user+':'+group);
        args.push(path);

        return this.execAdbShellCommand(args);
    }

    /**
     * Method to does an ls -la on the data folder for the given application
     *
     * @method fetchApplicationDataFolderInfo
     *
     * @param {String} packageName
     *
     * @return {Promise}
     *
     * @public
     */
    fetchApplicationDataFolderInfo (packageName) {
        return this.execAdbShellCommandAndCaptureOutput(['busybox', 'ls', '-l', '-n', '/data/data/', '|', 'grep', '"' + packageName + '"']);
    }

    /**
     * Method to find the user that represents an application
     *
     * @method fetchApplicationUser
     *
     * @param {String} packageName
     *
     * @return {Promise}
     *
     * @public
     */
    fetchApplicationUser (packageName) {
        let appUserIndex = 2;

        return this.fetchApplicationDataFolderInfo(packageName)
            .then(function (result) {
                return _.compact(result[0].split(' '))[appUserIndex];
            });
    }

    /**
     * Method to find the group that represents an application
     *
     * @method fetchApplicationGroup
     *
     * @param {String} packageName
     *
     * @return {Promise}
     *
     * @public
     */
    fetchApplicationGroup (packageName) {
        let appGroupIndex = 3;

        return this.fetchApplicationDataFolderInfo(packageName)
            .then(function (result) {
                return _.compact(result[0].split(' '))[appGroupIndex];
            });
    }

    /**
     * Method to check if a package is installed
     *
     * @method isInstalled
     *
     * @param {String} packageName
     *
     * @return {Promise}
     *
     * @public
     */
    isInstalled (packageName) {
        return this.fetchInstalledPackageNames()
            .then( function (installedApps) {
                installedApps = installedApps || [];

                return _.map(installedApps, function (v) {
                    return v.split(':').pop();
                });
            })
            .then( function (installedApps) {
                return installedApps.indexOf(packageName) >= 0;
            });
    }

    /**
     * Method that resolve when isInstalled becomes true
     *
     * @method resolveWhenInstalled
     *
     * @param {String} packageName
     *
     * @return {Promise}
     *
     * @public
     */
    resolveWhenInstalled (packageName) {
        let self = this,
            retries = 0,
            maxRetries = 60,
            pid = null,
            wait = 5 * 1000;

        return new Promise(function (resolve, reject) {

            let isInstalledCheck = function () {
                if (pid !== null ) {
                    clearTimeout(pid);
                }

                self.isInstalled(packageName)
                    .then(function(isInstalled) {
                        if (isInstalled === true) {
                            return resolve();
                        }

                        if (retries >= maxRetries) {
                            return reject(new Error('Hit max reties on wait for package name to appear'));
                        }

                        pid = setTimeout(isInstalledCheck, wait);
                    })
            }

            isInstalledCheck();
        });
    }

    /**
     * Method to install an app from a locally store apk file
     *
     * @method install
     *
     * @param {String} localFile - full path to local file to copy and install
     * @param {String} devicePath - path of where to copy the file to before installing
     * @param {String} packageName - packageName of the application
     * @param {String} launchName - launchName for the application
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */
    install(localFile, devicePath, packageName, launchName) {
        let self = this;

        return self.push(localFile, devicePath)
            .then( function () {
                return self.forceStopApp(packageName);
            })
            .then( function () {
                return self.execAdbShellCommand([
                    'pm',
                    'install',
                    '-r',
                    devicePath + localFile.split('/').pop()
                ]);
            })
            .then( function () {
                if (launchName) {
                    return self.startApp(packageName, launchName);
                } else {
                    return Promise.resolve();
                }
            });
    }

    /**
     * Method to uninstall an app
     *
     * @method uninstall
     *
     * @param {String} packageName - packageName of the application
     * @param {Boolean} cleanUp - remove cached data too
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */
    uninstall (packageName, cleanUp) {
        let self = this,
            args = ['pm', 'uninstall'];

        cleanUp = cleanUp || false;

        if (cleanUp !== true) {
            args.push('-k');
        }

        args.push(packageName);

        return self.forceStopApp(packageName)
            .then(function () {
                return self.execAdbShellCommand(args);
            });
    }

    /**
     * Method to upgrade an app
     *
     * @method upgrade
     *
     * @param {String} localFile - full path to local file to copy and install
     * @param {String} devicePath - path of where to copy the file to before installing
     * @param {String} packageName - packageName of the application
     * @param {String} launchName - launchName for the application
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */
    upgrade (localFile, devicePath, packageName, launchName) {
        let self = this;

        return self.uninstall(packageName, false)
            .then(self.install.bind(self, localFile, devicePath, packageName, launchName));
    }

    /**
     *
     * Method to fetch a list of all installed packages names on the device
     *
     * @method fetchInstalledPackageNames
     *
     * @param {Object} opts
     *
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */
    fetchInstalledPackageNames (opts) {
        let args = ['pm','list','packages'],
            defaults = {
                'systemOnly': false,
                'thirdPartyOnly': true,
                'paths': false,
                'allDisabled': false,
                'allEnabled': false
            },
            flags = {
                'systemOnly': '-s',
                'thirdPartyOnly': '-3',
                'paths': '-f',
                'allDisabled': '-d',
                'allEnabled': '-e'
            };

        opts = _.assign(defaults, opts || {});

        _.forEach(opts, (v, k) =>{
            if (v === true) {
                args.push(flags[k]);
            }
        });

        return this.execAdbShellCommandAndCaptureOutput(args)
            .then(_.compact);
    }

    /**
     * Method to get the resolution of the android device
     *
     * @method fetchResolution
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */
    fetchResolution () {
        return this.execAdbShellCommandAndCaptureOutput(['cat', '/sys/class/display/display0.HDMI/mode'])
            .then( (result) => {
                return (_.isArray(result)) ? result.pop() : result;
            });
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
        let self = this;

        return new Promise(function (resolve, reject) {

            self.fetchAdbCommand()
                .then( cmd => {
                    let deviceArgs = self.getDeviceArgs(args);
                    let result  = [];
                    let proc    = ChildProcess.spawn(cmd, deviceArgs);

                    proc.stdout.on('data', data => {
                        data = data.toString().split('\n');

                        //remove blank lines
                        result = _.reject(result.concat(data), v => {
                            return v === '';
                        });

                        //remove \n at the end of lines
                        result = _.map (result, v => {
                            return v.trim('\n');
                        });
                    });

                    proc.on('close', code => {
                        if (parseInt(code) !== 0) {
                            self.logger.error('ADB command `adb ' + deviceArgs.join(' ') + '` exited with code:' + code);
                        }

                        return parseInt(code) === 0 ? resolve(result) : reject();
                    });

                })
                .timeout(timeoutMs)
                .catch(Promise.TimeoutError, function(e) {
                    console.log('could not execute within ' + timeoutMs);
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
        let self = this;

        return new Promise(function (resolve, reject) {

            self.fetchAdbCommand()
                .then( cmd => {
                    let deviceArgs = self.getDeviceArgs(args);
                    let proc = ChildProcess.spawn(cmd, deviceArgs);

                    proc.on('close', (code) => {

                        if (parseInt(code) !== 0) {
                            self.logger.error('ADB command `adb ' + deviceArgs.join(' ') + '` exited with code:' + code);
                        }

                        return parseInt(code) === 0 ? resolve() : reject();
                    });

                })
                .timeout(timeoutMs)
                .catch(Promise.TimeoutError, function(e) {
                    console.log('could not execute within ' + timeoutMs);
                });

        });

    };

    /**
     *
     * @method getDeviceArgs
     *
     * @param {Array} [args]
     *
     * @return {Array}
     *
     * @public
     */
    getDeviceArgs (args) {
        return ['-s', this.adbDevice, ...args];
    };
}
