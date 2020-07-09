/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';
import LDParse from './ld_parse';
import LicGL from './webgl/licgl';

const measurementCanvas = document.createElement('canvas');
const renderState = {
	zoom: 500,
	lineThickness: 0.0015,
};

export interface LDRenderInterface {
	renderPart(
		colorCode: number,
		filename: string,
		containerID: string | HTMLCanvasElement,
		config: any
	): Box | null,
	renderModel(
		model: any, containerID: string | HTMLCanvasElement, config: any
	): Box | null,
	renderAndDeltaSelectedPart(
		model: any, containerID: string | HTMLCanvasElement, config: any
	): {dx: number, dy: number},
	setModel(model: any): void,
	setRenderState(newState: {zoom?: number, edgeWidth?: number}): void,
	imageOutOfBounds(bounds: Box, maxSize: number): boolean,
}

const api: LDRenderInterface = {

	// Render the chosen part filename with the chosen color code to the chosen container.
	// Return a {width, height} object representing the size of the rendering.
	// config: {size, resizeContainer, dx, dy, rotation: {x, y, z}}
	renderPart(colorCode, filename, containerID, config) {

		function renderCb(renderConfig: any) {
			const part = LDParse.partDictionary[filename];
			return LicGL.renderPart(part, colorCode, renderConfig);
		}
		return renderAndScaleToFit(renderCb, containerID, config);
	},

	renderModel(model, containerID, config) {

		function renderCb(renderConfig: any) {
			return LicGL.renderModel(model, renderConfig);
		}
		return renderAndScaleToFit(renderCb, containerID, config);
	},

	// Renders the model twice; once with all parts unselected and once with parts selected.
	// It renders the selected part to containerID, and returns the difference in position
	// between the selected and unselected renderings.  This is useful for offsetting renderings
	// so that they do not change positions when rendered with & without selected parts.
	renderAndDeltaSelectedPart(model, containerID, config) {

		function renderCb(renderConfig: any) {
			return LicGL.renderModel(model, renderConfig);
		}

		// Render with no parts selected
		const selectedPartIDs = config.selectedPartIDs;
		config.selectedPartIDs = null;
		const noSelectedPartsBounds = renderAndScaleToFit(renderCb, containerID, config);

		// Render again with parts selected
		config.selectedPartIDs = selectedPartIDs;
		const selectedPartsBounds = renderAndScaleToFit(renderCb, containerID, config);

		if (selectedPartsBounds == null || noSelectedPartsBounds == null) {
			return {dx: 0, dy: 0};
		}
		return {
			dx: Math.max(0, noSelectedPartsBounds.x - selectedPartsBounds.x),
			dy: Math.max(0, noSelectedPartsBounds.y - selectedPartsBounds.y),
		};
	},

	setModel(model) {
		LicGL.initialize();
		LicGL.initModel(model);
	},

	setRenderState(newState) {
		if (newState.zoom != null) {
			renderState.zoom = 500 + (newState.zoom * -10);
		}
		if (newState.edgeWidth != null) {
			renderState.lineThickness = newState.edgeWidth * 0.0004;
		}
	},

	imageOutOfBounds(bounds, maxSize) {
		if (bounds == null) {
			return false;
		}
		return bounds.x < 1
            || bounds.y < 1
            || (bounds.x + bounds.width) > maxSize
            || (bounds.y + bounds.height) > maxSize;
	},
};

function buildConfig(config: any) {

	const res = _.cloneDeep(config);
	if (config.zoom && config.zoom !== 1) {
		res.zoom = renderState.zoom / config.zoom;
	} else {
		res.zoom = renderState.zoom;
	}
	res.lineThickness = renderState.lineThickness;
	res.size = Math.max(Math.floor(config.size), 1);
	return res;
}

/* eslint-disable no-labels */
function contextBoundingBox(data: Uint8ClampedArray, w: number, h: number) {
	let x, y, minX = 0, minY = 0, maxX = 0, maxY = 0;
	o1: {
		for (y = h; y--;) {
			for (x = w; x--;) {
				if (data[(w * y + x) * 4 + 3] > 0) {
					maxY = y;
					break o1;
				}
			}
		}
	}
	if (!maxY) {
		return null;
	}
	o2: {
		for (x = w; x--;) {
			for (y = maxY + 1; y--;) {
				if (data[(w * y + x) * 4 + 3] > 0) {
					maxX = x;
					break o2;
				}
			}
		}
	}
	o3: {
		for (x = 0; x <= maxX; ++x) {
			for (y = maxY + 1; y--;) {
				if (data[(w * y + x) * 4 + 3] > 0) {
					minX = x;
					break o3;
				}
			}
		}
	}
	o4: {
		for (y = 0; y <= maxY; ++y) {
			for (x = minX; x <= maxX; ++x) {
				if (data[(w * y + x) * 4 + 3] > 0) {
					minY = y;
					break o4;
				}
			}
		}
	}
	return {
		x: minX,
		y: minY,
		maxX: maxX,
		maxY: maxY,
		width: maxX - minX,
		height: maxY - minY,
	};
}
/* eslint-enable no-labels */

function getCanvasBounds(canvas: HTMLCanvasElement, size: number) {
	measurementCanvas.width = measurementCanvas.height = size;
	const ctx = measurementCanvas.getContext('2d');
	if (ctx == null) {
		return null;
	}

	ctx.drawImage(canvas, 0, 0);
	const data = ctx.getImageData(0, 0, size, size);
	return contextBoundingBox(data.data, size, size);
}

// Re-render the canvas returned from renderCb() at increasing zooms until the rendered
// image is fully in the canvas, then draw the image to the chosen container
function renderAndScaleToFit(
	renderCb: (config: any) => HTMLCanvasElement,
	containerId: string | HTMLCanvasElement,
	config: any,
) {

	const maxZooms = 5;
	const glConfig = buildConfig(config);
	let maxSize = glConfig.size - 150;
	let zooms = 0;

	let canvas = renderCb(glConfig);
	let bounds = getCanvasBounds(canvas, glConfig.size);
	if (bounds == null) {
		return null;
	}
	while (zooms < maxZooms && api.imageOutOfBounds(bounds, maxSize)) {
		zooms += 1;
		glConfig.size *= 2;
		glConfig.zoom *= 2;
		glConfig.lineThickness *= 0.5;
		maxSize = glConfig.size - 150;
		canvas = renderCb(glConfig);
		bounds = getCanvasBounds(canvas, glConfig.size);
		if (!bounds) {
			return null;
		}
	}

	// Draw the specified canvas into the specified container,
	// in a size x size viewport, then crop it of all whitespace.
	// Return a {width, height} object specifying the final tightly cropped rendered image size.
	const container = (typeof containerId === 'string')
		? document.getElementById(containerId) as HTMLCanvasElement
		: containerId;
	if (container == null) {
		return null;
	}
	if (config.resizeContainer) {
		container.width = bounds.width + 1;
		container.height = bounds.height + 1;
	}
	const ctx2 = container.getContext('2d');
	if (ctx2 == null) {
		return null;
	}
	ctx2.drawImage(
		canvas,
		bounds.x, bounds.y,
		bounds.width + 1, bounds.height + 1,
		config.dx || 0, config.dy || 0,
		bounds.width + 1, bounds.height + 1,
	);
	return {
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
	};
}

export default api;
