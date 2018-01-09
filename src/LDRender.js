/*global module: false, require: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
LDRender = (function() {
'use strict';

let THREE;
if (typeof window !== 'undefined' && window.THREE) {
	THREE = window.THREE;
} else if (typeof require !== 'undefined') {
	THREE = require('../lib/three');
}

let renderer, camera;
let isInitialized = false;

function initialize() {

	const offscreenContainer = document.createElement('div');
	offscreenContainer.setAttribute('style', 'position: absolute; left: -10000px; top: -10000px;');
	offscreenContainer.setAttribute('id', 'offscreen_render_container');
	document.body.appendChild(offscreenContainer);

	renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
	offscreenContainer.appendChild(renderer.domElement);

	const viewBox = 500;
	camera = new THREE.OrthographicCamera(-viewBox, viewBox, viewBox, -viewBox, 0.1, 10000);
	camera.up = new THREE.Vector3(0, -1, 0);  // -1 because LDraw coordinate space has -y as UP
	camera.position.x = viewBox;
	camera.position.y = -viewBox + 150;
	camera.position.z = -viewBox;

	// TODO: KILL THISSSSSSS!!  It's shitting all over my life.
	new THREE.OrbitControls(camera, renderer.domElement);
	isInitialized = true;
}

const api = {
	renderPart(part, containerID, size, config) {

		if (api.partDictionary == null) {
			throw 'LDRender: You must set a partDictionary via LDRender.setPartDictionary() before rendering a part.';
		} else if (!isInitialized) {
			initialize();
		}
		const scene = initScene();
		addPartToScene(scene, api.partDictionary[part.filename], part.colorCode, config);
		return render(scene, size, containerID, config);
	},
	renderModel(part, containerID, size, config) {

		if (api.partDictionary == null) {
			throw 'LDRender: You must set a partDictionary via LDRender.setPartDictionary() before rendering a model.';
		} else if (!isInitialized) {
			initialize();
		}

		config = config || {};
		const scene = initScene();
		const startPart = (config.startPart == null) ? 0 : config.startPart;
		const endPart = (config.endPart == null) ? part.parts.length - 1 : config.endPart;

		addModelToScene(scene, part, startPart, endPart);
		return render(scene, size, containerID, config);
	},

	// Like renderModel, except it doesn't copy the rendered image to a
	// target node, it only returns a {width, height} object instead
	measureModel(part, size, endPart, startPart) {
		return api.renderModel(part, null, size, {endPart: endPart, startPart: startPart});
	},
	measurePart(part, size, config) {
		return api.renderPart(part, null, size, config);
	},
	// Like renderModel, except it doesn't copy the rendered image to a target
	// node, it only returns the raw image data as a base64 encoded string
	renderModelData(part, size, endPart, startPart) {
		return api.renderModel(part, null, size, {endPart: endPart, startPart: startPart, getData: true});
	},
	renderPartData(part, size, config) {
		config = config || {};
		config.getData = true;
		return api.renderPart(part, null, size, config);
	},
	setPartDictionary(dict) {
		api.partDictionary = dict;    // Part dictionary {partName : abstractPart} as created by LDParse
	},
	partDictionary: {},
	geometryDictionary: {}  // key: part filename, value: part's geometry
};

function contextBoundingBox(data, w, h) {
	let x, y, minX, minY, maxX, maxY;
	o1:
		for (y = h; y--;) {
			for (x = w; x--;) {
				if (data[(w * y + x) * 4 + 3] > 0) {
					maxY = y;
					break o1;
				}
			}
		}
	if (!maxY) {
		return null;
	}
	o2:
		for (x = w; x--;) {
			for (y = maxY + 1; y--;) {
				if (data[(w * y + x) * 4 + 3] > 0) {
					maxX = x;
					break o2;
				}
			}
		}
	o3:
		for (x = 0; x <= maxX; ++x) {
			for (y = maxY + 1; y--;) {
				if (data[(w * y + x) * 4 + 3] > 0) {
					minX = x;
					break o3;
				}
			}
		}
	o4:
		for (y = 0;y <= maxY; ++y) {
			for (x = minX; x <= maxX; ++x) {
				if (data[(w * y + x) * 4 + 3] > 0) {
					minY = y;
					break o4;
				}
			}
		}
	return {
		x: minX, y: minY,
		maxX: maxX, maxY: maxY,
		w: maxX - minX, h: maxY - minY
	};
}

// Render the specified scene in a size x size viewport, then crop it of all whitespace.
// If containerID refers to an SVG image or HTML5 canvas, copy rendered image there.
// Return a {width, height} object specifying the final tightly cropped rendered image size.
function render(scene, size, containerID, config) {

	config = config || {};

	renderer.setSize(size, size);
	renderer.render(scene, camera);

	// Create a new 2D canvas so we can convert the full 3D canvas into a 2D canvas, and retrieve its image data
	// TODO: create this canvas just once way offscreen
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;

	const ctx = canvas.getContext('2d');
	ctx.drawImage(renderer.domElement, 0, 0);
	const data = ctx.getImageData(0, 0, size, size);

	const bounds = contextBoundingBox(data.data, size, size, 5);
	if (!bounds) {
		return null;
	}

	const container = (typeof containerID === 'string') ? document.getElementById(containerID) : containerID;
	if (container instanceof SVGImageElement || (containerID == null && config.getData)) {
		// Resize image to fit bounds then redraw image inside those bounds
		canvas.width = bounds.w + 1;
		canvas.height = bounds.h + 1;
		ctx.drawImage(renderer.domElement, -bounds.x, -bounds.y);
		const data2D = canvas.toDataURL('image/png');
		if (containerID == null && config.getData) {
			return {width: canvas.width, height: canvas.height, image: data2D};
		}
		container.setAttributeNS('http://www.w3.org/1999/xlink', 'href', data2D);
		container.setAttribute('width', canvas.width);
		container.setAttribute('height', canvas.height);
	} else if (container instanceof HTMLCanvasElement) {
		if (config.resizeContainer) {
			container.width = bounds.w + 1;
			container.height = bounds.h + 1;
		}
		const ctx2 = container.getContext('2d');
		ctx2.drawImage(
			renderer.domElement,
			bounds.x, bounds.y,
			bounds.w + 1, bounds.h + 1,
			config.dx || 0, config.dy || 0,
			bounds.w + 1, bounds.h + 1
		);
	}
	return {width: bounds.w, height: bounds.h};
}

function initScene() {

	const scene = new THREE.Scene();
	scene.add(new THREE.AmbientLight(0x404040));
	return scene;
}

/* eslint-disable no-multi-spaces, no-mixed-spaces-and-tabs */
function LDMatrixToMatrix(m) {
	const matrix = new THREE.Matrix4();
	matrix.set(
		m[3], m[ 4], m[ 5], m[0],
		m[6], m[ 7], m[ 8], m[1],
		m[9], m[10], m[11], m[2],
		   0,     0,     0,    1
	);
	return matrix;
}
/* eslint-enable no-multi-spaces, no-mixed-spaces-and-tabs */

