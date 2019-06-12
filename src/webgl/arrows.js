/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from '../util';
import twgl from './twgl';

// Arrow geometry has base at (0, 0, 0), pointing straight down along Y, facing forward along Z
// Arrows are drawwn in two parts: the tip and the base, which can be stretched to any length
function createArrowBuffers(gl) {

	const arrowDimensions = {
		head: {
			length: 26,
			width: 6,
			insetDepth: 3
		},
		body: {
			width: 1.4
		}
	};

	const head = arrowDimensions.head;
	const body = arrowDimensions.body;
	const bodyLength = 1;

	const vertices = [
		0, bodyLength - head.insetDepth + head.length, 0,   // 0 tip
		-head.width, bodyLength - head.insetDepth, 0,  // 1 left arrow end
		-body.width, bodyLength, 0,  // 2 left arrow joint
		body.width, bodyLength, 0,  // 3 right arrow joint
		head.width, bodyLength - head.insetDepth, 0,  // 4 right arrow end
		body.width, 0, 0,  // 5 right base corner
		-body.width, 0, 0  // 6 left base corner
	];

	const tipIndices = [0, 1, 2, 0, 2, 3, 0, 3, 4];
	const bodyIndices = [2, 3, 5, 2, 5, 6];

	const tipVao = gl.createVertexArray();
	gl.bindVertexArray(tipVao);
	twgl.initBuffer(gl, 0, vertices, 3);
	twgl.initIndexBuffer(gl, tipIndices);
	gl.bindVertexArray(null);

	const bodyVao = gl.createVertexArray();
	gl.bindVertexArray(bodyVao);
	twgl.initBuffer(gl, 0, vertices, 3);
	twgl.initIndexBuffer(gl, bodyIndices);
	gl.bindVertexArray(null);

	return {
		tip: {
			vao: tipVao,
			numElements: tipIndices.length
		},
		body: {
			vao: bodyVao,
			numElements: bodyIndices.length
		}
	};
}

function getArrowPosition(partBox, modelView, {direction, arrowOffset = 0}) {

	const min = twgl.m4.transformPoint(modelView, partBox.min);
	const max = twgl.m4.transformPoint(modelView, partBox.max);

	let x = (min[0] + max[0]) / 2;
	let y = (min[1] + max[1]) / 2;
	let z = (min[2] + max[2]) / 2;

	if (arrowOffset) {
		if (direction === 'left') {
			x += arrowOffset;
		} else if (direction === 'right') {
			x -= arrowOffset;
		} else if (direction === 'forward') {
			z += arrowOffset;
		} else if (direction === 'backward') {
			z -= arrowOffset;
		} else if (direction === 'down') {
			y -= arrowOffset;
		} else {
			y += arrowOffset;
		}
	}
	return twgl.m4.translation([x, y, z]);
}

function getArrowRotation({direction, arrowRotation = 0}) {

	let rx, ry, rz;
	if (direction === 'left') {
		rz = -90;
		rx = -45 + arrowRotation;
	} else if (direction === 'right') {
		rz = 90;
		rx = -45 + arrowRotation;
	} else if (direction === 'forward') {
		rx = 90;
		ry = 45 + arrowRotation;
	} else if (direction === 'backward') {
		rx = -90;
		ry = -45 + arrowRotation;
	} else if (direction === 'down') {
		rx = 180;
		ry = 45 + arrowRotation;
	} else {
		ry = -45 + arrowRotation;
	}

	const res = twgl.m4.create();
	if (rx) {
		twgl.m4.rotateX(res, _.radians(rx), res);
	}
	if (rz) {
		twgl.m4.rotateZ(res, _.radians(rz), res);
	}
	if (ry) {
		twgl.m4.rotateY(res, _.radians(ry), res);
	}
	return res;
}

export default {
	createArrowBuffers,
	getArrowPosition,
	getArrowRotation
};
