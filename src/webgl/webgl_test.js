/* Web Lic - Copyright (C) 2019 Remi Gagne */

import faceShaderSource from './faceShader.glsl';
import lineShaderSource from './lineShader.glsl';
import condLineShaderSource from './condLineShader.glsl';
import fragmentShaderSource from './fragmentShader.glsl';
import twgl from './twgl';

import _ from '../util';
import LDParse from '../LDParse';

const studFaceColorCode = LDParse.studFaceColorCode;
const partBufferCache = {};
let canvas, gl, programs;
let isInitialized = false;

// config: {partList, selectedPartIDs, alpha, parentColorCode}
function generateObjectList(part, modelView, colorCode, config) {

	const res = {faces: [], lines: [], condLines: [], alphaFaces: []};
	const buffers = partBufferCache[part.filename];

	if (buffers) {

		const edgeColorCode = (colorCode === studFaceColorCode) ? config.parentColorCode : colorCode;
		const edgeColor = LDParse.getColor(edgeColorCode, 'edgeRgba');

		if (buffers.faces) {
			let color;
			if (colorCode === studFaceColorCode) {
				// Custom stud face color logic
				if (config.parentColorCode === 0) {
					// If base part is black, use black for stud face too
					color = LDParse.getColor(0, 'rgba');
				} else {
					// If base part is any other color, match stud face to edge color
					color = LDParse.getColor(edgeColorCode, 'edgeRgba');
				}
			} else {
				color = LDParse.getColor(colorCode, 'rgba');
			}
			if (config.alpha != null) {
				color = [color[0], color[1], color[2], config.alpha];
			}
			if (color && color[3] < 1) {
				addObject(res.alphaFaces, buffers.faces, modelView, color);
			} else {
				addObject(res.faces, buffers.faces, modelView, color);
			}
		}
		if (buffers.coloredFaces) {
			for (const key in buffers.coloredFaces) {
				if (buffers.coloredFaces.hasOwnProperty(key)) {
					addObject(
						res.faces, buffers.coloredFaces[key],
						modelView, LDParse.getColor(key, 'rgba')
					);
				}
			}
		}
		if (buffers.lines) {
			addObject(res.lines, buffers.lines, modelView, edgeColor);
		}
		if (buffers.condLines) {
			addObject(res.condLines, buffers.condLines, modelView, edgeColor);
		}
	}

	if (part.parts && part.parts.length) {

		if (config.isModel) {

			const displacedParts = {};
			if (config.displacedParts) {
				config.displacedParts.forEach(p => {
					displacedParts[p.partID] = p;
				});
			}

			const localPartList = (config.partList == null)
				? part.parts.map((p, idx) => idx)
				: config.partList;

			for (let i = 0; i < localPartList.length; i++) {

				const subPart = part.parts[localPartList[i]];
				const abstractPart = LDParse.partDictionary[subPart.filename];

				const newMat = LDMatrixToMatrix(subPart.matrix);
				twgl.m4.multiply(newMat, modelView, newMat);

				const displacement = displacedParts[localPartList[i]];
				if (displacement) {
					const translation = getPartDisplacement(displacement);
					twgl.m4.translate(newMat, translation, newMat);
				}

				const newColorCode = isValidColorCode(subPart.colorCode) ? subPart.colorCode : colorCode;
				let localAlpha = config.alpha;
				if (config.selectedPartIDs && config.selectedPartIDs.includes(localPartList[i])) {
					localAlpha = 0.5;
					const box = getPartBoundingBox(abstractPart, modelView);
					const boxBuffers = createBBoxBuffer(box);
					addObject(res.lines, boxBuffers, newMat, [1, 0, 0, 1]);
				}

				const localConfig = {
					alpha: localAlpha,
					parentColorCode: colorCode
				};
				const newObject = generateObjectList(abstractPart, newMat, newColorCode, localConfig);
				res.faces.push(...newObject.faces);
				res.lines.push(...newObject.lines);
				res.condLines.push(...newObject.condLines);
				res.alphaFaces.push(...newObject.alphaFaces);
			}
		} else {
			for (let i = 0; i < part.parts.length; i++) {

				const subPart = part.parts[i];
				const abstractPart = LDParse.partDictionary[subPart.filename];

				const newMat = LDMatrixToMatrix(subPart.matrix);
				twgl.m4.multiply(newMat, modelView, newMat);

				const newColorCode = isValidColorCode(subPart.colorCode) ? subPart.colorCode : colorCode;
				const localConfig = {
					alpha: config.alpha,
					parentColorCode: colorCode
				};

				const newObject = generateObjectList(abstractPart, newMat, newColorCode, localConfig);
				res.faces.push(...newObject.faces);
				res.lines.push(...newObject.lines);
				res.condLines.push(...newObject.condLines);
				res.alphaFaces.push(...newObject.alphaFaces);
			}
		}
	}
	return res;
}

