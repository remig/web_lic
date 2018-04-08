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
			'radians', 'emptyNode', 'geom', 'clone', 'sort', 'formatTime', 'titleCase', 'prettyPrint'
		]);
		assert.hasAllKeys(util.array, ['insert', 'remove', 'removeIndex', 'chunk', 'eq']);
		assert.hasAllKeys(util.geom, ['bbox', 'expandBox', 'distance', 'midpoint']);
		assert.hasAllKeys(util.sort, ['numeric']);
		assert.hasAllKeys(util.sort.numeric, ['ascending', 'descending']);
	});

	after(function() { });
});
