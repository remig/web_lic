/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';

const blackColor = {name: 'Black', color: '#05131D', edge: '#595959', alpha: 0};

const api = {

	// Path to load LDraw parts via HTTP. Either absolute or relative to current page.
	LDrawPath: '../ldraw/',

	// Load the specified url via AJAX and return an abstractPart representing the content of url.
	async loadRemotePart(url, progressCallback) {
		return await loadPart(url, null, progressCallback);
	},
	// Create an abstractPart from the specified 'content' of an LDraw part file
	// Treat loaded content as a final model: set its filename appropriately and fix bad color codes
	async loadModelContent(content, fn, progressCallback) {

		function fixPartColors(part) {
			if (part.parts) {
				part.parts.forEach(part => {
					if (!(part.colorCode in api.colorTable)) {
						part.colorCode = 0;
					}
				});
			}
		}

		const part = await loadPart(null, content, progressCallback);
		if (part && fn && part.filename == null) {
			part.filename = fn;
			api.partDictionary[fn] = part;
			if (api.partDictionary[null]) {
				delete api.partDictionary[null];
			}
		}

		// Force all base parts with invalid colors to be black instead of undefined and render badly
		fixPartColors(part);
		Object.values(api.partDictionary)
			.filter(part => part && part.isSubModel)
			.forEach(fixPartColors);

		return part;
	},
	// Create an abstractPart from the specified 'content' of an LDraw part file
	async loadPartContent(content, progressCallback) {
		return await loadPart(null, content, progressCallback);
	},
	async loadLDConfig(url = api.LDrawPath + 'LDConfig.ldr') {
		let content = await fetch(url);
		if (!content || !content.ok) {
			return {};
		}
		content = await content.text() || '';
		const colors = {};
		const lineList = content.split('\n');
		for (let i = 0; i < lineList.length; i++) {
			const line = lineList[i].trim().replace(/\s\s+/g, ' ').split(' ');
			if (line && line[1] === '!COLOUR') {
				const alpha = line[10] ? parseInt(line[10], 10) : 0;
				colors[line[4]] = {  // TODO: handle color modifiers like 'CHROME', 'METAL', 'LUMINANCE', etc
					name: line[2].split('').join(''),  // Force garbage collection
					color: line[6],
					edge: line[8],
					alpha,
					rgba: _.color.hexToVec4(line[6], alpha),
					edgeRgba: _.color.hexToVec4(line[8], 0)
				};
			}
		}
		api.colorTable = colors;
		return colors;
	},

	// key: filename, value: abstractPart content.
	// JSON representation of the LDraw file content for a given part.
	partDictionary: {},
	setPartDictionary(dict) {
		api.partDictionary = dict;
	},
	missingParts: {},  // key: filename of part that failed to load, value: count of that part in model

	studFaceColorCode: 987,

	// key: LDraw color code, value: {name, color, edge}.
	// JSON representation of the LDConfig.ldr file, which defines RGB colors for each LDraw color code
	colorTable: {},
	setColorTable(dict) {
		api.colorTable = dict;
		return dict;
	},
	customColorTable: {},
	setCustomColorTable(dict) {
		api.customColorTable = dict;
		return dict;
	},

	// colorID: an LDraw color to lookup
	// type: either 'color' or 'edge'
	getColor(colorCode, type = 'color') {
		if (colorCode == null) {
			return null;
		} else if (colorCode in api.customColorTable && api.customColorTable[colorCode][type]) {
			return api.customColorTable[colorCode][type];
		} else if (colorCode in api.colorTable) {
			return api.colorTable[colorCode][type];
		} else if (
			typeof colorCode === 'string' && colorCode.startsWith('#')
			&& (type === 'color' || type === 'name')
		) {
			return colorCode;
		}
		return blackColor[type || 'color'];  // Treat any unrecognized colors as black
	},

	isValidColor(colorCode) {
		return typeof colorCode === 'string' || (typeof colorCode === 'number' && colorCode >= 0);
	},

	model: {  // All 'model' arguments below are abstractParts
		isSubmodel(filename) {
			return api.partDictionary[filename].isSubModel;
		},
		removeMissingParts() {
			function removeOnePartFromPart(part, missingFilename) {

				const indicesToDelete = [];
				part.parts.forEach((part, idx) => {
					if (part.filename === missingFilename) {
						indicesToDelete.push(idx);
					}
				});
				indicesToDelete.reverse();
				indicesToDelete.forEach(idx => {
					removeOnePart(part, idx);
				});
			}

			function removeOnePart(part, partIdxToRemove) {
				part.parts.splice(partIdxToRemove, 1);
				if (part.steps) {
					part.steps.forEach(step => {
						const newParts = [];
						step.parts.forEach(partId => {
							if (partId < partIdxToRemove) {
								newParts.push(partId);
							} else if (partId > partIdxToRemove) {
								newParts.push(partId - 1);
							}
						});
						step.parts = newParts;
					});
					part.steps = part.steps.filter(step => step.parts.length);
				}
			}

			Object.keys(api.missingParts).forEach(missingFilename => {
				Object.values(api.partDictionary).forEach(part => {
					if (part.parts && part.parts.length) {
						removeOnePartFromPart(part, missingFilename);
					}
				});
			});
		},
		get: {
			// Return the total number of parts in this model, including parts in submodels
			partCount(model) {
				if (!model || !Array.isArray(model.parts) || model.parts.length <= 0) {
					return 0;
				}
				return model.parts.reduce((acc, p) => {
					if (!p || !p.filename || !api.partDictionary[p.filename]) {
						return acc;
					}
					p = api.partDictionary[p.filename];
					return (p.isSubModel ? p.parts.length : 1) + acc;
				}, 0);
			},
			abstractPart(filename) {
				return api.partDictionary[filename];
			},
			partFromID(partID, filename) {
				return api.partDictionary[filename].parts[partID];
			},
			// Return an array of abstractParts, one for each submodel in this model.
			submodels(model) {
				return model.parts.map(p => {
					p = api.partDictionary[p.filename];
					return p.isSubModel ? p : null;
				}).filter(p => p != null);
			}
		}
	},
	// These set functions will *not* perform the desired action directly
	// Instead, they return an object with two arrays of JSON-patch operations;
	// 'redo' performs perform the action, 'undo' will undo the action.
	getAction: {
		partColor(opts) {  // opts: {filename, partID, color}
			return actionBuilder(opts.filename, opts.partID, 'colorCode', opts.color);
		},
		matrix(opts) {  // opts: {filename, partID, matrix}
			return actionBuilder(opts.filename, opts.partID, 'matrix', opts.matrix);
		},
		filename(opts) { // opts: {filename, partID, newFilename}
			return actionBuilder(opts.filename, opts.partID, 'filename', opts.newFilename);
		},
		addPart(opts) {  // opts: {filename, part}
			const root = api.partDictionary;
			const idx = root[opts.filename].parts.length;
			const path = `/${opts.filename}/parts/${idx}`;
			return {
				redo: [{root, op: 'add', path, value: opts.part}],
				undo: [{root, op: 'remove', path}]
			};
		},
		removePart(opts) {  // opts: {filename, partID}
			const root = api.partDictionary;
			const part = root[opts.filename].parts[opts.partID];
			const path = `/${opts.filename}/parts/${opts.partID}`;
			return {
				redo: [{root, op: 'remove', path}],
				undo: [{root, op: 'add', path, value: part}]
			};
		}
	}
};

