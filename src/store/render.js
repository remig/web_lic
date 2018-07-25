/* Web Lic - Copyright (C) 2018 Remi Gagne */

'use strict';

import _ from '../util';
import store from '../store';
import LDRender from '../LDRender';
import uiState from '../uiState';

function getCanvas(domID) {
	const container = document.createElement('canvas');
	container.setAttribute('id', domID);
	container.setAttribute('class', 'offscreen');
	document.getElementById('canvasHolder').appendChild(container);
	return container;
}

function getRotation(item) {
	let rot = item.rotation;
	if (rot) {
		return (rot.x === 0 && rot.y === 0 && rot.z === 0) ? null : rot;
	}
	if (item.filename) {
		const transform = uiState.getPLITransform(item.filename);
		if (transform.rotation) {
			return transform.rotation;
		}
	}
	rot = store.get.templateForItem(item).rotation;
	return (rot && rot.x === 0 && rot.y === 0 && rot.z === 0) ? null : rot;
}

function getScale(item) {
	let scale;
	if (item.scale != null) {
		scale = item.scale;
	} else if (item.autoScale != null) {
		scale = item.autoScale;
	} else if (item.filename) {
		const transform = uiState.getPLITransform(item.filename);
		if (transform.scale != null) {
			scale = transform.scale;
		}
	}
	if (scale == null) {
		scale = store.get.templateForItem(item).scale;
	}
	return (scale === 1) ? null : scale;
}

export default {

	csi(localModel, step, csi, selectedPartIDs, hiResScale = 1, bypassCache) {
		const scale = (getScale(csi) || 1) * hiResScale;
		if (csi.domID == null) {
			csi.domID = `CSI_${step.csiID}`;
			csi.isDirty = true;
		}
		let container = document.getElementById(bypassCache ? 'generateImagesCanvas' : csi.domID);
		if (csi.isDirty || container == null || bypassCache) {
			if (step.parts == null) {
				// TODO: this only happens for title page; need better indicator for this non-step step
				container = container || getCanvas(csi.domID);
				LDRender.renderModel(localModel, container, 1000 * scale, {resizeContainer: true});
			} else {
				const partList = store.get.partList(step);
				if (_.isEmpty(partList)) {
					return null;
				}
				const config = {
					partList,
					selectedPartIDs,
					resizeContainer: true,
					displacedParts: step.displacedParts,
					rotation: getRotation(csi),
					displacementArrowColor: store.state.template.step.csi.displacementArrow.fill.color
				};
				container = container || getCanvas(csi.domID);
				LDRender.renderModel(localModel, container, 1000 * scale, config);
			}
			delete csi.isDirty;
		}
		return {width: container.width, height: container.height, dx: 0, dy: 0, container};
	},
	csiWithSelection(localModel, step, csi, selectedPartIDs) {
		const config = {
			partList: store.get.partList(step),
			selectedPartIDs,
			resizeContainer: true,
			displacedParts: step.displacedParts,
			rotation: getRotation(csi),
			displacementArrowColor: store.state.template.step.csi.displacementArrow.fill.color
		};
		const scale = getScale(csi) || 1;
		const container = document.getElementById('generateImagesCanvas');
		const offset = LDRender.renderAndDeltaSelectedPart(localModel, container, 1000 * scale, config);
		return {width: container.width, height: container.height, dx: offset.dx, dy: offset.dy, container};
	},
	pli(colorCode, filename, item, hiResScale = 1, bypassCache) {
		const scale = (getScale(item) || 1) * hiResScale;
		if (item.domID == null) {
			item.domID = `PLI_${filename}_${colorCode}`;
			item.isDirty = true;
		}
		let container = document.getElementById(bypassCache ? 'generateImagesCanvas' : item.domID);
		if ((item && item.isDirty) || container == null || bypassCache) {
			const config = {
				resizeContainer: true,
				rotation: getRotation(item)
			};
			container = container || getCanvas(item.domID, bypassCache);
			LDRender.renderPart(colorCode, filename, container, 1000 * scale, config);
			delete item.isDirty;
		}
		return {width: container.width, height: container.height, container};
	},
	removeCanvas(item) {
		if (item.type === 'step') {
			const domID = `CSI_${item.csiID}`;
			const container = document.getElementById(domID);
			if (container) {
				container.remove();
			}
		}
	}
};
