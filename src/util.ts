/* Web Lic - Copyright (C) 2018 Remi Gagne */

import assign from 'lodash/assign';
import chunk from 'lodash/chunk';
import clamp from 'lodash/clamp';
import clone from 'lodash/clone';
import cloneDeep from 'lodash/cloneDeep';
import difference from 'lodash/difference';
import each from 'lodash/each';
import forOwn from 'lodash/forOwn';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import last from 'lodash/last';
import pullAt from 'lodash/pullAt';
import range from 'lodash/range';
import round from 'lodash/round';
import set from 'lodash/set';
import some from 'lodash/some';
import startCase from 'lodash/startCase';
import template from 'lodash/template';
import unzip from 'lodash/unzip';

import { type Border, type Box, type Point, type Size } from './item_types';

type CacheInterface<T> = Record<string, T>;

type EdgeList = 'top' | 'right' | 'bottom' | 'left';

interface ArrowInterface {
	head: {
		length: number;
		width: number;
		insetDepth: number;
	};
	body: {
		width: number;
	};
}

interface RGBColor {
	r: number;
	g: number;
	b: number;
	a: number | null;
	toString(): string;
}

interface FontPartsInterface {
	fontStyle?: string;
	fontVariant?: string;
	fontWeight?: string;
	fontStretch?: string;
	fontSize?: string;
	fontFamily?: string;
}

export type UnitTypes = 'point' | 'in' | 'mm' | 'cm';

interface Version {
	major: number;
	minor: number;
	revision: number;
}

const unitConversions = {
	// this conversion factor * pixel count = units
	point: 0.75,
	in: 0.75 / 72,
	mm: (0.75 / 72) * 25.4,
	cm: (0.75 / 72) * 2.54,
};

