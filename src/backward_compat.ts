/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';
import defaultTemplate from './template';

// 'fixOldFoo' state is anything before the big version 0.45
// Anything older than the latest version but newer than 0.44 must still
// be upgraded, but by regular 'fixFoo' logic

function fixOldRotation(oldRotation: any) {
	const newRotation: Rotation[] = [];
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

function fixOldTemplate(template: Template) {

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
		template.sceneRendering = _.cloneDeep(defaultTemplate.sceneRendering);
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
			{axis: 'y', angle: 45},
		];
	}
	template.useBlackStudFaces = true;
}

function fixState(state: any) {
	if (state.books == null) {
		state.books = [];
	}

	state.pages.forEach((page: Page) => {
		if (page.subtype == null) {
			page.subtype = 'page';
		}
	});

	if (state.titlePage) {
		state.titlePage.type = 'page';
		state.titlePage.subtype = 'titlePage';
		const newId = Math.max(...state.pages.map((el: Page) => el.id)) + 1;
		changeItemId(state.titlePage, newId, state);
		state.pages.unshift(state.titlePage);
	}
	if (state.templatePage) {
		state.templatePage.type = 'page';
		state.templatePage.subtype = 'templatePage';
		state.templatePage.number = 0;
		const newId = Math.max(...state.pages.map((el: Page) => el.id)) + 1;
		changeItemId(state.templatePage, newId, state);
		state.pages.unshift(state.templatePage);
	}
	if (state.inventoryPages) {
		const newId = Math.max(...state.pages.map((el: Page) => el.id)) + 1;
		state.inventoryPages.forEach((page: Page, idx: number) => {
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

function fixOldState(state: StateInterface) {

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
			step.displacedParts.forEach((d: any) => {
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
		delete (pliItem as any).partNumbers;
	});
}

function fixColorTable(colorTable: any) {

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

function fixOldPartDictionary(partDictionary: any) {

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
					part.primitives = part.primitives.map((p: any) => {
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

function changeItemId(item: any, newId: number, state: any) {

	function fixChildList(listType: string) {
		(item[listType] || []).forEach((itemId: number) => {
			state[listType]
				.find((child: any) => child.id === itemId)
				.parent = {type: item.type, id: newId};
		});
	}

	function fixChild(childType: ItemTypeNames) {
		if (item[childType + 'ID'] != null) {
			const child: any = state[childType + 's']
				.find((el: any) => el.id === item[childType + 'ID']);
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

function isOld(content: SaveFileContent) {
	const version = _.version.parse(content.version);
	return version.major < 1 && version.minor < 45;
}

function fixLicTemplate(content: any) {
	if (isOld(content)) {
		fixOldTemplate(content.template);
	}
}

function fixLicSaveFile(content: SaveFileContent) {

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
