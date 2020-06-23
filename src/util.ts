/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from 'lodash';

// These are used from lodash... not a lot...
// isEmpty, get, cloneDeep, assign, isEqual, round, clamp, last, pullAt
// forOwn, startCase, clone, each, some, unzip, chunk, range, count,
// difference, template, set

interface CacheInterface {
	[key: string]: any
}

type EdgeList = 'top' | 'right' | 'bottom' | 'left';

interface ArrowInterface {
	head: {
		length: number;
		width: number;
		insetDepth: number;
	},
	body: {
		width: number,
	},
}

interface GeomInterface {
	bbox(points: (Point | Box)[]): Box;
	expandBox(box: Box, minWidth: number, minHeight: number): Box;
	moveBoxEdge(box: Box, edge: EdgeList, dt: number): void;
	distance(p1: number | Point, p2: number | Point): number;
	midpoint(p1: Point, p2: Point): Point;
	arrow(): ArrowInterface;
}

interface RGBColor {
	r: number;
	g: number;
	b: number;
	a: number | null;
	toString(): string;
}

interface ColorInterface {
	toRGB(colorString: string): RGBColor;
	toVec4(colorString: string, alpha: number): number[];
	luma(colorString: any, isUnitColor: boolean): number;
	opposite(colorString: string): 'white' | 'black';
	isVisible(colorString?: string | null): boolean;
}

interface FontPartsInterface {
	fontStyle?: string;
	fontVariant?: string;
	fontWeight?: string;
	fontStretch?: string;
	fontSize?: string;
	fontFamily?: string;
}

interface DOMInterface {
	createElement(type: string, attrs: any, parent: any, text: string): HTMLElement;
	emptyNode(node: HTMLElement): void;
}

type UnitTypes = 'point' | 'in' | 'mm' | 'cm';

interface UnitsInterface {
	pixelsToUnits(pixelCount: number, newUnits: UnitTypes): number;
	unitsToPixels(unitCount: number, newUnits: UnitTypes): number;
	pointsToUnits(pointCount: number, newUnits: UnitTypes): number;
	unitToPoints(unitCount: number, newUnits: UnitTypes): number;
}

interface Version {
	major: number;
	minor: number;
	revision: number;
}

interface VersionInterface {
	parse(v: string): Version;
	nice(v: string): string;
	isOldVersion(prev: string, current: string): boolean;
}

interface LoDashMixins extends _.LoDashStatic {
	equal(a: number, b: number, e:number): boolean;
	isEven(n: number): boolean;
	insert<T>(array: T[], item: T, idx: number): void;
	deleteItem<T>(array: T[], item: T): void;
	count<T>(array: T[], search: T): number;
	itemEq(a: any, b: any): boolean;
	measureLabel(font: string, text: string): Size;
	fontToFontParts(font: string): FontPartsInterface;
	fontPartsToFont(font: FontPartsInterface): string;
	fontString(
		{size, family, bold, italic}:
		{size: number, family: string, bold: string, italic: string}
	): string;
	degrees(radians: number): number;
	radians(degrees: number): number;
	dom: DOMInterface;
	units: UnitsInterface;
	geom: GeomInterface;
	version: VersionInterface;
	sort: {
		numeric: {
			ascending(a: any, b: any): any;
			descending(a: any, b: any): any;
		};
	};
	formatTime(start: number, end: number): string;
	color: ColorInterface;
	isBorderVisible(border: Border): boolean;
}

