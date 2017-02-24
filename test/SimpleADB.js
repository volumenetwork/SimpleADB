/**
 * Created by james on 24/02/2017.
 */

'use strict';

import {SimpleADB} from '../src/SimpleADB';
import {assert} from 'chai';

describe('Constructor', function() {

    describe('Can create new instance of SimpleADB', function() {
        it('should return an instance of SimpleADB when given no arguements', function() {
            let sadb = new SimpleADB();
            assert.typeOf(sadb, 'object');
            assert.typeOf(sadb.logger, 'object');
        });

        it('should be able to return a new SimpleADB instance with a custom path', function () {
            let sadb = new SimpleADB({
                path: 'foo'
            });

            assert.typeOf(sadb, 'object');
            assert.typeOf(sadb.logger, 'object');
        });
    });

});