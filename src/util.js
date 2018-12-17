/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global _: false */
'use strict';

// Add a handful of useful utility functions to lodash
// TODO: A lot of these duplicate functionality in lodash; remove them
_.mixin({
	isEven(n) {
		return (typeof n === 'number') && isFinite(n) && !(n % 2);
	},
	insert(array, item, idx) {
		if (idx == null || idx === -1) {
			array.push(item);
		} else {
			array.splice(idx, 0, item);
		}
	},
	deleteItem(array, item) {
		const idx = array.indexOf(item);
		if (idx >= 0) {
			array.splice(idx, 1);
		}
	},
	count(array, serach) {
		let count = 0;
		for (let i = 0; i < array.length; i++) {
			if (array[i] === serach) {
				count++;
			}
		}
		return count;
	},
	itemEq(a, b) {
		return a && b && a.id === b.id && a.type === b.type && a.stepID === b.stepID;
	},
	measureLabel: (() => {
		const labelSizeCache = {};  // {font: {text: {width: 10, height: 20}}}
		return function(font, text) {
			if (labelSizeCache[font] && labelSizeCache[font][text]) {
				return _.cloneDeep(labelSizeCache[font][text]);
			}
			const container = document.getElementById('fontMeasureContainer');
			container.style.font = font;
			container.firstChild.textContent = text;
			let res = container.getBBox();
			res = {width: Math.ceil(res.width), height: Math.ceil(res.height)};
			labelSizeCache[font] = labelSizeCache[font] || {};
			labelSizeCache[font][text] = res;
			return _.cloneDeep(res);  // Always return a clone so we don't accidentally alter cached values
		};
	})(),
	fontToFontParts: (() => {

		/* eslint-disable max-len */
		const boldList = ['bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
		const sizeList = ['medium', 'xx-small', 'x-small', 'small', 'large', 'x-large', 'xx-large', 'smaller', 'larger'];
		const stretchList = ['ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded'];
		/* eslint-enable max-len */

		return function(font = '') {
			const fullFontParts = {
				fontStyle: '', fontVariant: '', fontWeight: '',
				fontStretch: '', fontSize: '', fontFamily: []
			};
			let haveFontSize = false;
			font = (font || '') + '';

			const fontParts = font.split(/ (?=(?:[^'"]|'[^']*'|"[^"]*")*$)/);
			fontParts.map(el => {
				if (!el || typeof el !== 'string') {
					return;
				}
				const elLower = el.toLowerCase();
				if (elLower === 'italic' || elLower === 'oblique') {
					fullFontParts.fontStyle = el;
				} else if (elLower === 'small-caps') {
					fullFontParts.fontVariant = el;
				} else if (boldList.includes(elLower)) {
					fullFontParts.fontWeight = el;
				} else if (stretchList.includes(elLower)) {
					fullFontParts.fontStretch = elLower;
				} else if (sizeList.includes(elLower)) {
					fullFontParts.fontSize = elLower;
					haveFontSize = true;
				} else if (el) {
					if (!haveFontSize) {
						fullFontParts.fontSize = el;
						haveFontSize = true;
					} else {
						fullFontParts.fontFamily.push(el);
					}
				}
			});
			fullFontParts.fontFamily = fullFontParts.fontFamily.join(' ');
			return fullFontParts;
		};
	})(),
	fontPartsToFont({
		fontStyle = '', fontVariant = '', fontWeight = '',
		fontStretch = '', fontSize = '', fontFamily = ''
	} = {}) {
		return [
			fontStyle, fontVariant, fontWeight, fontStretch, fontSize, fontFamily.trim()
		].filter(el => el !== '').join(' ').trim();
	},
	fontString({size, family, bold, italic}) {
		return _.fontPartsToFont({
			fontSize: size + 'pt',
			fontFamily: family,
			fontWeight: bold ? 'bold' : null,
			fontStyle: italic ? 'italic' : null
		});
	},
	degrees(radians) {
		return radians * 180 / Math.PI;
	},
	radians(degrees) {
		return degrees * Math.PI / 180;
	},
	emptyNode(node) {
		if (node) {
			while (node.firstChild) {
				node.removeChild(node.firstChild);
			}
		}
	},
	units: (() => {
		const unitConversions = {  // this conversion factor * pixel count = units
			point: 0.75,
			'in': 0.75 / 72,
			mm: 0.75 / 72 * 25.4,
			cm: 0.75 / 72 * 2.54
		};
		function units() {}
		units.pixelsToUnits = function(pixelCount, units) {
			return pixelCount * unitConversions[units];
		};
		units.unitsToPixels = function(unitCount, units) {
			return unitCount / unitConversions[units];
		};
		units.pointsToUnits = function(pointCount, units) {
			const pixels = _.units.unitsToPixels(pointCount, 'point');
			return _.units.pixelsToUnits(pixels, units);
		};
		units.unitToPoints = function(unitCount, units) {
			const pixels = _.units.unitsToPixels(unitCount, units);
			return _.units.pixelsToUnits(pixels, 'point');
		};
		return units;
	})(),
	geom: (() => {
		function geom() {}
		geom.bbox = function(points) {
			let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
			for (let i = 0; i < (points || []).length; i++) {
				const p = points[i];
				minX = Math.min(minX, p.x);
				minY = Math.min(minY, p.y);
				maxX = Math.max(maxX, p.x);
				maxY = Math.max(maxY, p.y);
				if (p.hasOwnProperty('width')) {
					maxX = Math.max(maxX, p.x + p.width);
				}
				if (p.hasOwnProperty('height')) {
					maxY = Math.max(maxY, p.y + p.height);
				}
			}
			return {
				x: minX, y: minY,
				width: maxX - minX, height: maxY - minY
			};
		};
		geom.expandBox = function(box, minWidth, minHeight) {
			box = _.cloneDeep(box);
			if (Math.floor(box.width) < 1) {
				box.width = minWidth;
				box.x -= minWidth / 2;
			}
			if (Math.floor(box.height) < 1) {
				box.height = minHeight;
				box.y -= minHeight / 2;
			}
			return box;
		};
		geom.moveBoxEdge = function(box, edge, dt) {
			switch (edge) {
				case 'top':
					box.y += dt;
					box.height -= dt;
					break;
				case 'right':
					box.width += dt;
					break;
				case 'bottom':
					box.height += dt;
					break;
				case 'left':
					box.x += dt;
					box.width -= dt;
					break;
			}
		};
		geom.distance = (p1, p2) => {
			if (typeof p1 === 'number' && typeof p2 === 'number') {
				return Math.abs(p1 - p2);
			}
			return Math.sqrt(((p1.x - p2.x) ** 2) + ((p1.y - p2.y) ** 2));
		};
		geom.midpoint = (p1, p2) => {
			return {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2};
		};
		geom.arrow = () => {
			return {
				head: {
					length: 30,
					width: 7,
					insetDepth: 3
				},
				body: {
					width: 1.25
				}
			};
		};
		return geom;
	})(),
	version: (() => {
		function version() {}
		version.parse = (v) => {
			v = (v || '').split('.').map(v => parseInt(v, 10));
			return {major: v[0] || 0, minor: v[1] || 0, revision: v[2] || 0};
		};
		version.nice = (v) => {
			v = _.version.parse(v);
			return `${v.major}.${v.minor}`;
		};
		version.isOldVersion = (prev, current) => {
			prev = _.version.parse(prev);
			current = _.version.parse(current);
			if (prev.major !== current.major) {
				return prev.major < current.major;
			} else if (prev.minor !== current.minor) {
				return prev.minor < current.minor;
			}
			return prev.revision < current.revision;
		};
		return version;
	})(),
	sort: (() => {
		function sort() {}
		sort.numeric = () => {
			function numeric() {}
			numeric.ascending = (a, b) => {
				return a - b;
			};
			numeric.descending = (a, b) => {
				return b - a;
			};
			return numeric;
		};
		return sort;
	})(),
	formatTime(start, end) {
		const t = end - start;
		if (t >= 1000) {
			return (t / 1000).toFixed(2) + 's';
		}
		return t + 'ms';
	},
	color: (() => {
		function color() {}
		color.toRGB = (() => {
			const rgbLookupCache = {
				'#000000': [0, 0, 0]
			};
			return function(color) {
				let rgb;
				if (rgbLookupCache[color]) {
					rgb = rgbLookupCache[color];
				} else {
					// Browser quirk: set an element's color to any color string at all,
					// then getComputedStyle.color will return that same color as rgb() or rgba().
					// Greatly reduces the number of color strings to parse.
					const parent = document.getElementById('offscreenCache');

					// Set parent to black so that any invalid colors set on child will inherit this color
					parent.setAttribute('style', 'color: black;');

					const div = document.getElementById('openFileChooser');
					div.setAttribute('style', 'color: ' + color);
					rgb = window.getComputedStyle(div).color;
					rgb = rgb.match(/[a-z]+\((.*)\)/i)[1].split(',').map(parseFloat);
					rgbLookupCache[color] = rgb;
				}

				const res = {r: rgb[0], g: rgb[1], b: rgb[2]};
				if (rgb.length > 3) {
					res.a = rgb[3];
				}
				res.toString = function() {
					return (this.a == null)
						? `rgb(${this.r}, ${this.g}, ${this.b})`
						: `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
				};
				return res;
			};
		})();
		color.luma = (color) =>{
			color = _.color.toRGB(color);
			return (0.2126 * Math.pow(color.r / 255, 2.2))
				+ (0.7151 * Math.pow(color.g / 255, 2.2))
				+ (0.0721 * Math.pow(color.b / 255, 2.2));
		};
		color.opposite = (color) => {
			return (_.color.luma(color) < 0.18) ? 'white' : 'black';
		};
		color.isVisible = (color) => {
			if (!color || typeof color !== 'string') {
				return false;
			}
			color = _.color.toRGB(color);
			if (color.hasOwnProperty('a') && color.a === 0) {
				return false;
			}
			return true;
		};
		return color;
	})(),
	isBorderVisible(border) {
		if (!border || !border.width || border.width < 1 ||
			!border.color || typeof border.color !== 'string'
		) {
			return false;
		}
		return _.color.isVisible(border.color);
	}
});

export default _;