function drawScene(gl, programs, objectsToDraw, rotation) {

	gl.clearColor(0, 0, 0, 0);
	gl.clearDepth(1.0);
	// gl.enable(gl.CULL_FACE);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const w = 530;
	const thickness = 0.002;
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	// left, right, bottom, top, near, far
	const projectionMatrix = twgl.m4.ortho(-w, w, w / aspect, -w / aspect, w * 2, -w * 2);

	const viewMatrix = twgl.m4.create();
	twgl.m4.rotateX(viewMatrix, Math.PI / 6, viewMatrix);
	twgl.m4.rotateY(viewMatrix, Math.PI / 4, viewMatrix);
	if (rotation) {
		if (rotation.x) {
			twgl.m4.rotateX(viewMatrix, _.radians(rotation.x), viewMatrix);
		}
		if (rotation.y) {
			twgl.m4.rotateY(viewMatrix, _.radians(rotation.y), viewMatrix);
		}
		if (rotation.z) {
			twgl.m4.rotateZ(viewMatrix, _.radians(rotation.z), viewMatrix);
		}
	}
	twgl.m4.multiply(viewMatrix, projectionMatrix, projectionMatrix);

	// Draw opaque faces first
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1, 1);
	gl.useProgram(programs.faces.program);
	programs.faces.uniformSetters.projection(projectionMatrix);
	for (let i = 0; i < objectsToDraw.faces.length; i++) {
		const object = objectsToDraw.faces[i];
		twgl.setBuffersAndAttributes(gl, programs.faces, object.buffers);
		twgl.setUniforms(programs.faces, object.uniforms);
		gl.drawElements(gl.TRIANGLES, object.buffers.numElements, gl.UNSIGNED_SHORT, 0);
	}

	gl.disable(gl.POLYGON_OFFSET_FILL);
	gl.useProgram(programs.lines.program);
	programs.lines.uniformSetters.projection(projectionMatrix);
	programs.lines.uniformSetters.aspect(aspect);
	programs.lines.uniformSetters.thickness(thickness);
	for (let i = 0; i < objectsToDraw.lines.length; i++) {
		const object = objectsToDraw.lines[i];
		twgl.setBuffersAndAttributes(gl, programs.lines, object.buffers);
		twgl.setUniforms(programs.lines, object.uniforms);
		gl.drawElements(gl.TRIANGLES, object.buffers.numElements, gl.UNSIGNED_SHORT, 0);
	}

	gl.useProgram(programs.condLines.program);
	programs.condLines.uniformSetters.projection(projectionMatrix);
	programs.condLines.uniformSetters.aspect(aspect);
	programs.condLines.uniformSetters.thickness(thickness);
	for (let i = 0; i < objectsToDraw.condLines.length; i++) {
		const object = objectsToDraw.condLines[i];
		twgl.setBuffersAndAttributes(gl, programs.condLines, object.buffers);
		twgl.setUniforms(programs.condLines, object.uniforms);
		gl.drawElements(gl.TRIANGLES, object.buffers.numElements, gl.UNSIGNED_SHORT, 0);
	}

	// Draw partially transparent faces last
	gl.useProgram(programs.faces.program);
	programs.faces.uniformSetters.projection(projectionMatrix);
	for (let i = 0; i < objectsToDraw.alphaFaces.length; i++) {
		const object = objectsToDraw.alphaFaces[i];
		twgl.setBuffersAndAttributes(gl, programs.faces, object.buffers);
		twgl.setUniforms(programs.faces, object.uniforms);
		gl.drawElements(gl.TRIANGLES, object.buffers.numElements, gl.UNSIGNED_SHORT, 0);
	}
}

