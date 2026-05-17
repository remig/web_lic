/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from "../util";
import twgl from "./twgl";

function createCenterOfMassCubeBuffers(gl) {
	const size = 75;

	const vertices = [
		-size,
		0,
		0,
		size,
		0,
		0,
		-size,
		-size,
		size,
		size,
		-size,
		size,

		size,
		size,
		-size,
		-size,
		size,
		-size,
		-size,
		-size,
		-size,
		size,
		-size,
		-size,
	];

	const faceIndices = [
		0, 1, 2, 2, 3, 0,

		7, 6, 5, 5, 4, 7,

		4, 5, 1, 1, 0, 4,

		3, 2, 6, 6, 7, 3,

		3, 7, 4, 4, 0, 3,

		1, 5, 6, 6, 2, 1,
	];

	const faceVao = gl.createVertexArray();
	gl.bindVertexArray(faceVao);
	twgl.initBuffer(gl, 0, vertices, 3);
	twgl.initIndexBuffer(gl, faceIndices);
	gl.bindVertexArray(null);

	return {
		vao: faceVao,
		numElements: faceIndices.length,
	};
}

function createCenterOfMassLinesBuffers(gl) {
	const lineData = {
		position: [],
		next: [],
		direction: [],
		order: [],
		indices: { data: [], lastIndex: 0 },
	};

	const size = 500;
	const lines = [
		[-size, 0, 0, size, 0, 0],
		[0, -size, 0, 0, size, 0],
		[0, 0, -size, 0, 0, size],
	];

	for (const p of lines) {
		const idx = lineData.indices.lastIndex;
		lineData.position.push(
			p[0],
			p[1],
			p[2],
			p[0],
			p[1],
			p[2],
			p[3],
			p[4],
			p[5],
			p[3],
			p[4],
			p[5]
		);
		lineData.next.push(
			p[3],
			p[4],
			p[5],
			p[3],
			p[4],
			p[5],
			p[0],
			p[1],
			p[2],
			p[0],
			p[1],
			p[2]
		);
		lineData.indices.data.push(
			idx + 2,
			idx + 1,
			idx,
			idx + 3,
			idx + 1,
			idx + 2
		);
		lineData.direction.push(-1, 1, -1, 1);
		lineData.order.push(0, 0, 1, 1);
		lineData.indices.lastIndex += 4;
	}

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	twgl.initBuffer(gl, 0, lineData.position, 3);
	twgl.initBuffer(gl, 1, lineData.next, 3);
	twgl.initBuffer(gl, 2, lineData.direction, 1);
	twgl.initBuffer(gl, 3, lineData.order, 1);
	twgl.initIndexBuffer(gl, lineData.indices.data);

	gl.bindVertexArray(null);
	return {
		vao,
		numElements: lineData.indices.data.length,
	};
}

// Arrow geometry has base at (0, 0, 0), pointing straight down along Y, facing forward along Z
// Arrows are drawwn in two parts: the tip and the base, which can be stretched to any length
function createArrowBuffers(gl) {
	const arrowDimensions = {
		head: {
			length: 26,
			width: 6,
			insetDepth: 3,
		},
		body: {
			width: 1.4,
		},
	};

	const head = arrowDimensions.head;
	const body = arrowDimensions.body;
	const bodyLength = 1;

	const vertices = [
		0,
		bodyLength - head.insetDepth + head.length,
		0, // 0 tip
		-head.width,
		bodyLength - head.insetDepth,
		0, // 1 left arrow end
		-body.width,
		bodyLength,
		0, // 2 left arrow joint
		body.width,
		bodyLength,
		0, // 3 right arrow joint
		head.width,
		bodyLength - head.insetDepth,
		0, // 4 right arrow end
		body.width,
		0,
		0, // 5 right base corner
		-body.width,
		0,
		0, // 6 left base corner
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
			numElements: tipIndices.length,
		},
		body: {
			vao: bodyVao,
			numElements: bodyIndices.length,
		},
	};
}

function getArrowPosition(partBox, modelView, { direction, arrowOffset = 0 }) {
	const min = twgl.m4.transformPoint(modelView, partBox.min);
	const max = twgl.m4.transformPoint(modelView, partBox.max);

	let x = (min[0] + max[0]) / 2;
	let y = (min[1] + max[1]) / 2;
	let z = (min[2] + max[2]) / 2;

	if (arrowOffset) {
		if (direction === "left") {
			x += arrowOffset;
		} else if (direction === "right") {
			x -= arrowOffset;
		} else if (direction === "forward") {
			z += arrowOffset;
		} else if (direction === "backward") {
			z -= arrowOffset;
		} else if (direction === "down") {
			y -= arrowOffset;
		} else {
			y += arrowOffset;
		}
	}
	return twgl.m4.translation([x, y, z]);
}

function getArrowRotation({ direction, arrowRotation = 0 }) {
	let rx, ry, rz;
	if (direction === "left") {
		rz = -90;
		rx = -45 + arrowRotation;
	} else if (direction === "right") {
		rz = 90;
		rx = -45 + arrowRotation;
	} else if (direction === "forward") {
		rx = 90;
		ry = 45 + arrowRotation;
	} else if (direction === "backward") {
		rx = -90;
		ry = -45 + arrowRotation;
	} else if (direction === "down") {
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
	createCenterOfMassLinesBuffers,
	createCenterOfMassCubeBuffers,
	createArrowBuffers,
	getArrowPosition,
	getArrowRotation,
};
