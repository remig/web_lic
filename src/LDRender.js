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

const api = {

	// Render the chosen abstract part to the chosen container.
	// Return a {width, height} object representing the size of the rendering.
	// Optional config: {getData, resizeContainer, dx, dy, rotation: {x, y, z}}
	renderPart(part, containerID, size, config) {

		config = config || {};
		config.size = size;

		initialize();
		const scene = initScene(size);

		addPartToScene(scene, part, config);
		const res = render(scene, size, containerID, config);
		cleanup(scene);
		return res;
	},
	renderModel(part, containerID, size, config) {

		config = config || {};
		config.size = size;
		if (!config.partList) {
			config.partList = part.parts.map((part, idx) => idx);
		}

		initialize();
		const scene = initScene(size);

		addModelToScene(scene, part, config.partList, config);
		const res = render(scene, size, containerID, config);
		cleanup(scene);
		return res;
	},

	// Renders the model twice; once with all parts unselected and once with parts selected.
	// It renders the selected part to containerID, and returns the difference in position
	// between the selected and unselected renderings.  This is useful for offsetting renderings
	// so that they do not change positions when rendered with & without selected parts.
	renderAndDeltaSelectedPart(part, containerID, size, config) {

		config = config || {};
		config.size = size;
		if (!config.partList) {
			config.partList = part.parts.map((part, idx) => idx);
		}

		initialize();
		const scene = initScene(size);

		// Render with no parts selected
		config.includeSelection = false;
		addModelToScene(scene, part, config.partList, config);
		const noSelectedPartsBounds = render(scene, size, containerID, config);

		// Render again with parts selected
		config.includeSelection = true;
		addModelToScene(scene, part, config.partList, config);
		const selectedPartsBounds = render(scene, size, containerID, config);
		cleanup(scene);

		return {
			dx: Math.max(0, noSelectedPartsBounds.x - selectedPartsBounds.x),
			dy: Math.max(0, noSelectedPartsBounds.y - selectedPartsBounds.y)
		};
	},

	// Like renderModel / renderPart, except it doesn't copy the rendered image to a target
	// node, it only returns the raw image data as a base64 encoded string
	renderModelData(part, size, config) {
		config = config || {};
		config.getData = true;
		return api.renderModel(part, null, size, config);
	},
	renderPartData(part, size, config) {
		config = config || {};
		config.getData = true;
		return api.renderPart(part, null, size, config);
	},
	setPartDictionary(dict) {
		api.partDictionary = dict;    // Part dictionary {partName : abstractPart} as created by LDParse
	},
	partDictionary: {}
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

function initialize() {

	if (api.partDictionary == null) {
		throw 'LDRender: You must set a partDictionary via LDRender.setPartDictionary() before rendering a part.';
	} else if (isInitialized) {
		return;
	}

	const offscreenContainer = document.createElement('div');
	offscreenContainer.setAttribute('style', 'position: absolute; left: -10000px; top: -10000px;');
	offscreenContainer.setAttribute('id', 'offscreen_render_container');
	document.body.appendChild(offscreenContainer);

	renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
	offscreenContainer.appendChild(renderer.domElement);

	const viewBox = (500 / 1);
	camera = new THREE.OrthographicCamera(-viewBox, viewBox, viewBox, -viewBox, 0.1, 10000);
	camera.up = new THREE.Vector3(0, -1, 0);  // -1 because LDraw coordinate space has -y as UP
	camera.position.x = viewBox;
	camera.position.y = -viewBox + (150 / 1);
	camera.position.z = -viewBox;
	camera.lookAt(new THREE.Vector3());
	isInitialized = true;
}

function initScene(size) {

	const scene = new THREE.Scene();
	scene.add(new THREE.AmbientLight(0x404040));

	// These three calls must be made before addModelToScene(), to correctly project points to screen (for conditional line rendering)
	renderer.setSize(size, size);
	camera.updateMatrixWorld();
	camera.updateProjectionMatrix();

	return scene;
}

function cleanup(scene) {
	renderer.renderLists.dispose();
	scene.traverse(node => {
		if (node instanceof THREE.Mesh) {
			if (node.geometry) {
				node.geometry.dispose();
			}
			if (node.material) {
				node.material.dispose();
			}
		}
	});
}

// Render the specified scene in a size x size viewport, then crop it of all whitespace.
// If containerID refers to an SVG image or HTML5 canvas, copy rendered image there.
// Return a {width, height} object specifying the final tightly cropped rendered image size.
function render(scene, size, containerID, config) {

	config = config || {};

	renderer.render(scene, camera);

	// Create a new 2D canvas so we can convert the full 3D canvas into a 2D canvas, and retrieve its image data
	// TODO: create this canvas just once way offscreen
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;

	const ctx = canvas.getContext('2d');
	ctx.drawImage(renderer.domElement, 0, 0);
	const data = ctx.getImageData(0, 0, size, size);

	const bounds = contextBoundingBox(data.data, size, size);
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
	return {x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h};
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

	const geometry = {
		faces: new THREE.Geometry(),
		lines: new THREE.Geometry(),
		condlines: []
	};

	const colorObj = (colorCode == null) ? null : new THREE.Color(LDParse.getColor(colorCode));
	const lineColor = (colorCode == null) ? null : new THREE.Color(LDParse.getColor(colorCode, 'edge'));
	for (let i = 0; i < abstractPart.primitives.length; i++) {
		const primitive = abstractPart.primitives[i];
		const p = primitive.points;
		if (primitive.shape === 'line') {
			geometry.lines.vertices.push(new THREE.Vector3(p[0], p[1], p[2]));
			geometry.lines.vertices.push(new THREE.Vector3(p[3], p[4], p[5]));
			if (lineColor) {
				geometry.lines.colors.push(lineColor);
				geometry.lines.colors.push(lineColor);
			}
		} else if (primitive.shape === 'condline') {
			const cp = primitive.conditionalPoints;
			const condLine = new THREE.Geometry();
			condLine.vertices.push(new THREE.Vector3(p[0], p[1], p[2]));
			condLine.vertices.push(new THREE.Vector3(p[3], p[4], p[5]));
			if (lineColor) {
				condLine.colors.push(lineColor);
				condLine.colors.push(lineColor);
			}
			geometry.condlines.push({
				line: condLine,
				c1: new THREE.Vector3(cp[0], cp[1], cp[2]),
				c2: new THREE.Vector3(cp[3], cp[4], cp[5])
			});
		} else {

			const vIdx = geometry.faces.vertices.length;
			geometry.faces.faces.push(new THREE.Face3(vIdx, vIdx + 1, vIdx + 2, null, colorObj));
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
		const color = part.colorCode >= 0 ? part.colorCode : colorCode;
		const subPartGeometry = getPartGeometry(api.partDictionary[part.filename], color);

		const faces = subPartGeometry.faces.clone().applyMatrix(matrix);
		geometry.faces.merge(faces);

		const lines = subPartGeometry.lines.clone().applyMatrix(matrix);
		geometry.lines.merge(lines);

		for (let l = 0; l < subPartGeometry.condlines.length; l++) {
			const condline = subPartGeometry.condlines[l];
			geometry.condlines.push({
				line: condline.line.clone().applyMatrix(matrix),
				c1: condline.c1.clone().applyMatrix4(matrix),
				c2: condline.c2.clone().applyMatrix4(matrix)
			});
		}
	}

	return geometry;
}

const selectedLineColor = 0xFF0000;
const faceMaterial = new THREE.MeshBasicMaterial({
	vertexColors: THREE.FaceColors,
	side: THREE.DoubleSide,
	polygonOffset: true,
	polygonOffsetFactor: 1,
	polygonOffsetUnits: 1
});
const selectedFaceMaterial = new THREE.MeshBasicMaterial({
	vertexColors: THREE.FaceColors,
	opacity: 0.5,
	transparent: true,
	side: THREE.DoubleSide
});

function project(vec, camera, size) {
	vec = vec.clone();
	vec.project(camera);
	vec.x = (vec.x * size) + size;
	vec.y = -(vec.y * size) + size;
	vec.z = 0;
	return vec;
}

function lineSide(p, l1, l2) {
	var res = ((p.x - l1.x) * (l2.y - l1.y)) - ((p.y - l1.y) * (l2.x - l1.x));
	return (res > 0) ? 1 : -1;
}

function addModelToScene(scene, model, partIDList, config) {

	const size = config.size / 2;
	for (let i = 0; i < partIDList.length; i++) {
		const part = model.parts[partIDList[i]];
		const abstractPart = api.partDictionary[part.filename];
		const drawSelected = config.includeSelection && part.selected;

		const matrix = LDMatrixToMatrix(part.matrix);
		const color = (part.colorCode >= 0) ? part.colorCode : null;
		const partGeometry = getPartGeometry(abstractPart, color);

		const faceMat = drawSelected ? selectedFaceMaterial : faceMaterial;
		const mesh = new THREE.Mesh(partGeometry.faces, faceMat);
		mesh.applyMatrix(matrix);
		scene.add(mesh);

		const line = new THREE.LineSegments(partGeometry.lines, faceMaterial);
		line.applyMatrix(matrix);
		scene.add(line);

		if (drawSelected) {
			const box = new THREE.Box3().setFromObject(mesh);
			const boxMesh = new THREE.Box3Helper(box, selectedLineColor);
			scene.add(boxMesh);
		}

		for (let l = 0; l < partGeometry.condlines.length; l++) {

			const condline = partGeometry.condlines[l];
			const cline = condline.line.clone().applyMatrix(matrix);
			const l1 = project(cline.vertices[0], camera, size);
			const l2 = project(cline.vertices[1], camera, size);

			const c1 = project(condline.c1.clone().applyMatrix4(matrix), camera, size);
			const c2 = project(condline.c2.clone().applyMatrix4(matrix), camera, size);

			if (lineSide(c1, l1, l2) === lineSide(c2, l1, l2)) {
				scene.add(new THREE.LineSegments(cline, faceMaterial));
			}
		}
	}
}

function addPartToScene(scene, part, config) {

	/*
	const mesh = new THREE.Mesh(partGeometry.faces.clone(), faceMaterial);
	if (config && config.rotation) {
		mesh.rotation.x = config.rotation.x * Math.PI / 180;
		mesh.rotation.y = config.rotation.y * Math.PI / 180;
		mesh.rotation.z = config.rotation.z * Math.PI / 180;
	}
	scene.add(mesh);
	*/

	part = {
		colorCode: part.colorCode,
		filename: part.filename,
		matrix: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
	};

	const model = {
		filename: part.filename,
		name: part.filename,
		parts: [part], primitives: [], steps: []
	};

	return addModelToScene(scene, model, [0], config);
}

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = api;
}

return api;

})();
