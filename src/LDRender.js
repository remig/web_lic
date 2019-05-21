/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global THREE: false */
'use strict';

import LDParse from './LDParse';
import LicGL from './webgl/webgl_test';

let camera;
const measurementCanvas = document.createElement('canvas');

const renderState = {
	zoom: 500,
	edgeWidth: 0.0008
};

const rad = THREE.Math.degToRad;
const deg = THREE.Math.radToDeg;

const lineMaterial = new THREE.LineMaterial({
	color: 0xffffff,
	vertexColors: THREE.VertexColors,
	linewidth: renderState.edgeWidth
});

const faceMaterials = [
	new THREE.MeshBasicMaterial({
		vertexColors: THREE.FaceColors,
		side: THREE.DoubleSide,
		polygonOffset: true,
		polygonOffsetFactor: 1,
		polygonOffsetUnits: 1
	}),
	new THREE.MeshBasicMaterial({
		vertexColors: THREE.FaceColors,
		side: THREE.DoubleSide,
		opacity: 0.5,
		transparent: true,
		polygonOffset: true,
		polygonOffsetFactor: 1,
		polygonOffsetUnits: 1
	})
];

const arrowMaterial = new THREE.MeshBasicMaterial({
	color: 0xFF0000,
	side: THREE.DoubleSide
});

const api = {

	// Render the chosen part filename with the chosen color code to the chosen container.
	// Return a {width, height} object representing the size of the rendering.
	// Optional config: {resizeContainer, dx, dy, rotation: {x, y, z}}
	renderPart(colorCode, filename, containerID, size, config) {

		size = Math.max(Math.floor(size), 1);
		config = config || {};
		config.size = size;

		const part = LDParse.partDictionary[filename];
		const canvas = LicGL.renderPart(part, colorCode, size, config.rotation);
		return renderToCanvas(canvas, containerID, size, config);
	},

	renderModel(model, containerID, size, config) {

		size = Math.max(Math.floor(size), 1);
		config = config || {};
		config.size = size;

		const canvas = LicGL.renderModel(model, size, config.rotation, config.partList);
		return renderToCanvas(canvas, containerID, size, config);
	},

	// Renders the model twice; once with all parts unselected and once with parts selected.
	// It renders the selected part to containerID, and returns the difference in position
	// between the selected and unselected renderings.  This is useful for offsetting renderings
	// so that they do not change positions when rendered with & without selected parts.
	renderAndDeltaSelectedPart(model, containerID, size, config) {

		size = Math.max(Math.floor(size), 1);
		config = config || {};
		config.size = size;

		// Render with no parts selected
		let canvas = LicGL.renderModel(model, size, config.rotation, config.partList);
		const noSelectedPartsBounds = renderToCanvas(canvas, containerID, size, config);

		// Render again with parts selected
		canvas = LicGL.renderModel(model, size, config.rotation, config.partList, config.selectedPartIDs);
		const selectedPartsBounds = renderToCanvas(canvas, containerID, size, config);

		return {
			dx: Math.max(0, noSelectedPartsBounds.x - selectedPartsBounds.x),
			dy: Math.max(0, noSelectedPartsBounds.y - selectedPartsBounds.y)
		};
	},

	LDMatrixToTransform(m) {
		const position = new THREE.Vector3();
		const quaternion = new THREE.Quaternion();
		const scale = new THREE.Vector3();
		const matrix = LDMatrixToMatrix(m);
		matrix.decompose(position, quaternion, scale);
		const rotation = new THREE.Euler();
		rotation.setFromQuaternion(quaternion);
		rotation.x = deg(rotation.x);
		rotation.y = deg(rotation.y);
		rotation.z = deg(rotation.z);
		return {position, rotation, scale};
	},

	TransformToLDMatrix(transform) {
		const rot = transform.rotation;
		const euler = new THREE.Euler(rad(rot.x), rad(rot.y), rad(rot.z));
		const matrix = new THREE.Matrix4();
		matrix.makeRotationFromEuler(euler);
		matrix.setPosition(transform.position);
		return MatrixToLDMatrix(matrix).map(el => Math.abs(el) < 0.0000001 ? 0 : el);
	},

	setModel(model) {
		LicGL.initialize();
		LicGL.initModel(model);
	},

	setRenderState(newState) {
		if (newState.zoom != null) {
			const viewBox = renderState.zoom = 500 + (newState.zoom * -10);
			if (camera != null) {
				camera.right = camera.top = viewBox;
				camera.left = camera.bottom = -viewBox;
				camera.position.set(viewBox, -viewBox * 0.7, -viewBox);
			}
		}
		if (newState.edgeWidth != null) {
			renderState.edgeWidth = newState.edgeWidth * 0.0002;
			lineMaterial.linewidth = renderState.edgeWidth;
		}
	}
};

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

