/* Web Lic - Copyright (C) 2019 Remi Gagne */

import faceShaderSource from './faceShader.glsl';
import lineShaderSource from './lineShader.glsl';
import condLineShaderSource from './condLineShader.glsl';
import fragmentShaderSource from './fragmentShader.glsl';
import twgl from './twgl';
import arrows from './arrows';

import _ from '../util';
import LDParse from '../LDParse';

const selectedPartBoxColor = [1, 0, 0, 1];
const selectedPartAlpha = 0.5;
const studFaceColorCode = LDParse.studFaceColorCode;
const arrowPartName = 'lic_displacement_arrow';
const partBufferCache = {};
let canvas, gl, programs;
let isInitialized = false;

// This gets called *a lot*.  Keep it fast.
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

				let partBox;
				const subPart = part.parts[localPartList[i]];
				const abstractPart = LDParse.partDictionary[subPart.filename];

				const partMatrix = LDMatrixToMatrix(subPart.matrix);
				twgl.m4.multiply(partMatrix, modelView, partMatrix);

				const newColorCode = isValidColorCode(subPart.colorCode) ? subPart.colorCode : colorCode;
				let localAlpha = config.alpha;
				if (config.selectedPartIDs && config.selectedPartIDs.includes(localPartList[i])) {
					localAlpha = selectedPartAlpha;
					partBox = getPartBoundingBox(abstractPart, modelView);
					const boxBuffers = createBBoxBuffer(partBox);
					addObject(res.lines, boxBuffers, partMatrix, selectedPartBoxColor);
				}

				const displacement = displacedParts[localPartList[i]];
				if (displacement) {
					const translation = getPartDisplacement(displacement);
					twgl.m4.translate(partMatrix, translation, partMatrix);

					partBox = partBox || getPartBoundingBox(abstractPart, modelView);
					const arrowMat = arrows.getArrowPosition(partBox, partMatrix, displacement);
					const arrowRotMat = arrows.getArrowRotation(displacement);
					twgl.m4.multiply(arrowRotMat, arrowMat, arrowRotMat);
					addArrowObject(res.faces, arrowRotMat, (displacement.arrowLength || 60) - 15);
				}

				const localConfig = {
					alpha: localAlpha,
					parentColorCode: colorCode
				};
				const newObject = generateObjectList(abstractPart, partMatrix, newColorCode, localConfig);
				res.faces.push(...newObject.faces);
				res.lines.push(...newObject.lines);
				res.condLines.push(...newObject.condLines);
				res.alphaFaces.push(...newObject.alphaFaces);
			}
		} else {
			for (let i = 0; i < part.parts.length; i++) {

				const subPart = part.parts[i];
				const abstractPart = LDParse.partDictionary[subPart.filename];

				const partMatrix = LDMatrixToMatrix(subPart.matrix);
				twgl.m4.multiply(partMatrix, modelView, partMatrix);

				const newColorCode = isValidColorCode(subPart.colorCode) ? subPart.colorCode : colorCode;
				const localConfig = {
					alpha: config.alpha,
					parentColorCode: colorCode
				};

				const newObject = generateObjectList(abstractPart, partMatrix, newColorCode, localConfig);
				res.faces.push(...newObject.faces);
				res.lines.push(...newObject.lines);
				res.condLines.push(...newObject.condLines);
				res.alphaFaces.push(...newObject.alphaFaces);
			}
		}
	}
	return res;
}

function drawScene(gl, programs, objectsToDraw, config) {

	gl.clearColor(0, 0, 0, 0);
	gl.clearDepth(1.0);
	// gl.enable(gl.CULL_FACE);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const {rotation, lineThickness, zoom} = config;
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const projectionMatrix = twgl.m4.ortho(-zoom, zoom, zoom / aspect, -zoom / aspect, zoom * 2, -zoom * 2);

	const viewMatrix = twgl.m4.create();
	twgl.m4.rotateX(viewMatrix, _.radians(36), viewMatrix);
	twgl.m4.rotateY(viewMatrix, _.radians(55), viewMatrix);
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
	programs.lines.uniformSetters.thickness(lineThickness);
	for (let i = 0; i < objectsToDraw.lines.length; i++) {
		const object = objectsToDraw.lines[i];
		twgl.setBuffersAndAttributes(gl, programs.lines, object.buffers);
		twgl.setUniforms(programs.lines, object.uniforms);
		gl.drawElements(gl.TRIANGLES, object.buffers.numElements, gl.UNSIGNED_SHORT, 0);
	}

	gl.useProgram(programs.condLines.program);
	programs.condLines.uniformSetters.projection(projectionMatrix);
	programs.condLines.uniformSetters.aspect(aspect);
	programs.condLines.uniformSetters.thickness(lineThickness);
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

function addArrowObject(objectsToDraw, mat, length) {

	const arrowBuffers = partBufferCache[arrowPartName];

	// Arrows have their base at [0, 0, 0]
	// Scale arrow body to correct length, then draw it
	const bodyMat = twgl.m4.scaling([1, length, 1]);
	twgl.m4.multiply(bodyMat, mat, bodyMat);
	addObject(objectsToDraw, arrowBuffers.body, bodyMat, [1, 0, 0, 1]);

	// Translate arrow tip to end of arrow body, then draw it
	const tipMat = twgl.m4.translation([0, length - 1, 0]);
	twgl.m4.multiply(tipMat, mat, tipMat);
	addObject(objectsToDraw, arrowBuffers.tip, tipMat, [1, 0, 0, 1]);
}

function addFace(faceData, primitive) {
	const points = primitive.points || primitive;
	const idx = faceData.indices.lastIndex;
	faceData.position.data.push(...points);
	faceData.indices.data.push(idx, idx + 1, idx + 2);
	if (primitive.shape === 'quad') {
		faceData.indices.data.push(idx, idx + 2, idx + 3);
		faceData.indices.lastIndex += 4;
	} else {
		faceData.indices.lastIndex += 3;
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
			const partMatrix = LDMatrixToMatrix(subPart.matrix);
			twgl.m4.multiply(partMatrix, modelView, partMatrix);
			const abstractPart = LDParse.partDictionary[subPart.filename];
			const subBox = getPartBoundingBox(abstractPart, partMatrix);
			if (subBox.min[0] < minX) { minX = subBox.min[0]; }
			if (subBox.min[1] < minY) { minY = subBox.min[1]; }
			if (subBox.min[2] < minZ) { minZ = subBox.min[2]; }
			if (subBox.max[3] > maxX) { maxX = subBox.max[3]; }
			if (subBox.max[4] > maxY) { maxY = subBox.max[4]; }
			if (subBox.max[5] > maxZ) { maxZ = subBox.max[5]; }
		}
	}
	return {
		min: [minX, minY, minZ],
		max: [maxX, maxY, maxZ]
	};
}

