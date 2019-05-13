/* global glMatrix: false */
/* eslint-disable no-alert */

import lineShaderSource from './lineShader.glsl';
import faceShaderSource from './faceShader.glsl';
import fragmentShaderSource from './fragmentShader.glsl';
import twgl from './twgl';

const v = [
	// Front face
	[-1.0, -1.0, 1.0],
	[1.0, -1.0, 1.0],
	[1.0, 1.0, 1.0],
	[-1.0, 1.0, 1.0],

	// Back face
	[-1.0, -1.0, -1.0],
	[1.0, -1.0, -1.0],
	[1.0, 1.0, -1.0],
	[-1.0, 1.0, -1.0]
];

const colors = [
	1.0, 0.0, 1.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 1.0,
	0.0, 1.0, 0.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 1.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 1.0,
	0.0, 1.0, 0.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 1.0,
	0.0, 1.0, 0.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 1.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 1.0,
	0.0, 1.0, 0.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 1.0,
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
	1.0, 1.0, 0.0,
	1.0, 0.0, 1.0,
	0.0, 1.0, 0.0
];

function buildLineGeometry() {

	const directionPoints = (new Array(128)).fill(1).map((el, idx) => idx % 2 ? 1 : -1);
	const orderPoints = (new Array(128).fill(0)).map((el, idx) => (idx % 4) > 1 ? 1 : 0);
	const points = [], nextPoints = [], indices = [];

	let lastIndex = 0;
	function addLine(p1, p2) {
		// TODO: if we're pusing a point that coincides with a previous point, use that fact to draw an
		// extra triangle in the corner to fill it up.  Or something.  Maybe.
		points.push(...p1, ...p1, ...p2, ...p2);
		nextPoints.push(...p2, ...p2, ...p1, ...p1);
		indices.push(
			lastIndex + 2, lastIndex + 1, lastIndex,
			lastIndex + 3, lastIndex + 1, lastIndex + 2
		);
		lastIndex += 4;
	}

	// front lines
	addLine(v[0], v[1]);
	addLine(v[1], v[2]);
	addLine(v[2], v[3]);
	addLine(v[3], v[0]);

	// back lines
	addLine(v[4], v[5]);
	addLine(v[5], v[6]);
	addLine(v[6], v[7]);
	addLine(v[7], v[4]);

	// side lines
	addLine(v[0], v[4]);
	addLine(v[1], v[5]);
	addLine(v[2], v[6]);
	addLine(v[3], v[7]);

	return {
		position: {data: points, numComponents: 3},
		next: {data: nextPoints, numComponents: 3},
		direction: {data: directionPoints, numComponents: 1},
		order: {data: orderPoints, numComponents: 1},
		color: {data: (new Array(144)).fill(0), numComponents: 3},
		indices: {data: indices, numComponents: 3}
	};
}

function buildFaceGeometry() {

	const points = [], indices = [];
	let lastIndex = 0;
	function addFace(p1, p2, p3) {
		points.push(...p1, ...p2, ...p3);
		indices.push(lastIndex + 2, lastIndex + 1, lastIndex);
		lastIndex += 3;
	}

	addFace(v[3], v[1], v[0]);
	addFace(v[3], v[2], v[1]);
	addFace(v[4], v[3], v[0]);
	addFace(v[4], v[7], v[3]);
	addFace(v[6], v[2], v[3]);
	addFace(v[3], v[7], v[6]);

	addFace(v[4], v[5], v[7]);
	addFace(v[5], v[6], v[7]);
	addFace(v[2], v[5], v[1]);
	addFace(v[2], v[6], v[5]);
	addFace(v[0], v[1], v[5]);
	addFace(v[5], v[4], v[0]);

	return {
		position: {data: points, numComponents: 3},
		color: {data: (new Array(144)).fill(0.8), numComponents: 3},
		indices: {data: indices, numComponents: 3}
	};
}

let squareRotation = 1.0;

function drawScene(gl, objectsToDraw, deltaTime) {

	gl.clearColor(1.0, 1.0, 1.0, 0.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const projectionMatrix = glMatrix.mat4.create();
	glMatrix.mat4.ortho(projectionMatrix, 0, 6, 4, 0, 4, -4); // out, left, right, bottom, top, near, far

	const lineMat = glMatrix.mat4.create();
	glMatrix.mat4.translate(lineMat, lineMat, [3, 2, 0]);
	glMatrix.mat4.rotate(lineMat, lineMat, 0.75 * squareRotation, [1, 0, 0]);
	glMatrix.mat4.rotate(lineMat, lineMat, 0.75 * squareRotation, [0, 1, 0]);

	const faces = objectsToDraw[0];
	faces.uniforms.projection = projectionMatrix;
	faces.uniforms.modelView = lineMat;

	const lines = objectsToDraw[1];
	lines.uniforms.aspect = aspect;
	lines.uniforms.projection = projectionMatrix;
	lines.uniforms.modelView = lineMat;

	for (let i = 0; i < objectsToDraw.length; i++) {
		const object = objectsToDraw[i];

		if (object.polygonOffset) {
			gl.enable(gl.POLYGON_OFFSET_FILL);
			gl.polygonOffset(object.polygonOffset, 1);
		} else {
			gl.disable(gl.POLYGON_OFFSET_FILL);
		}

		gl.useProgram(object.programInfo.program);

		twgl.setBuffersAndAttributes(gl, object.programInfo, object.buffers);

		twgl.setUniforms(object.programInfo, object.uniforms);

		gl.drawElements(object.glType, object.buffers.numElements, gl.UNSIGNED_SHORT, 0);
	}

	squareRotation += deltaTime;
}

export default function init(canvas) {

	const gl = canvas.getContext('webgl', {alpha: false, antialias: true});

	const lineShaderProgram = twgl.createProgramInfo(gl, [lineShaderSource, fragmentShaderSource]);
	const linePoints = buildLineGeometry();
	const lineBuffers = twgl.createBufferInfoFromArrays(gl, linePoints);

	const faceShaderProgram = twgl.createProgramInfo(gl, [faceShaderSource, fragmentShaderSource]);
	const facePoints = buildFaceGeometry();
	const faceBuffers = twgl.createBufferInfoFromArrays(gl, facePoints);

	const objectsToDraw = [
		{
			polygonOffset: 2,
			glType: gl.TRIANGLES,
			programInfo: faceShaderProgram,
			buffers: faceBuffers,
			uniforms: {
				projection: null,
				modelView: null
			}
		},
		{
			glType: gl.TRIANGLES,
			programInfo: lineShaderProgram,
			buffers: lineBuffers,
			uniforms: {
				projection: null,
				modelView: null,
				aspect: 1.0,
				thickness: 0.015
			}
		}
	];

	let then = 0;

	// Draw the scene repeatedly
	function render(now) {
		now *= 0.001;  // convert to seconds
		const deltaTime = now - then;
		then = now;
		drawScene(gl, objectsToDraw, deltaTime);
		requestAnimationFrame(render);
	}

	// requestAnimationFrame(render);
	drawScene(gl, objectsToDraw, 0);
}