// Render the specified scene in a size x size viewport, then crop it of all whitespace.
// Return a {width, height} object specifying the final tightly cropped rendered image size.
function renderToCanvas(canvas, container, size, config) {

	measurementCanvas.width = measurementCanvas.height = size;
	const ctx = measurementCanvas.getContext('2d');
	ctx.drawImage(canvas, 0, 0);
	const data = ctx.getImageData(0, 0, size, size);

	const bounds = contextBoundingBox(data.data, size, size);
	if (!bounds) {
		return null;
	}

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
	return {x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h};
}

/* eslint-disable no-multi-spaces, no-mixed-spaces-and-tabs, computed-property-spacing */
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

function MatrixToLDMatrix(m) {
	const a = m.elements;
	return [
		a[12], a[13], a[14],  // x, y, z
		a[ 0], a[ 4], a[ 8], a[1], a[5], a[9], a[2], a[6], a[10]  // a - i
	];
}
/* eslint-enable no-multi-spaces, no-mixed-spaces-and-tabs, computed-property-spacing */

const arrowDimensions = {
	head: {
		length: 28,
		width: 7,
		insetDepth: 4
	},
	body: {
		width: 1.25
	}
};

// Arrow geometry has base at (0, 0, 0), pointing straight down along Y, facing forward along Z
function getArrowGeometry(length = 60) {
	const head = arrowDimensions.head, body = arrowDimensions.body;
	const geom = new THREE.Geometry();
	geom.vertices.push(new THREE.Vector3(0, length, 0));  // 0
	geom.vertices.push(new THREE.Vector3(-head.width, length - head.length, 0));  // 1
	geom.vertices.push(new THREE.Vector3(-body.width, length - head.length + head.insetDepth, 0));  // 2
	geom.vertices.push(new THREE.Vector3(body.width, length - head.length + head.insetDepth, 0));  // 3
	geom.vertices.push(new THREE.Vector3(head.width, length - head.length, 0));  // 4
	geom.vertices.push(new THREE.Vector3(body.width, 0, 0));  // 5
	geom.vertices.push(new THREE.Vector3(-body.width, 0, 0));  // 6
	geom.faces.push(new THREE.Face3(0, 1, 2));
	geom.faces.push(new THREE.Face3(0, 2, 3));
	geom.faces.push(new THREE.Face3(0, 3, 4));
	geom.faces.push(new THREE.Face3(2, 3, 5));
	geom.faces.push(new THREE.Face3(2, 5, 6));
	return geom;
}

function getPartDisplacement({direction, partDistance = 60}) {
	switch (direction) {
		case 'left':
			return {x: -partDistance, y: 0, z: 0};
		case 'right':
			return {x: partDistance, y: 0, z: 0};
		case 'forward':
			return {x: 0, y: 0, z: -partDistance};
		case 'backward':
			return {x: 0, y: 0, z: partDistance};
		case 'down':
			return {x: 0, y: partDistance, z: 0};
		case 'up':
		default:
			return {x: 0, y: -partDistance, z: 0};
	}
}

function getArrowInitialPosition(partMesh) {
	const partBox = new THREE.Box3().setFromObject(partMesh);
	const center = partBox.getCenter();
	return new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
}

