/* global glMatrix: false, WebGLDebugUtils: false */
/* eslint-disable no-alert */

import vsSource from './vertexShader.glsl';
import fsSource from './fragmentShader.glsl';

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

let toggleAnimation = true;
window.toggleAnimation = function() {
	toggleAnimation = !toggleAnimation;
};

function flatten(array) {
	const res = [];
	for (let i = 0; i < array.length; i++) {
		res.push(...array[i]);
	}
	return res;
}

function duplicate(array) {
	const res = [];
	for (let i = 0; i < array.length; i++) {
		const v = array[i];
		res.push(v, v);
	}
	return res;
}

function shift(array, offset) {
	const res = [], len = array.length - 1;
	for (let i = 0; i <= len; i++) {
		let idx = i + offset;
		if (idx < 0) {
			idx = len;
		} else if (idx > len) {
			idx = 0;
		}
		res.push(array[idx]);
	}
	return res;
}

function initBuffers(gl) {

	const positions = [
		// Front face
		[-1.0, -1.0, 1.0],
		[1.0, -1.0, 1.0],
		[1.0, 1.0, 1.0],
		[-1.0, 1.0, 1.0],

		// Back face
		[-1.0, -1.0, 1.0],
		[1.0, -1.0, 1.0],
		[1.0, 1.0, 1.0],
		[-1.0, 1.0, 1.0]
	];

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(flatten(duplicate(positions))),
		gl.STATIC_DRAW
	);

	const previousPoints = flatten(duplicate(shift(positions, -1)));
	const previousBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(previousPoints),
		gl.STATIC_DRAW
	);

	const nextPoints = flatten(duplicate(shift(positions, 1)));
	const nextBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nextBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(nextPoints),
		gl.STATIC_DRAW
	);

	const direction = (new Array(16)).fill(1).map((el, idx) => idx % 2 ? 1 : -1);
	const directionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, directionBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(direction),
		gl.STATIC_DRAW
	);

	const colors = [
		1.0, 0.0, 1.0,
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
		1.0, 0.0, 0.0,
		0.0, 1.0, 0.0,
		0.0, 0.0, 1.0,
		1.0, 1.0, 0.0,
		1.0, 0.0, 1.0
	];
	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

	const indices = [
		2, 1, 0, 3, 1, 2,
		4, 3, 2, 5, 3, 4,
		6, 5, 4, 7, 5, 6,
		0, 7, 6, 1, 7, 0,
	];
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	return {
		positionBuffer,
		directionBuffer,
		previousBuffer,
		nextBuffer,
		colorBuffer,
		indexBuffer,
		indices
	};
}

const vertexCount = 24;
let squareRotation = 0.0;

function drawScene(gl, programInfo, buffers, deltaTime) {

	gl.clearColor(1.0, 1.0, 1.0, 0.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(programInfo.program);

	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const projectionMatrix = glMatrix.mat4.create();

	glMatrix.mat4.ortho(  //out, left, right, bottom, top, near, far
		projectionMatrix,
		0,  // left
		3, // right
		2,  // bottom
		0,  // top
		4,  // near
		-4  // far
	);

	const modelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.rotate(
		modelViewMatrix,  // destination matrix
		modelViewMatrix,  // matrix to rotate
		0,   // amount to rotate in radians
		[1, 0, 0]       // axis to rotate around
	);

	glMatrix.mat4.rotate(
		modelViewMatrix,  // destination matrix
		modelViewMatrix,  // matrix to rotate
		0,   // amount to rotate in radians
		[0, 1, 0]       // axis to rotate around
	);

	glMatrix.mat4.translate(
		modelViewMatrix,  // destination matrix
		modelViewMatrix,  // matrix to rotate
		[1, 1, 0]       // axis to rotate around
	);

	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
		gl.enableVertexAttribArray(
			programInfo.attributeLocations.position
		);
		gl.vertexAttribPointer(
			programInfo.attributeLocations.position,
			numComponents,
			type,
			normalize,
			stride,
			offset
		);
	}
	{
		const numComponents = 1;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.directionBuffer);
		gl.enableVertexAttribArray(
			programInfo.attributeLocations.direction
		);
		gl.vertexAttribPointer(
			programInfo.attributeLocations.direction,
			numComponents,
			type,
			normalize,
			stride,
			offset
		);
	}
	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.previousBuffer);
		gl.enableVertexAttribArray(
			programInfo.attributeLocations.previous
		);
		gl.vertexAttribPointer(
			programInfo.attributeLocations.previous,
			numComponents,
			type,
			normalize,
			stride,
			offset
		);
	}
	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nextBuffer);
		gl.enableVertexAttribArray(
			programInfo.attributeLocations.next
		);
		gl.vertexAttribPointer(
			programInfo.attributeLocations.next,
			numComponents,
			type,
			normalize,
			stride,
			offset
		);
	}
	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colorBuffer);
		gl.vertexAttribPointer(
			programInfo.attributeLocations.color,
			numComponents,
			type,
			normalize,
			stride,
			offset
		);
		gl.enableVertexAttribArray(programInfo.attributeLocations.color);
	}

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
	gl.uniform1f(programInfo.uniformLocations.thickness, 0.2);
	gl.uniform1i(programInfo.uniformLocations.miter, 1);

	{
		const offset = 0;
		const type = gl.UNSIGNED_SHORT;
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}
	squareRotation += deltaTime;
}

export default function init(canvas) {

	const props = {
		alpha: false,
		antialias: true
	};
	const gl = canvas.getContext('webgl', props);

	const shaderProgram = createShaderProgram(gl, vsSource, fsSource);
	const programInfo = {
		program: shaderProgram,
		attributeLocations: {
			position: gl.getAttribLocation(shaderProgram, 'position'),
			direction: gl.getAttribLocation(shaderProgram, 'direction'),
			next: gl.getAttribLocation(shaderProgram, 'next'),
			previous: gl.getAttribLocation(shaderProgram, 'previous'),
			color: gl.getAttribLocation(shaderProgram, 'color')
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'projection'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'modelView'),
			aspect: gl.getUniformLocation(shaderProgram, 'aspect'),
			thickness: gl.getUniformLocation(shaderProgram, 'thickness'),
			miter: gl.getUniformLocation(shaderProgram, 'miter')
		}
	};

	const buffers = initBuffers(gl);
	let then = 0;

	// Draw the scene repeatedly
	function render(now) {
		if (toggleAnimation) {
			now *= 0.0005;  // convert to seconds
			const deltaTime = now - then;
			then = now;
			drawScene(gl, programInfo, buffers, deltaTime);
		}
		requestAnimationFrame(render);
	}
	// requestAnimationFrame(render);
	drawScene(gl, programInfo, buffers, 0);
}