function addObject(objectsToDraw, buffers, modelView, color) {
	if (buffers) {
		objectsToDraw.push({
			buffers,
			uniforms: {modelView, color}
		});
	}
}

function addFace(faceData, primitive) {
	const idx = faceData.indices.lastIndex;
	faceData.position.data.push(...primitive.points);
	faceData.indices.data.push(idx, idx + 1, idx + 2);
	if (primitive.shape === 'triangle') {
		faceData.indices.lastIndex += 3;
	} else {
		faceData.indices.data.push(idx, idx + 2, idx + 3);
		faceData.indices.lastIndex += 4;
	}
}

function addLine(lineData, p, cp) {
	const idx = lineData.indices.lastIndex;
	lineData.position.data.push(p[0], p[1], p[2], p[0], p[1], p[2], p[3], p[4], p[5], p[3], p[4], p[5]);
	lineData.next.data.push(p[3], p[4], p[5], p[3], p[4], p[5], p[0], p[1], p[2], p[0], p[1], p[2]);
	lineData.indices.data.push(
		idx + 2, idx + 1, idx,
		idx + 3, idx + 1, idx + 2
	);
	lineData.direction.data.push(-1, 1, -1, 1);
	lineData.order.data.push(0, 0, 1, 1);
	if (cp != null) {
		lineData.condPointA.data.push(
			cp[0], cp[1], cp[2], cp[0], cp[1], cp[2], cp[0], cp[1], cp[2], cp[0], cp[1], cp[2]
		);
		lineData.condPointB.data.push(
			cp[3], cp[4], cp[5], cp[3], cp[4], cp[5], cp[3], cp[4], cp[5], cp[3], cp[4], cp[5]
		);
	}
	lineData.indices.lastIndex += 4;
}

function getPartBoundingBox(part, modelView) {
	let minX = Infinity, minY = Infinity, minZ = Infinity;
	let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
	if (part.primitives && part.primitives.length) {
		for (let i = 0; i < part.primitives.length; i++) {
			const shape = part.primitives[i].shape;
			if (shape === 'triangle' || shape === 'quad') {
				const pts = part.primitives[i].points;
				for (let j = 0; j < pts.length; j += 3) {
					const pt = twgl.m4.transformPoint(modelView, pts);
					if (pt[j + 0] < minX) { minX = pt[j + 0]; }
					if (pt[j + 1] < minY) { minY = pt[j + 1]; }
					if (pt[j + 2] < minZ) { minZ = pt[j + 2]; }
					if (pt[j + 0] > maxX) { maxX = pt[j + 0]; }
					if (pt[j + 1] > maxY) { maxY = pt[j + 1]; }
					if (pt[j + 2] > maxZ) { maxZ = pt[j + 2]; }
				}
			}
		}
	}
	if (part.parts && part.parts.length) {
		for (let i = 0; i < part.parts.length; i++) {
			const subPart = part.parts[i];
			const newMat = LDMatrixToMatrix(subPart.matrix);
			twgl.m4.multiply(newMat, modelView, newMat);
			const abstractPart = LDParse.partDictionary[subPart.filename];
			const partBBox = getPartBoundingBox(abstractPart, newMat);
			if (partBBox[0] < minX) { minX = partBBox[0]; }
			if (partBBox[1] < minY) { minY = partBBox[1]; }
			if (partBBox[2] < minZ) { minZ = partBBox[2]; }
			if (partBBox[3] > maxX) { maxX = partBBox[3]; }
			if (partBBox[4] > maxY) { maxY = partBBox[4]; }
			if (partBBox[5] > maxZ) { maxZ = partBBox[5]; }
		}
	}
	return [minX, minY, minZ, maxX, maxY, maxZ];
}