function getArrowOffsetPosition(partBox, {direction, arrowOffset = 0}) {

	const max = partBox.max, min = partBox.min;
	let x = 0, y = 0, z = 0;

	switch (direction) {
		case 'left':
			x = ((max.x - min.x) / 2) + arrowOffset;
			break;
		case 'right':
			x = -((max.x - min.x) / 2) - arrowOffset;
			break;
		case 'forward':
			z = ((max.z - min.z) / 2) + arrowOffset;
			break;
		case 'backward':
			z = -((max.z - min.z) / 2) - arrowOffset;
			break;
		case 'down':
			y = -((max.y - min.y) / 2) - arrowOffset;
			break;
		case 'up':
		default:
			// -6 because arrow almost always lands on top of a stud, and a stud is about 6 units tall
			y = ((max.y - min.y) / 2) + arrowOffset - 6;
			break;
	}
	return new THREE.Matrix4().makeTranslation(x, y, z);
}

function getArrowRotation({direction, arrowRotation = 0}) {
	let x = 0, y = 0, z = 0;
	switch (direction) {
		case 'left':
			z = -90;
			x = -45 + arrowRotation;
			break;
		case 'right':
			z = 90;
			x = -45 + arrowRotation;
			break;
		case 'forward':
			x = 90;
			y = 45 + arrowRotation;
			break;
		case 'backward':
			x = -90;
			y = -45 + arrowRotation;
			break;
		case 'down':
			x = 180;
			y = 45 + arrowRotation;
			break;
		case 'up':
		default:
			y = -45 + arrowRotation;
			break;
	}
	const rot = new THREE.Euler(rad(x), rad(y), rad(z), 'XYZ');
	return new THREE.Matrix4().makeRotationFromEuler(rot);
}

function getArrowMesh(partMesh, partBox, partRotation, displacement) {

	const arrowGeometry = getArrowGeometry(displacement.arrowLength);
	const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
	const arrowMatrix = new THREE.Matrix4();
	arrowMatrix.multiply(getArrowInitialPosition(partMesh));
	if (partRotation) {
		arrowMatrix.multiply(partRotation);
	}
	arrowMatrix.multiply(getArrowOffsetPosition(partBox, displacement));
	arrowMatrix.multiply(getArrowRotation(displacement));
	arrowMesh.applyMatrix(arrowMatrix);

	return arrowMesh;
}

function addModelToScene(scene, model, partIDList, config) {

	const displacedParts = {};
	(config.displacedParts || []).forEach(p => {
		displacedParts[p.partID] = p;
	});

	for (let i = 0; i < partIDList.length; i++) {
		const part = model.parts[partIDList[i]];
		const displacement = displacedParts[partIDList[i]];

		const matrix = LDMatrixToMatrix(part.matrix);
		const partGeometry = null;

		if (displacement) {
			const {x, y, z} = getPartDisplacement(displacement);
			matrix.premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
		}

		let partRotation;
		if (config.rotation) {
			const {x, y, z} = config.rotation;
			partRotation = new THREE.Euler(rad(x), rad(y), rad(z), 'XYZ');
			partRotation = new THREE.Matrix4().makeRotationFromEuler(partRotation);
			matrix.premultiply(partRotation);
		}

		const mesh = new THREE.Mesh(partGeometry.faces, faceMaterials);

		let meshBox;
		if (displacement) {
			// Store copy of untransformed part bounding box, for displacement arrow positioning later
			meshBox = new THREE.Box3().setFromObject(mesh);
		}

		mesh.applyMatrix(matrix);
		scene.add(mesh);

		const lineGeom = new THREE.LineSegmentsGeometry();
		const points = [], colors = [];
		for (let i = 0; i < partGeometry.lines.vertices.length; i++) {
			const v = partGeometry.lines.vertices[i];
			const c = partGeometry.lines.colors[i];
			points.push(v.x, v.y, v.z);
			colors.push(c.r, c.g, c.b);
		}
		lineGeom.setPositions(points);
		lineGeom.setColors(colors);

		const line = new THREE.LineSegments2(lineGeom, lineMaterial);
		line.applyMatrix(matrix);
		scene.add(line);

		if (displacement) {
			if (config.displacementArrowColor) {
				arrowMaterial.color.set(config.displacementArrowColor);
			}
			const arrowMesh = getArrowMesh(mesh, meshBox, partRotation, displacement);
			scene.add(arrowMesh);
		}
	}
}

export default api;
