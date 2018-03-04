/* global require: false, describe: false, it: false, before: false, after: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;

const util = require('../../src/util');

describe('Test util module', function() {

	before(function() { });

	it('util exists with all public API', () => {
		assert.hasAllKeys(util, [
			'isEmpty', 'toArray', 'array', 'itemEq', 'get', 'measureLabel', 'fontToFontParts', 'degrees',
			'radians', 'emptyNode', 'geom', 'draw', 'clone', 'sort', 'formatTime', 'prettyPrint'
		]);
		assert.hasAllKeys(util.array, ['insert', 'remove', 'eq']);
		assert.hasAllKeys(util.geom, ['bbox', 'expandBox', 'distance']);
		assert.hasAllKeys(util.draw, ['arrow', 'roundedRect']);
		assert.hasAllKeys(util.sort, ['numeric']);
		assert.hasAllKeys(util.sort.numeric, ['ascending', 'descending']);
	});

	after(function() { });
});