const api = {
	equal(a: number, b: number, e: number = 0.0001): boolean {
		return Math.abs(a - b) < e;
	},
	isEven(n: number): boolean {
		return typeof n === 'number' && isFinite(n) && !(n % 2);
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
		const labelSizeCache: CacheInterface<Record<string, Size>> = {}; // {font: {text: {width: 10, height: 20}}}
		return function (font: string, text: string): Size {
			if (labelSizeCache?.[font]?.[text] != null) {
				return cloneDeep(labelSizeCache[font][text]);
			}
			const container = document.getElementById('fontMeasureContainer');
			if (!container?.firstChild) {
				throw 'Trying to measure a label in a non-existent measure container';
			}

			container.style.font = font;
			container.firstChild.textContent = text;
			const bbox = (container as any).getBBox();
			const res = { width: Math.ceil(bbox.width), height: Math.ceil(bbox.height) };
			labelSizeCache[font] = labelSizeCache[font] || {};
			labelSizeCache[font][text] = res;
			return cloneDeep(res); // return a clone so we don't accidentally alter cached values
		};
	})(),
	fontToFontParts: (() => {
		// prettier-ignore
		const boldList = ['bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
		// prettier-ignore
		const sizeList = ['medium', 'xx-small', 'x-small', 'small', 'large', 'x-large', 'xx-large', 'smaller', 'larger'];
		// prettier-ignore
		const stretchList = ['ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded'];

		return function (font: string = ''): FontPartsInterface {
			const fullFontParts = {
				fontStyle: '',
				fontVariant: '',
				fontWeight: '',
				fontStretch: '',
				fontSize: '',
				fontFamily: '',
			};
			const fontFamily: string[] = [];
			let haveFontSize = false;
			font = String(font || '');

			const fontParts = font.split(/ (?=(?:[^'"]|'[^']*'|"[^"]*")*$)/);
			fontParts.forEach((el) => {
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
		fontStyle = '',
		fontVariant = '',
		fontWeight = '',
		fontStretch = '',
		fontSize = '',
		fontFamily = '',
	}: FontPartsInterface = {}): string {
		return [fontStyle, fontVariant, fontWeight, fontStretch, fontSize, fontFamily.trim()]
			.filter((el) => el !== '')
			.join(' ')
			.trim();
	},
	fontString({
		size,
		family,
		bold,
		italic,
	}: {
		size: number;
		family: string;
		bold: boolean;
		italic: boolean;
	}): string {
		return api.fontPartsToFont({
			fontSize: size + 'pt',
			fontFamily: family,
			fontWeight: bold ? 'bold' : '',
			fontStyle: italic ? 'italic' : '',
		});
	},
	degrees(radians: number): number {
		return (radians * 180) / Math.PI;
	},
	radians(degrees: number): number {
		return (degrees * Math.PI) / 180;
	},
	dom: {
		createElement(type: string, attrs: any, parent: any, text?: string): HTMLElement {
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
		},
		emptyNode(node: HTMLElement): void {
			if (node) {
				while (node.firstChild) {
					node.removeChild(node.firstChild);
				}
			}
		},
	},
	units: {
		pixelsToUnits(pixelCount: number, newUnits: UnitTypes): number {
			return pixelCount * unitConversions[newUnits];
		},
		unitsToPixels(unitCount: number, newUnits: UnitTypes): number {
			return unitCount / unitConversions[newUnits];
		},
		pointsToUnits(pointCount: number, newUnits: UnitTypes): number {
			const pixels = api.units.unitsToPixels(pointCount, 'point');
			return api.units.pixelsToUnits(pixels, newUnits);
		},
		unitToPoints(unitCount: number, newUnits: UnitTypes): number {
			const pixels = api.units.unitsToPixels(unitCount, newUnits);
			return api.units.pixelsToUnits(pixels, 'point');
		},
	},
	geom: {
		isPoint(point: any): point is Point {
			return (point as Point).x != null && (point as Point).y != null;
		},
		isBox(box: any): box is Box {
			return (box as Box).width != null && (box as Box).height != null;
		},
		bbox(points: (Point | Box)[]): Box {
			let minX = Infinity;
			let minY = Infinity;
			let maxX = -Infinity;
			let maxY = -Infinity;
			for (let i = 0; i < (points || []).length; i++) {
				const p = points[i];
				minX = Math.min(minX, p.x);
				minY = Math.min(minY, p.y);
				maxX = Math.max(maxX, p.x);
				maxY = Math.max(maxY, p.y);
				if (api.geom.isBox(p)) {
					maxX = Math.max(maxX, p.x + p.width);
					maxY = Math.max(maxY, p.y + p.height);
				}
			}
			return {
				x: minX,
				y: minY,
				width: maxX - minX,
				height: maxY - minY,
			};
		},
		expandBox(box: Box, minWidth: number, minHeight: number): Box {
			box = cloneDeep(box);
			if (Math.floor(box.width) < 1) {
				box.width = minWidth;
				box.x -= minWidth / 2;
			}
			if (Math.floor(box.height) < 1) {
				box.height = minHeight;
				box.y -= minHeight / 2;
			}
			return box;
		},
		moveBoxEdge(box: Box, edge: EdgeList, dt: number): void {
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
		},
		distance(p1: number | Point, p2: number | Point): number {
			if (typeof p1 === 'number' && typeof p2 === 'number') {
				return Math.abs(p1 - p2);
			} else if (api.geom.isPoint(p1) && api.geom.isPoint(p2)) {
				return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
			}
			return 0;
		},
		midpoint(p1: Point, p2: Point): Point {
			return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
		},
		arrow(): ArrowInterface {
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
		},
	},
	version: {
		parse(v: string): Version {
			const revs: number[] = (v || '').split('.').map((w) => parseInt(w, 10));
			return {
				major: revs[0] || 0,
				minor: revs[1] || 0,
				revision: revs[2] || 0,
			};
		},
		nice(v: string): string {
			const ver = api.version.parse(v);
			return `${ver.major}.${ver.minor}`;
		},
		isOldVersion(prev: string, current: string): boolean {
			const prevRev = api.version.parse(prev);
			const curRev = api.version.parse(current);
			if (prevRev.major !== curRev.major) {
				return prevRev.major < curRev.major;
			} else if (prevRev.minor !== curRev.minor) {
				return prevRev.minor < curRev.minor;
			}
			return prevRev.revision < curRev.revision;
		},
	},
	sort: {
		numeric: {
			ascending(a: any, b: any): number {
				return a - b;
			},
			descending(a: any, b: any): number {
				return b - a;
			},
		},
	},
	formatTime(start: number, end: number): string {
		const t = end - start;
		if (t >= 1000) {
			return (t / 1000).toFixed(2) + 's';
		}
		return t + 'ms';
	},
	color: {
		toRGB: (() => {
			const rgbLookupCache: CacheInterface<number[]> = {
				'#000000': [0, 0, 0],
			};
			return function (colorString: string): RGBColor {
				let rgb: number[];
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
					if (!div) {
						throw 'Trying to convert RGB in non-existent file chooser';
					}
					div.setAttribute('style', 'color: ' + colorString);
					const rgbString = window.getComputedStyle(div).color;
					const match = rgbString.match(/[a-z]+\((.*)\)/i);
					if (match && match?.length > 0) {
						rgb = match[1].split(',').map(parseFloat);
						rgbLookupCache[colorString] = rgb;
					} else {
						throw `Trying to convert invalid RGB string: ${rgbString}`;
					}
				}

				const res = { r: rgb[0], g: rgb[1], b: rgb[2], a: rgb[3] };
				res.toString = function () {
					return this.a == null
						? `rgb(${this.r}, ${this.g}, ${this.b})`
						: `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
				};
				return res;
			};
		})(),
		toVec4(colorString: string, alpha: number): number[] {
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
				const localColor = api.color.toRGB(colorString);
				r = localColor.r / 255;
				g = localColor.g / 255;
				b = localColor.b / 255;
				a = alpha == null ? (localColor.a == null ? 1 : localColor.a) : alpha;
			}
			return [round(r, 4), round(g, 4), round(b, 4), round(a, 4)];
		},
		luma(colorString: any, isUnitColor: boolean): number {
			if (!Array.isArray(colorString)) {
				const colorObj = api.color.toRGB(colorString);
				colorString = [colorObj.r, colorObj.g, colorObj.b];
			}
			const scale = isUnitColor ? 1 : 255;
			return (
				0.2126 * (colorString[0] / scale) ** 2.2 +
				0.7151 * (colorString[1] / scale) ** 2.2 +
				0.0721 * (colorString[2] / scale) ** 2.2
			);
		},
		opposite(colorString: string): 'white' | 'black' {
			return api.color.luma(colorString, false) < 0.18 ? 'white' : 'black';
		},
		isVisible(colorString?: string | null): boolean {
			if (!colorString || typeof colorString !== 'string') {
				return false;
			}
			const colorObj = api.color.toRGB(colorString);
			if (colorObj.hasOwnProperty('a') && colorObj.a === 0) {
				return false;
			}
			return true;
		},
	},
	isBorderVisible(border: Border): boolean {
		if (
			!border ||
			!border.width ||
			border.width < 1 ||
			!border.color ||
			typeof border.color !== 'string'
		) {
			return false;
		}
		return api.color.isVisible(border.color);
	},
	assign,
	chunk,
	clamp,
	clone,
	cloneDeep,
	difference,
	each,
	forOwn,
	get,
	isEmpty,
	isEqual,
	last,
	pullAt,
	range,
	round,
	set,
	some,
	startCase,
	template,
	unzip,
} as const;

export default api;
