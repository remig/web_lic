/* global global: false, require: false, describe: false, before: false, after: false, it: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const sinon = require('sinon');

const LDParse = require('../../src/LDParse');

const fakeLDConfig = `
0 LDraw.org Configuration File
0                              // LEGOID  26 - Black
0 !COLOUR Black                                                 CODE   0   VALUE #05131D   EDGE #595959
0                              // LEGOID  23 - Bright Blue
0 !COLOUR Blue                                                  CODE   1   VALUE #0055BF   EDGE #333333
0                              // LEGOID  28 - Dark Green
0 !COLOUR Green                                                 CODE   2   VALUE #257A3E   EDGE #333333
0 // LDraw Internal Common Material Colours
0 !COLOUR Main_Colour                                           CODE  16   VALUE #7F7F7F   EDGE #333333
0 !COLOUR Edge_Colour                                           CODE  24   VALUE #7F7F7F   EDGE #333333
0`;

const fakeParts = {
	'3004.dat': `
0 Brick  1 x  2
0 Name: 3004.dat

0 BFC INVERTNEXT
1 16 0 24 0 16 0 0 0 -20 0 0 0 6 box5.dat

4 16 20 24 10 16 24 6 -16 24 6 -20 24 10
4 16 -20 24 10 -16 24 6 -16 24 -6 -20 24 -10
4 16 -20 24 -10 -16 24 -6 16 24 -6 20 24 -10
4 16 20 24 -10 16 24 -6 16 24 6 20 24 10

1 16 0 24 0 20 0 0 0 -24 0 0 0 10 box5.dat

1 16 10 0 0 1 0 0 0 1 0 0 0 1 stud.dat
1 16 -10 0 0 1 0 0 0 1 0 0 0 1 stud.dat
0`,
	'box5.dat': `
0 Box with 5 Faces and All Edges
0 Name: box5.dat

0 BFC CERTIFY CCW
2 24 1 1 1 -1 1 1
2 24 -1 1 1 -1 1 -1
2 24 -1 1 -1 1 1 -1
2 24 1 1 -1 1 1 1
2 24 1 0 1 -1 0 1
2 24 -1 0 1 -1 0 -1
2 24 -1 0 -1 1 0 -1
2 24 1 0 -1 1 0 1
2 24 1 0 1 1 1 1
2 24 -1 0 1 -1 1 1
2 24 1 0 -1 1 1 -1
2 24 -1 0 -1 -1 1 -1
4 16 -1 1 1 1 1 1 1 1 -1 -1 1 -1
4 16 -1 1 1 -1 0 1 1 0 1 1 1 1
4 16 -1 1 -1 -1 0 -1 -1 0 1 -1 1 1
4 16 1 1 -1 1 0 -1 -1 0 -1 -1 1 -1
4 16 1 1 1 1 0 1 1 0 -1 1 1 -1`,
	'stud.dat': `
0 Stud
0 Name: stud.dat

0 BFC CERTIFY CCW
1 16 0 0 0 6 0 0 0 1 0 0 0 6 4-4edge.dat
1 16 0 -4 0 6 0 0 0 1 0 0 0 6 4-4edge.dat`,
	'4-4edge.dat': `
0 Circle 1.0
0 Name: 4-4edge.dat
0 Author: James Jessiman
 2 24 1 0 0 0.9239 0 0.3827
 2 24 0.9239 0 0.3827 0.7071 0 0.7071
 2 24 0.7071 0 0.7071 0.3827 0 0.9239
 2 24 0.3827 0 0.9239 0 0 1
 2 24 0 0 1 -0.3827 0 0.9239
 2 24 -0.3827 0 0.9239 -0.7071 0 0.7071
 2 24 -0.7071 0 0.7071 -0.9239 0 0.3827
 2 24 -0.9239 0 0.3827 -1 0 -0
 2 24 -1 0 -0 -0.9239 0 -0.3827
 2 24 -0.9239 0 -0.3827 -0.7071 0 -0.7071
 2 24 -0.7071 0 -0.7071 -0.3827 0 -0.9239
 2 24 -0.3827 0 -0.9239 0 0 -1
 2 24 0 0 -1 0.3827 0 -0.9239
 2 24 0.3827 0 -0.9239 0.7071 0 -0.7071
 2 24 0.7071 0 -0.7071 0.9239 0 -0.3827
 2 24 0.9239 0 -0.3827 1 0 0
0`
};

let xhr, server;

describe('Test LDParse module', function() {

	before(function() {
		server = sinon.fakeServer.create();
		server.respondImmediately = true;
		global.XMLHttpRequest = xhr = sinon.useFakeXMLHttpRequest();
	});

	it('LDParse exists with all public API and empty part & color tables', () => {
		assert.exists(LDParse);
		assert.exists(LDParse.loadRemotePart);
		assert.exists(LDParse.loadPartContent);
		assert.exists(LDParse.loadLDConfig);
		assert.exists(LDParse.setPartDictionary);
		assert.exists(LDParse.partDictionary);
		assert.isEmpty(LDParse.partDictionary);
		assert.exists(LDParse.colorTable);
		assert.isEmpty(LDParse.colorTable);
		assert.exists(LDParse.getColor);
		assert.exists(LDParse.model);
		assert.exists(LDParse.model.get);
		assert.exists(LDParse.model.get.partCount);
		assert.exists(LDParse.model.get.submodelDescendant);
		assert.exists(LDParse.model.get.submodels);
	});

	it('setPartDictionary() should work', () => {
		LDParse.setPartDictionary({a: 10, b: 20});
		assert.deepEqual(LDParse.partDictionary, {a: 10, b: 20});
	});

	describe('loadLDConfig() should work', () => {

		it('Non-existent LDConfig should return empty color table', () => {
			server.respondWith(/ldconfig\.ldr/ig, [404, {'Content-Type': 'text/plain'}, '']);
			const colorTable = LDParse.loadLDConfig();
			assert.exists(colorTable);
			assert.isEmpty(colorTable);
		});

		it('Load sample LDConfig file', () => {
			server.respondWith(/ldconfig\.ldr/ig, [200, {'Content-Type': 'text/plain'}, fakeLDConfig]);
			const colorTable = LDParse.loadLDConfig();
			assert.isNotEmpty(colorTable);
			assert.exists(colorTable[0]);
			assert.exists(colorTable[1]);
			assert.exists(colorTable[2]);
			assert.deepEqual(colorTable[0], {name: 'Black', color: 332573, edge: 5855577});
			assert.deepEqual(colorTable[1], {name: 'Blue', color: 21951, edge: 3355443});
			assert.deepEqual(colorTable[2], {name: 'Green', color: 2456126, edge: 3355443});
			assert.deepEqual(colorTable[16], {name: 'Main_Colour', color: -1, edge: -1});
			assert.deepEqual(colorTable[24], {name: 'Edge_Colour', color: -1, edge: -1});
		});

		it('getColor() should work', () => {
			assert.equal(LDParse.getColor(), 0);
			assert.equal(LDParse.getColor(0), 0);
			server.respondWith(/ldconfig\.ldr/ig, [200, {'Content-Type': 'text/plain'}, fakeLDConfig]);
			LDParse.colorTable = LDParse.loadLDConfig();
			assert.equal(LDParse.getColor(0), 332573);
			assert.equal(LDParse.getColor(0, 'color'), 332573);
			assert.equal(LDParse.getColor(0, 'edge'), 5855577);
			assert.equal(LDParse.getColor(16), -1);
			assert.equal(LDParse.getColor(44), 0);
			assert.equal(LDParse.getColor(null), 0);
		});
	});

	describe('Load basic part content', () => {

		it('Gracefully handle empty / bad part content', () => {
			LDParse.setPartDictionary({});
			assert.isEmpty(LDParse.partDictionary);
			assert.isNull(LDParse.loadPartContent(''));
			assert.isNull(LDParse.loadPartContent('\n'));
		});

		it('Load non-nested part', () => {
			LDParse.setPartDictionary({});
			assert.isEmpty(LDParse.partDictionary);
			const part = LDParse.loadPartContent(fakeParts['4-4edge.dat']);
			assert.isNotEmpty(part);
			assert.equal(part.name, 'Circle 1.0');
			assert.equal(part.filename, '4-4edge.dat');
			assert.isEmpty(part.parts);
			assert.equal(part.primitives.length, 16);
			assert.deepEqual(part.primitives[0], {shape: 'line', colorCode: -1, points: [1, 0, 0, 0.9239, 0, 0.3827]});
			assert.deepEqual(LDParse.partDictionary, {'4-4edge.dat': part});
		});

		it('Gracefully handle missing parts', () => {
		});

		it('Load nested parts', () => {
		});
	});

	after(function() {
		xhr.restore();
		server.restore();
	});
});