function actionBuilder(filename, partID, property, newValue) {
	const root = api.partDictionary, op = 'replace';
	const originalValue = root[filename].parts[partID][property];
	const path = `/${filename}/parts/${partID}/${property}`;
	return {
		redo: [{root, op, path, value: newValue}],
		undo: [{root, op, path, value: originalValue}]
	};
}

async function requestPart(fn) {
	if (!fn || typeof fn !== 'string') {
		return '';
	}
	fn = fn.replace(/\\/g, '/').toLowerCase();
	const qualifiedFn = fn.startsWith('./') ? fn : api.LDrawPath + 'parts/' + fn;

	let resp = await fetch(qualifiedFn);  // flat LDraw file layout should alwyas end up here

	if (resp == null || !resp.ok) {
		// Support non-flat LDraw file layouts.  Try to guess 'parts' vs 'p' folder to minimize requests
		let pathsToTry;
		if (fn.startsWith('8/') || fn.startsWith('48/')) {
			pathsToTry = ['p/', 'parts/', 'constraints/', 'models/'];
		} else if (fn.endsWith('mpd') || fn.endsWith('ldr')) {
			pathsToTry = ['models/', 'parts/', 'p/', 'constraints/'];
		} else {
			pathsToTry = ['parts/', 'p/', 'constraints/', 'models/'];
		}

		for (let i = 0; i < pathsToTry.length; i++) {
			if (resp == null || !resp.ok) {
				resp = await fetch(api.LDrawPath + pathsToTry[i] + fn);
			}
		}
	}

	if (resp == null || !resp.ok) {
		console.log(`   *** FAILED TO LOAD: ${fn}`);  // eslint-disable-line no-console
		return null;
	}
	return await resp.text();
}

// key: submodel filename, value: lineList to be loaded
const unloadedSubModels = {};

