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
        this.execAdbCommand([
            'shell',
            'am',
            'start',
            packageName + '/' + launchName
        ]);
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
                self.logger.error('adb exited with code: ' + code)

                return parseInt(code) === 0 ? resolve() : reject();
            });
        });

    };
}
