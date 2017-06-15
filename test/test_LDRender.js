/* global require: false, describe: false, before: false, after: false, it: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;

const THREE = require('../lib/three');
const LDParse = require('../src/LDParse');
const LDRender = require('../src/LDRender');

describe('Test LDRender module', function() {

	before(function() { });

	it('Three.js imported successfully', () => {
		assert.exists(THREE);
		assert.exists(THREE.WebGLRenderer);
	});

	it('LDParse and LDRender imported successfully, with all necessary API', () => {
		assert.exists(LDParse);
		assert.exists(LDParse.loadLDConfig);
		assert.exists(LDRender);
		assert.exists(LDRender.renderPart);
		assert.exists(LDRender.renderModel);
		assert.exists(LDRender.measureModel);
		assert.exists(LDRender.measurePart);
		assert.exists(LDRender.renderModelData);
		assert.exists(LDRender.renderPartData);
		assert.exists(LDRender.setPartDictionary);
		assert.exists(LDRender.partDictionary);
		assert.isEmpty(LDRender.partDictionary);
		assert.exists(LDRender.geometryDictionary);
		assert.isEmpty(LDRender.geometryDictionary);
	});

	it('Don\'t crash on invalid page navigation', () => {
	});

	it('Should store state via mutations', () => {
	});

	after(function() { });
});
