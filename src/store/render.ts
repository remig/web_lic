/* Web Lic - Copyright (C) 2018 Remi Gagne */

import store from '../store';
import LDRender from '../ld_render';

const canvasCache = (function() {
	let cache: {[key: string]: HTMLCanvasElement} = {};
	const transientCanvas = document.createElement('canvas');
	return {
		create(domId: string) {
			cache[domId] = document.createElement('canvas');
			return cache[domId];
		},
		get(domId?: string, bypass?: boolean) {
			if (domId == null || bypass === true) {
				return transientCanvas;
			}
			return cache[domId];
		},
		clear() {
			cache = {};
		},
	};
})();

function getCSIRotation(csi: CSI) {
	let rot = csi.rotation;
	if (rot?.length) {
		return rot;
	}
	rot = store.get.templateForItem(csi).rotation;
	return rot?.length ? rot : null;
}

function getCSIScale(csi: CSI) {
	let scale;
	if (csi.scale != null) {
		scale = csi.scale;
	} else if (csi.autoScale != null) {
		scale = csi.autoScale;
	}
	if (scale == null) {
		scale = store.get.templateForItem(csi).scale;
	}
	return (scale === 1) ? null : scale;
}

function getPLIItemRotation(item: PLIItem) {
	const transform = store.get.pliTransform(item.filename);
	const rot = (transform.rotation == null)
		? store.get.templateForItem(item).rotation
		: transform.rotation;
	return rot?.length ? rot : null;
}

function getPLIItemScale(item: PLIItem) {
	const transform = store.get.pliTransform(item.filename);
	const scale = (transform.scale == null)
		? store.get.templateForItem(item).scale
		: transform.scale;
	return (scale === 1) ? null : scale;
}

export interface RenderResult {
	width: number;
	height: number;
	dx?: number;
	dy?: number;
	container: any;
}

export interface RendererInterface {
	csi(
		localModel: any, step: Step, csi: CSI, selectedPartIDs?: number[] | null,
		hiResScale?: number, bypassCache?: boolean
	): RenderResult | null;
	csiWithSelection(
		localModel: any, step: Step, csi: CSI, selectedPartIDs?: number[] | null,
		hiResScale?: number, bypassCache?: boolean
	): RenderResult | null;
	pli(
		colorCode: number, filename: string, item: CSI | PLIItem,
		hiResScale?: number, bypassCache?: boolean
	): RenderResult | null;
	clearCanvasCache(): void;
	removeCanvas(item: ItemTypes): void;
	adjustCameraZoom(): void;
}

export const Renderer: RendererInterface = {

	csi(localModel, step, csi, selectedPartIDs, hiResScale = 1, bypassCache = false) {

		if (csi.domID == null) {
			csi.domID = `CSI_${step.csiID}`;
			csi.isDirty = true;
		}

		let container = canvasCache.get(csi.domID, bypassCache);
		if (csi.isDirty || container == null || bypassCache) {
			const config: any = {
				size: hiResScale * 1000,
				zoom: getCSIScale(csi),
				resizeContainer: true,
			};
			if (!store.get.isTitlePage(step.parent)) {
				const partList = store.get.partList(step);
				if (partList == null || !partList.length) {
					return null;
				}
				config.partList = partList;
				config.selectedPartIDs = selectedPartIDs;
				config.displacedParts = step.displacedParts;
				config.rotation = getCSIRotation(csi);
				config.displacementArrowColor = store.state.template.step.csi.displacementArrow.fill.color;
			}
			container = container || canvasCache.create(csi.domID);
			LDRender.renderModel(localModel, container, config);
			delete csi.isDirty;
		}
		return {width: container.width, height: container.height, dx: 0, dy: 0, container};
	},
	csiWithSelection(localModel, step, csi, selectedPartIDs) {
		const config = {
			size: 1000,
			zoom: getCSIScale(csi),
			partList: store.get.partList(step),
			selectedPartIDs,
			resizeContainer: true,
			displacedParts: step.displacedParts,
			rotation: getCSIRotation(csi),
			displacementArrowColor: store.state.template.step.csi.displacementArrow.fill.color,
		};
		const container = canvasCache.get();
		const offset = LDRender.renderAndDeltaSelectedPart(localModel, container, config);
		return {
			width: container.width,
			height: container.height,
			dx: offset.dx,
			dy: offset.dy,
			container,
		};
	},
	pli(colorCode, filename, item, hiResScale = 1, bypassCache) {

		if (item.domID == null) {
			item.domID = `PLI_${filename}_${colorCode}`;
			item.isDirty = true;
		}
		let container = canvasCache.get(item.domID, bypassCache);
		if (item.isDirty || container == null || bypassCache) {
			const zoom = (item.type === 'csi') ? getCSIScale(item) : getPLIItemScale(item);
			const rotation = (item.type === 'csi') ? getCSIRotation(item) : getPLIItemRotation(item);
			const config = {
				size: hiResScale * 1000,
				zoom,
				resizeContainer: true,
				rotation,
			};
			container = container || canvasCache.create(item.domID || '');
			LDRender.renderPart(colorCode, filename, container, config);
			delete item.isDirty;
		}
		return {width: container.width, height: container.height, container};
	},
	clearCanvasCache() {
		canvasCache.clear();
	},
	removeCanvas(item) {
		if (item.type === 'step') {
			const domID = `CSI_${item.csiID}`;
			const container = document.getElementById(domID);
			if (container) {
				container.remove();
			}
		}
	},
	adjustCameraZoom() {

		if (store.model == null) {
			return;
		}

		// Render the main model; if it's too big to fit in the default view, zoom out until it fits
		const size = 1000, maxSize = size - 150, zoomStep = 20;
		const config = {size, resizeContainer: true};
		const container = canvasCache.get();
		let zoom = 0;

		let res = LDRender.renderPart(0, store.model.filename, container, config);

		while (res && (zoom > -500) && LDRender.imageOutOfBounds(res, maxSize)) {
			zoom -= zoomStep;
			LDRender.setRenderState({zoom});
			res = LDRender.renderPart(0, store.model.filename, container, config);
		}
		store.state.template.sceneRendering.zoom = zoom;
	},
};