function forceBlack(colorCode, abstractPartName, partName) {
	partName = (partName + '').toLowerCase();
	abstractPartName = (abstractPartName + '').toLowerCase();
	if (partName === '4-4cyli.dat') {
		if (abstractPartName === 'stud.dat' || abstractPartName === 'stud2.dat' ||
				abstractPartName === 'stud2a.dat' || abstractPartName === 'stod3.dat') {
			return api.studFaceColorCode;
		}
	}
	return colorCode;
}

// These parsers get called *a lot*.  Keep them fast, at the expense of readibility
function parseFloatList(a) {
	for (let i = 0; i < a.length; i++) {
		a[i] = parseFloat(a[i]);
	}
	return a;
}

function parseComment(abstractPart, line) {
	const command = line[1];
	if (command === 'FILE') {
		// NYI
	} else if (command === 'ROTSTEP') {
		// NYI
	} else if (command === 'STEP') {
		if (abstractPart.steps == null) {
			abstractPart.steps = [];
			abstractPart.steps.lastPart = 0;
		}
		if (abstractPart.parts) {
			abstractPart.steps.push({
				parts: abstractPart.parts.slice(abstractPart.steps.lastPart)
					.map((v, i) => i + abstractPart.steps.lastPart)
			});
			abstractPart.steps.lastPart = abstractPart.parts.length;
		}
	}
}

function parseColorCode(code) {
	if (typeof code === 'string' && code.includes('x')) {
		return '#' + code.slice(-6);
	}
	code = parseInt(code, 10);
	return (code === 16 || code === 24) ? null : code;
}

async function parsePart(abstractPartParent, line) {
	const filename = line.slice(14).join(' ');
	await loadPart(filename);
	const newPart = {
		filename,
		matrix: parseFloatList(line.slice(2, 14))
	};
	let colorCode = parseColorCode(line[1]);
	colorCode = forceBlack(colorCode, abstractPartParent.filename, filename);
	if (colorCode != null) {
		newPart.colorCode = colorCode;
	}
	if (!abstractPartParent.parts) {
		abstractPartParent.parts = [];
	}
	abstractPartParent.parts.push(newPart);
}

// Primitive data can get *huge*, so store it in as compact a representation as possible.
// The vast majority of primitives have no color data; they inherit that from their parent.
// So store most primitives as a flat array of points, then render based on number of points.
// Quads & condlines have the same number of points, so to distingusih,
// condlines will always be {p: points, cp: condpoints} objects.
// Primitives with hardcoded colors will be {p: points, c: color} objects.
function parseLine(abstractPart, line) {
	if (!abstractPart.primitives) {
		abstractPart.primitives = [];
	}
	abstractPart.primitives.push([
		parseFloat(line[2]), parseFloat(line[3]), parseFloat(line[4]),
		parseFloat(line[5]), parseFloat(line[6]), parseFloat(line[7])
	]);
}

function parseTriangle(abstractPart, line) {
	let points = [
		parseFloat(line[2]), parseFloat(line[3]), parseFloat(line[4]),
		parseFloat(line[5]), parseFloat(line[6]), parseFloat(line[7]),
		parseFloat(line[8]), parseFloat(line[9]), parseFloat(line[10])
	];
	if (parseColorCode(line[1]) != null) {
		points = {p: points, c: parseColorCode(line[1])};
	}
	if (!abstractPart.primitives) {
		abstractPart.primitives = [];
	}
	abstractPart.primitives.push(points);
}

function parseQuad(abstractPart, line) {
	let points = [
		parseFloat(line[2]), parseFloat(line[3]), parseFloat(line[4]),
		parseFloat(line[5]), parseFloat(line[6]), parseFloat(line[7]),
		parseFloat(line[8]), parseFloat(line[9]), parseFloat(line[10]),
		parseFloat(line[11]), parseFloat(line[12]), parseFloat(line[13])
	];
	if (parseColorCode(line[1]) != null) {
		points = {p: points, c: parseColorCode(line[1])};
	}
	if (!abstractPart.primitives) {
		abstractPart.primitives = [];
	}
	abstractPart.primitives.push(points);
}

function parseCondLine(abstractPart, line) {
	if (!abstractPart.primitives) {
		abstractPart.primitives = [];
	}
	abstractPart.primitives.push({
		p: [
			parseFloat(line[2]), parseFloat(line[3]), parseFloat(line[4]),
			parseFloat(line[5]), parseFloat(line[6]), parseFloat(line[7])
		],
		cp: [
			parseFloat(line[8]), parseFloat(line[9]), parseFloat(line[10]),
			parseFloat(line[11]), parseFloat(line[12]), parseFloat(line[13])
		]
	});
}

const lineParsers = {
	0: parseComment,
	1: parsePart,
	2: parseLine,
	3: parseTriangle,
	4: parseQuad,
	5: parseCondLine
};

