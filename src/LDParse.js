/* global module: false */

// eslint-disable-next-line no-implicit-globals, no-undef
LDParse = (function() {
'use strict';

const api = {
	// Load the specified url via AJAX and return an abstractPart representing the content of url.
	async loadRemotePart(url) {
		return await loadPart(url, null, api.progressCallback);
	},
	// Create an abstractPart from the specified 'content' of an LDraw part file
	async loadPartContent(content, fn) {
		const part = await loadPart(null, content, api.progressCallback);
		if (part && fn && part.filename == null) {
			part.filename = fn;
		}
		return part;
	},
	async loadLDConfig(url = '/ldraw/LDConfig.ldr') {
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
				colors[line[4]] = {
					name: line[2],
					color: parseInt(line[6].slice(1), 16),
					edge: parseInt(line[8].slice(1), 16)
				};
			}
		}
		if (colors[16]) {
			colors[16].color = colors[16].edge = -1;
		}
		if (colors[24]) {
			colors[24].color = colors[24].edge = -1;
		}
		return colors;
	},

	// cb will be called incrementally during the part loading process
	setProgressCallback(cb) {
		api.progressCallback = cb;
	},

	// key: filename, value: abstractPart content.
	// JSON representation of the LDraw file content for a given part.
	partDictionary: {},
	setPartDictionary(dict) {
		api.partDictionary = dict;
	},

	// key: LDraw color code, value: {name, color, edge}.
	// JSON representation of the LDConfig.ldr file, which defines RGB colors for each LDraw color code
	colorTable: {},
	setColorTable(dict) {
		api.colorTable = dict;
	},

	// colorID: an LDraw color to lookup
	// type: either 'color' or 'edge'
	getColor(colorCode, type) {
		if (colorCode in api.colorTable) {
			return api.colorTable[colorCode][type || 'color'];
		}
		return 0;  // Treat any unrecognized colors as black
	},

	model: {  // All 'model' arguments below are abstractParts
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
			partFromID(partID, model, submodelList) {
				model = api.model.get.submodelDescendant(model, submodelList);
				return model.parts[partID];
			},
			// submodelIDList is an array of submodel IDs representing a deeply nested submodel hierarchy.
			// Traverse the submodel tree in submodelIDList and return the abstractPart associated with the final submodelIDList entry.
			submodelDescendant(model, submodelIDList) {
				if (!submodelIDList || !submodelIDList.length) {
					return model;
				}
				return (submodelIDList || []).reduce((p, id) => api.partDictionary[p.parts[id].filename], model);
			},
			// Return an array of abstractParts, one for each submodel in this model.
			submodels(model) {
				return model.parts.map(p => {
					p = api.partDictionary[p.filename];
					return p.isSubModel ? p : null;
				}).filter(p => p != null);
			}
		}
	}
};

