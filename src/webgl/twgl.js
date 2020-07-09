/**
 * @license twgl.js 1.9.0 Copyright (c) 2015, Gregg Tavares All Rights Reserved.
 * Available via the MIT license.
 * see: http://github.com/greggman/twgl.js for details
 */

const twgl = (function() {

	function floatSetter(gl, location) {
		return function(v) {
			gl.uniform1f(location, v);
		};
	}

	function floatVec4Setter(gl, location) {
		return function(v) {
			gl.uniform4fv(location, v);
		};
	}

	function floatMat4Setter(gl, location) {
		return function(v) {
			gl.uniformMatrix4fv(location, false, v);
		};
	}

	const FLOAT = 0x1406;
	const FLOAT_VEC4 = 0x8B52;
	const FLOAT_MAT4 = 0x8B5C;

	const typeMap = {};
	typeMap[FLOAT] = floatSetter;
	typeMap[FLOAT_VEC4] = floatVec4Setter;
	typeMap[FLOAT_MAT4] = floatMat4Setter;

	function createUniformSetter(gl, program, uniformInfo) {
		const location = gl.getUniformLocation(program, uniformInfo.name);
		return typeMap[uniformInfo.type](gl, location);
	}

	function createUniformSetters(gl, program) {

		const uniformSetters = {};
		const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

		for (let i = 0; i < numUniforms; ++i) {
			const uniformInfo = gl.getActiveUniform(program, i);
			uniformSetters[uniformInfo.name] = createUniformSetter(gl, program, uniformInfo);
		}
		return uniformSetters;
	}

	function setUniforms(setters, values) {
		for (const name in values) {
			if (values.hasOwnProperty(name)) {
				setters.uniformSetters[name](values[name]);
			}
		}
	}

	function initBuffer(gl, attribIdx, data, numComponents) {
		data = new Float32Array(data);
		gl.enableVertexAttribArray(attribIdx);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		gl.vertexAttribPointer(attribIdx, numComponents, gl.FLOAT, false, 0, 0);
	}

	function initIndexBuffer(gl, data) {
		data = new Uint16Array(data);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
	}

	function createShader(gl, source, type) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			gl.deleteShader(shader);
			throw 'Failed to compile shader';
		}
		return shader;
	}

	function createProgram(gl, vertexShader, fragShader, attribs) {
		const program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragShader);
		for (let i = 0; i < attribs.length; i++) {
			gl.bindAttribLocation(program, i, attribs[i]);
		}
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			gl.deleteProgram(program);
			throw 'Failed to link program';
		}
		return program;
	}

	return {
		createUniformSetters,
		setUniforms,
		initBuffer,
		initIndexBuffer,
		createShader,
		createProgram,
	};
})();