function getPartGeometry(abstractPart, colorCode) {

	if (0 && abstractPart.geometry != null) {
		const faceGeometry = abstractPart.geometry.faces;
		if (colorCode != null && !abstractPart.isSubModel) {
			for (let i = 0; i < faceGeometry.faces.length; i++) {
				faceGeometry.faces[i].color.setHex(LDParse.getColor(colorCode));
			}
		}

		return {
			faces: faceGeometry,
			lines: abstractPart.geometry.lines.clone()
		};
	}

	const geometry = api.geometryDictionary[abstractPart.filename] = {
		faces: new THREE.Geometry(),
		lines: new THREE.Geometry()
	};

	var colorObj = (colorCode == null) ? null : new THREE.Color(LDParse.getColor(colorCode));
	for (let i = 0; i < abstractPart.primitives.length; i++) {
		const primitive = abstractPart.primitives[i];
		const p = primitive.points;
		if (primitive.shape === 'line') {
			geometry.lines.vertices.push(new THREE.Vector3(p[0], p[1], p[2]));
			geometry.lines.vertices.push(new THREE.Vector3(p[3], p[4], p[5]));
		} else {

			const vIdx = geometry.faces.vertices.length;
			const face1 = new THREE.Face3(vIdx, vIdx + 1, vIdx + 2, null, colorObj);
			geometry.faces.faces.push(face1);

			geometry.faces.vertices.push(new THREE.Vector3(p[0], p[1], p[2]));
			geometry.faces.vertices.push(new THREE.Vector3(p[3], p[4], p[5]));
			geometry.faces.vertices.push(new THREE.Vector3(p[6], p[7], p[8]));

			if (primitive.shape === 'quad') {
				geometry.faces.vertices.push(new THREE.Vector3(p[9], p[10], p[11]));
				const face2 = new THREE.Face3(vIdx, vIdx + 2, vIdx + 3, null, colorObj);
				geometry.faces.faces.push(face2);
			}
		}
	}

	for (let i = 0; i < abstractPart.parts.length; i++) {
		const part = abstractPart.parts[i];
		const matrix = LDMatrixToMatrix(part.matrix);
		const res = getPartGeometry(api.partDictionary[part.filename], part.colorCode >= 0 ? part.colorCode : colorCode, part.colorCode);
		const faces = res.faces.clone().applyMatrix(matrix);
		const lines = res.lines.clone().applyMatrix(matrix);
		geometry.faces.merge(faces);
		geometry.lines.merge(lines);
	}

	return geometry;
}

const faceMaterial = new THREE.MeshBasicMaterial({vertexColors: THREE.FaceColors, side: THREE.DoubleSide});
const lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 5});
const scaleDownVector3 = new THREE.Vector3(0.98, 0.98, 0.98);  // TODO: this is only applied to parts in a model; must apply to parts in submodel drawn as a single part inside a model

function addModelToScene(scene, model, startPart, endPart) {

	for (var i = startPart; i <= endPart; i++) {
		var part = model.parts[i];

		const matrix = LDMatrixToMatrix(part.matrix);
		matrix.scale(scaleDownVector3);
		const color = (part.colorCode >= 0) ? part.colorCode : null;
		const partGeometry = getPartGeometry(api.partDictionary[part.filename], color, null);

		const mesh = new THREE.Mesh(partGeometry.faces, faceMaterial);
		mesh.applyMatrix(matrix);
		scene.add(mesh);

		const line = new THREE.LineSegments(partGeometry.lines, lineMaterial);
		line.applyMatrix(matrix);
		scene.add(line);
	}
}

function addPartToScene(scene, abstractPart, colorCode, config) {
	const partGeometry = getPartGeometry(abstractPart, colorCode);

	const mesh = new THREE.Mesh(partGeometry.faces.clone(), faceMaterial);
	if (config && config.rotation) {
		mesh.rotation.x = config.rotation.x * Math.PI / 180;
		mesh.rotation.y = config.rotation.y * Math.PI / 180;
		mesh.rotation.z = config.rotation.z * Math.PI / 180;
	}
	scene.add(mesh);

	const line = new THREE.LineSegments(partGeometry.lines.clone(), lineMaterial);
	if (config && config.rotation) {
		line.rotation.x = config.rotation.x * Math.PI / 180;
		line.rotation.y = config.rotation.y * Math.PI / 180;
		line.rotation.z = config.rotation.z * Math.PI / 180;
	}
	scene.add(line);
}

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = api;
}

return api;

})();
