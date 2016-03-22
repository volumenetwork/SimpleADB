'use strict';

import bunyan from 'bunyan';

export class SimpleADB {

    /**
     *
     * @param opts
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
     *
     * @param ipAddress
     */
    connect (ipAddress) {
        return new Promise(function (resolve, reject) {
            return resolve();    
        });
    }

    /**
     *
     */
    disconnect () {
        return new Promise(function (resolve, reject) {
            return resolve();
        });
    }

    /**
     *
     */
    restart () {

    }

    shutdown () {

    }
}
