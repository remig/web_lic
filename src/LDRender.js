/* global THREE: false */

// eslint-disable-next-line no-implicit-globals, no-undef
LDRender = (function() {
'use strict';

var renderer, camera;

function contextBoundingBox(data, w, h) {
	var x, y, minX, minY, maxX, maxY;
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

function getImageData(image) {
	var canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;

	var ctx = canvas.getContext('2d');
	ctx.drawImage(image, 0, 0);

	return ctx.getImageData(0, 0, image.width, image.height);
}

var isInitialized = false;

function initialize() {

	var offscreenContainer = document.createElement('div');
	offscreenContainer.setAttribute('style', 'position: absolute; left: -10000px; top: -10000px;');
	offscreenContainer.setAttribute('id', 'offscreen_render_container');
	document.body.appendChild(offscreenContainer);

	renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
	offscreenContainer.appendChild(renderer.domElement);

	const viewBox = 500;
	camera = new THREE.OrthographicCamera(-viewBox, viewBox, viewBox, -viewBox, 0.1, 10000);
	camera.up = new THREE.Vector3(0, -1, 0);  // -1 because LDraw coordinate space has -y as UP
	camera.position.x = viewBox;
	camera.position.y = -viewBox;
	camera.position.z = -viewBox;

	var controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.addEventListener('change', render);
	controls.enableZoom = true;
}

function render(scene, containerID, size) {

	renderer.setSize(size, size);

	renderer.render(scene, camera);

	var data = getImageData(renderer.domElement);
	var bounds = contextBoundingBox(data.data, size, size, 5);
	if (!bounds) {
		return;
	}

	var canvas = document.getElementById(containerID);
	var ctx = canvas.getContext('2d');
	canvas.width = bounds.w + 1;
	canvas.height = bounds.h + 1;
	ctx.drawImage(renderer.domElement, -bounds.x, -bounds.y);
	ctx.rect(0.5, 0.5, bounds.w, bounds.h);
	ctx.stroke();
}

function initScene() {

	var scene = new THREE.Scene();
	scene.add(new THREE.AmbientLight(0x404040));
	return scene;
}

function LDQuadToArray(p) {
	return [
		p[0], p[ 1], p[ 2],
		p[3], p[ 4], p[ 5],
		p[6], p[ 7], p[ 8],

		p[6], p[ 7], p[ 8],
		p[9], p[10], p[11],
		p[0], p[ 1], p[ 2]
	];
}

function LDMatrixToMatrix(m) {
	var matrix = new THREE.Matrix4();
	matrix.set(
		m[3], m[ 4], m[ 5], m[0],
		m[6], m[ 7], m[ 8], m[1],
		m[9], m[10], m[11], m[2],
		   0,     0,     0,    1
	);
	return matrix;
}

function getPartGeometry(abstractPart, color) {

	if (abstractPart.geometry != null) {
		var faceGeometry = abstractPart.geometry.faces;
		if (color != null && !abstractPart.isSubModel) {
			for (var i = 0; i < faceGeometry.faces.length; i++) {
				var face = faceGeometry.faces[i];
				if (1 || !face.preserveColor) {
					face.color.setHex(color);
				}
			}
		}

		return {
			faces: faceGeometry,
			lines: abstractPart.geometry.lines.clone()
		};
	}

	abstractPart.geometry = {
		faces: new THREE.Geometry(),
		lines: new THREE.Geometry()
	};

	var colorObj = (color == null) ? null : new THREE.Color(color);
	abstractPart.primitives.forEach(function(primitive) {
		var p = primitive.points;
		if (primitive.shape === 'linexx') {
			var geometry = new THREE.Geometry();
			geometry.vertices.push(new THREE.Vector3(p[0], p[1], p[2]));
			geometry.vertices.push(new THREE.Vector3(p[3], p[4], p[5]));
			var line = new MeshLine();
			line.setGeometry(geometry);
			var material = new MeshLineMaterial({
				useMap: false,
				color: new THREE.Color((color == null) ? 0x000000 : color),
				lineWidth: 0.004,
				opacity: 1,
				resolution: new THREE.Vector2(w, h),
				sizeAttenuation: true
			});
			var mesh = new THREE.Mesh(line.geometry, material);
			scene.add(mesh);
		} else if (primitive.shape === 'line') {
			abstractPart.geometry.lines.vertices.push(new THREE.Vector3(p[0], p[ 1], p[ 2]));
			abstractPart.geometry.lines.vertices.push(new THREE.Vector3(p[3], p[ 4], p[ 5]));
		} else {
			var vIdx = abstractPart.geometry.faces.vertices.length;
			if (primitive.shape === 'quad') {
				abstractPart.geometry.faces.vertices.push(new THREE.Vector3(p[0], p[ 1], p[ 2]));
				abstractPart.geometry.faces.vertices.push(new THREE.Vector3(p[3], p[ 4], p[ 5]));
				abstractPart.geometry.faces.vertices.push(new THREE.Vector3(p[6], p[ 7], p[ 8]));
				abstractPart.geometry.faces.vertices.push(new THREE.Vector3(p[9], p[10], p[11]));
				var face1 = new THREE.Face3(vIdx, vIdx + 1, vIdx + 2, null, colorObj);
				var face2 = new THREE.Face3(vIdx, vIdx + 2, vIdx + 3, null, colorObj);
				if (color != null) {
					face1.preserveColor = face2.preserveColor = true;
				}
				abstractPart.geometry.faces.faces.push(face1);
				abstractPart.geometry.faces.faces.push(face2);
			} else if (primitive.shape === 'triangle') {
				abstractPart.geometry.faces.vertices.push(new THREE.Vector3(p[0], p[ 1], p[ 2]));
				abstractPart.geometry.faces.vertices.push(new THREE.Vector3(p[3], p[ 4], p[ 5]));
				abstractPart.geometry.faces.vertices.push(new THREE.Vector3(p[6], p[ 7], p[ 8]));
				var face = new THREE.Face3(vIdx, vIdx + 1, vIdx + 2, null, colorObj);
				if (color != null) {
					face.preserveColor = true;
				}
				abstractPart.geometry.faces.faces.push(face);
			}
		}
	});

	abstractPart.parts.forEach(function(part) {
		var matrix = LDMatrixToMatrix(part.matrix);
		var res = getPartGeometry(part.abstractPart, part.color >= 0 ? part.color : color);
		var faces = res.faces.clone().applyMatrix(matrix);
		var lines = res.lines.clone().applyMatrix(matrix);
		abstractPart.geometry.faces.merge(faces);
		abstractPart.geometry.lines.merge(lines);
	});

	return abstractPart.geometry;
}

const faceMaterial = new THREE.MeshBasicMaterial({vertexColors: THREE.FaceColors, side: THREE.DoubleSide});
const lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 5});

function addModelToScene(scene, model) {

	model.parts.forEach(function(part) {

		var matrix = LDMatrixToMatrix(part.matrix);
		var partGeometry = getPartGeometry(part.abstractPart, part.color >= 0 ? part.color : null);

		var mesh = new THREE.Mesh(partGeometry.faces, faceMaterial);
		mesh.applyMatrix(matrix);
		scene.add(mesh);

		var line = new THREE.LineSegments(partGeometry.lines, lineMaterial);
		line.applyMatrix(matrix);
		scene.add(line);
	});
}

function addPartToScene(scene, abstractPart, color, config) {
	var partGeometry = getPartGeometry(abstractPart, color);

	var mesh = new THREE.Mesh(partGeometry.faces.clone(), faceMaterial);
	if (config && config.rotation) {
		mesh.rotation.x = config.rotation.x * Math.PI / 180;
		mesh.rotation.y = config.rotation.y * Math.PI / 180;
		mesh.rotation.z = config.rotation.z * Math.PI / 180;
	}
	scene.add(mesh);

	var line = new THREE.LineSegments(partGeometry.lines.clone(), lineMaterial);
	if (config && config.rotation) {
		line.rotation.x = config.rotation.x * Math.PI / 180;
		line.rotation.y = config.rotation.y * Math.PI / 180;
		line.rotation.z = config.rotation.z * Math.PI / 180;
	}
	scene.add(line);
}

function renderModel(part, containerID, size) {

	if (!isInitialized) {
		initialize();
	}
	var start = Date.now();
	var scene = initScene();
	addModelToScene(scene, part);
	render(scene, containerID, size);

	var end = Date.now();
	console.log('Render time: ' + (end - start) + 'ms');
}

function renderPart(part, containerID, size, color, config) {

	if (!isInitialized) {
		initialize();
	}
	var start = Date.now();
	var scene = initScene();
	addPartToScene(scene, part, color, config);
	render(scene, containerID, size);

	var end = Date.now();
	console.log('Render time: ' + (end - start) + 'ms');
}

return {
	renderPart: renderPart,
	renderModel: renderModel
};

})();