function growBox(box) {
	const scale = 1.5, min = box.min, max = box.max;
	return {
		min: [min[0] - scale, min[1] - scale, min[2] - scale],
		max: [max[0] + scale, max[1] + scale, max[2] + scale]
	};
}

function createBBoxBuffer(box) {

	box = growBox(box);
	const [x0, y0, z0] = box.min;
	const [x1, y1, z1] = box.max;

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

function MatrixToLDMatrix(m) {
	return [
		m[12], m[13], m[14],  // x, y, z
		m[ 0], m[ 4], m[ 8], m[1], m[5], m[9], m[2], m[6], m[10]  // a - i
	];
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

		partBufferCache[arrowPartName] = arrows.createArrowBuffers(gl);

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
		drawScene(gl, programs, objectsToDraw, config);
		console.log('time CSI: ' + (Date.now() - now)); // eslint-disable-line no-console
		return canvas;
	},
	renderPart(part, colorCode, config) {
		canvas.width = canvas.height = config.size;
		gl.viewport(0, 0, config.size, config.size);
		const now = Date.now();
		const identity = twgl.m4.create();
		const objectsToDraw = generateObjectList(part, identity, colorCode, {});
		drawScene(gl, programs, objectsToDraw, config);
		console.log('time PLI: ' + (Date.now() - now)); // eslint-disable-line no-console
		return canvas;
	},
	composeLDMatrix(transform) {
		const pos = transform.position, rot = transform.rotation;

		const x = _.radians(rot.x), y = _.radians(rot.y), z = _.radians(rot.z);
		const a = Math.cos(x), b = Math.sin(x);
		const c = Math.cos(y), d = Math.sin(y);
		const e = Math.cos(z), f = Math.sin(z);

		const ae = a * e, af = a * f, be = b * e, bf = b * f;

		const m = [
			c * e, af + be * d, bf - ae * d, 0,
			-c * f, ae - bf * d, be + af * d, 0,
			d, -b * c, a * c, 0,
			pos.x, pos.y, pos.z, 1
		];

		return MatrixToLDMatrix(m).map(el => Math.abs(el) < 0.0000001 ? 0 : el);
	},
	decomposeLDMatrix(ldMatrix) {

		const m = LDMatrixToMatrix(ldMatrix);

		const sx = twgl.v3.length([m[0], m[1], m[2]]);
		const sy = twgl.v3.length([m[4], m[5], m[6]]);
		const sz = twgl.v3.length([m[8], m[9], m[10]]);

		if (sx !== 1) {
			m[0] *= 1 / sx;
			m[1] *= 1 / sx;
			m[2] *= 1 / sx;
		}
		if (sy !== 1) {
			m[4] *= 1 / sy;
			m[5] *= 1 / sy;
			m[6] *= 1 / sy;
		}
		if (sz !== 1) {
			m[8] *= 1 / sz;
			m[9] *= 1 / sz;
			m[10] *= 1 / sz;
		}

		const m11 = m[0], m12 = m[4], m13 = m[8];
		const m22 = m[5], m23 = m[9];
		const m32 = m[6], m33 = m[10];

		const ry = Math.asin(_.clamp(m13, -1, 1));
		let rx, rz;

		if (Math.abs(m13) < 0.99999) {
			rx = Math.atan2(-m23, m33);
			rz = Math.atan2(-m12, m11);
		} else {
			rx = Math.atan2(m32, m22);
			rz = 0;
		}

		return {
			position: {x: m[12], y: m[13], z: m[14]},
			rotation: {x: _.degrees(rx), y: _.degrees(ry), z: _.degrees(rz)},
			scale: {x: sx, y: sy, z: sz}
		};
	}
};