// Cache list of parts in the 'p' folder, so we don't have to make
// extraneous requests guessing whether a part is in 'parts' or 'p'.
/* eslint-disable max-len */
const partPathLookup = ['/ldraw/parts/', '/ldraw/p/'];
const partsInPFolder = {
	'1-16con1.dat': 1, '1-16cyli.dat': 1, '1-16cylo.dat': 1, '1-16disc.dat': 1, '1-16edge.dat': 1, '1-16ndis.dat': 1, '1-16ri19.dat': 1, '1-16rin1.dat': 1, '1-16rin2.dat': 1, '1-16rin3.dat': 1, '1-16rin4.dat': 1, '1-16ring11.dat': 1, '1-16ring19.dat': 1, '1-4ccyli.dat': 1, '1-4chrd.dat': 1, '1-4con0.dat': 1, '1-4con1.dat': 1, '1-4con10.dat': 1, '1-4con11.dat': 1, '1-4con12.dat': 1, '1-4con13.dat': 1, '1-4con14.dat': 1, '1-4con15.dat': 1, '1-4con18.dat': 1, '1-4con19.dat': 1, '1-4con2.dat': 1, '1-4con23.dat': 1, '1-4con24.dat': 1, '1-4con27.dat': 1, '1-4con28.dat': 1, '1-4con3.dat': 1, '1-4con31.dat': 1, '1-4con4.dat': 1, '1-4con5.dat': 1, '1-4con6.dat': 1, '1-4con7.dat': 1, '1-4con8.dat': 1, '1-4con9.dat': 1, '1-4cylc.dat': 1, '1-4cylc2.dat': 1, '1-4cylh.dat': 1, '1-4cyli.dat': 1, '1-4cyli2.dat': 1, '1-4cylo.dat': 1, '1-4cyls.dat': 1, '1-4cyls2.dat': 1, '1-4disc.dat': 1, '1-4edge.dat': 1, '1-4edgh.dat': 1, '1-4ndis.dat': 1, '1-4rin10.dat': 1, '1-4rin11.dat': 1, '1-4rin12.dat': 1, '1-4rin13.dat': 1, '1-4rin14.dat': 1, '1-4rin15.dat': 1, '1-4rin16.dat': 1, '1-4rin17.dat': 1, '1-4rin18.dat': 1, '1-4rin19.dat': 1, '1-4rin20.dat': 1, '1-4rin24.dat': 1, '1-4rin28.dat': 1, '1-4rin34.dat': 1, '1-4rin38.dat': 1, '1-4rin39.dat': 1, '1-4rin48.dat': 1, '1-4rin49.dat': 1, '1-4rin50.dat': 1, '1-4ring1.dat': 1, '1-4ring2.dat': 1, '1-4ring3.dat': 1, '1-4ring4.dat': 1, '1-4ring5.dat': 1, '1-4ring6.dat': 1, '1-4ring7.dat': 1, '1-4ring8.dat': 1, '1-4ring9.dat': 1, '1-4tang.dat': 1, '1-8chrd.dat': 1, '1-8con1.dat': 1, '1-8con19.dat': 1, '1-8con2.dat': 1, '1-8con20.dat': 1, '1-8con28.dat': 1, '1-8con3.dat': 1, '1-8cylh.dat': 1, '1-8cyli.dat': 1, '1-8cylo.dat': 1, '1-8cyls.dat': 1, '1-8cyls2.dat': 1, '1-8disc.dat': 1, '1-8edge.dat': 1, '1-8edgh.dat': 1, '1-8ndis.dat': 1, '1-8rin10.dat': 1, '1-8rin15.dat': 1, '1-8rin17.dat': 1, '1-8rin18.dat': 1, '1-8rin19.dat': 1, '1-8rin23.dat': 1, '1-8rin39.dat': 1, '1-8ring1.dat': 1, '1-8ring2.dat': 1, '1-8ring3.dat': 1, '1-8ring4.dat': 1, '1-8ring5.dat': 1, '1-8ring6.dat': 1, '1-8ring7.dat': 1, '1-8ring8.dat': 1, '1-8ring9.dat': 1, '1-8sphc.dat': 1, '1-8sphe.dat': 1, '1-8tang.dat': 1, '1-8tric.dat': 1, '13-16chr.dat': 1, '13-16chrd.dat': 1, '13-16cyli.dat': 1, '13-16edge.dat': 1, '2-4chrd.dat': 1, '2-4con0.dat': 1, '2-4con1.dat': 1, '2-4con10.dat': 1, '2-4con11.dat': 1, '2-4con12.dat': 1, '2-4con13.dat': 1, '2-4con15.dat': 1, '2-4con19.dat': 1, '2-4con2.dat': 1, '2-4con3.dat': 1, '2-4con4.dat': 1, '2-4con7.dat': 1, '2-4con8.dat': 1, '2-4cylc.dat': 1, '2-4cyli.dat': 1, '2-4cylo.dat': 1, '2-4cyls.dat': 1, '2-4disc.dat': 1, '2-4edge.dat': 1, '2-4ndis.dat': 1, '2-4rin10.dat': 1, '2-4rin11.dat': 1, '2-4rin12.dat': 1, '2-4rin13.dat': 1, '2-4rin14.dat': 1, '2-4rin15.dat': 1, '2-4rin16.dat': 1, '2-4rin17.dat': 1, '2-4rin18.dat': 1, '2-4rin22.dat': 1, '2-4rin23.dat': 1, '2-4rin24.dat': 1, '2-4rin25.dat': 1, '2-4rin30.dat': 1, '2-4rin52.dat': 1, '2-4ring1.dat': 1, '2-4ring2.dat': 1, '2-4ring3.dat': 1, '2-4ring4.dat': 1, '2-4ring5.dat': 1, '2-4ring6.dat': 1, '2-4ring7.dat': 1, '2-4ring8.dat': 1, '2-4ring9.dat': 1, '2-4stud4.dat': 1, '2-8sphe.dat': 1, '3-16chrd.dat': 1, '3-16con1.dat': 1, '3-16con2.dat': 1, '3-16cylh.dat': 1, '3-16cyli.dat': 1, '3-16cyli2.dat': 1, '3-16cylo.dat': 1, '3-16cyls.dat': 1, '3-16cys2.dat': 1, '3-16disc.dat': 1, '3-16edge.dat': 1, '3-16edgh.dat': 1, '3-16ndis.dat': 1, '3-16ri11.dat': 1, '3-16ri12.dat': 1, '3-16ri13.dat': 1, '3-16ri14.dat': 1, '3-16rin1.dat': 1, '3-16rin2.dat': 1, '3-16rin3.dat': 1, '3-16rin4.dat': 1, '3-16rin5.dat': 1, '3-16rin6.dat': 1, '3-16rin7.dat': 1, '3-16rin8.dat': 1, '3-16rin9.dat': 1, '3-16ring11.dat': 1, '3-16ring12.dat': 1, '3-16ring13.dat': 1, '3-16ring14.dat': 1, '3-4cylc.dat': 1, '3-4cyli.dat': 1, '3-4cylo.dat': 1, '3-4disc.dat': 1, '3-4edge.dat': 1, '3-4ndis.dat': 1, '3-4rin10.dat': 1, '3-4rin14.dat': 1, '3-4rin22.dat': 1, '3-4ring1.dat': 1, '3-4ring2.dat': 1, '3-4ring3.dat': 1, '3-4ring4.dat': 1, '3-4ring5.dat': 1, '3-4ring6.dat': 1, '3-4ring7.dat': 1, '3-4ring8.dat': 1, '3-4ring9.dat': 1, '3-8chrd.dat': 1, '3-8con12.dat': 1, '3-8con20.dat': 1, '3-8con34.dat': 1, '3-8con4.dat': 1, '3-8con6.dat': 1, '3-8con7.dat': 1, '3-8con9.dat': 1, '3-8cyli.dat': 1, '3-8cyli2.dat': 1, '3-8cylo.dat': 1, '3-8cyls.dat': 1, '3-8disc.dat': 1,
	'3-8edge.dat': 1, '3-8ndis.dat': 1, '3-8rin10.dat': 1, '3-8rin12.dat': 1, '3-8rin13.dat': 1, '3-8rin15.dat': 1, '3-8rin16.dat': 1, '3-8rin18.dat': 1, '3-8rin24.dat': 1, '3-8ring1.dat': 1, '3-8ring2.dat': 1, '3-8ring3.dat': 1, '3-8ring4.dat': 1, '3-8ring5.dat': 1, '3-8ring6.dat': 1, '3-8ring7.dat': 1, '3-8ring8.dat': 1, '3-8ring9.dat': 1, '4-4con0.dat': 1, '4-4con1.dat': 1, '4-4con10.dat': 1, '4-4con11.dat': 1, '4-4con12.dat': 1, '4-4con13.dat': 1, '4-4con14.dat': 1, '4-4con15.dat': 1, '4-4con16.dat': 1, '4-4con17.dat': 1, '4-4con18.dat': 1, '4-4con19.dat': 1, '4-4con2.dat': 1, '4-4con20.dat': 1, '4-4con21.dat': 1, '4-4con22.dat': 1, '4-4con24.dat': 1, '4-4con25.dat': 1, '4-4con28.dat': 1, '4-4con29.dat': 1, '4-4con3.dat': 1, '4-4con30.dat': 1, '4-4con32.dat': 1, '4-4con33.dat': 1, '4-4con35.dat': 1, '4-4con36.dat': 1, '4-4con4.dat': 1, '4-4con41.dat': 1, '4-4con42.dat': 1, '4-4con43.dat': 1, '4-4con46.dat': 1, '4-4con47.dat': 1, '4-4con48.dat': 1, '4-4con5.dat': 1, '4-4con6.dat': 1, '4-4con61.dat': 1, '4-4con7.dat': 1, '4-4con8.dat': 1, '4-4con80.dat': 1, '4-4con81.dat': 1, '4-4con9.dat': 1, '4-4cyl1sph2.dat': 1, '4-4cylc.dat': 1, '4-4cylc2.dat': 1, '4-4cyli.dat': 1, '4-4cyli2.dat': 1, '4-4cylo.dat': 1, '4-4cyls.dat': 1, '4-4cylse.dat': 1, '4-4disc.dat': 1, '4-4edge.dat': 1, '4-4ndis.dat': 1, '4-4rin10.dat': 1, '4-4rin11.dat': 1, '4-4rin12.dat': 1, '4-4rin13.dat': 1, '4-4rin14.dat': 1, '4-4rin15.dat': 1, '4-4rin16.dat': 1, '4-4rin17.dat': 1, '4-4rin18.dat': 1, '4-4rin19.dat': 1, '4-4rin20.dat': 1, '4-4rin21.dat': 1, '4-4rin22.dat': 1, '4-4rin23.dat': 1, '4-4rin24.dat': 1, '4-4rin25.dat': 1, '4-4rin26.dat': 1, '4-4rin29.dat': 1, '4-4rin30.dat': 1, '4-4rin31.dat': 1, '4-4rin32.dat': 1, '4-4rin33.dat': 1, '4-4rin34.dat': 1, '4-4rin36.dat': 1, '4-4rin37.dat': 1, '4-4rin38.dat': 1, '4-4rin39.dat': 1, '4-4rin40.dat': 1, '4-4rin43.dat': 1, '4-4rin44.dat': 1, '4-4rin45.dat': 1, '4-4rin46.dat': 1, '4-4rin47.dat': 1, '4-4rin48.dat': 1, '4-4rin50.dat': 1, '4-4rin51.dat': 1, '4-4rin52.dat': 1, '4-4rin57.dat': 1, '4-4rin77.dat': 1, '4-4rin78.dat': 1, '4-4rin79.dat': 1, '4-4rin85.dat': 1, '4-4ring1.dat': 1, '4-4ring101.dat': 1, '4-4ring2.dat': 1, '4-4ring3.dat': 1, '4-4ring4.dat': 1, '4-4ring5.dat': 1, '4-4ring6.dat': 1, '4-4ring7.dat': 1, '4-4ring8.dat': 1, '4-4ring9.dat': 1, '4-8sphe.dat': 1, '48': 1, '5-16chrd.dat': 1, '5-16cyli.dat': 1, '5-16cyli2.dat': 1, '5-16cylo.dat': 1, '5-16disc.dat': 1, '5-16edge.dat': 1, '5-16ndis.dat': 1, '5-16ri12.dat': 1, '5-16rin2.dat': 1, '5-16rin5.dat': 1, '5-16ring12.dat': 1, '5-8cyli.dat': 1, '5-8cylo.dat': 1, '5-8disc.dat': 1, '5-8edge.dat': 1, '5-8ring1.dat': 1, '5-8ring2.dat': 1, '5-8ring3.dat': 1, '5-8ring6.dat': 1, '7-16chrd.dat': 1, '7-16cyli.dat': 1, '7-16disc.dat': 1, '7-16edge.dat': 1, '7-16ndis.dat': 1, '7-16rin1.dat': 1, '7-16rin3.dat': 1, '7-16rin4.dat': 1, '7-8cyli.dat': 1, '7-8cylo.dat': 1, '7-8disc.dat': 1, '7-8edge.dat': 1, '7-8ndis.dat': 1, '7-8rin12.dat': 1, '7-8rin15.dat': 1, '7-8rin16.dat': 1, '7-8rin39.dat': 1, '7-8rin40.dat': 1, '7-8ring1.dat': 1, '7-8ring2.dat': 1, '7-8ring3.dat': 1, '7-8ring9.dat': 1, '8': 1, '8-8sphe.dat': 1, '9-16edge.dat': 1, 'arm1.dat': 1, 'arm2.dat': 1, 'arm3.dat': 1, 'axl2ho10.dat': 1, 'axl2hol2.dat': 1, 'axl2hol3.dat': 1, 'axl2hol8.dat': 1, 'axl2hol9.dat': 1, 'axl2hole.dat': 1, 'axl3ho10.dat': 1, 'axl3hol2.dat': 1, 'axl3hol3.dat': 1, 'axl3hol6.dat': 1, 'axl3hol8.dat': 1, 'axl3hol9.dat': 1, 'axl3hole.dat': 1, 'axle.dat': 1, 'axleend.dat': 1, 'axleho10.dat': 1, 'axleho11.dat': 1, 'axlehol2.dat': 1, 'axlehol3.dat': 1, 'axlehol4.dat': 1, 'axlehol5.dat': 1, 'axlehol6.dat': 1, 'axlehol7.dat': 1, 'axlehol8.dat': 1, 'axlehol9.dat': 1, 'axlehole.dat': 1, 'axlesphe.dat': 1, 'beamhol2.dat': 1, 'beamhole.dat': 1, 'box.dat': 1, 'box0.dat': 1, 'box2-11.dat': 1, 'box2-5.dat': 1, 'box2-7.dat': 1, 'box2-9.dat': 1, 'box2-9p.dat': 1, 'box3#8p.dat': 1, 'box3-12.dat': 1, 'box3-3.dat': 1, 'box3-5a.dat': 1, 'box3-7a.dat': 1, 'box3u10p.dat': 1, 'box3u12.dat': 1, 'box3u2p.dat': 1, 'box3u4a.dat': 1, 'box3u4p.dat': 1, 'box3u5p.dat': 1, 'box3u6.dat': 1, 'box3u7a.dat': 1, 'box3u8p.dat': 1, 'box4-1.dat': 1, 'box4-2p.dat': 1, 'box4-3p.dat': 1, 'box4-4a.dat': 1, 'box4-5a.dat': 1, 'box4-7a.dat': 1, 'box4.dat': 1, 'box4o4a.dat': 1, 'box4o8a.dat': 1,
	'box4t.dat': 1, 'box5-1.dat': 1, 'box5-12.dat': 1, 'box5-2p.dat': 1, 'box5-4a.dat': 1, 'box5.dat': 1, 'boxjcyl4.dat': 1, 'bump5000.dat': 1, 'bush.dat': 1, 'bush0.dat': 1, 'bush1.dat': 1, 'bush2.dat': 1, 'bushloc2.dat': 1, 'bushloc3.dat': 1, 'bushloc4.dat': 1, 'bushlock.dat': 1, 'clh1.dat': 1, 'clh10.dat': 1, 'clh11.dat': 1, 'clh12.dat': 1, 'clh2.dat': 1, 'clh3.dat': 1, 'clh4.dat': 1, 'clh5.dat': 1, 'clh6.dat': 1, 'clh8.dat': 1, 'clh9.dat': 1, 'clip1.dat': 1, 'clip10.dat': 1, 'clip11.dat': 1, 'clip2.dat': 1, 'clip3.dat': 1, 'clip4.dat': 1, 'clip5.dat': 1, 'clip6.dat': 1, 'clip7.dat': 1, 'clip8.dat': 1, 'clip9.dat': 1, 'confric.dat': 1, 'confric2.dat': 1, 'confric3.dat': 1, 'confric5.dat': 1, 'confric6.dat': 1, 'confric8.dat': 1, 'confric9.dat': 1, 'connect.dat': 1, 'connect2.dat': 1, 'connect3.dat': 1, 'connect4.dat': 1, 'connect5.dat': 1, 'connect6.dat': 1, 'connect7.dat': 1, 'connhol2.dat': 1, 'connhol3.dat': 1, 'connhole.dat': 1, 'cylj4x10.dat': 1, 'cylj4x6.dat': 1, 'cylj4x8.dat': 1, 'duplohol.dat': 1, 'duplopin.dat': 1, 'filletp0s.dat': 1, 'filletp1s.dat': 1, 'filletp2s.dat': 1, 'filletr0s.dat': 1, 'filletr1s.dat': 1, 'filletr2s.dat': 1, 'filstud3.dat': 1, 'finger1.dat': 1, 'h1.dat': 1, 'h2.dat': 1, 'handle.dat': 1, 'handle2.dat': 1, 'npeghol10.dat': 1, 'npeghol11.dat': 1, 'npeghol12.dat': 1, 'npeghol13.dat': 1, 'npeghol2.dat': 1, 'npeghol3.dat': 1, 'npeghol4.dat': 1, 'npeghol5.dat': 1, 'npeghol6.dat': 1, 'npeghol7.dat': 1, 'npeghol8.dat': 1, 'npeghol9.dat': 1, 'npeghole.dat': 1, 'peghole.dat': 1, 'peghole2.dat': 1, 'peghole3.dat': 1, 'peghole4.dat': 1, 'peghole5.dat': 1, 'plug34.dat': 1, 'primobot.dat': 1, 'primotop.dat': 1, 'r04o1000.dat': 1, 'r04o1333.dat': 1, 'r04o1500.dat': 1, 'r04o2000.dat': 1, 'r04o3000.dat': 1, 'r04o4600.dat': 1, 'rail12v.dat': 1, 'rect.dat': 1, 'rect1.dat': 1, 'rect2a.dat': 1, 'rect2p.dat': 1, 'rect3.dat': 1, 'recte3.dat': 1, 'recte4.dat': 1, 'ribt45.dat': 1, 'ring1.dat': 1, 'ring10.dat': 1, 'ring2.dat': 1, 'ring3.dat': 1, 'ring4.dat': 1, 'ring7.dat': 1, 'slotm.dat': 1, 'st4jfil2.dat': 1, 'st4jfil3.dat': 1, 'st4jfil4.dat': 1, 'steerend.dat': 1, 'stu2.dat': 1, 'stu210.dat': 1, 'stu211.dat': 1, 'stu212.dat': 1, 'stu213.dat': 1, 'stu214.dat': 1, 'stu215.dat': 1, 'stu216.dat': 1, 'stu217a.dat': 1, 'stu218a.dat': 1, 'stu22.dat': 1, 'stu220.dat': 1, 'stu221a.dat': 1, 'stu222a.dat': 1, 'stu223.dat': 1, 'stu225.dat': 1, 'stu22a.dat': 1, 'stu22s.dat': 1, 'stu23.dat': 1, 'stu23a.dat': 1, 'stu24.dat': 1, 'stu24a.dat': 1, 'stu24f1s.dat': 1, 'stu24f1w.dat': 1, 'stu24f2n.dat': 1, 'stu24f2s.dat': 1, 'stu24f2w.dat': 1, 'stu24f3s.dat': 1, 'stu24f4n.dat': 1, 'stu24f4s.dat': 1, 'stu24f5n.dat': 1, 'stu24h.dat': 1, 'stu24o.dat': 1, 'stu24od.dat': 1, 'stu24s.dat': 1, 'stu24s2.dat': 1, 'stu25.dat': 1, 'stu26.dat': 1, 'stu26a.dat': 1, 'stu27.dat': 1, 'stu28.dat': 1, 'stu28a.dat': 1, 'stu29.dat': 1, 'stu2a.dat': 1, 'stu2el.dat': 1, 'stu2p01.dat': 1, 'stu2x.dat': 1, 'stud.dat': 1, 'stud10.dat': 1, 'stud11.dat': 1, 'stud12.dat': 1, 'stud13.dat': 1, 'stud14.dat': 1, 'stud15.dat': 1, 'stud16.dat': 1, 'stud17a.dat': 1, 'stud18a.dat': 1, 'stud2.dat': 1, 'stud20.dat': 1, 'stud21a.dat': 1, 'stud22a.dat': 1, 'stud23.dat': 1, 'stud25.dat': 1, 'stud2a.dat': 1, 'stud2s.dat': 1, 'stud2s2.dat': 1, 'stud2s2e.dat': 1, 'stud3.dat': 1, 'stud3a.dat': 1, 'stud4.dat': 1, 'stud4a.dat': 1, 'stud4f1s.dat': 1, 'stud4f1w.dat': 1, 'stud4f2n.dat': 1, 'stud4f2s.dat': 1, 'stud4f2w.dat': 1, 'stud4f3s.dat': 1, 'stud4f4n.dat': 1, 'stud4f4s.dat': 1, 'stud4f5n.dat': 1, 'stud4h.dat': 1, 'stud4o.dat': 1, 'stud4od.dat': 1, 'stud4s.dat': 1, 'stud4s2.dat': 1, 'stud5.dat': 1, 'stud6.dat': 1, 'stud6a.dat': 1, 'stud7.dat': 1, 'stud8.dat': 1, 'stud8a.dat': 1, 'stud9.dat': 1, 'studa.dat': 1, 'studel.dat': 1, 'studline.dat': 1, 'studp01.dat': 1, 'studx.dat': 1, 'stug-10x1.dat': 1, 'stug-11x1.dat': 1, 'stug-12x1.dat': 1, 'stug-1x10.dat': 1, 'stug-1x11.dat': 1, 'stug-1x12.dat': 1, 'stug-1x2.dat': 1, 'stug-1x3.dat': 1, 'stug-1x4.dat': 1, 'stug-1x5.dat': 1, 'stug-1x6.dat': 1, 'stug-1x7.dat': 1, 'stug-1x8.dat': 1, 'stug-1x9.dat': 1, 'stug-2x1.dat': 1, 'stug-2x2.dat': 1, 'stug-3x1.dat': 1, 'stug-3x3.dat': 1, 'stug-4x1.dat': 1, 'stug-4x4.dat': 1, 'stug-5x1.dat': 1, 'stug-5x5.dat': 1, 'stug-6x1.dat': 1, 'stug-6x6.dat': 1, 'stug-7x1.dat': 1, 'stug-7x7.dat': 1,
	'stug-8x1.dat': 1, 'stug-8x8.dat': 1, 'stug-9x1.dat': 1, 'stug-9x9.dat': 1, 'stug2-10x1.dat': 1, 'stug2-1x12.dat': 1, 'stug2-1x2.dat': 1, 'stug2-1x3.dat': 1, 'stug2-1x4.dat': 1, 'stug2-1x6.dat': 1, 'stug2-1x8.dat': 1, 'stug2-2x1.dat': 1, 'stug2-2x2.dat': 1, 'stug2-4x1.dat': 1, 'stug2-4x4.dat': 1, 'stug2.dat': 1, 'stug20-1x6.dat': 1, 'stug20-1x7.dat': 1, 'stug20-1x8.dat': 1, 'stug20-2x2.dat': 1, 'stug20-3x3.dat': 1, 'stug20-4x4.dat': 1, 'stug20-5x1.dat': 1, 'stug20-7x1.dat': 1, 'stug20-7x7.dat': 1, 'stug20-8x8.dat': 1, 'stug2a.dat': 1, 'stug3-1x2.dat': 1, 'stug3-1x3.dat': 1, 'stug3-1x4.dat': 1, 'stug3-1x5.dat': 1, 'stug3-1x7.dat': 1, 'stug3.dat': 1, 'stug4-1x11.dat': 1, 'stug4-1x2.dat': 1, 'stug4-1x3.dat': 1, 'stug4-1x4.dat': 1, 'stug4-1x5.dat': 1, 'stug4-1x6.dat': 1, 'stug4-1x7.dat': 1, 'stug4-1x9.dat': 1, 'stug4-2x2.dat': 1, 'stug4-3x3.dat': 1, 'stug4-4x4.dat': 1, 'stug4-5x5.dat': 1, 'stug4-6x6.dat': 1, 'stug4-7x7.dat': 1, 'stug4.dat': 1, 'stug4a.dat': 1, 'stug5.dat': 1, 'stug6.dat': 1, 'stug7-1x6.dat': 1, 'stug7-2x2.dat': 1, 'stug7-6x6.dat': 1, 'stug7.dat': 1, 'stug8-1x3.dat': 1, 'stug8-1x5.dat': 1, 'stug8.dat': 1, 'stug9.dat': 1, 't01i0702.dat': 1, 't01i0714.dat': 1, 't01i0769.dat': 1, 't01i1579.dat': 1, 't01i1667.dat': 1, 't01i2000.dat': 1, 't01i3261.dat': 1, 't01i3333.dat': 1, 't01i3600.dat': 1, 't01i5556.dat': 1, 't01i6000.dat': 1, 't01o0556.dat': 1, 't01o0625.dat': 1, 't01o0667.dat': 1, 't01o0714.dat': 1, 't01o1154.dat': 1, 't01o1250.dat': 1, 't01o1429.dat': 1, 't01o1579.dat': 1, 't01o2222.dat': 1, 't01o2500.dat': 1, 't01o3333.dat': 1, 't01o3571.dat': 1, 't01o3750.dat': 1, 't01o3810.dat': 1, 't01o3889.dat': 1, 't01o4000.dat': 1, 't01q0702.dat': 1, 't01q1429.dat': 1, 't02i1111.dat': 1, 't02i2000.dat': 1, 't02i2258.dat': 1, 't02i4000.dat': 1, 't02o1111.dat': 1, 't02o1176.dat': 1, 't02o2000.dat': 1, 't02q3333.dat': 1, 't02q5455.dat': 1, 't04i0462.dat': 1, 't04i0625.dat': 1, 't04i0857.dat': 1, 't04i1111.dat': 1, 't04i1304.dat': 1, 't04i1333.dat': 1, 't04i1429.dat': 1, 't04i1765.dat': 1, 't04i2000.dat': 1, 't04i2258.dat': 1, 't04i2500.dat': 1, 't04i2667.dat': 1, 't04i3333.dat': 1, 't04i4167.dat': 1, 't04i5000.dat': 1, 't04i6381.dat': 1, 't04o0462.dat': 1, 't04o0625.dat': 1, 't04o0833.dat': 1, 't04o0857.dat': 1, 't04o1111.dat': 1, 't04o1250.dat': 1, 't04o1304.dat': 1, 't04o1333.dat': 1, 't04o1429.dat': 1, 't04o1538.dat': 1, 't04o1667.dat': 1, 't04o1765.dat': 1, 't04o1905.dat': 1, 't04o2000.dat': 1, 't04o2500.dat': 1, 't04o2667.dat': 1, 't04o3077.dat': 1, 't04o3333.dat': 1, 't04o3750.dat': 1, 't04o4167.dat': 1, 't04o5000.dat': 1, 't04o6250.dat': 1, 't04o6667.dat': 1, 't04o7000.dat': 1, 't04o7500.dat': 1, 't04o8889.dat': 1, 't04ounit.dat': 1, 't04q0625.dat': 1, 't04q1316.dat': 1, 't04q1538.dat': 1, 't04q2500.dat': 1, 't04q2857.dat': 1, 't04q3030.dat': 1, 't04q3333.dat': 1, 't04q3529.dat': 1, 't04q3750.dat': 1, 't04q4000.dat': 1, 't04q5455.dat': 1, 't04q7143.dat': 1, 't04q7500.dat': 1, 't04q9231.dat': 1, 't08i0909.dat': 1, 't08i2000.dat': 1, 't08o0727.dat': 1, 't08o0909.dat': 1, 't08o2000.dat': 1, 't08o6250.dat': 1, 't08q7500.dat': 1, 't16i0909.dat': 1, 't16i2000.dat': 1, 't16o0909.dat': 1, 't16o1429.dat': 1, 't16o2000.dat': 1, 't16o6250.dat': 1, 't16q7500.dat': 1, 'tootb28.dat': 1, 'tootb28s.dat': 1, 'tooth16.dat': 1, 'tooth24.dat': 1, 'tooth24a.dat': 1, 'tooth24b.dat': 1, 'tooth24c.dat': 1, 'tooth40.dat': 1, 'tooth8.dat': 1, 'tooth8a.dat': 1, 'toothb12.dat': 1, 'toothb14.dat': 1, 'toothb20.dat': 1, 'toothd28.dat': 1, 'toothl.dat': 1, 'toothr.dat': 1, 'tri3.dat': 1, 'tri3a1.dat': 1, 'tri3u1.dat': 1, 'tri3u3.dat': 1, 'tri4.dat': 1, 'triangle.dat': 1, 'typestn0.dat': 1, 'typestn5.dat': 1, 'typests4.dat': 1, 'typestua.dat': 1, 'typestub.dat': 1, 'typestud.dat': 1, 'typestue.dat': 1, 'typestuf.dat': 1, 'typestuh.dat': 1, 'typestui.dat': 1, 'typestuk.dat': 1, 'typestul.dat': 1, 'typestum.dat': 1, 'typestun.dat': 1, 'typestuo.dat': 1, 'typestur.dat': 1, 'typestus.dat': 1, 'typestut.dat': 1, 'typestuv.dat': 1, 'typestuw.dat': 1, 'typestuy.dat': 1, 'wpin.dat': 1, 'wpin2.dat': 1, 'wpin2a.dat': 1, 'wpin3.dat': 1, 'wpin4.dat': 1, 'wpinhol2.dat': 1, 'wpinhole.dat': 1, 'znap1.dat': 1, 'znap2.dat': 1, 'znap3a.dat': 1, 'znap3b.dat': 1, 'znap4.dat': 1, 'znap5.dat': 1, 'znap6.dat': 1, 'zstud.dat': 1
};
/* eslint-enable max-len */

