/* eslint-disable no-unused-vars */
import faceShaderSource from './faceShader.glsl';
import lineShaderSource from './lineShader.glsl';
import condLineShaderSource from './condLineShader.glsl';
import fragmentShaderSource from './fragmentShader.glsl';
import twgl from './twgl';

import LDParse from '../LDParse';

const partBufferCache = {};

function generateObjectList(part, modelView, colorCode, partCount) {

	const edgeColor = LDParse.getColor(colorCode, 'edgeRgba');
	const res = {faces: [], lines: [], condLines: [], alphaFaces: []};
	const buffers = partBufferCache[part.filename];
	if (buffers) {
		if (buffers.faces) {
			const color = LDParse.getColor(colorCode, 'rgba');
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
		const len = (partCount == null) ? part.parts.length : partCount;
		for (let i = 0; i < len; i++) {
			const subPart = part.parts[i];
			const abstractPart = LDParse.partDictionary[subPart.filename];
			const newMat = LDMatrixToMatrix(subPart.matrix);
			twgl.m4.multiply(newMat, modelView, newMat);
			const newColorCode = isValidColorCode(subPart.colorCode) ? subPart.colorCode : colorCode;
			const newObject = generateObjectList(abstractPart, newMat, newColorCode);
			res.faces.push(...newObject.faces);
			res.lines.push(...newObject.lines);
			res.condLines.push(...newObject.condLines);
			res.alphaFaces.push(...newObject.alphaFaces);
		}
	}
	return res;
}

function drawScene(gl, programs, objectsToDraw) {

	gl.clearColor(0, 0, 0, 0);
	gl.clearDepth(1.0);
	// gl.enable(gl.CULL_FACE);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const w = 530;
	const thickness = 0.0035;
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	// left, right, bottom, top, near, far
	const projectionMatrix = twgl.m4.ortho(-w, w, w / aspect, -w / aspect, w * 2, -w * 2);

	const viewMatrix = twgl.m4.create();
	twgl.m4.axisRotate(viewMatrix, [1, 0, 0], 0.75, viewMatrix);
	twgl.m4.axisRotate(viewMatrix, [0, 1, 0], 0.75, viewMatrix);
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

export default function init(canvas) {

	const gl = canvas.getContext('webgl', {
		antialias: true,
		alpha: true
	});
	const programs = {
		faces: twgl.createProgramInfo(gl, [faceShaderSource, fragmentShaderSource]),
		lines: twgl.createProgramInfo(gl, [lineShaderSource, fragmentShaderSource]),
		condLines: twgl.createProgramInfo(gl, [condLineShaderSource, fragmentShaderSource])
	};

	LDParse.loadLDConfig();

	// const url = './static/models/20015 - Alligator.mpd';
	const url = './static/models/7140 - x-wing fighter.mpd';
	LDParse.loadRemotePart(url)
		.then(function() {
			// const model = LDParse.partDictionary['3004.dat'];
			// const model = LDParse.partDictionary['20015 - Alligator.mpd'];
			const model = LDParse.partDictionary['7140 - Main Model.ldr'];

			importPart(gl, model);

			const now = Date.now();
			const objectsToDraw = generateObjectList(model, twgl.m4.create());
			drawScene(gl, programs, objectsToDraw);
			console.log('time: ' + (Date.now() - now));
		});
}