const v3 = twgl.v3 = (function() {

	let VecType = Float32Array;

	function setDefaultType(ctor) {
		const oldType = VecType;
		VecType = ctor;
		return oldType;
	}

	function create(x, y, z) {
		const dst = new VecType(3);
		if (x) {
			dst[0] = x;
		}
		if (y) {
			dst[1] = y;
		}
		if (z) {
			dst[2] = z;
		}
		return dst;
	}

	function add(a, b, dst) {
		dst = dst || new VecType(3);

		dst[0] = a[0] + b[0];
		dst[1] = a[1] + b[1];
		dst[2] = a[2] + b[2];

		return dst;
	}

	function subtract(a, b, dst) {
		dst = dst || new VecType(3);

		dst[0] = a[0] - b[0];
		dst[1] = a[1] - b[1];
		dst[2] = a[2] - b[2];

		return dst;
	}

	function lerp(a, b, t, dst) {
		dst = dst || new VecType(3);

		dst[0] = (1 - t) * a[0] + t * b[0];
		dst[1] = (1 - t) * a[1] + t * b[1];
		dst[2] = (1 - t) * a[2] + t * b[2];

		return dst;
	}

	function mulScalar(v, k, dst) {
		dst = dst || new VecType(3);

		dst[0] = v[0] * k;
		dst[1] = v[1] * k;
		dst[2] = v[2] * k;

		return dst;
	}

	function divScalar(v, k, dst) {
		dst = dst || new VecType(3);

		dst[0] = v[0] / k;
		dst[1] = v[1] / k;
		dst[2] = v[2] / k;

		return dst;
	}

	function cross(a, b, dst) {
		dst = dst || new VecType(3);

		dst[0] = a[1] * b[2] - a[2] * b[1];
		dst[1] = a[2] * b[0] - a[0] * b[2];
		dst[2] = a[0] * b[1] - a[1] * b[0];

		return dst;
	}

	function dot(a, b) {
		return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
	}

	function length(v) {
		return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	}

	function lengthSq(v) {
		return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
	}

	function normalize(a, dst) {
		dst = dst || new VecType(3);

		const lenSq = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
		const len = Math.sqrt(lenSq);
		if (len > 0.00001) {
			dst[0] = a[0] / len;
			dst[1] = a[1] / len;
			dst[2] = a[2] / len;
		} else {
			dst[0] = 0;
			dst[1] = 0;
			dst[2] = 0;
		}

		return dst;
	}

	function negate(v, dst) {
		dst = dst || new VecType(3);

		dst[0] = -v[0];
		dst[1] = -v[1];
		dst[2] = -v[2];

		return dst;
	}

	function copy(v, dst) {
		dst = dst || new VecType(3);

		dst[0] = v[0];
		dst[1] = v[1];
		dst[2] = v[2];

		return dst;
	}

	function multiply(a, b, dst) {
		dst = dst || new VecType(3);

		dst[0] = a[0] * b[0];
		dst[1] = a[1] * b[1];
		dst[2] = a[2] * b[2];

		return dst;
	}

	function divide(a, b, dst) {
		dst = dst || new VecType(3);

		dst[0] = a[0] / b[0];
		dst[1] = a[1] / b[1];
		dst[2] = a[2] / b[2];

		return dst;
	}

	return {
		add,
		copy,
		create,
		cross,
		divide,
		divScalar,
		dot,
		lerp,
		length,
		lengthSq,
		mulScalar,
		multiply,
		negate,
		normalize,
		setDefaultType,
		subtract,
	};

})();