function growBox(box) {
	const scale = 1.5;
	return [
		box[0] - scale, box[1] - scale, box[2] - scale,
		box[3] + scale, box[4] + scale, box[5] + scale
	];
}

function createBBoxBuffer(box) {
	box = growBox(box);
	const x0 = box[0], y0 = box[1], z0 = box[2];
	const x1 = box[3], y1 = box[4], z1 = box[5];

	const lineData = {
		position: {data: [], numComponents: 3},
		next: {data: [], numComponents: 3},
		direction: {data: [], numComponents: 1},
		order: {data: [], numComponents: 1},
		indices: {data: [], numComponents: 3, lastIndex: 0}
	};

	addLine(lineData, [x0, y0, z0, x0, y0, z1]);
	addLine(lineData, [x0, y0, z1, x1, y0, z1]);
	addLine(lineData, [x1, y0, z1, x1, y0, z0]);
	addLine(lineData, [x1, y0, z0, x0, y0, z0]);

	addLine(lineData, [x0, y1, z0, x0, y1, z1]);
	addLine(lineData, [x0, y1, z1, x1, y1, z1]);
	addLine(lineData, [x1, y1, z1, x1, y1, z0]);
	addLine(lineData, [x1, y1, z0, x0, y1, z0]);

	addLine(lineData, [x0, y0, z0, x0, y1, z0]);
	addLine(lineData, [x0, y0, z1, x0, y1, z1]);
	addLine(lineData, [x1, y0, z0, x1, y1, z0]);
	addLine(lineData, [x1, y0, z1, x1, y1, z1]);

	return twgl.createBufferInfoFromArrays(gl, lineData);
}

function importPart(gl, part) {

	if (partBufferCache[part.filename] == null && part.primitives.length) {

		let coloredPrimitives;
		const faceData = {
			position: {data: [], numComponents: 3},
			indices: {data: [], numComponents: 3, lastIndex: 0}
		};
		const lineData = {
			position: {data: [], numComponents: 3},
			next: {data: [], numComponents: 3},
			direction: {data: [], numComponents: 1},
			order: {data: [], numComponents: 1},
			indices: {data: [], numComponents: 3, lastIndex: 0}
		};
		const condLineData = {
			position: {data: [], numComponents: 3},
			next: {data: [], numComponents: 3},
			direction: {data: [], numComponents: 1},
			order: {data: [], numComponents: 1},
			condPointA: {data: [], numComponents: 3},
			condPointB: {data: [], numComponents: 3},
			indices: {data: [], numComponents: 3, lastIndex: 0}
		};

		for (let i = 0; i < part.primitives.length; i++) {
			const primitive = part.primitives[i];
			const p = primitive.points;
			if (primitive.shape === 'triangle' || primitive.shape === 'quad') {
				if (primitive.colorCode >= 0) {
					coloredPrimitives = coloredPrimitives || {};
					if (coloredPrimitives[primitive.colorCode] == null) {
						coloredPrimitives[primitive.colorCode] = {
							position: {data: [], numComponents: 3},
							indices: {data: [], numComponents: 3, lastIndex: 0}
						};
					}
					addFace(coloredPrimitives[primitive.colorCode], primitive);
				} else {
					addFace(faceData, primitive);
				}
			} else if (primitive.shape === 'line') {
				addLine(lineData, p);
			} else if (primitive.shape === 'condline') {
				addLine(condLineData, p, primitive.conditionalPoints);
			}
		}

		partBufferCache[part.filename] = {};
		if (faceData.position.data.length) {
			partBufferCache[part.filename].faces = twgl.createBufferInfoFromArrays(gl, faceData);
		}
		if (lineData.position.data.length) {
			partBufferCache[part.filename].lines = twgl.createBufferInfoFromArrays(gl, lineData);
		}
		if (condLineData.position.data.length) {
			partBufferCache[part.filename].condLines = twgl.createBufferInfoFromArrays(gl, condLineData);
		}
		if (coloredPrimitives != null) {
			partBufferCache[part.filename].coloredFaces = {};
			for (const colorCode in coloredPrimitives) {
				if (coloredPrimitives.hasOwnProperty(colorCode)) {
					const buf = twgl.createBufferInfoFromArrays(gl, coloredPrimitives[colorCode]);
					partBufferCache[part.filename].coloredFaces[colorCode] = buf;
				}
			}
		}
	}

	for (let i = 0; i < part.parts.length; i++) {
		importPart(gl, LDParse.partDictionary[part.parts[i].filename]);
	}
}