const mixin = {
	equal(a: number, b: number, e:number = 0.0001): boolean {
		return Math.abs(a - b) < e;
	},
	isEven(n: number): boolean {
		return (typeof n === 'number') && isFinite(n) && !(n % 2);
	},
	insert<T>(array: T[], item: T, idx: number): void {
		if (idx == null || idx === -1) {
			array.push(item);
		} else {
			array.splice(idx, 0, item);
		}
	},
	deleteItem<T>(array: T[], item: T): void {
		const idx = array.indexOf(item);
		if (idx >= 0) {
			array.splice(idx, 1);
		}
	},
	count<T>(array: T[], search: T): number {
		let count = 0;
		for (let i = 0; i < array.length; i++) {
			if (array[i] === search) {
				count++;
			}
		}
		return count;
	},
	itemEq(a: any, b: any): boolean {
		return a && b && a.id === b.id && a.type === b.type && a.stepID === b.stepID;
	},
	measureLabel: (() => {
		const labelSizeCache: CacheInterface = {};  // {font: {text: {width: 10, height: 20}}}
		return function(font: string, text: string) {
			if (labelSizeCache[font] && labelSizeCache[font][text]) {
				return _.cloneDeep(labelSizeCache[font][text]);
			}
			const container = document.getElementById('fontMeasureContainer');
			if (container && container.firstChild) {
				container.style.font = font;
				container.firstChild.textContent = text;
				let res = (container as any).getBBox();
				res = {width: Math.ceil(res.width), height: Math.ceil(res.height)};
				labelSizeCache[font] = labelSizeCache[font] || {};
				labelSizeCache[font][text] = res;
				return _.cloneDeep(res);  // return a clone so we don't accidentally alter cached values
			}
			return null;
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
				fontStretch: '', fontSize: '', fontFamily: '',
			};
			const fontFamily: string[] = [];
			let haveFontSize = false;
			font = String(font || '');

			const fontParts = font.split(/ (?=(?:[^'"]|'[^']*'|"[^"]*")*$)/);
			fontParts.forEach(el => {
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
						fontFamily.push(el);
					}
				}
			});
			fullFontParts.fontFamily = fontFamily.join(' ');
			return fullFontParts;
		};
	})(),
	fontPartsToFont({
		fontStyle = '', fontVariant = '', fontWeight = '',
		fontStretch = '', fontSize = '', fontFamily = '',
	} = {}) {
		return [
			fontStyle, fontVariant, fontWeight, fontStretch, fontSize, fontFamily.trim(),
		].filter(el => el !== '').join(' ').trim();
	},
	fontString(
		{size, family, bold, italic}:
		{size: number, family: string, bold: string, italic: string}
	) {
		return mixin.fontPartsToFont({
			fontSize: size + 'pt',
			fontFamily: family,
			fontWeight: bold ? 'bold' : '',
			fontStyle: italic ? 'italic' : '',
		});
	},
	degrees(radians: number): number {
		return radians * 180 / Math.PI;
	},
	radians(degrees: number): number {
		return degrees * Math.PI / 180;
	},
	dom: (() => {

		function dom() {}

		dom.createElement = function(type: string, attrs: any, parent: any, text: string) {
			const node = document.createElement(type);
			for (const key in attrs) {
				if (attrs.hasOwnProperty(key)) {
					node.setAttribute(key, attrs[key]);
				}
			}
			if (text) {
				node.innerHTML = text;
			}
			if (parent) {
				parent.appendChild(node);
			}
			return node;
		};

		dom.emptyNode = function(node: HTMLElement) {
			if (node) {
				while (node.firstChild) {
					node.removeChild(node.firstChild);
				}
			}
		};
		return dom;
	})(),
	units: (() => {
		const unitConversions = {  // this conversion factor * pixel count = units
			point: 0.75,
			'in': 0.75 / 72,
			mm: 0.75 / 72 * 25.4,
			cm: 0.75 / 72 * 2.54,
		};
		function units() {}
		units.pixelsToUnits = function(pixelCount: number, newUnits: UnitTypes) {
			return pixelCount * unitConversions[newUnits];
		};
		units.unitsToPixels = function(unitCount: number, newUnits: UnitTypes) {
			return unitCount / unitConversions[newUnits];
		};
		units.pointsToUnits = function(pointCount: number, newUnits: UnitTypes) {
			const pixels = mixin.units.unitsToPixels(pointCount, 'point');
			return mixin.units.pixelsToUnits(pixels, newUnits);
		};
		units.unitToPoints = function(unitCount: number, newUnits: UnitTypes) {
			const pixels = mixin.units.unitsToPixels(unitCount, newUnits);
			return mixin.units.pixelsToUnits(pixels, 'point');
		};
		return units;
	})(),
	geom: (() => {

		function isPoint(point: any): point is Point {
			return (point as Point).x != null
				&& (point as Point).y != null;
		}

		function isBox(box: any): box is Box {
			return (box as Box).width != null
				&& (box as Box).height != null;
		}

		function geom() {}
		geom.bbox = function(points: (Point | Box)[]): Box {
			let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
			for (let i = 0; i < (points || []).length; i++) {
				const p = points[i];
				minX = Math.min(minX, p.x);
				minY = Math.min(minY, p.y);
				maxX = Math.max(maxX, p.x);
				maxY = Math.max(maxY, p.y);
				if (isBox(p)) {
					maxX = Math.max(maxX, p.x + p.width);
					maxY = Math.max(maxY, p.y + p.height);
				}
			}
			return {
				x: minX, y: minY,
				width: maxX - minX, height: maxY - minY,
			};
		};
		geom.expandBox = function(box: Box, minWidth: number, minHeight: number) {
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
		geom.moveBoxEdge = function(box: Box, edge: EdgeList, dt: number) {
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
		geom.distance = (p1: number | Point, p2: number | Point) => {
			if (typeof p1 === 'number' && typeof p2 === 'number') {
				return Math.abs(p1 - p2);
			} else if (isPoint(p1) && isPoint(p2)) {
				return Math.sqrt(((p1.x - p2.x) ** 2) + ((p1.y - p2.y) ** 2));
			}
			return 0;
		};
		geom.midpoint = (p1: Point, p2: Point): Point => {
			return {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2};
		};
		geom.arrow = () => {
			return {
				head: {
					length: 30,
					width: 7,
					insetDepth: 3,
				},
				body: {
					width: 1.25,
				},
			};
		};
		return geom;
	})(),
	version: (() => {
		function version() {}
		version.parse = (v: string): Version => {
			const revs: number[] = (v || '').split('.').map(w => parseInt(w, 10));
			return {
				major: revs[0] || 0,
				minor: revs[1] || 0,
				revision: revs[2] || 0,
			};
		};
		version.nice = (v: string): string => {
			const ver = mixin.version.parse(v);
			return `${ver.major}.${ver.minor}`;
		};
		version.isOldVersion = (prev: string, current: string) => {
			const prevRev = mixin.version.parse(prev);
			const curRev = mixin.version.parse(current);
			if (prevRev.major !== curRev.major) {
				return prevRev.major < curRev.major;
			} else if (prevRev.minor !== curRev.minor) {
				return prevRev.minor < curRev.minor;
			}
			return prevRev.revision < curRev.revision;
		};
		return version;
	})(),
	sort: (() => {
		function sort() {}
		sort.numeric = () => {
			function numeric() {}
			numeric.ascending = (a: any, b: any) => {
				return a - b;
			};
			numeric.descending = (a: any, b: any) => {
				return b - a;
			};
			return numeric;
		};
		return sort;
	})(),
	formatTime(start: number, end: number): string {
		const t = end - start;
		if (t >= 1000) {
			return (t / 1000).toFixed(2) + 's';
		}
		return t + 'ms';
	},
	color: (() => {
		function color() {}
		color.toRGB = (() => {
			const rgbLookupCache: CacheInterface = {
				'#000000': [0, 0, 0],
			};
			return function(colorString: string) {
				let rgb;
				if (rgbLookupCache[colorString]) {
					rgb = rgbLookupCache[colorString];
				} else {
					// Browser quirk: set an element's color to any color string at all,
					// then getComputedStyle.color will return that same color as rgb() or rgba().
					// Greatly reduces the number of color strings to parse.
					const parent = document.getElementById('offscreenCache');
					if (!parent) {
						throw 'Could not locate #offscreenCache';
					}

					// Set parent to black so that any invalid colors set on child will inherit this color
					parent.setAttribute('style', 'color: black;');

					const div = document.getElementById('openFileChooser');
					if (div != null) {
						div.setAttribute('style', 'color: ' + colorString);
						rgb = window.getComputedStyle(div).color;
						if (rgb) {
							const match = rgb.match(/[a-z]+\((.*)\)/i);
							if (match && match.length > 0) {
								rgb = match[1].split(',').map(parseFloat);
							}
							rgbLookupCache[colorString] = rgb;
						}
					}
				}

				const res = {r: rgb[0], g: rgb[1], b: rgb[2], a: rgb[3]};
				// if (rgb.length > 3) {
				// 	res.a = rgb[3];
				// }
				res.toString = function() {
					return (this.a == null)
						? `rgb(${this.r}, ${this.g}, ${this.b})`
						: `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
				};
				return res;
			};
		})();
		color.toVec4 = (colorString: string, alpha: number) => {
			if (!colorString || typeof colorString !== 'string') {
				return [0, 0, 0, 0];
			}
			let r: number, g: number, b: number, a: number;
			if (colorString.startsWith('#')) {
				colorString = colorString.replace('#', '');
				r = parseInt(colorString.substr(0, 2), 16) / 255;
				g = parseInt(colorString.substr(2, 2), 16) / 255;
				b = parseInt(colorString.substr(4, 2), 16) / 255;
				a = (255 - (alpha || 0)) / 255;
			} else {
				const localColor = mixin.color.toRGB(colorString);
				r = localColor.r / 255;
				g = localColor.g / 255;
				b = localColor.b / 255;
				a = (alpha == null)
					? (localColor.a == null ? 1 : localColor.a)
					: alpha;
			}
			return [_.round(r, 4), _.round(g, 4), _.round(b, 4), _.round(a, 4)];
		};
		color.luma = (colorString: any, isUnitColor: boolean) => {
			if (!Array.isArray(colorString)) {
				const colorObj = mixin.color.toRGB(colorString);
				colorString = [colorObj.r, colorObj.g, colorObj.b];
			}
			const scale = isUnitColor ? 1 : 255;
			return (0.2126 * ((colorString[0] / scale) ** 2.2))
				+ (0.7151 * ((colorString[1] / scale) ** 2.2))
				+ (0.0721 * ((colorString[2] / scale) ** 2.2));
		};
		color.opposite = (colorString: string) => {
			return (mixin.color.luma(colorString, false) < 0.18) ? 'white' : 'black';
		};
		color.isVisible = (colorString?: string | null) => {
			if (!colorString || typeof colorString !== 'string') {
				return false;
			}
			const colorObj = mixin.color.toRGB(colorString);
			if (colorObj.hasOwnProperty('a') && colorObj.a === 0) {
				return false;
			}
			return true;
		};
		return color;
	})(),
	isBorderVisible(border: Border) {
		if (!border || !border.width || border.width < 1 ||
			!border.color || typeof border.color !== 'string'
		) {
			return false;
		}
		return mixin.color.isVisible(border.color);
	},
};

_.mixin(mixin);

export default <LoDashMixins>_;
