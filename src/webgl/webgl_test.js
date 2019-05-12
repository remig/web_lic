/* global glMatrix: false */
/* eslint-disable no-alert */

import lineShaderSource from './lineShader.glsl';
import faceShaderSource from './faceShader.glsl';
import fragmentShaderSource from './fragmentShader.glsl';

function createShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
		return null;
	}
	return shaderProgram;
}

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

const directionPoints = (new Array(128)).fill(1).map((el, idx) => idx % 2 ? 1 : -1);
const orderPoints = (new Array(128).fill(0)).map((el, idx) => (idx % 4) > 1 ? 1 : 0);

function createBuffer(gl, points, bufferType, pointType) {
	pointType = pointType || Float32Array;
	bufferType = bufferType || gl.ARRAY_BUFFER;
	const buffer = gl.createBuffer();
	gl.bindBuffer(bufferType, buffer);
	gl.bufferData(bufferType, new pointType(points), gl.STATIC_DRAW);
	return buffer;
}

function initBuffers(gl) {

	const positionBuffer = createBuffer(gl, points);
	const nextBuffer = createBuffer(gl, nextPoints);
	const indexBuffer = createBuffer(gl, indices, gl.ELEMENT_ARRAY_BUFFER, Uint16Array);
	const directionBuffer = createBuffer(gl, directionPoints);
	const orderBuffer = createBuffer(gl, orderPoints);

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
	const colorBuffer = createBuffer(gl, colors);

	return {
		positionBuffer,
		orderBuffer,
		directionBuffer,
		nextBuffer,
		colorBuffer,
		indexBuffer
	};
}

const vertexCount = indices.length;
// const vertexCount = 72;

let squareRotation = 1.0;

function setBufferAttribute(gl, buffer, attribute, numComponents) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.enableVertexAttribArray(attribute);
	// type, normalize, stride, offset
	gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
}

function drawScene(gl, programInfo, buffers, deltaTime) {

	gl.clearColor(1.0, 1.0, 1.0, 0.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const projectionMatrix = glMatrix.mat4.create();
	glMatrix.mat4.ortho(projectionMatrix, 0, 3, 2, 0, 4, -4); // out, left, right, bottom, top, near, far


	gl.useProgram(programInfo.program);

	const modelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [1, 1, 0]);
	glMatrix.mat4.rotate(modelViewMatrix, modelViewMatrix, 0.75 * squareRotation, [1, 0, 0]);
	glMatrix.mat4.rotate(modelViewMatrix, modelViewMatrix, 0.75 * squareRotation, [0, 1, 0]);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
	setBufferAttribute(gl, buffers.positionBuffer, programInfo.attributeLocations.position, 3);
	setBufferAttribute(gl, buffers.nextBuffer, programInfo.attributeLocations.next, 3);
	setBufferAttribute(gl, buffers.colorBuffer, programInfo.attributeLocations.color, 3);
	setBufferAttribute(gl, buffers.orderBuffer, programInfo.attributeLocations.order, 1);
	setBufferAttribute(gl, buffers.directionBuffer, programInfo.attributeLocations.direction, 1);

	gl.uniformMatrix4fv(
		programInfo.uniformLocations.projectionMatrix,
		false,
		projectionMatrix
	);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.modelViewMatrix,
		false,
		modelViewMatrix
	);

	gl.uniform1f(programInfo.uniformLocations.aspect, aspect);
	gl.uniform1f(programInfo.uniformLocations.thickness, 0.4);
	gl.uniform1i(programInfo.uniformLocations.miter, 1);

	gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);

	squareRotation += deltaTime;
}

export default function init(canvas) {

	const props = {
		alpha: false,
		antialias: true
	};
	const gl = canvas.getContext('webgl', props);

	const lineShaderProgram = createShaderProgram(gl, lineShaderSource, fragmentShaderSource);
	const programInfo = {
		program: lineShaderProgram,
		attributeLocations: {
			position: gl.getAttribLocation(lineShaderProgram, 'position'),
			direction: gl.getAttribLocation(lineShaderProgram, 'direction'),
			order: gl.getAttribLocation(lineShaderProgram, 'order'),
			next: gl.getAttribLocation(lineShaderProgram, 'next'),
			color: gl.getAttribLocation(lineShaderProgram, 'color')
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(lineShaderProgram, 'projection'),
			modelViewMatrix: gl.getUniformLocation(lineShaderProgram, 'modelView'),
			aspect: gl.getUniformLocation(lineShaderProgram, 'aspect'),
			thickness: gl.getUniformLocation(lineShaderProgram, 'thickness'),
			miter: gl.getUniformLocation(lineShaderProgram, 'miter')
		}
	};

	const buffers = initBuffers(gl);
	let then = 0;

	// Draw the scene repeatedly
	function render(now) {
		now *= 0.0005;  // convert to seconds
		const deltaTime = now - then;
		then = now;
		drawScene(gl, programInfo, buffers, deltaTime);
		requestAnimationFrame(render);
	}

	// requestAnimationFrame(render);
	drawScene(gl, programInfo, buffers, 0);
}