function isValidColorCode(colorCode) {
	return typeof colorCode === 'number' && colorCode >= 0;
}

/* eslint-disable computed-property-spacing */
function LDMatrixToMatrix(m) {
	const res = new Float32Array(16);
	res[ 0] = m[3]; res[ 1] = m[6]; res[ 2] = m[ 9]; res[ 3] = 0;
	res[ 4] = m[4]; res[ 5] = m[7]; res[ 6] = m[10]; res[ 7] = 0;
	res[ 8] = m[5]; res[ 9] = m[8]; res[10] = m[11]; res[11] = 0;
	res[12] = m[0]; res[13] = m[1]; res[14] = m[ 2]; res[15] = 1;
	return res;
}
/* eslint-enable computed-property-spacing */

function getPartDisplacement({direction, partDistance = 60}) {
	switch (direction) {
		case 'left':
			return [-partDistance, 0, 0];
		case 'right':
			return [partDistance, 0, 0];
		case 'forward':
			return [0, 0, -partDistance];
		case 'backward':
			return [0, 0, partDistance];
		case 'down':
			return [0, partDistance, 0];
		case 'up':
		default:
			return [0, -partDistance, 0];
	}
}

export default {
	initialize: function() {
		if (isInitialized) {
			return;
		}
		isInitialized = true;
		canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		canvas.setAttribute('id', 'lic_gl_canvas');
		gl = canvas.getContext('webgl', {antialias: true, alpha: true});
		// TODO: figure out why canvas has to be in the DOM to render anything into it
		document.getElementById('offscreenCache').appendChild(canvas);

		programs = {
			faces: twgl.createProgramInfo(gl, [faceShaderSource, fragmentShaderSource]),
			lines: twgl.createProgramInfo(gl, [lineShaderSource, fragmentShaderSource]),
			condLines: twgl.createProgramInfo(gl, [condLineShaderSource, fragmentShaderSource])
		};

		importPart(gl, LDParse.partDictionary['templateModel.ldr']);
	},
	initModel: function(model) {
		if (model == null) {
			LDParse.loadLDConfig();
			// const url = './static/models/20015 - Alligator.mpd';
			const url = './static/models/7140 - x-wing fighter.mpd';
			LDParse.loadRemotePart(url)
				.then(function() {
					// const model = LDParse.partDictionary['3004.dat'];
					// const model = LDParse.partDictionary['20015 - Alligator.mpd'];
					const model = LDParse.partDictionary['7140 - Main Model.ldr'];
					importPart(gl, model);
				});
		} else {
			importPart(gl, model);
		}
	},
	// config: {size, rotation, partList, selectedPartIDs, displacedParts}
	renderModel(model, config) {
		// eslint-disable-next-line no-undef
		__lic.twgl = twgl;
		canvas.width = canvas.height = config.size;
		gl.viewport(0, 0, config.size, config.size);
		const now = Date.now();
		const identity = twgl.m4.create();
		config.isModel = true;
		const objectsToDraw = generateObjectList(model, identity, null, config);
		drawScene(gl, programs, objectsToDraw, config.rotation);
		console.log('time CSI: ' + (Date.now() - now)); // eslint-disable-line no-console
		return canvas;
	},
	renderPart(part, colorCode, config) {
		canvas.width = canvas.height = config.size;
		gl.viewport(0, 0, config.size, config.size);
		const now = Date.now();
		const identity = twgl.m4.create();
		const objectsToDraw = generateObjectList(part, identity, colorCode, {});
		drawScene(gl, programs, objectsToDraw, config.rotation);
		console.log('time PLI: ' + (Date.now() - now)); // eslint-disable-line no-console
		return canvas;
	}
};
