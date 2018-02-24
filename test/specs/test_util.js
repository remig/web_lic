/* global require: false, describe: false, it: false, before: false, after: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;

const util = require('../../src/util');

describe('Test util module', function() {

	before(function() { });

	it('util exists with all public API', () => {
		assert.property(util, 'isEmpty');
		assert.property(util, 'toArray');
		assert.property(util, 'array');
		assert.hasAllKeys(util.array, ['insert', 'remove', 'eq']);
		assert.property(util, 'itemEq');
		assert.property(util, 'get');
		assert.property(util, 'measureLabel');
		assert.property(util, 'fontToFontParts');
		assert.property(util, 'emptyNode');
		assert.property(util, 'roundedRect');
		assert.property(util, 'clone');
		assert.property(util, 'sort');
		assert.hasAllKeys(util.sort, ['numeric']);
		assert.hasAllKeys(util.sort.numeric, ['ascending', 'descending']);
		assert.property(util, 'formatTime');
		assert.property(util, 'prettyPrint');
	});

	after(function() { });
});