async function req(fn) {
	if (!fn || typeof fn !== 'string') {
		return '';
	}
	fn = fn.replace(/\\/g, '/').toLowerCase();
	let resp, path;
	if (fn.startsWith('48/')) {
		path = partPathLookup[1];
	} else {
		path = partPathLookup[partsInPFolder[fn] || 0];
	}
	resp = await fetch(path + fn);
	if (resp == null || !resp.ok) {
		if (path.includes('/parts/')) {
			resp = await fetch(partPathLookup[1] + fn);
		} else {
			resp = await fetch(partPathLookup[0] + fn);
		}
	}
	if (resp == null || !resp.ok) {
		resp = await fetch(`/ldraw/models/${fn}`);
	}
	if (resp == null || !resp.ok) {
		console.log(`   *** FAILED TO LOAD: ${fn}`);
	}
	return await resp.text() || '';
}

// key: submodel filename, value: lineList to be loaded
const unloadedSubModels = {};

let needLDConfig = true;

const primitiveTypes = {
	'2': 'line',
	'3': 'triangle',
	'4': 'quad',
	'5': 'condline'
};

function forceBlack(colorCode, abstractPartName, partName) {
	partName = (partName + '').toLowerCase();
	abstractPartName = (abstractPartName + '').toLowerCase();
	if (partName === '4-4cyli.dat') {
		if (abstractPartName === 'stud.dat' || abstractPartName === 'stud2.dat' ||
				abstractPartName === 'stud2a.dat' || abstractPartName === 'stod3.dat') {
			return 0;
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
	if (command === 'BFC') {
		if (line[2] === 'CERTIFY') {
			abstractPart.winding = line[3];
		} else if (line[2] === 'INVERTNEXT') {
			// NYI
		}
	} else if (command === 'FILE') {
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
	code = parseInt(code, 10);
	return (code === 16 || code === 24) ? -1 : code;
}

async function parsePart(abstractPartParent, line) {
	const partName = line.slice(14).join(' ');
	let colorCode = parseColorCode(line[1]);
	colorCode = forceBlack(colorCode, abstractPartParent.filename, partName);
	const part = await loadPart(partName);
	if (part) {
		abstractPartParent.parts.push({
			colorCode: colorCode,
			filename: partName,
			matrix: parseFloatList(line.slice(2, 14))
		});
	}
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
	'0': parseComment,
	'1': parsePart,
	'2': parseLine,
	'3': parseFace,
	'4': parseFace,
	'5': parseCondLine
};

async function lineListToAbstractPart(fn, lineList, progressCallback) {
	const abstractPart = {
		filename: fn,
		name: '',
		winding: 'CW',
		parts: [],
		primitives: []
	};
	// First line in any LDraw file is assumed to be the part / main model's colloquial name
	if (lineList[0] && lineList[0][0] === '0') {
		if (lineList[0][1] === 'FILE') {
			abstractPart.name = lineList[0].slice(2).join(' ');
		} else {
			abstractPart.name = lineList[0].slice(1).join(' ');
			abstractPart.name = abstractPart.name.replace(/^Name:\s*/ig, '');  // Trim leading 'Name: ', if any
		}
	}
	if (!fn && lineList[1] && lineList[1][0] === '0' && lineList[1][1] === 'Name:') {
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

async function loadSubModels(lineList) {
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
			partName = lineList[models[i].start].slice(2).join(' ').toLowerCase();
			unloadedSubModels[partName] = lineList.slice(models[i].start, models[i].end + 1);
		}
		partName = lineList[models[0].start].slice(2).join(' ');
		const lines = lineList.slice(models[0].start, models[0].end + 1);
		return await lineListToAbstractPart(partName, lines, api.progressCallback);
	}
	return null;
}

async function loadPart(fn, content, progressCallback) {
	let part;
	if (needLDConfig) {
		api.colorTable = await api.loadLDConfig();
		needLDConfig = false;
	}
	if (fn && fn in api.partDictionary) {
		return api.partDictionary[fn];
	} else if (fn && fn.toLowerCase() in unloadedSubModels) {
		const fnLower = fn.toLowerCase();
		part = await lineListToAbstractPart(fn, unloadedSubModels[fnLower], api.progressCallback);
		part.isSubModel = true;
		delete unloadedSubModels[fnLower];
	} else {
		if (!content) {
			content = await req(fn);
		}
		if (!content) {
			return null;  // No content, nothing to create
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
			return null;  // No content, nothing to create
		}
		if (progressCallback) {
			progressCallback({stepCount: partCount});
		}
		if (!fn || fn.endsWith('mpd')) {
			part = await loadSubModels(lineList);
		}
		if (part == null) {
			part = await lineListToAbstractPart(fn, lineList, progressCallback);
		}
	}
	api.partDictionary[fn || part.filename] = part;
	if (part.steps) {
		delete part.steps.lastPart;
		// Check if any parts were left out of the last step; add them to a new step if so.
		// This happens often when a model / submodel does not end with a 'STEP 0' command.
		const lastStepParts = part.steps[part.steps.length - 1].parts;
		if (lastStepParts[lastStepParts.length - 1] < part.parts.length - 1) {
			part.steps.push({parts: []});
			for (let i = lastStepParts[lastStepParts.length - 1] + 1; i < part.parts.length; i++) {
				part.steps[part.steps.length - 1].parts.push(i);
			}
		}
	}
	return part;
}

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = api;
}

return api;

})();
