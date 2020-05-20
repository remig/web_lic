/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';
import LDParse from './ld_parse';
import LicGL from './webgl/licgl';

const measurementCanvas = document.createElement('canvas');
const renderState = {
	zoom: 500,
	lineThickness: 0.0015
};

const api = {

	// Render the chosen part filename with the chosen color code to the chosen container.
	// Return a {width, height} object representing the size of the rendering.
	// config: {size, resizeContainer, dx, dy, rotation: {x, y, z}}
	renderPart(colorCode, filename, containerID, config) {

		config = buildConfig(config);
		const part = LDParse.partDictionary[filename];
		const canvas = LicGL.renderPart(part, colorCode, config);
		return renderToCanvas(canvas, containerID, config);
	},

	renderModel(model, containerID, config) {

		config = buildConfig(config);
		const canvas = LicGL.renderModel(model, config);
		return renderToCanvas(canvas, containerID, config);
	},

	// Renders the model twice; once with all parts unselected and once with parts selected.
	// It renders the selected part to containerID, and returns the difference in position
	// between the selected and unselected renderings.  This is useful for offsetting renderings
	// so that they do not change positions when rendered with & without selected parts.
	renderAndDeltaSelectedPart(model, containerID, config) {

		// Render with no parts selected
		config = buildConfig(config);
		const selectedPartIDs = config.selectedPartIDs;
		config.selectedPartIDs = null;
		let canvas = LicGL.renderModel(model, config);
		const noSelectedPartsBounds = renderToCanvas(canvas, containerID, config);

		// Render again with parts selected
		config.selectedPartIDs = selectedPartIDs;
		canvas = LicGL.renderModel(model, config);
		const selectedPartsBounds = renderToCanvas(canvas, containerID, config);

		return {
			dx: Math.max(0, noSelectedPartsBounds.x - selectedPartsBounds.x),
			dy: Math.max(0, noSelectedPartsBounds.y - selectedPartsBounds.y)
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
	}
};

function buildConfig(config) {

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
function contextBoundingBox(data, w, h) {
	let x, y, minX, minY, maxX, maxY;
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
		x: minX, y: minY,
		maxX: maxX, maxY: maxY,
		w: maxX - minX, h: maxY - minY
	};
}
/* eslint-enable no-labels */

/**
 * Find the left-and-bottom-most point of the image
 * @param img
 */
function determineBottomLeft(img, w, h) {
	// start at the bottom line and find the first non-0 point
	for (let y = h - 1; y >= 0; --y) {
		for (let x = 0; x < w; ++x) {
			if (img[(y * w + x) * 4 + 3] > 0) {
				// found the first non-0 point
				return {
					x: x,
					y: y
				};
			}
		}
	}
	// fallback: should never happen!
	return {
		x: 0,
		y: h - 1
	};
}

// Render the specified scene in a size x size viewport, then crop it of all whitespace.
// Return a {width, height} object specifying the final tightly cropped rendered image size.
function renderToCanvas(canvas, container, config) {

	const size = config.size;
	measurementCanvas.width = measurementCanvas.height = size;
	const ctx = measurementCanvas.getContext('2d');
	ctx.drawImage(canvas, 0, 0);
	const data = ctx.getImageData(0, 0, size, size);

	const bounds = contextBoundingBox(data.data, size, size);
	if (!bounds) {
		return null;
	}

	const bottomLeft = determineBottomLeft(data.data, data.width, data.height);

	container = (typeof container === 'string') ? document.getElementById(container) : container;
	if (config.resizeContainer) {
		container.width = bounds.w + 1;
		container.height = bounds.h + 1;
	}
	const ctx2 = container.getContext('2d');
	ctx2.drawImage(
		canvas,
		bounds.x, bounds.y,
		bounds.w + 1, bounds.h + 1,
		config.dx || 0, config.dy || 0,
		bounds.w + 1, bounds.h + 1
	);
	return {
		x: bounds.x,
		y: bounds.y,
		width: bounds.w,
		height: bounds.h,
		bottomX: bottomLeft.x - bounds.x
	};
}

export default api;
