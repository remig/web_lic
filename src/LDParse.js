/* Web Lic - Copyright (C) 2018 Remi Gagne */

let needLDConfig = true;
const blackColor = {name: 'Black', color: '#05131D', edge: '#595959', alpha: 0};

const api = {

	LDrawPath: '../ldraw/',  // Path to load LDraw parts via HTTP. Either absolute or relative to current page

	// Load the specified url via AJAX and return an abstractPart representing the content of url.
	async loadRemotePart(url, progressCallback) {
		return await loadPart(url, null, progressCallback);
	},
	// Create an abstractPart from the specified 'content' of an LDraw part file
	// Treat loaded content as a final model: set its filename appropriately and fix bad color codes
	async loadModelContent(content, fn, progressCallback) {

		function fixPartColors(part) {
			part.parts.forEach(part => {
				if (typeof part.colorCode === 'number' && part.colorCode < 0) {
					part.colorCode = 0;
				}
			});
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
				colors[line[4]] = {  // TODO: handle color modifiers like 'CHROME', 'METAL', 'LUMINANCE', etc
					name: line[2],
					color: line[6],
					edge: line[8],
					alpha: line[10] ? parseInt(line[10], 10) : 0
				};
			}
		}
		if (colors[16]) {
			colors[16].color = colors[16].edge = -1;
		}
		if (colors[24]) {
			colors[24].color = colors[24].edge = -1;
		}
		colors[api.studFaceColorCode] = {
			name: 'Stud Face',
			color: '#05131D',
			edge: '#05131D',
			alpha: 0
		};
		api.setColorTable(colors);
		needLDConfig = false;
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
	},
	customColorTable: {},
	setCustomColorTable(dict) {
		api.customColorTable = dict;
	},

	// colorID: an LDraw color to lookup
	// type: either 'color' or 'edge'
	getColor(colorCode, type = 'color') {
		if (colorCode in api.customColorTable && api.customColorTable[colorCode][type]) {
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
					if (part.parts.length) {
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

// Cache list of parts in the 'p' folder, so we don't have to make
// extraneous requests guessing whether a part is in 'parts' or 'p'.
/* eslint-disable max-len */
// [os.path.splitext(f)[0] for f in os.listdir("../LDraw/p") if (os.path.isfile(os.path.join("../LDraw/p", f)))]
const partsInPFolder = ['1-16chrd', '1-16con1', '1-16cyli', '1-16cylo', '1-16disc', '1-16edge', '1-16ndis', '1-16ri19', '1-16rin1', '1-16rin2', '1-16rin3', '1-16rin4', '1-16ring11', '1-16ring19', '1-16ring22', '1-16ring57', '1-4ccyli', '1-4chrd', '1-4con0', '1-4con1', '1-4con10', '1-4con11', '1-4con12', '1-4con13', '1-4con14', '1-4con15', '1-4con16', '1-4con17', '1-4con18', '1-4con19', '1-4con2', '1-4con23', '1-4con24', '1-4con25', '1-4con27', '1-4con28', '1-4con3', '1-4con31', '1-4con4', '1-4con5', '1-4con6', '1-4con7', '1-4con8', '1-4con9', '1-4cylc', '1-4cylc2', '1-4cylc3', '1-4cylh', '1-4cyli', '1-4cyli2', '1-4cylo', '1-4cyls', '1-4cyls2', '1-4disc', '1-4edge', '1-4edgh', '1-4ering', '1-4ndis', '1-4rin10', '1-4rin11', '1-4rin12', '1-4rin13', '1-4rin14', '1-4rin15', '1-4rin16', '1-4rin17', '1-4rin18', '1-4rin19', '1-4rin20', '1-4rin23', '1-4rin24', '1-4rin28', '1-4rin34', '1-4rin38', '1-4rin39', '1-4rin48', '1-4rin49', '1-4rin50', '1-4ring1', '1-4ring2', '1-4ring29', '1-4ring3', '1-4ring33', '1-4ring4', '1-4ring5', '1-4ring6', '1-4ring7', '1-4ring79', '1-4ring8', '1-4ring9', '1-4stud4', '1-4tang', '1-8chrd', '1-8con0', '1-8con1', '1-8con10', '1-8con19', '1-8con2', '1-8con20', '1-8con27', '1-8con28', '1-8con3', '1-8cylh', '1-8cyli', '1-8cylo', '1-8cyls', '1-8cyls2', '1-8disc', '1-8edge', '1-8edgh', '1-8ndis', '1-8rin10', '1-8rin15', '1-8rin17', '1-8rin18', '1-8rin19', '1-8rin23', '1-8rin39', '1-8ring1', '1-8ring12', '1-8ring16', '1-8ring2', '1-8ring27', '1-8ring28', '1-8ring3', '1-8ring33', '1-8ring34', '1-8ring4', '1-8ring5', '1-8ring6', '1-8ring7', '1-8ring8', '1-8ring9', '1-8sphc', '1-8sphe', '1-8stud4', '1-8tang', '1-8tric', '11-16cyli', '11-16disc', '11-16edge', '13-16chr', '13-16chrd', '13-16cyli', '13-16edge', '2-4chrd', '2-4con0', '2-4con1', '2-4con10', '2-4con11', '2-4con12', '2-4con13', '2-4con15', '2-4con19', '2-4con2', '2-4con3', '2-4con4', '2-4con6', '2-4con7', '2-4con8', '2-4cylc', '2-4cyli', '2-4cyli2', '2-4cylj1x1', '2-4cylj1x1e', '2-4cylo', '2-4cyls', '2-4disc', '2-4edge', '2-4ndis', '2-4rin10', '2-4rin11', '2-4rin12', '2-4rin13', '2-4rin14', '2-4rin15', '2-4rin16', '2-4rin17', '2-4rin18', '2-4rin22', '2-4rin23', '2-4rin24', '2-4rin25', '2-4rin30', '2-4rin52', '2-4ring1', '2-4ring19', '2-4ring2', '2-4ring20', '2-4ring3', '2-4ring31', '2-4ring32', '2-4ring37', '2-4ring4', '2-4ring43', '2-4ring44', '2-4ring5', '2-4ring6', '2-4ring7', '2-4ring8', '2-4ring9', '2-4stud4', '2-8sphe', '3-16chrd', '3-16con1', '3-16con2', '3-16con9', '3-16cylh', '3-16cyli', '3-16cyli2', '3-16cylo', '3-16cyls', '3-16cys2', '3-16disc', '3-16edge', '3-16edgh', '3-16ndis', '3-16ri11', '3-16ri12', '3-16ri13', '3-16ri14', '3-16rin1', '3-16rin2', '3-16rin3', '3-16rin4', '3-16rin5', '3-16rin6', '3-16rin7', '3-16rin8', '3-16rin9', '3-16ring10', '3-16ring11', '3-16ring12', '3-16ring13', '3-16ring14', '3-16ring15', '3-16ring19', '3-16ring22', '3-16ring24', '3-4chrd', '3-4cylc', '3-4cyli', '3-4cylo', '3-4disc', '3-4edge', '3-4ndis', '3-4rin10', '3-4rin14', '3-4rin22', '3-4ring1', '3-4ring2', '3-4ring3', '3-4ring4', '3-4ring5', '3-4ring6', '3-4ring7', '3-4ring8', '3-4ring9', '3-4stud4', '3-8chrd', '3-8con12', '3-8con2', '3-8con20', '3-8con24', '3-8con34', '3-8con39', '3-8con4', '3-8con5', '3-8con6', '3-8con7', '3-8con9', '3-8cyli', '3-8cyli2', '3-8cylo', '3-8cyls', '3-8disc', '3-8edge', '3-8ndis', '3-8rin10', '3-8rin12', '3-8rin13', '3-8rin15', '3-8rin16', '3-8rin18', '3-8rin24', '3-8ring1', '3-8ring2', '3-8ring21', '3-8ring3', '3-8ring4', '3-8ring5', '3-8ring6', '3-8ring7', '3-8ring8', '3-8ring9', '3-8stud4', '4-4con0', '4-4con1', '4-4con10', '4-4con11', '4-4con12', '4-4con13', '4-4con14', '4-4con15', '4-4con16', '4-4con17', '4-4con18', '4-4con19', '4-4con2', '4-4con20', '4-4con21', '4-4con22', '4-4con24', '4-4con25', '4-4con28', '4-4con29', '4-4con3', '4-4con30', '4-4con31', '4-4con32', '4-4con33', '4-4con35', '4-4con36', '4-4con4', '4-4con41', '4-4con42', '4-4con43', '4-4con46', '4-4con47', '4-4con48', '4-4con49', '4-4con5', '4-4con6', '4-4con61', '4-4con66', '4-4con7', '4-4con70', '4-4con71', '4-4con8', '4-4con80', '4-4con81', '4-4con9', '4-4con95', '4-4con96', '4-4cyl19sph40', '4-4cyl1sph2', '4-4cylc', '4-4cylc2', '4-4cylc3', '4-4cyli', '4-4cyli2', '4-4cylo', '4-4cyls', '4-4cylse', '4-4disc', '4-4edge', '4-4ering', '4-4ndis', '4-4rin10', '4-4rin11', '4-4rin12', '4-4rin13', '4-4rin14', '4-4rin15', '4-4rin16', '4-4rin17', '4-4rin18', '4-4rin19', '4-4rin20', '4-4rin21', '4-4rin22', '4-4rin23', '4-4rin24', '4-4rin25', '4-4rin26', '4-4rin29', '4-4rin30', '4-4rin31', '4-4rin32', '4-4rin33', '4-4rin34', '4-4rin36', '4-4rin37', '4-4rin38', '4-4rin39', '4-4rin40', '4-4rin43', '4-4rin44', '4-4rin45', '4-4rin46', '4-4rin47', '4-4rin48', '4-4rin50', '4-4rin51', '4-4rin52', '4-4rin57', '4-4rin77', '4-4rin78', '4-4rin79', '4-4rin85', '4-4ring1', '4-4ring101', '4-4ring2', '4-4ring3', '4-4ring35', '4-4ring4', '4-4ring49', '4-4ring5', '4-4ring6', '4-4ring61', '4-4ring66', '4-4ring7', '4-4ring70', '4-4ring71', '4-4ring8', '4-4ring9', '4-4ring95', '4-4ring97', '4-8sphe', '5-16chrd', '5-16cyli', '5-16cyli2', '5-16cylo', '5-16disc', '5-16edge', '5-16ndis', '5-16ri12', '5-16rin2', '5-16rin3', '5-16rin5', '5-16ring12', '5-16stud4', '5-8chrd', '5-8cyli', '5-8cylo', '5-8disc', '5-8edge', '5-8ring1', '5-8ring10', '5-8ring2', '5-8ring3', '5-8ring4', '5-8ring6', '7-16chrd', '7-16cyli', '7-16cylo', '7-16disc', '7-16edge', '7-16ndis', '7-16rin1', '7-16rin3', '7-16rin4', '7-16ring1', '7-16ring11', '7-16ring17', '7-16ring2', '7-16ring3', '7-16ring6', '7-16ring7', '7-16ring8', '7-16ring9', '7-8chrd', '7-8con3', '7-8cyli', '7-8cylo', '7-8disc', '7-8edge', '7-8ndis', '7-8rin12', '7-8rin15', '7-8rin16', '7-8rin39', '7-8rin40', '7-8ring1', '7-8ring2', '7-8ring3', '7-8ring8', '7-8ring9', '8-8sphe', '9-16cyli', '9-16cylo', '9-16edge', '9-16ring1', 'arm1', 'arm2', 'arm3', 'axl2ho10', 'axl2hol2', 'axl2hol3', 'axl2hol8', 'axl2hol9', 'axl2hole', 'axl3ho10', 'axl3hol2', 'axl3hol3', 'axl3hol4', 'axl3hol6', 'axl3hol8', 'axl3hol9', 'axl3hole', 'axle', 'axlebeam', 'axleconnect', 'axleend', 'axleho10', 'axleho11', 'axlehol0', 'axlehol2', 'axlehol3', 'axlehol4', 'axlehol5', 'axlehol6', 'axlehol7', 'axlehol8', 'axlehol9', 'axlehole', 'axlehols', 'axlesphe', 'ballsocketr1', 'ballsocketr2', 'beamhol2', 'beamhole', 'bowlball', 'bowlball2', 'bowlball3', 'bowlball4', 'box', 'box0', 'box2-11', 'box2-5', 'box2-7', 'box2-9', 'box2-9p', 'box3#8p', 'box3-12', 'box3-3', 'box3-5a', 'box3-7a', 'box3-9a', 'box3u10p', 'box3u12', 'box3u2p', 'box3u4a', 'box3u4p', 'box3u5p', 'box3u6', 'box3u7a', 'box3u8p', 'box4-1', 'box4-12', 'box4-2p', 'box4-3p', 'box4-4a', 'box4-5a', 'box4-7a', 'box4', 'box4o4a', 'box4o8a', 'box4t', 'box5-1', 'box5-12', 'box5-2p', 'box5-4a', 'box5', 'boxjcyl4', 'bump5000', 'bush', 'bush0', 'bush1', 'bush2', 'bush3', 'bushloc2', 'bushloc3', 'bushloc4', 'bushlock', 'clh1', 'clh10', 'clh11', 'clh12', 'clh2', 'clh3', 'clh4', 'clh5', 'clh6', 'clh7', 'clh8', 'clh9', 'clikhole', 'clikstud', 'clip1', 'clip10', 'clip11', 'clip12', 'clip13', 'clip2', 'clip3', 'clip4', 'clip5', 'clip6', 'clip7', 'clip8', 'clip9', 'confric', 'confric2', 'confric3', 'confric4', 'confric5', 'confric6', 'confric7', 'confric8', 'confric9', 'connect', 'connect2', 'connect3', 'connect4', 'connect5', 'connect6', 'connect7', 'connect8', 'connhol2', 'connhol3', 'connhole', 'cylj2_1x2', 'cylj3x4', 'cylj4x10', 'cylj4x6', 'cylj4x7', 'cylj4x8', 'cylj4x9', 'cylj5x9', 'daxle', 'daxlehole', 'daxlehub', 'dconnhole', 'dnpeghole', 'dtooth', 'dtooth8', 'dtoothc', 'duplohol', 'duplopin', 'empty', 'filletp0s', 'filletp1s', 'filletp2s', 'filletr0n', 'filletr0s', 'filletr1n', 'filletr1s', 'filletr2s', 'filstud3', 'finger1', 'fric', 'fric2', 'h1', 'h2', 'handle', 'handle2', 'joint8ball', 'joint8socket1', 'joint8socket2', 'logo', 'logo2', 'logo3', 'logo4', 'logo5', 'npeghol10', 'npeghol11', 'npeghol12', 'npeghol13', 'npeghol14', 'npeghol15', 'npeghol15b', 'npeghol16', 'npeghol2', 'npeghol3', 'npeghol4', 'npeghol5', 'npeghol6', 'npeghol6a', 'npeghol6b', 'npeghol6c', 'npeghol7', 'npeghol7a', 'npeghol8', 'npeghol9', 'npeghole', 'peghole', 'peghole2', 'peghole3', 'peghole4', 'peghole5', 'peghole6', 'plug34', 'primobot', 'primotop', 'r04o1000', 'r04o1333', 'r04o1375', 'r04o1500', 'r04o2000', 'r04o3000', 'r04o3500', 'r04o4600', 'rail12v', 'rect', 'rect1', 'rect2a', 'rect2p', 'rect3', 'recte3', 'recte4', 'ribt45', 'ring1', 'ring10', 'ring2', 'ring3', 'ring4', 'ring7', 'slotm', 'st4jfil2', 'st4jfil2oc', 'st4jfil3', 'st4jfil4', 'steerend', 'stu2-logo', 'stu2-logo2', 'stu2-logo3', 'stu2-logo4', 'stu2-logo5', 'stu2', 'stu210', 'stu211', 'stu212', 'stu212a', 'stu212s', 'stu213', 'stu214', 'stu215', 'stu216', 'stu217', 'stu217a', 'stu218a', 'stu22-logo', 'stu22-logo2', 'stu22-logo3', 'stu22-logo4', 'stu22-logo5', 'stu22', 'stu220', 'stu221a', 'stu222a', 'stu223', 'stu223d', 'stu225', 'stu226', 'stu22a', 'stu22s', 'stu22s2', 'stu22s2e', 'stu23', 'stu23a', 'stu24', 'stu24a', 'stu24f1s', 'stu24f1w', 'stu24f2n', 'stu24f2s', 'stu24f2w', 'stu24f3n', 'stu24f3s', 'stu24f4n', 'stu24f4s', 'stu24f5n', 'stu24h', 'stu24hlf', 'stu24o', 'stu24od', 'stu24s', 'stu24s2', 'stu25', 'stu26', 'stu26a', 'stu27', 'stu27a', 'stu28', 'stu28a', 'stu29', 'stu2a', 'stu2bp1', 'stu2bp2', 'stu2bp3', 'stu2el', 'stu2p01', 'stu2x', 'stud-logo', 'stud-logo2', 'stud-logo3', 'stud-logo4', 'stud-logo5', 'stud', 'stud10', 'stud11', 'stud12', 'stud12a', 'stud12s', 'stud13', 'stud14', 'stud15', 'stud16', 'stud17', 'stud17a', 'stud18a', 'stud2-logo', 'stud2-logo2', 'stud2-logo3', 'stud2-logo4', 'stud2-logo5', 'stud2', 'stud20', 'stud21a', 'stud22a', 'stud23', 'stud23d', 'stud25', 'stud26', 'stud2a', 'stud2s', 'stud2s2', 'stud2s2e', 'stud3', 'stud3a', 'stud4', 'stud4a', 'stud4f1s', 'stud4f1w', 'stud4f2n', 'stud4f2s', 'stud4f2w', 'stud4f3n', 'stud4f3s', 'stud4f4n', 'stud4f4s', 'stud4f5n', 'stud4h', 'stud4o', 'stud4od', 'stud4s', 'stud4s2', 'stud5', 'stud6', 'stud6a', 'stud7', 'stud7a', 'stud8', 'stud8a', 'stud9', 'studa', 'studbp1', 'studbp2', 'studbp3', 'studel', 'studline', 'studp01', 'studx', 'stug-10x1', 'stug-10x10', 'stug-11x1', 'stug-11x11', 'stug-12x1', 'stug-12x12', 'stug-16x16', 'stug-1x10', 'stug-1x11', 'stug-1x12', 'stug-1x2', 'stug-1x3', 'stug-1x4', 'stug-1x5', 'stug-1x6', 'stug-1x7', 'stug-1x8', 'stug-1x9', 'stug-2x1', 'stug-2x2', 'stug-3x1', 'stug-3x3', 'stug-4x1', 'stug-4x4', 'stug-5x1', 'stug-5x5', 'stug-6x1', 'stug-6x6', 'stug-7x1', 'stug-7x7', 'stug-8x1', 'stug-8x8', 'stug-9x1', 'stug-9x9', 'stug2-10x1', 'stug2-11x1', 'stug2-12x1', 'stug2-1x10', 'stug2-1x11', 'stug2-1x12', 'stug2-1x2', 'stug2-1x3', 'stug2-1x4', 'stug2-1x5', 'stug2-1x6', 'stug2-1x7', 'stug2-1x8', 'stug2-1x9', 'stug2-2x1', 'stug2-2x2', 'stug2-3x1', 'stug2-3x3', 'stug2-4x1', 'stug2-4x4', 'stug2-5x1', 'stug2-5x5', 'stug2-6x1', 'stug2-6x6', 'stug2-7x1', 'stug2-8x1', 'stug2-9x1', 'stug2', 'stug20-1x2', 'stug20-1x3', 'stug20-1x4', 'stug20-1x5', 'stug20-1x6', 'stug20-1x7', 'stug20-1x8', 'stug20-2x1', 'stug20-2x2', 'stug20-3x1', 'stug20-3x3', 'stug20-4x1', 'stug20-4x4', 'stug20-5x1', 'stug20-5x5', 'stug20-6x1', 'stug20-6x6', 'stug20-7x1', 'stug20-7x7', 'stug20-8x1', 'stug20-8x8', 'stug2a', 'stug3-1x2', 'stug3-1x3', 'stug3-1x4', 'stug3-1x5', 'stug3-1x6', 'stug3-1x7', 'stug3-1x8', 'stug3', 'stug4-1x10', 'stug4-1x11', 'stug4-1x2', 'stug4-1x3', 'stug4-1x4', 'stug4-1x5', 'stug4-1x6', 'stug4-1x7', 'stug4-1x8', 'stug4-1x9', 'stug4-2x2', 'stug4-3x3', 'stug4-4x4', 'stug4-5x5', 'stug4-6x6', 'stug4-7x7', 'stug4', 'stug4a', 'stug5', 'stug6', 'stug7-1x2', 'stug7-1x3', 'stug7-1x4', 'stug7-1x5', 'stug7-1x6', 'stug7-1x7', 'stug7-2x2', 'stug7-3x3', 'stug7-4x4', 'stug7-5x5', 'stug7-6x6', 'stug7', 'stug8-1x2', 'stug8-1x3', 'stug8-1x4', 'stug8-1x5', 'stug8', 'stug9', 'stugp01-1x10', 'stugp01-1x11', 'stugp01-1x12', 'stugp01-1x2', 'stugp01-1x3', 'stugp01-1x4', 'stugp01-1x5', 'stugp01-1x6', 'stugp01-1x7', 'stugp01-1x8', 'stugp01-1x9', 't01i0702', 't01i0714', 't01i0769', 't01i1579', 't01i1667', 't01i2000', 't01i3261', 't01i3333', 't01i3600', 't01i5556', 't01i6000', 't01o0556', 't01o0625', 't01o0667', 't01o0714', 't01o1154', 't01o1250', 't01o1429', 't01o1579', 't01o2222', 't01o2500', 't01o3333', 't01o3571', 't01o3750', 't01o3810', 't01o3889', 't01o4000', 't01o4286', 't01q0702', 't01q1429', 't02i1111', 't02i2000', 't02i2258', 't02i3333', 't02i4000', 't02o0417', 't02o0526', 't02o1111', 't02o1176', 't02o2000', 't02o2308', 't02o3333', 't02o4286', 't02q3333', 't02q5455', 't04i0462', 't04i0625', 't04i0857', 't04i1111', 't04i1304', 't04i1333', 't04i1429', 't04i1765', 't04i2000', 't04i2258', 't04i2500', 't04i2667', 't04i3077', 't04i3333', 't04i4167', 't04i5000', 't04i6381', 't04o0462', 't04o0625', 't04o0833', 't04o0857', 't04o1111', 't04o1250', 't04o1304', 't04o1333', 't04o1429', 't04o1538', 't04o1667', 't04o1765', 't04o1905', 't04o2000', 't04o2500', 't04o2667', 't04o3077', 't04o3333', 't04o3750', 't04o4167', 't04o5000', 't04o6250', 't04o6667', 't04o7000', 't04o7500', 't04o8750', 't04o8889', 't04ounit', 't04q0625', 't04q1000', 't04q1316', 't04q1538', 't04q2500', 't04q2857', 't04q3030', 't04q3333', 't04q3529', 't04q3750', 't04q4000', 't04q4444', 't04q5000', 't04q5455', 't04q7143', 't04q7500', 't04q8000', 't04q9231', 't04qunit', 't08i0909', 't08i2000', 't08o0727', 't08o0909', 't08o2000', 't08o6250', 't08q3333', 't08q4000', 't08q4444', 't08q5000', 't08q7500', 't16i0909', 't16i2000', 't16i3333', 't16o0727', 't16o0909', 't16o1429', 't16o2000', 't16o6250', 't16q4000', 't16q5000', 't16q7500', 'tootb28', 'tootb28s', 'tooth16', 'tooth24', 'tooth24a', 'tooth24b', 'tooth24c', 'tooth24d', 'tooth40', 'tooth8', 'tooth8a', 'toothb12', 'toothb14', 'toothb20', 'toothd28', 'toothl', 'toothr', 'tri3-1', 'tri3-3', 'tri3', 'tri3a1', 'tri3a3', 'tri3a4', 'tri3u1', 'tri3u3', 'tri4', 'triangle', 'typestn0', 'typestn5', 'typests4', 'typestua', 'typestub', 'typestud', 'typestue', 'typestuf', 'typestuh', 'typestui', 'typestuk', 'typestul', 'typestum', 'typestun', 'typestuo', 'typestup', 'typestur', 'typestus', 'typestut', 'typestuu', 'typestuv', 'typestuw', 'typestuy', 'wpin', 'wpin2', 'wpin2a', 'wpin3', 'wpin4', 'wpinhol2', 'wpinhole', 'znap1', 'znap2', 'znap3a', 'znap3b', 'znap4', 'znap5', 'znap6', 'zstud'];
/* eslint-enable max-len */

async function requestPart(fn) {
	if (!fn || typeof fn !== 'string') {
		return '';
	}
	fn = fn.replace(/\\/g, '/').toLowerCase();

	let pathsToTry, resp;
	if (fn.startsWith('./')) {
		resp = await fetch(fn);
	}

	if (resp == null || !resp.ok) {
		if (fn.startsWith('8/') || fn.startsWith('48/') || partsInPFolder.includes(fn.split('.')[0])) {
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

const primitiveTypes = {
	2: 'line',
	3: 'triangle',
	4: 'quad',
	5: 'condline'
};

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
	for (let i = 0; i < a.length; i++) {  // Noticeably faster than a.map(parseFloat)
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
		abstractPart.steps.push({
			parts: abstractPart.parts.slice(abstractPart.steps.lastPart)
				.map((v, i) => i + abstractPart.steps.lastPart)
		});
		abstractPart.steps.lastPart = abstractPart.parts.length;
	}
}

function parseColorCode(code) {
	if (typeof code === 'string' && code.includes('x')) {
		return '#' + code.slice(-6);
	}
	code = parseInt(code, 10);
	return (code === 16 || code === 24) ? -1 : code;
}

async function parsePart(abstractPartParent, line) {
	const partName = line.slice(14).join(' ');
	let colorCode = parseColorCode(line[1]);
	colorCode = forceBlack(colorCode, abstractPartParent.filename, partName);
	await loadPart(partName);
	abstractPartParent.parts.push({
		colorCode: colorCode,  // TODO: only save this if it's not -1; treat null color as -1 = inherit
		filename: partName,
		matrix: parseFloatList(line.slice(2, 14))
	});
}

function parseLine(abstractPart, line) {
	abstractPart.primitives.push({
		shape: primitiveTypes[line[0]],
		colorCode: parseColorCode(line[1]),
		points: [
			parseFloat(line[2]), parseFloat(line[3]), parseFloat(line[4]),
			parseFloat(line[5]), parseFloat(line[6]), parseFloat(line[7])
		]
	});
}

function parseCondLine(abstractPart, line) {
	abstractPart.primitives.push({
		shape: primitiveTypes[line[0]],
		colorCode: parseColorCode(line[1]),
		points: [
			parseFloat(line[2]), parseFloat(line[3]), parseFloat(line[4]),
			parseFloat(line[5]), parseFloat(line[6]), parseFloat(line[7])
		],
		conditionalPoints: [
			parseFloat(line[8]), parseFloat(line[9]), parseFloat(line[10]),
			parseFloat(line[11]), parseFloat(line[12]), parseFloat(line[13])
		]
	});
}

function parseFace(abstractPart, line) {
	abstractPart.primitives.push({
		shape: primitiveTypes[line[0]],
		colorCode: parseColorCode(line[1]),
		points: parseFloatList(line.slice(2))
	});
}

const lineParsers = {
	0: parseComment,
	1: parsePart,
	2: parseLine,
	3: parseFace,
	4: parseFace,
	5: parseCondLine
};

async function lineListToAbstractPart(fn, lineList, progressCallback) {
	if (fn.includes('/')) {  // Need only final filename, not the path to it
		fn = fn.slice(fn.lastIndexOf('/') + 1);
	}
	const abstractPart = {
		filename: fn,
		name: '',  // TODO: only store this for real parts, not sub parts
		parts: [],
		primitives: []
	};
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
	if (!fn && lineList[1] && lineList[1][0] === '0' && lineList[1][1] === 'Name:' && lineList[1][2]) {
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
	if (needLDConfig) {
		await api.loadLDConfig();
	}
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
	if (part.steps) {
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
