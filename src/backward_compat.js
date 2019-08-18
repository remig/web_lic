/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';

function fixRotation(oldRotation) {
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

function fixTemplate(template) {

	if (template.pliItem.rotation != null) {
		template.pliItem.rotation = fixRotation(template.pliItem.rotation);
	}
	if (template.step.csi.rotation != null) {
		template.step.csi.rotation = fixRotation(template.step.csi.rotation);
	}
	if (template.submodelImage.csi.rotation != null) {
		template.submodelImage.csi.rotation = fixRotation(template.submodelImage.csi.rotation);
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
			csi.rotation = fixRotation(csi.rotation);
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

function fixPartDictionary(partDictionary) {

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

function isOld(content) {
	const version = _.version.parse(content.version);
	return version.major < 1 && version.minor < 45;
}

function fixLicTemplate(content) {
	if (isOld(content)) {
		fixTemplate(content.template);
	}
}

function fixLicSaveFile(content) {

	if (isOld(content)) {

		if (_.isEmpty(content.state.licFilename)) {
			content.state.licFilename = content.modelFilename.split('.')[0];
		}

		fixState(content.state);
		fixTemplate(content.state.template);
		fixColorTable(content.colorTable);
		fixPartDictionary(content.partDictionary);
	}
}

export default {fixLicSaveFile, fixLicTemplate, fixColorTable};
