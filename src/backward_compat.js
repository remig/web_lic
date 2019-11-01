/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';

// 'fixOldFoo' state is anything before the big version 0.45
// Anything older than the latest version but newer than 0.44 must still
// be upgraded, but by regular 'fixFoo' logic

function fixOldRotation(oldRotation) {
	const newRotation = [];
	if (oldRotation.x) {
		newRotation.push({axis: 'x', angle: oldRotation.x});
	}
	if (oldRotation.y) {
		newRotation.push({axis: 'y', angle: oldRotation.y});
	}
	if (oldRotation.z) {
		newRotation.push({axis: 'z', angle: oldRotation.z});
	}
	return newRotation;
}

function fixOldTemplate(template) {

	if (template.pliItem.rotation != null) {
		template.pliItem.rotation = fixOldRotation(template.pliItem.rotation);
	}
	if (template.step.csi.rotation != null) {
		template.step.csi.rotation = fixOldRotation(template.step.csi.rotation);
	}
	if (template.submodelImage.csi.rotation != null) {
		template.submodelImage.csi.rotation = fixOldRotation(template.submodelImage.csi.rotation);
	}
	if (template.submodelImage.maxHeight == null) {
		template.submodelImage.maxHeight = 0.3;
	}

	if (template.sceneRendering == null) {
		template.sceneRendering = {};
	}
	if (template.sceneRendering.zoom == null) {
		template.sceneRendering.zoom = 0;
	}
	if (template.sceneRendering.edgeWidth == null) {
		template.sceneRendering.edgeWidth = 4;
	}
	if (template.sceneRendering.rotation == null) {
		template.sceneRendering.rotation = [
			// These are the camera rotations used in older versions of lic.
			{axis: 'x', angle: 26.33},
			{axis: 'y', angle: 45}
		];
	}
	template.useBlackStudFaces = true;
}

function fixState(state) {
	if (state.books == null) {
		state.books = [];
	}

	state.pages.forEach(page => {
		if (page.subtype == null) {
			page.subtype = 'page';
		}
	});

	if (state.titlePage) {
		state.titlePage.type = 'page';
		state.titlePage.subtype = 'titlePage';
		const newId = Math.max(...state.pages.map(el => el.id)) + 1;
		changeItemId(state.titlePage, newId, state);
		state.pages.unshift(state.titlePage);
	}
	if (state.templatePage) {
		state.templatePage.type = 'page';
		state.templatePage.subtype = 'templatePage';
		state.templatePage.number = 0;
		const newId = Math.max(...state.pages.map(el => el.id)) + 1;
		changeItemId(state.templatePage, newId, state);
		state.pages.unshift(state.templatePage);
	}
	if (state.inventoryPages) {
		const newId = Math.max(...state.pages.map(el => el.id)) + 1;
		state.inventoryPages.forEach((page, idx) => {
			page.type = 'page';
			page.subtype = 'inventoryPage';
			changeItemId(page, newId + idx, state);
		});
		state.pages = state.pages.concat(state.inventoryPages);
	}

	delete state.titlePage;
	delete state.templatePage;
	delete state.inventoryPages;
}

function fixOldState(state) {

	if (state.inventoryPages == null) {
		state.inventoryPages = [];
	}
	if (state.pliTransforms == null) {
		state.pliTransforms = {};
	}

	state.pages.forEach(page => {
		if (page.pliItems == null) {
			page.pliItems = [];
		}
	});

	state.steps.forEach(step => {
		if (step.stretchedPages == null) {
			step.stretchedPages = [];
		}
		if (step.annotations == null) {
			step.annotations = [];
		}
		if (step.displacedParts) {
			step.displacedParts.forEach(d => {
				if (d.hasOwnProperty('distance')) {
					d.partDistance = d.distance;
					delete d.distance;
				}
			});
		}
	});

	state.csis.forEach(csi => {
		if (csi.annotations == null) {
			csi.annotations = [];
		}
		if (csi.rotation != null) {
			csi.rotation = fixOldRotation(csi.rotation);
		}
	});

	state.callouts.forEach(callout => {
		if (!callout.hasOwnProperty('borderOffset')) {
			callout.borderOffset = {x: 0, y: 0};
		}
		if (!callout.hasOwnProperty('position')) {
			callout.position = 'left';
		}
	});

	state.pliItems.forEach(pliItem => {
		delete pliItem.partNumbers;
	});
}

function fixColorTable(colorTable) {

	for (const colorCode in colorTable) {
		if (colorTable.hasOwnProperty(colorCode)) {
			const entry = colorTable[colorCode];
			if (entry.color === -1) {
				delete entry.color;
			}
			if (entry.edge === -1) {
				delete entry.edge;
			}
			if (typeof entry.color === 'number') {
				entry.color = '#' + (entry.color).toString(16).padStart(6, '0');
				entry.edge = '#' + (entry.edge).toString(16).padStart(6, '0');
			}
			if (entry.rgba == null && entry.color != null) {
				entry.rgba = _.color.toVec4(entry.color, entry.alpha);
			}
			if (entry.edgeRgba == null && entry.edge != null) {
				entry.edgeRgba = _.color.toVec4(entry.edge, 0);
			}
		}
	}
	return colorTable;
}

function fixOldPartDictionary(partDictionary) {

	for (const partFn in partDictionary) {
		if (partDictionary.hasOwnProperty(partFn)) {
			const part = partDictionary[partFn];
			if (part.parts) {
				if (part.parts.length) {
					// Newer code treats missing color codes as 'inherit', instead of storing -1s everywhere
					for (let i = 0; i < part.parts.length; i++) {
						if (part.parts[i].colorCode === -1) {
							delete part.parts[i].colorCode;
						}
					}
				} else {
					delete part.parts;
				}
			}
			if (part.primitives) {
				if (part.primitives.length) {
					// convert primitives to new, more compact form
					part.primitives = part.primitives.map(p => {
						if (p.colorCode === -1 || p.shape === 'line' || p.shape === 'condline') {
							if (p.shape === 'condline') {
								return {p: p.points, cp: p.conditionalPoints};
							}
							return p.points;
						}
						return {p: p.points, c: p.colorCode};
					});
				} else {
					delete part.primitives;
				}
			}
		}
	}
}

function changeItemId(item, newId, state) {

	function fixChildList(listType) {
		(item[listType] || []).forEach(itemId => {
			state[listType]
				.find(item => item.id === itemId)
				.parent = {type: item.type, id: newId};
		});
	}

	function fixChild(childType) {
		if (item[childType + 'ID'] != null) {
			const child = state[childType + 's']
				.find(el => el.id === item[childType + 'ID']);
			if (child) {
				child.parent = {type: item.type, id: newId};
			}
		}
	}

	fixChildList('steps');
	fixChildList('annotations');
	fixChildList('dividers');
	fixChildList('pliItems');

	fixChild('numberLabel');

	item.id = newId;
}

function isOld(content) {
	const version = _.version.parse(content.version);
	return version.major < 1 && version.minor < 45;
}

function fixLicTemplate(content) {
	if (isOld(content)) {
		fixOldTemplate(content.template);
	}
}

function fixLicSaveFile(content) {

	if (isOld(content)) {

		if (_.isEmpty(content.state.licFilename)) {
			content.state.licFilename = content.modelFilename.split('.')[0];
		}

		fixOldState(content.state);
		fixOldTemplate(content.state.template);
		fixColorTable(content.colorTable);
		fixOldPartDictionary(content.partDictionary);
	}

	fixState(content.state);
}

export default {fixLicSaveFile, fixLicTemplate, fixColorTable};
