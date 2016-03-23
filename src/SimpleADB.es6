'use strict';

import bunyan from 'bunyan';
import ChildProcess from 'child_process';

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
            level: opts.logLevel || 'error' 
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

        return this.execAdbCommand(['shell', 'am', 'start', appName]);
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
        return this.execAdbCommand(['shell', 'am', 'force-stop', packageName]);
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
        return this.execAdbCommand(['shell', 'input', 'keyevent', 'KEYCODE_POWER']);
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
    execAdbCommand (args) {
        var self = this;

        return new Promise(function (resolve, reject) {

            var proc = ChildProcess.spawn('adb', args || null);

            proc.on('close', function (code) {
                if (parseInt(code) !== 0) {
                    self.logger.error('ADB command `adb ' + args.join(' ') + '` exited with code:' + code);
                }

                return parseInt(code) === 0 ? resolve() : reject();
            });
        });

    };
}