twgl.m4 = (function() {

	let MatType = Float32Array;

	const tempV3a = v3.create();
	const tempV3b = v3.create();
	const tempV3c = v3.create();

	function setDefaultType(ctor) {
		const oldType = MatType;
		MatType = ctor;
		return oldType;
	}

	function negate(m, dst) {
		dst = dst || new MatType(16);

		dst[0] = -m[0];
		dst[1] = -m[1];
		dst[2] = -m[2];
		dst[3] = -m[3];
		dst[4] = -m[4];
		dst[5] = -m[5];
		dst[6] = -m[6];
		dst[7] = -m[7];
		dst[8] = -m[8];
		dst[9] = -m[9];
		dst[10] = -m[10];
		dst[11] = -m[11];
		dst[12] = -m[12];
		dst[13] = -m[13];
		dst[14] = -m[14];
		dst[15] = -m[15];

		return dst;
	}

	function copy(m, dst) {
		dst = dst || new MatType(16);

		dst[0] = m[0];
		dst[1] = m[1];
		dst[2] = m[2];
		dst[3] = m[3];
		dst[4] = m[4];
		dst[5] = m[5];
		dst[6] = m[6];
		dst[7] = m[7];
		dst[8] = m[8];
		dst[9] = m[9];
		dst[10] = m[10];
		dst[11] = m[11];
		dst[12] = m[12];
		dst[13] = m[13];
		dst[14] = m[14];
		dst[15] = m[15];

		return dst;
	}

	function identity(dst) {
		dst = dst || new MatType(16);

		dst[0] = 1;
		dst[1] = 0;
		dst[2] = 0;
		dst[3] = 0;
		dst[4] = 0;
		dst[5] = 1;
		dst[6] = 0;
		dst[7] = 0;
		dst[8] = 0;
		dst[9] = 0;
		dst[10] = 1;
		dst[11] = 0;
		dst[12] = 0;
		dst[13] = 0;
		dst[14] = 0;
		dst[15] = 1;

		return dst;
	}

	function transpose(m, dst) {
		dst = dst || new MatType(16);
		if (dst === m) {
			let t;

			t = m[1];
			m[1] = m[4];
			m[4] = t;

			t = m[2];
			m[2] = m[8];
			m[8] = t;

			t = m[3];
			m[3] = m[12];
			m[12] = t;

			t = m[6];
			m[6] = m[9];
			m[9] = t;

			t = m[7];
			m[7] = m[13];
			m[13] = t;

			t = m[11];
			m[11] = m[14];
			m[14] = t;
			return dst;
		}

		const m00 = m[0 * 4 + 0];
		const m01 = m[0 * 4 + 1];
		const m02 = m[0 * 4 + 2];
		const m03 = m[0 * 4 + 3];
		const m10 = m[1 * 4 + 0];
		const m11 = m[1 * 4 + 1];
		const m12 = m[1 * 4 + 2];
		const m13 = m[1 * 4 + 3];
		const m20 = m[2 * 4 + 0];
		const m21 = m[2 * 4 + 1];
		const m22 = m[2 * 4 + 2];
		const m23 = m[2 * 4 + 3];
		const m30 = m[3 * 4 + 0];
		const m31 = m[3 * 4 + 1];
		const m32 = m[3 * 4 + 2];
		const m33 = m[3 * 4 + 3];

		dst[0] = m00;
		dst[1] = m10;
		dst[2] = m20;
		dst[3] = m30;
		dst[4] = m01;
		dst[5] = m11;
		dst[6] = m21;
		dst[7] = m31;
		dst[8] = m02;
		dst[9] = m12;
		dst[10] = m22;
		dst[11] = m32;
		dst[12] = m03;
		dst[13] = m13;
		dst[14] = m23;
		dst[15] = m33;

		return dst;
	}

	function inverse(m, dst) {
		dst = dst || new MatType(16);

		const m00 = m[0 * 4 + 0];
		const m01 = m[0 * 4 + 1];
		const m02 = m[0 * 4 + 2];
		const m03 = m[0 * 4 + 3];
		const m10 = m[1 * 4 + 0];
		const m11 = m[1 * 4 + 1];
		const m12 = m[1 * 4 + 2];
		const m13 = m[1 * 4 + 3];
		const m20 = m[2 * 4 + 0];
		const m21 = m[2 * 4 + 1];
		const m22 = m[2 * 4 + 2];
		const m23 = m[2 * 4 + 3];
		const m30 = m[3 * 4 + 0];
		const m31 = m[3 * 4 + 1];
		const m32 = m[3 * 4 + 2];
		const m33 = m[3 * 4 + 3];
		const tmp_0 = m22 * m33;
		const tmp_1 = m32 * m23;
		const tmp_2 = m12 * m33;
		const tmp_3 = m32 * m13;
		const tmp_4 = m12 * m23;
		const tmp_5 = m22 * m13;
		const tmp_6 = m02 * m33;
		const tmp_7 = m32 * m03;
		const tmp_8 = m02 * m23;
		const tmp_9 = m22 * m03;
		const tmp_10 = m02 * m13;
		const tmp_11 = m12 * m03;
		const tmp_12 = m20 * m31;
		const tmp_13 = m30 * m21;
		const tmp_14 = m10 * m31;
		const tmp_15 = m30 * m11;
		const tmp_16 = m10 * m21;
		const tmp_17 = m20 * m11;
		const tmp_18 = m00 * m31;
		const tmp_19 = m30 * m01;
		const tmp_20 = m00 * m21;
		const tmp_21 = m20 * m01;
		const tmp_22 = m00 * m11;
		const tmp_23 = m10 * m01;

		const t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
        (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
		const t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
        (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
		const t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
        (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
		const t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
        (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

		const d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

		dst[0] = d * t0;
		dst[1] = d * t1;
		dst[2] = d * t2;
		dst[3] = d * t3;
		dst[4] = d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
            (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30));
		dst[5] = d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
            (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30));
		dst[6] = d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
            (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30));
		dst[7] = d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
            (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20));
		dst[8] = d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
            (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33));
		dst[9] = d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
            (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33));
		dst[10] = d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
            (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33));
		dst[11] = d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
            (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23));
		dst[12] = d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
            (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22));
		dst[13] = d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
            (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02));
		dst[14] = d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
            (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12));
		dst[15] = d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
            (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02));

		return dst;
	}

	function multiply(a, b, dst) {
		dst = dst || new MatType(16);

		const a00 = a[0];
		const a01 = a[1];
		const a02 = a[2];
		const a03 = a[3];
		const a10 = a[4 + 0];
		const a11 = a[4 + 1];
		const a12 = a[4 + 2];
		const a13 = a[4 + 3];
		const a20 = a[8 + 0];
		const a21 = a[8 + 1];
		const a22 = a[8 + 2];
		const a23 = a[8 + 3];
		const a30 = a[12 + 0];
		const a31 = a[12 + 1];
		const a32 = a[12 + 2];
		const a33 = a[12 + 3];
		const b00 = b[0];
		const b01 = b[1];
		const b02 = b[2];
		const b03 = b[3];
		const b10 = b[4 + 0];
		const b11 = b[4 + 1];
		const b12 = b[4 + 2];
		const b13 = b[4 + 3];
		const b20 = b[8 + 0];
		const b21 = b[8 + 1];
		const b22 = b[8 + 2];
		const b23 = b[8 + 3];
		const b30 = b[12 + 0];
		const b31 = b[12 + 1];
		const b32 = b[12 + 2];
		const b33 = b[12 + 3];

		dst[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
		dst[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
		dst[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
		dst[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
		dst[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
		dst[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
		dst[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
		dst[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
		dst[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
		dst[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
		dst[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
		dst[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
		dst[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
		dst[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
		dst[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
		dst[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

		return dst;
	}

	function setTranslation(a, v, dst) {
		dst = dst || identity();
		if (a !== dst) {
			dst[0] = a[0];
			dst[1] = a[1];
			dst[2] = a[2];
			dst[3] = a[3];
			dst[4] = a[4];
			dst[5] = a[5];
			dst[6] = a[6];
			dst[7] = a[7];
			dst[8] = a[8];
			dst[9] = a[9];
			dst[10] = a[10];
			dst[11] = a[11];
		}
		dst[12] = v[0];
		dst[13] = v[1];
		dst[14] = v[2];
		dst[15] = 1;
		return dst;
	}

	function getTranslation(m, dst) {
		dst = dst || v3.create();
		dst[0] = m[12];
		dst[1] = m[13];
		dst[2] = m[14];
		return dst;
	}

	function getAxis(m, axis, dst) {
		dst = dst || v3.create();
		const off = axis * 4;
		dst[0] = m[off + 0];
		dst[1] = m[off + 1];
		dst[2] = m[off + 2];
		return dst;
	}

	function setAxis(a, v, axis, dst) {
		if (dst !== a) {
			dst = copy(a, dst);
		}
		const off = axis * 4;
		dst[off + 0] = v[0];
		dst[off + 1] = v[1];
		dst[off + 2] = v[2];
		return dst;
	}

	function perspective(fieldOfViewYInRadians, aspect, zNear, zFar, dst) {
		dst = dst || new MatType(16);

		const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
		const rangeInv = 1.0 / (zNear - zFar);

		dst[0] = f / aspect;
		dst[1] = 0;
		dst[2] = 0;
		dst[3] = 0;

		dst[4] = 0;
		dst[5] = f;
		dst[6] = 0;
		dst[7] = 0;

		dst[8] = 0;
		dst[9] = 0;
		dst[10] = (zNear + zFar) * rangeInv;
		dst[11] = -1;

		dst[12] = 0;
		dst[13] = 0;
		dst[14] = zNear * zFar * rangeInv * 2;
		dst[15] = 0;

		return dst;
	}

	function ortho(left, right, bottom, top, near, far, dst) {
		dst = dst || new MatType(16);

		dst[0] = 2 / (right - left);
		dst[1] = 0;
		dst[2] = 0;
		dst[3] = 0;

		dst[4] = 0;
		dst[5] = 2 / (top - bottom);
		dst[6] = 0;
		dst[7] = 0;

		dst[8] = 0;
		dst[9] = 0;
		dst[10] = -1 / (far - near);
		dst[11] = 0;

		dst[12] = (right + left) / (left - right);
		dst[13] = (top + bottom) / (bottom - top);
		dst[14] = -near / (near - far);
		dst[15] = 1;

		return dst;
	}

	function frustum(left, right, bottom, top, near, far, dst) {
		dst = dst || new MatType(16);

		const dx = (right - left);
		const dy = (top - bottom);
		const dz = (near - far);

		dst[0] = 2 * near / dx;
		dst[1] = 0;
		dst[2] = 0;
		dst[3] = 0;
		dst[4] = 0;
		dst[5] = 2 * near / dy;
		dst[6] = 0;
		dst[7] = 0;
		dst[8] = (left + right) / dx;
		dst[9] = (top + bottom) / dy;
		dst[10] = far / dz;
		dst[11] = -1;
		dst[12] = 0;
		dst[13] = 0;
		dst[14] = near * far / dz;
		dst[15] = 0;

		return dst;
	}

	function lookAt(eye, target, up, dst) {
		dst = dst || new MatType(16);

		const xAxis = tempV3a;
		const yAxis = tempV3b;
		const zAxis = tempV3c;

		v3.normalize(
			v3.subtract(eye, target, zAxis), zAxis);
		v3.normalize(v3.cross(up, zAxis, xAxis), xAxis);
		v3.normalize(v3.cross(zAxis, xAxis, yAxis), yAxis);

		dst[0] = xAxis[0];
		dst[1] = xAxis[1];
		dst[2] = xAxis[2];
		dst[3] = 0;
		dst[4] = yAxis[0];
		dst[5] = yAxis[1];
		dst[6] = yAxis[2];
		dst[7] = 0;
		dst[8] = zAxis[0];
		dst[9] = zAxis[1];
		dst[10] = zAxis[2];
		dst[11] = 0;
		dst[12] = eye[0];
		dst[13] = eye[1];
		dst[14] = eye[2];
		dst[15] = 1;

		return dst;
	}

	function translation(v, dst) {
		dst = dst || new MatType(16);

		dst[0] = 1;
		dst[1] = 0;
		dst[2] = 0;
		dst[3] = 0;
		dst[4] = 0;
		dst[5] = 1;
		dst[6] = 0;
		dst[7] = 0;
		dst[8] = 0;
		dst[9] = 0;
		dst[10] = 1;
		dst[11] = 0;
		dst[12] = v[0];
		dst[13] = v[1];
		dst[14] = v[2];
		dst[15] = 1;
		return dst;
	}

	function translate(m, v, dst) {
		dst = dst || new MatType(16);

		const v0 = v[0];
		const v1 = v[1];
		const v2 = v[2];
		const m00 = m[0];
		const m01 = m[1];
		const m02 = m[2];
		const m03 = m[3];
		const m10 = m[1 * 4 + 0];
		const m11 = m[1 * 4 + 1];
		const m12 = m[1 * 4 + 2];
		const m13 = m[1 * 4 + 3];
		const m20 = m[2 * 4 + 0];
		const m21 = m[2 * 4 + 1];
		const m22 = m[2 * 4 + 2];
		const m23 = m[2 * 4 + 3];
		const m30 = m[3 * 4 + 0];
		const m31 = m[3 * 4 + 1];
		const m32 = m[3 * 4 + 2];
		const m33 = m[3 * 4 + 3];

		if (m !== dst) {
			dst[0] = m00;
			dst[1] = m01;
			dst[2] = m02;
			dst[3] = m03;
			dst[4] = m10;
			dst[5] = m11;
			dst[6] = m12;
			dst[7] = m13;
			dst[8] = m20;
			dst[9] = m21;
			dst[10] = m22;
			dst[11] = m23;
		}

		dst[12] = m00 * v0 + m10 * v1 + m20 * v2 + m30;
		dst[13] = m01 * v0 + m11 * v1 + m21 * v2 + m31;
		dst[14] = m02 * v0 + m12 * v1 + m22 * v2 + m32;
		dst[15] = m03 * v0 + m13 * v1 + m23 * v2 + m33;

		return dst;
	}

	function rotationX(angleInRadians, dst) {
		dst = dst || new MatType(16);

		const c = Math.cos(angleInRadians);
		const s = Math.sin(angleInRadians);

		dst[0] = 1;
		dst[1] = 0;
		dst[2] = 0;
		dst[3] = 0;
		dst[4] = 0;
		dst[5] = c;
		dst[6] = s;
		dst[7] = 0;
		dst[8] = 0;
		dst[9] = -s;
		dst[10] = c;
		dst[11] = 0;
		dst[12] = 0;
		dst[13] = 0;
		dst[14] = 0;
		dst[15] = 1;

		return dst;
	}

	function rotateX(m, angleInRadians, dst) {
		dst = dst || new MatType(16);

		const m10 = m[4];
		const m11 = m[5];
		const m12 = m[6];
		const m13 = m[7];
		const m20 = m[8];
		const m21 = m[9];
		const m22 = m[10];
		const m23 = m[11];
		const c = Math.cos(angleInRadians);
		const s = Math.sin(angleInRadians);

		dst[4] = c * m10 + s * m20;
		dst[5] = c * m11 + s * m21;
		dst[6] = c * m12 + s * m22;
		dst[7] = c * m13 + s * m23;
		dst[8] = c * m20 - s * m10;
		dst[9] = c * m21 - s * m11;
		dst[10] = c * m22 - s * m12;
		dst[11] = c * m23 - s * m13;

		if (m !== dst) {
			dst[0] = m[0];
			dst[1] = m[1];
			dst[2] = m[2];
			dst[3] = m[3];
			dst[12] = m[12];
			dst[13] = m[13];
			dst[14] = m[14];
			dst[15] = m[15];
		}

		return dst;
	}

	function rotationY(angleInRadians, dst) {
		dst = dst || new MatType(16);

		const c = Math.cos(angleInRadians);
		const s = Math.sin(angleInRadians);

		dst[0] = c;
		dst[1] = 0;
		dst[2] = -s;
		dst[3] = 0;
		dst[4] = 0;
		dst[5] = 1;
		dst[6] = 0;
		dst[7] = 0;
		dst[8] = s;
		dst[9] = 0;
		dst[10] = c;
		dst[11] = 0;
		dst[12] = 0;
		dst[13] = 0;
		dst[14] = 0;
		dst[15] = 1;

		return dst;
	}

	function rotateY(m, angleInRadians, dst) {
		dst = dst || new MatType(16);

		const m00 = m[0 * 4 + 0];
		const m01 = m[0 * 4 + 1];
		const m02 = m[0 * 4 + 2];
		const m03 = m[0 * 4 + 3];
		const m20 = m[2 * 4 + 0];
		const m21 = m[2 * 4 + 1];
		const m22 = m[2 * 4 + 2];
		const m23 = m[2 * 4 + 3];
		const c = Math.cos(angleInRadians);
		const s = Math.sin(angleInRadians);

		dst[0] = c * m00 - s * m20;
		dst[1] = c * m01 - s * m21;
		dst[2] = c * m02 - s * m22;
		dst[3] = c * m03 - s * m23;
		dst[8] = c * m20 + s * m00;
		dst[9] = c * m21 + s * m01;
		dst[10] = c * m22 + s * m02;
		dst[11] = c * m23 + s * m03;

		if (m !== dst) {
			dst[4] = m[4];
			dst[5] = m[5];
			dst[6] = m[6];
			dst[7] = m[7];
			dst[12] = m[12];
			dst[13] = m[13];
			dst[14] = m[14];
			dst[15] = m[15];
		}

		return dst;
	}

	function rotationZ(angleInRadians, dst) {
		dst = dst || new MatType(16);

		const c = Math.cos(angleInRadians);
		const s = Math.sin(angleInRadians);

		dst[0] = c;
		dst[1] = s;
		dst[2] = 0;
		dst[3] = 0;
		dst[4] = -s;
		dst[5] = c;
		dst[6] = 0;
		dst[7] = 0;
		dst[8] = 0;
		dst[9] = 0;
		dst[10] = 1;
		dst[11] = 0;
		dst[12] = 0;
		dst[13] = 0;
		dst[14] = 0;
		dst[15] = 1;

		return dst;
	}

	function rotateZ(m, angleInRadians, dst) {
		dst = dst || new MatType(16);

		const m00 = m[0 * 4 + 0];
		const m01 = m[0 * 4 + 1];
		const m02 = m[0 * 4 + 2];
		const m03 = m[0 * 4 + 3];
		const m10 = m[1 * 4 + 0];
		const m11 = m[1 * 4 + 1];
		const m12 = m[1 * 4 + 2];
		const m13 = m[1 * 4 + 3];
		const c = Math.cos(angleInRadians);
		const s = Math.sin(angleInRadians);

		dst[0] = c * m00 + s * m10;
		dst[1] = c * m01 + s * m11;
		dst[2] = c * m02 + s * m12;
		dst[3] = c * m03 + s * m13;
		dst[4] = c * m10 - s * m00;
		dst[5] = c * m11 - s * m01;
		dst[6] = c * m12 - s * m02;
		dst[7] = c * m13 - s * m03;

		if (m !== dst) {
			dst[8] = m[8];
			dst[9] = m[9];
			dst[10] = m[10];
			dst[11] = m[11];
			dst[12] = m[12];
			dst[13] = m[13];
			dst[14] = m[14];
			dst[15] = m[15];
		}

		return dst;
	}

	function axisRotation(axis, angleInRadians, dst) {
		dst = dst || new MatType(16);

		let x = axis[0];
		let y = axis[1];
		let z = axis[2];
		const n = Math.sqrt(x * x + y * y + z * z);
		x /= n;
		y /= n;
		z /= n;
		const xx = x * x;
		const yy = y * y;
		const zz = z * z;
		const c = Math.cos(angleInRadians);
		const s = Math.sin(angleInRadians);
		const oneMinusCosine = 1 - c;

		dst[0] = xx + (1 - xx) * c;
		dst[1] = x * y * oneMinusCosine + z * s;
		dst[2] = x * z * oneMinusCosine - y * s;
		dst[3] = 0;
		dst[4] = x * y * oneMinusCosine - z * s;
		dst[5] = yy + (1 - yy) * c;
		dst[6] = y * z * oneMinusCosine + x * s;
		dst[7] = 0;
		dst[8] = x * z * oneMinusCosine + y * s;
		dst[9] = y * z * oneMinusCosine - x * s;
		dst[10] = zz + (1 - zz) * c;
		dst[11] = 0;
		dst[12] = 0;
		dst[13] = 0;
		dst[14] = 0;
		dst[15] = 1;

		return dst;
	}

	function axisRotate(m, axis, angleInRadians, dst) {
		dst = dst || new MatType(16);

		let x = axis[0];
		let y = axis[1];
		let z = axis[2];
		const n = Math.sqrt(x * x + y * y + z * z);
		x /= n;
		y /= n;
		z /= n;
		const xx = x * x;
		const yy = y * y;
		const zz = z * z;
		const c = Math.cos(angleInRadians);
		const s = Math.sin(angleInRadians);
		const oneMinusCosine = 1 - c;

		const r00 = xx + (1 - xx) * c;
		const r01 = x * y * oneMinusCosine + z * s;
		const r02 = x * z * oneMinusCosine - y * s;
		const r10 = x * y * oneMinusCosine - z * s;
		const r11 = yy + (1 - yy) * c;
		const r12 = y * z * oneMinusCosine + x * s;
		const r20 = x * z * oneMinusCosine + y * s;
		const r21 = y * z * oneMinusCosine - x * s;
		const r22 = zz + (1 - zz) * c;

		const m00 = m[0];
		const m01 = m[1];
		const m02 = m[2];
		const m03 = m[3];
		const m10 = m[4];
		const m11 = m[5];
		const m12 = m[6];
		const m13 = m[7];
		const m20 = m[8];
		const m21 = m[9];
		const m22 = m[10];
		const m23 = m[11];

		dst[0] = r00 * m00 + r01 * m10 + r02 * m20;
		dst[1] = r00 * m01 + r01 * m11 + r02 * m21;
		dst[2] = r00 * m02 + r01 * m12 + r02 * m22;
		dst[3] = r00 * m03 + r01 * m13 + r02 * m23;
		dst[4] = r10 * m00 + r11 * m10 + r12 * m20;
		dst[5] = r10 * m01 + r11 * m11 + r12 * m21;
		dst[6] = r10 * m02 + r11 * m12 + r12 * m22;
		dst[7] = r10 * m03 + r11 * m13 + r12 * m23;
		dst[8] = r20 * m00 + r21 * m10 + r22 * m20;
		dst[9] = r20 * m01 + r21 * m11 + r22 * m21;
		dst[10] = r20 * m02 + r21 * m12 + r22 * m22;
		dst[11] = r20 * m03 + r21 * m13 + r22 * m23;

		if (m !== dst) {
			dst[12] = m[12];
			dst[13] = m[13];
			dst[14] = m[14];
			dst[15] = m[15];
		}

		return dst;
	}

	function scaling(v, dst) {
		dst = dst || new MatType(16);

		dst[0] = v[0];
		dst[1] = 0;
		dst[2] = 0;
		dst[3] = 0;
		dst[4] = 0;
		dst[5] = v[1];
		dst[6] = 0;
		dst[7] = 0;
		dst[8] = 0;
		dst[9] = 0;
		dst[10] = v[2];
		dst[11] = 0;
		dst[12] = 0;
		dst[13] = 0;
		dst[14] = 0;
		dst[15] = 1;

		return dst;
	}

	function scale(m, v, dst) {
		dst = dst || new MatType(16);

		const v0 = v[0];
		const v1 = v[1];
		const v2 = v[2];

		dst[0] = v0 * m[0 * 4 + 0];
		dst[1] = v0 * m[0 * 4 + 1];
		dst[2] = v0 * m[0 * 4 + 2];
		dst[3] = v0 * m[0 * 4 + 3];
		dst[4] = v1 * m[1 * 4 + 0];
		dst[5] = v1 * m[1 * 4 + 1];
		dst[6] = v1 * m[1 * 4 + 2];
		dst[7] = v1 * m[1 * 4 + 3];
		dst[8] = v2 * m[2 * 4 + 0];
		dst[9] = v2 * m[2 * 4 + 1];
		dst[10] = v2 * m[2 * 4 + 2];
		dst[11] = v2 * m[2 * 4 + 3];

		if (m !== dst) {
			dst[12] = m[12];
			dst[13] = m[13];
			dst[14] = m[14];
			dst[15] = m[15];
		}

		return dst;
	}

	function transformPoint(m, v, dst) {
		dst = dst || v3.create();
		const v0 = v[0];
		const v1 = v[1];
		const v2 = v[2];
		const d = v0 * m[0 * 4 + 3] + v1 * m[1 * 4 + 3] + v2 * m[2 * 4 + 3] + m[3 * 4 + 3];

		dst[0] = (v0 * m[0 * 4 + 0] + v1 * m[1 * 4 + 0] + v2 * m[2 * 4 + 0] + m[3 * 4 + 0]) / d;
		dst[1] = (v0 * m[0 * 4 + 1] + v1 * m[1 * 4 + 1] + v2 * m[2 * 4 + 1] + m[3 * 4 + 1]) / d;
		dst[2] = (v0 * m[0 * 4 + 2] + v1 * m[1 * 4 + 2] + v2 * m[2 * 4 + 2] + m[3 * 4 + 2]) / d;

		return dst;
	}

	function transformDirection(m, v, dst) {
		dst = dst || v3.create();

		const v0 = v[0];
		const v1 = v[1];
		const v2 = v[2];

		dst[0] = v0 * m[0 * 4 + 0] + v1 * m[1 * 4 + 0] + v2 * m[2 * 4 + 0];
		dst[1] = v0 * m[0 * 4 + 1] + v1 * m[1 * 4 + 1] + v2 * m[2 * 4 + 1];
		dst[2] = v0 * m[0 * 4 + 2] + v1 * m[1 * 4 + 2] + v2 * m[2 * 4 + 2];

		return dst;
	}

	function transformNormal(m, v, dst) {
		dst = dst || v3.create();
		const mi = inverse(m);
		const v0 = v[0];
		const v1 = v[1];
		const v2 = v[2];

		dst[0] = v0 * mi[0 * 4 + 0] + v1 * mi[0 * 4 + 1] + v2 * mi[0 * 4 + 2];
		dst[1] = v0 * mi[1 * 4 + 0] + v1 * mi[1 * 4 + 1] + v2 * mi[1 * 4 + 2];
		dst[2] = v0 * mi[2 * 4 + 0] + v1 * mi[2 * 4 + 1] + v2 * mi[2 * 4 + 2];

		return dst;
	}

	return {
		axisRotate,
		axisRotation,
		create: identity,
		copy,
		frustum,
		getAxis,
		getTranslation,
		identity,
		inverse,
		lookAt,
		multiply,
		negate,
		ortho,
		perspective,
		rotateX,
		rotateY,
		rotateZ,
		rotateAxis: axisRotate,
		rotationX,
		rotationY,
		rotationZ,
		scale,
		scaling,
		setAxis,
		setDefaultType,
		setTranslation,
		transformDirection,
		transformNormal,
		transformPoint,
		translate,
		translation,
		transpose,
	};
})();

export default twgl;