async function lineListToAbstractPart(filename, lineList, progressCallback) {
	if (filename && filename.includes('/')) {  // Need only final filename, not the path to it
		filename = filename.slice(filename.lastIndexOf('/') + 1);
	}
	const abstractPart = {filename, name: ''};  // optional: 'primitives', 'parts'

	// First line in any LDraw file is assumed to be the part / main model's colloquial name
	// TODO: if first line is some variant of 'untitled', and if a subsequent line is 0 Name: foo, use foo
	if (lineList[0] && lineList[0][0] === '0') {
		if (lineList[0][1] === 'FILE') {
			abstractPart.name = lineList[0].slice(2).join(' ');
		} else {
			abstractPart.name = lineList[0].slice(1).join(' ');
			abstractPart.name = abstractPart.name.replace(/^Name:\s*/ig, '');  // Trim leading 'Name: '
		}
	}
	if (!filename && lineList[1] && lineList[1][0] === '0' && lineList[1][1] === 'Name:' && lineList[1][2]) {
		// If we don't have a filename but line 2 includes 'Name', use it
		abstractPart.filename = lineList[1][2];
	}
	for (let i = 0; i < lineList.length; i++) {
		const line = lineList[i];
		if (line && line[0] in lineParsers) {
			await lineParsers[line[0]](abstractPart, line);
			if (progressCallback && line[0] === '1') {
				progressCallback();
			}
		}
	}
	return abstractPart;
}

async function loadSubModels(lineList, progressCallback) {
	const models = [];
	let lastFileLine, i, partName;
	for (i = 0; i < lineList.length; i++) {
		const line = lineList[i];
		if (line && line[0] === '0' && line[1] === 'FILE') {
			if (lastFileLine != null) {
				models.push({start: lastFileLine, end: i - 1});
			}
			lastFileLine = i;
		}
	}
	if (lastFileLine != null) {
		models.push({start: lastFileLine, end: i - 1});
	}
	if (models.length) {
		for (i = 1; i < models.length; i++) {
			const model = models[i];
			partName = lineList[model.start].slice(2).join(' ').toLowerCase();
			if (partName in api.partDictionary) {
				// If we already have a submodel with this name, delete and reload it,
				// as it came from a previous, likely unrelated, model.
				delete api.partDictionary[partName];
			}
			unloadedSubModels[partName] = lineList.slice(model.start, model.end + 1);
		}
		partName = lineList[models[0].start].slice(2).join(' ');
		const lines = lineList.slice(models[0].start, models[0].end + 1);
		return await lineListToAbstractPart(partName, lines, progressCallback);
	}
	return null;
}

async function loadPart(fn, content, progressCallback) {
	let part;
	if (fn && fn in api.partDictionary) {
		return api.partDictionary[fn];
	} else if (fn && fn in api.missingParts) {
		api.missingParts[fn] += 1;
		return null;
	} else if (fn && fn.toLowerCase() in unloadedSubModels) {
		const fnLower = fn.toLowerCase();
		part = await lineListToAbstractPart(fn, unloadedSubModels[fnLower], progressCallback);
		part.isSubModel = true;
		delete unloadedSubModels[fnLower];
	} else {
		if (!content) {
			content = await requestPart(fn);
		}
		if (!content) {
			api.missingParts[fn] = 1;
			return null;
		}
		const lineList = [], tmpList = content.split('\n');
		let partCount = 0;
		for (let i = 0; i < tmpList.length; i++) {
			const line = tmpList[i].trim().replace(/\s\s+/g, ' ').split(' ');
			if (line && line.length > 1) {
				lineList.push(line);
				if (line[0] === '1') {
					partCount++;
				}
			}
		}
		if (lineList.length < 1) {
			api.missingParts[fn] = 1;
			return null;  // No content, nothing to create
		}
		if (progressCallback) {
			progressCallback({stepCount: partCount});
		}
		if (!fn || fn.endsWith('mpd')) {
			part = await loadSubModels(lineList, progressCallback);
		}
		if (part == null) {
			part = await lineListToAbstractPart(fn, lineList, progressCallback);
		}
	}

	api.partDictionary[part.filename] = part;
	if (part.filename in api.missingParts) {
		delete api.missingParts[part.filename];
	}
	if (part.steps && part.parts) {
		// Check if any parts were left out of the last step; add them to a new step if so.
		// This happens often when a model / submodel does not end with a 'STEP 0' command.
		if (part.steps.lastPart < part.parts.length) {
			const skippedParts = part.parts.map((el, idx) => idx).slice(part.steps.lastPart);
			part.steps.push({parts: skippedParts});
		}
		delete part.steps.lastPart;
	}
	return part;
}

export default api;
