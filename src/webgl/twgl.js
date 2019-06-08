/**
 * @license twgl.js 1.9.0 Copyright (c) 2015, Gregg Tavares All Rights Reserved.
 * Available via the MIT license.
 * see: http://github.com/greggman/twgl.js for details
 */
/* eslint-disable */

var error = (window.console && window.console.error && typeof window.console.error === "function")
  ? window.console.error.bind(window.console)
  : function() { };

var typedArrays = (function() {

  var BYTE                           = 0x1400;
  var UNSIGNED_BYTE                  = 0x1401;
  var SHORT                          = 0x1402;
  var UNSIGNED_SHORT                 = 0x1403;
  var INT                            = 0x1404;
  var UNSIGNED_INT                   = 0x1405;
  var FLOAT                          = 0x1406;

  function getGLTypeForTypedArray(typedArray) {
    if (typedArray instanceof Int8Array)         { return BYTE; }           // eslint-disable-line
    if (typedArray instanceof Uint8Array)        { return UNSIGNED_BYTE; }  // eslint-disable-line
    if (typedArray instanceof Uint8ClampedArray) { return UNSIGNED_BYTE; }  // eslint-disable-line
    if (typedArray instanceof Int16Array)        { return SHORT; }          // eslint-disable-line
    if (typedArray instanceof Uint16Array)       { return UNSIGNED_SHORT; } // eslint-disable-line
    if (typedArray instanceof Int32Array)        { return INT; }            // eslint-disable-line
    if (typedArray instanceof Uint32Array)       { return UNSIGNED_INT; }   // eslint-disable-line
    if (typedArray instanceof Float32Array)      { return FLOAT; }          // eslint-disable-line
    throw "unsupported typed array type";
  }

  function isArrayBuffer(a) {
    return a && a.buffer && a.buffer instanceof ArrayBuffer;
  }

  return {
    "getGLTypeForTypedArray": getGLTypeForTypedArray,
    "isArrayBuffer": isArrayBuffer,
  };
})();

var attributes = (function() {
  
  var gl = undefined;  // eslint-disable-line
	  
  function setBufferFromTypedArray(gl, type, buffer, array, drawType) {
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, array, drawType || gl.STATIC_DRAW);
  }

  function createBufferFromTypedArray(gl, typedArray, type, drawType) {
    if (typedArray instanceof WebGLBuffer) {
      return typedArray;
    }
    type = type || gl.ARRAY_BUFFER;
    var buffer = gl.createBuffer();
    setBufferFromTypedArray(gl, type, buffer, typedArray, drawType);
    return buffer;
  }

  function isIndices(name) {
    return name === "indices";
  }

  function getNormalizationForTypedArray(typedArray) {
    if (typedArray instanceof Int8Array)    { return true; }  // eslint-disable-line
    if (typedArray instanceof Uint8Array)   { return true; }  // eslint-disable-line
    return false;
  }

  function getArray(array) {
    return array.length ? array : array.data;
  }

  function guessNumComponentsFromName(name, length) {
    var numComponents;
    if (name.indexOf("coord") >= 0) {
      numComponents = 2;
    } else if (name.indexOf("color") >= 0) {
      numComponents = 4;
    } else {
      numComponents = 3;  // position, normals, indices ...
    }

    if (length % numComponents > 0) {
      throw "can not guess numComponents. You should specify it.";
    }

    return numComponents;
  }

  function getNumComponents(array, arrayName) {
    return array.numComponents || array.size || guessNumComponentsFromName(arrayName, getArray(array).length);
  }

  function makeTypedArray(array, name) {
    if (typedArrays.isArrayBuffer(array)) {
      return array;
    }

    if (typedArrays.isArrayBuffer(array.data)) {
      return array.data;
    }

    if (Array.isArray(array)) {
      array = {
        data: array,
      };
    }

    var Type = array.type;
    if (!Type) {
      if (name === "indices") {
        Type = Uint16Array;
      } else {
        Type = Float32Array;
      }
    }
    return new Type(array.data);
  }

  function createAttribsFromArrays(gl, arrays) {
    var attribs = {};
    Object.keys(arrays).forEach(function(arrayName) {
      if (!isIndices(arrayName)) {
        var array = arrays[arrayName];
        var attribName = array.attrib || array.name || array.attribName || arrayName;
        var typedArray = makeTypedArray(array, arrayName);
        attribs[attribName] = {
          buffer:        createBufferFromTypedArray(gl, typedArray, undefined, array.drawType),
          numComponents: getNumComponents(array, arrayName),
          type:          typedArrays.getGLTypeForTypedArray(typedArray),
          normalize:     array.normalize !== undefined ? array.normalize : getNormalizationForTypedArray(typedArray),
          stride:        array.stride || 0,
          offset:        array.offset || 0,
          drawType:      array.drawType,
        };
      }
    });
    return attribs;
  }

  var getNumElementsFromNonIndexedArrays = (function() {
    var positionKeys = ['position', 'positions', 'a_position'];

    return function getNumElementsFromNonIndexedArrays(arrays) {
      var key;
      for (var ii = 0; ii < positionKeys.length; ++ii) {
        key = positionKeys[ii];
        if (key in arrays) {
          break;
        }
      }
      if (ii === positionKeys.length) {
        key = Object.keys(arrays)[0];
      }
      var array = arrays[key];
      var length = getArray(array).length;
      var numComponents = getNumComponents(array, key);
      var numElements = length / numComponents;
      if (length % numComponents > 0) {
        throw "numComponents " + numComponents + " not correct for length " + length;
      }
      return numElements;
    };
  }());

  function createBufferInfoFromArrays(gl, arrays) {
    var bufferInfo = {
      attribs: createAttribsFromArrays(gl, arrays),
    };
    var indices = arrays.indices;
    if (indices) {
      indices = makeTypedArray(indices, "indices");
      bufferInfo.indices = createBufferFromTypedArray(gl, indices, gl.ELEMENT_ARRAY_BUFFER);
      bufferInfo.numElements = indices.length;
      bufferInfo.elementType = typedArrays.getGLTypeForTypedArray(indices);
    } else {
      bufferInfo.numElements = getNumElementsFromNonIndexedArrays(arrays);
    }

    return bufferInfo;
  }

  return {
    "createBufferInfoFromArrays": createBufferInfoFromArrays
  };
})();

var programs = (function() {
  
  var FLOAT                         = 0x1406;
  var FLOAT_VEC2                    = 0x8B50;
  var FLOAT_VEC3                    = 0x8B51;
  var FLOAT_VEC4                    = 0x8B52;
  var INT                           = 0x1404;
  var INT_VEC2                      = 0x8B53;
  var INT_VEC3                      = 0x8B54;
  var INT_VEC4                      = 0x8B55;
  var BOOL                          = 0x8B56;
  var BOOL_VEC2                     = 0x8B57;
  var BOOL_VEC3                     = 0x8B58;
  var BOOL_VEC4                     = 0x8B59;
  var FLOAT_MAT2                    = 0x8B5A;
  var FLOAT_MAT3                    = 0x8B5B;
  var FLOAT_MAT4                    = 0x8B5C;
  var SAMPLER_2D                    = 0x8B5E;
  var SAMPLER_CUBE                  = 0x8B60;
  var SAMPLER_3D                    = 0x8B5F;
  var SAMPLER_2D_SHADOW             = 0x8B62;
  var FLOAT_MAT2x3                  = 0x8B65;
  var FLOAT_MAT2x4                  = 0x8B66;
  var FLOAT_MAT3x2                  = 0x8B67;
  var FLOAT_MAT3x4                  = 0x8B68;
  var FLOAT_MAT4x2                  = 0x8B69;
  var FLOAT_MAT4x3                  = 0x8B6A;
  var SAMPLER_2D_ARRAY              = 0x8DC1;
  var SAMPLER_2D_ARRAY_SHADOW       = 0x8DC4;
  var SAMPLER_CUBE_SHADOW           = 0x8DC5;
  var UNSIGNED_INT                  = 0x1405;
  var UNSIGNED_INT_VEC2             = 0x8DC6;
  var UNSIGNED_INT_VEC3             = 0x8DC7;
  var UNSIGNED_INT_VEC4             = 0x8DC8;
  var INT_SAMPLER_2D                = 0x8DCA;
  var INT_SAMPLER_3D                = 0x8DCB;
  var INT_SAMPLER_CUBE              = 0x8DCC;
  var INT_SAMPLER_2D_ARRAY          = 0x8DCF;
  var UNSIGNED_INT_SAMPLER_2D       = 0x8DD2;
  var UNSIGNED_INT_SAMPLER_3D       = 0x8DD3;
  var UNSIGNED_INT_SAMPLER_CUBE     = 0x8DD4;
  var UNSIGNED_INT_SAMPLER_2D_ARRAY = 0x8DD7;

  var TEXTURE_2D                    = 0x0DE1;
  var TEXTURE_CUBE_MAP              = 0x8513;
  var TEXTURE_3D                    = 0x806F;
  var TEXTURE_2D_ARRAY              = 0x8C1A;

  var typeMap = {};

  /**
   * Returns the corresponding bind point for a given sampler type
   */
  function getBindPointForSamplerType(gl, type) {
    return typeMap[type].bindPoint;
  }

  // This kind of sucks! If you could compose functions as in `var fn = gl[name];`
  // this code could be a lot smaller but that is sadly really slow (T_T)

  function floatSetter(gl, location) {
    return function(v) {
      gl.uniform1f(location, v);
    };
  }

  function floatArraySetter(gl, location) {
    return function(v) {
      gl.uniform1fv(location, v);
    };
  }

  function floatVec2Setter(gl, location) {
    return function(v) {
      gl.uniform2fv(location, v);
    };
  }

  function floatVec3Setter(gl, location) {
    return function(v) {
      gl.uniform3fv(location, v);
    };
  }

  function floatVec4Setter(gl, location) {
    return function(v) {
      gl.uniform4fv(location, v);
    };
  }

  function intSetter(gl, location) {
    return function(v) {
      gl.uniform1i(location, v);
    };
  }

  function intArraySetter(gl, location) {
    return function(v) {
      gl.uniform1iv(location, v);
    };
  }

  function intVec2Setter(gl, location) {
    return function(v) {
      gl.uniform2iv(location, v);
    };
  }

  function intVec3Setter(gl, location) {
    return function(v) {
      gl.uniform3iv(location, v);
    };
  }

  function intVec4Setter(gl, location) {
    return function(v) {
      gl.uniform4iv(location, v);
    };
  }

  function uintSetter(gl, location) {
    return function(v) {
      gl.uniform1ui(location, v);
    };
  }

  function uintArraySetter(gl, location) {
    return function(v) {
      gl.uniform1uiv(location, v);
    };
  }

  function uintVec2Setter(gl, location) {
    return function(v) {
      gl.uniform2uiv(location, v);
    };
  }

  function uintVec3Setter(gl, location) {
    return function(v) {
      gl.uniform3uiv(location, v);
    };
  }

  function uintVec4Setter(gl, location) {
    return function(v) {
      gl.uniform4uiv(location, v);
    };
  }

  function floatMat2Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix2fv(location, false, v);
    };
  }

  function floatMat3Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix3fv(location, false, v);
    };
  }

  function floatMat4Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix4fv(location, false, v);
    };
  }

  function floatMat23Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix2x3fv(location, false, v);
    };
  }

  function floatMat32Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix3x2fv(location, false, v);
    };
  }

  function floatMat24Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix2x4fv(location, false, v);
    };
  }

  function floatMat42Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix4x2fv(location, false, v);
    };
  }

  function floatMat34Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix3x4fv(location, false, v);
    };
  }

  function floatMat43Setter(gl, location) {
    return function(v) {
      gl.uniformMatrix4x3fv(location, false, v);
    };
  }

  function samplerSetter(gl, type, unit, location) {
    var bindPoint = getBindPointForSamplerType(gl, type);
    return function(texture) {
      gl.uniform1i(location, unit);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(bindPoint, texture);
    };
  }

  function samplerArraySetter(gl, type, unit, location, size) {
    var bindPoint = getBindPointForSamplerType(gl, type);
    var units = new Int32Array(size);
    for (var ii = 0; ii < size; ++ii) {
      units[ii] = unit + ii;
    }

    return function(textures) {
      gl.uniform1iv(location, units);
      textures.forEach(function(texture, index) {
        gl.activeTexture(gl.TEXTURE0 + units[index]);
        gl.bindTexture(bindPoint, texture);
      });
    };
  }

  typeMap[FLOAT]                         = { Type: Float32Array, size:  4, setter: floatSetter,      arraySetter: floatArraySetter, };
  typeMap[FLOAT_VEC2]                    = { Type: Float32Array, size:  8, setter: floatVec2Setter,  };
  typeMap[FLOAT_VEC3]                    = { Type: Float32Array, size: 12, setter: floatVec3Setter,  };
  typeMap[FLOAT_VEC4]                    = { Type: Float32Array, size: 16, setter: floatVec4Setter,  };
  typeMap[INT]                           = { Type: Int32Array,   size:  4, setter: intSetter,        arraySetter: intArraySetter, };
  typeMap[INT_VEC2]                      = { Type: Int32Array,   size:  8, setter: intVec2Setter,    };
  typeMap[INT_VEC3]                      = { Type: Int32Array,   size: 12, setter: intVec3Setter,    };
  typeMap[INT_VEC4]                      = { Type: Int32Array,   size: 16, setter: intVec4Setter,    };
  typeMap[UNSIGNED_INT]                  = { Type: Uint32Array,  size:  4, setter: uintSetter,       arraySetter: uintArraySetter, };
  typeMap[UNSIGNED_INT_VEC2]             = { Type: Uint32Array,  size:  8, setter: uintVec2Setter,   };
  typeMap[UNSIGNED_INT_VEC3]             = { Type: Uint32Array,  size: 12, setter: uintVec3Setter,   };
  typeMap[UNSIGNED_INT_VEC4]             = { Type: Uint32Array,  size: 16, setter: uintVec4Setter,   };
  typeMap[BOOL]                          = { Type: Uint32Array,  size:  4, setter: intSetter,        arraySetter: intArraySetter, };
  typeMap[BOOL_VEC2]                     = { Type: Uint32Array,  size:  8, setter: intVec2Setter,    };
  typeMap[BOOL_VEC3]                     = { Type: Uint32Array,  size: 12, setter: intVec3Setter,    };
  typeMap[BOOL_VEC4]                     = { Type: Uint32Array,  size: 16, setter: intVec4Setter,    };
  typeMap[FLOAT_MAT2]                    = { Type: Float32Array, size: 16, setter: floatMat2Setter,  };
  typeMap[FLOAT_MAT3]                    = { Type: Float32Array, size: 36, setter: floatMat3Setter,  };
  typeMap[FLOAT_MAT4]                    = { Type: Float32Array, size: 64, setter: floatMat4Setter,  };
  typeMap[FLOAT_MAT2x3]                  = { Type: Float32Array, size: 24, setter: floatMat23Setter, };
  typeMap[FLOAT_MAT2x4]                  = { Type: Float32Array, size: 32, setter: floatMat24Setter, };
  typeMap[FLOAT_MAT3x2]                  = { Type: Float32Array, size: 24, setter: floatMat32Setter, };
  typeMap[FLOAT_MAT3x4]                  = { Type: Float32Array, size: 48, setter: floatMat34Setter, };
  typeMap[FLOAT_MAT4x2]                  = { Type: Float32Array, size: 32, setter: floatMat42Setter, };
  typeMap[FLOAT_MAT4x3]                  = { Type: Float32Array, size: 48, setter: floatMat43Setter, };
  typeMap[SAMPLER_2D]                    = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D,       };
  typeMap[SAMPLER_CUBE]                  = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_CUBE_MAP, };
  typeMap[SAMPLER_3D]                    = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_3D,       };
  typeMap[SAMPLER_2D_SHADOW]             = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D,       };
  typeMap[SAMPLER_2D_ARRAY]              = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D_ARRAY, };
  typeMap[SAMPLER_2D_ARRAY_SHADOW]       = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D_ARRAY, };
  typeMap[SAMPLER_CUBE_SHADOW]           = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_CUBE_MAP, };
  typeMap[INT_SAMPLER_2D]                = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D,       };
  typeMap[INT_SAMPLER_3D]                = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_3D,       };
  typeMap[INT_SAMPLER_CUBE]              = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_CUBE_MAP, };
  typeMap[INT_SAMPLER_2D_ARRAY]          = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D_ARRAY, };
  typeMap[UNSIGNED_INT_SAMPLER_2D]       = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D,       };
  typeMap[UNSIGNED_INT_SAMPLER_3D]       = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_3D,       };
  typeMap[UNSIGNED_INT_SAMPLER_CUBE]     = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_CUBE_MAP, };
  typeMap[UNSIGNED_INT_SAMPLER_2D_ARRAY] = { Type: null,         size:  0, setter: samplerSetter,    arraySetter: samplerArraySetter, bindPoint: TEXTURE_2D_ARRAY, };

  var attrTypeMap = {};
  attrTypeMap[FLOAT_MAT2] = { size:  4, count: 2, };
  attrTypeMap[FLOAT_MAT3] = { size:  9, count: 3, };
  attrTypeMap[FLOAT_MAT4] = { size: 16, count: 4, };

  // make sure we don't see a global gl
  var gl = undefined;  // eslint-disable-line

  function addLineNumbers(src, lineOffset) {
    lineOffset = lineOffset || 0;
    ++lineOffset;

    return src.split("\n").map(function(line, ndx) {
      return (ndx + lineOffset) + ": " + line;
    }).join("\n");
  }

  var spaceRE = /^[ \t]*\n/;

  function loadShader(gl, shaderSource, shaderType, opt_errorCallback) {
    var errFn = opt_errorCallback || error;
    var shader = gl.createShader(shaderType);

    var lineOffset = 0;
    if (spaceRE.test(shaderSource)) {
      lineOffset = 1;
      shaderSource = shaderSource.replace(spaceRE, '');
    }

    // Load the shader source
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check the compile status
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      // Something went wrong during compilation; get the error
      var lastError = gl.getShaderInfoLog(shader);
      errFn(addLineNumbers(shaderSource, lineOffset) + "\n*** Error compiling shader: " + lastError);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  function createProgram(
      gl, shaders, opt_attribs, opt_locations, opt_errorCallback) {
    if (typeof opt_locations === 'function') {
      opt_errorCallback = opt_locations;
      opt_locations = undefined;
    }
    if (typeof opt_attribs === 'function') {
      opt_errorCallback = opt_attribs;
      opt_attribs = undefined;
    }
    var errFn = opt_errorCallback || error;
    var program = gl.createProgram();
    shaders.forEach(function(shader) {
      gl.attachShader(program, shader);
    });
    if (opt_attribs) {
      opt_attribs.forEach(function(attrib,  ndx) {
        gl.bindAttribLocation(
            program,
            opt_locations ? opt_locations[ndx] : ndx,
            attrib);
      });
    }
    gl.linkProgram(program);

    // Check the link status
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        // something went wrong with the link
        var lastError = gl.getProgramInfoLog(program);
        errFn("Error in program linking:" + lastError);

        gl.deleteProgram(program);
        return null;
    }
    return program;
  }

  var defaultShaderType = [
    "VERTEX_SHADER",
    "FRAGMENT_SHADER",
  ];

  function createProgramFromSources(
      gl, shaderSources, opt_attribs, opt_locations, opt_errorCallback) {
    var shaders = [];
    for (var ii = 0; ii < shaderSources.length; ++ii) {
      var shader = loadShader(
          gl, shaderSources[ii], gl[defaultShaderType[ii]], opt_errorCallback);
      if (!shader) {
        return null;
      }
      shaders.push(shader);
    }
    return createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback);
  }

  function createUniformSetters(gl, program) {
    var textureUnit = 0;

    function createUniformSetter(program, uniformInfo) {
      var location = gl.getUniformLocation(program, uniformInfo.name);
      var isArray = (uniformInfo.size > 1 && uniformInfo.name.substr(-3) === "[0]");
      var type = uniformInfo.type;
      var typeInfo = typeMap[type];
      if (!typeInfo) {
        throw ("unknown type: 0x" + type.toString(16)); // we should never get here.
      }
      if (typeInfo.bindPoint) {
        // it's a sampler
        var unit = textureUnit;
        textureUnit += uniformInfo.size;

        if (isArray) {
          return typeInfo.arraySetter(gl, type, unit, location, uniformInfo.size);
        } else {
          return typeInfo.setter(gl, type, unit, location, uniformInfo.size);
        }
      } else {
        if (typeInfo.arraySetter && isArray) {
          return typeInfo.arraySetter(gl, location);
        } else {
          return typeInfo.setter(gl, location);
        }
      }
    }

    var uniformSetters = { };
    var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (var ii = 0; ii < numUniforms; ++ii) {
      var uniformInfo = gl.getActiveUniform(program, ii);
      if (!uniformInfo) {
        break;
      }
      var name = uniformInfo.name;
      // remove the array suffix.
      if (name.substr(-3) === "[0]") {
        name = name.substr(0, name.length - 3);
      }
      var setter = createUniformSetter(program, uniformInfo);
      uniformSetters[name] = setter;
    }
    return uniformSetters;
  }

  function createUniformBlockSpecFromProgram(gl, program) {
    var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    var uniformData = [];
    var uniformIndices = [];

    for (var ii = 0; ii < numUniforms; ++ii) {
      uniformIndices.push(ii);
      uniformData.push({});
      var uniformInfo = gl.getActiveUniform(program, ii);
      if (!uniformInfo) {
        break;
      }
      uniformData[ii].name = uniformInfo.name;
    }

    [
      [ "UNIFORM_TYPE", "type" ],
      [ "UNIFORM_SIZE", "size" ],  // num elements
      [ "UNIFORM_BLOCK_INDEX", "blockNdx" ],
      [ "UNIFORM_OFFSET", "offset", ],
    ].forEach(function(pair) {
      var pname = pair[0];
      var key = pair[1];
      gl.getActiveUniforms(program, uniformIndices, gl[pname]).forEach(function(value, ndx) {
        uniformData[ndx][key] = value;
      });
    });

    var blockSpecs = {};

    var numUniformBlocks = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);
    for (ii = 0; ii < numUniformBlocks; ++ii) {
      var name = gl.getActiveUniformBlockName(program, ii);
      var blockSpec = {
        index: ii,
        usedByVertexShader: gl.getActiveUniformBlockParameter(program, ii, gl.UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER),
        usedByFragmentShader: gl.getActiveUniformBlockParameter(program, ii, gl.UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER),
        size: gl.getActiveUniformBlockParameter(program, ii, gl.UNIFORM_BLOCK_DATA_SIZE),
        uniformIndices: gl.getActiveUniformBlockParameter(program, ii, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES),
      };
      blockSpec.used = blockSpec.usedByVertexSahder || blockSpec.usedByFragmentShader;
      blockSpecs[name] = blockSpec;
    }

    return {
      blockSpecs: blockSpecs,
      uniformData: uniformData,
    };
  }

  var arraySuffixRE = /\[\d+\]\.$/;  // better way to check?

  function setUniforms(setters, values) {  // eslint-disable-line
    var actualSetters = setters.uniformSetters || setters;
    var numArgs = arguments.length;
    for (var andx = 1; andx < numArgs; ++andx) {
      var vals = arguments[andx];
      if (Array.isArray(vals)) {
        var numValues = vals.length;
        for (var ii = 0; ii < numValues; ++ii) {
          setUniforms(actualSetters, vals[ii]);
        }
      } else {
        for (var name in vals) {
          var setter = actualSetters[name];
          if (setter) {
            setter(vals[name]);
          }
        }
      }
    }
  }

  function createAttributeSetters(gl, program) {
    var attribSetters = {
    };

    function createAttribSetter(index) {
      return function(b) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
        gl.enableVertexAttribArray(index);
        gl.vertexAttribPointer(
            index, b.numComponents || b.size, b.type || gl.FLOAT, b.normalize || false, b.stride || 0, b.offset || 0);
      };
    }

    function createMatAttribSetter(index, typeInfo) {
      var defaultSize = typeInfo.size;
      var count = typeInfo.count;

      return function(b) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
        var numComponents = b.size || b.numComponents || defaultSize;
        var size = numComponents / count;
        var type = b.type || gl.FLOAT;
        var typeInfo = typeMap[type];
        var stride = typeInfo.size * numComponents;
        var normalize = b.normalize || false;
        var offset = b.offset || 0;
        var rowOffset = stride / count;
        for (var i = 0; i < count; ++i) {
          gl.enableVertexAttribArray(index + i);
          gl.vertexAttribPointer(
              index + i, size, type, normalize, stride, offset + rowOffset * i);
        }
      };
    }

    var numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (var ii = 0; ii < numAttribs; ++ii) {
      var attribInfo = gl.getActiveAttrib(program, ii);
      if (!attribInfo) {
        break;
      }
      var index = gl.getAttribLocation(program, attribInfo.name);
      var typeInfo = attrTypeMap[attribInfo.type];
      if (typeInfo) {
        attribSetters[attribInfo.name] = createMatAttribSetter(index, typeInfo);
      } else {
        attribSetters[attribInfo.name] = createAttribSetter(index);
      }
    }

    return attribSetters;
  }

  function setAttributes(setters, buffers) {
    for (var name in buffers) {
      var setter = setters[name];
      if (setter) {
        setter(buffers[name]);
      }
    }
  }

  function setBuffersAndAttributes(gl, programInfo, buffers) {
    if (buffers.vertexArrayObject) {
      gl.bindVertexArray(buffers.vertexArrayObject);
    } else {
      setAttributes(programInfo.attribSetters || programInfo, buffers.attribs);
      if (buffers.indices) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
      }
    }
  }

  function createProgramInfoFromProgram(gl, program) {
    var uniformSetters = createUniformSetters(gl, program);
    var attribSetters = createAttributeSetters(gl, program);
    var programInfo = {
      program: program,
      uniformSetters: uniformSetters,
      attribSetters: attribSetters,
    };
    programInfo.uniformBlockSpec = createUniformBlockSpecFromProgram(gl, program);
    return programInfo;
  }

  function createProgramInfo(
      gl, shaderSources, opt_attribs, opt_locations, opt_errorCallback) {
    if (typeof opt_locations === 'function') {
      opt_errorCallback = opt_locations;
      opt_locations = undefined;
    }
    if (typeof opt_attribs === 'function') {
      opt_errorCallback = opt_attribs;
      opt_attribs = undefined;
    }
    var errFn = opt_errorCallback || error;
    var good = true;
    shaderSources = shaderSources.map(function(source) {
      // Lets assume if there is no \n it's an id
      if (source.indexOf("\n") < 0) {
        var script = document.getElementById(source);
        if (!script) {
          errFn("no element with id: " + source);
          good = false;
        } else {
          source = script.text;
        }
      }
      return source;
    });
    if (!good) {
      return null;
    }
    var program = createProgramFromSources(gl, shaderSources, opt_attribs, opt_locations, opt_errorCallback);
    if (!program) {
      return null;
    }
    return createProgramInfoFromProgram(gl, program);
  }

  return {
    "createProgramInfo": createProgramInfo,
    "setBuffersAndAttributes": setBuffersAndAttributes,
    "setUniforms": setUniforms
  };
})();

var twgl = (function() {

  var api = {};

  function copyPublicProperties(src, dst) {
    Object.keys(src).forEach(function(key) {
      dst[key] = src[key];
    });
    return dst;
  }

  var apis = {
    attributes: attributes,
    programs: programs,
    typedArrays: typedArrays,
  };
  Object.keys(apis).forEach(function(name) {
    var srcApi = apis[name];
    copyPublicProperties(srcApi, api);
    api[name] = copyPublicProperties(srcApi, {});
  });

  return api;
})();

var v3 = twgl.v3 = (function() {
  
  var VecType = Float32Array;

  function setDefaultType(ctor) {
    var oldType = VecType;
    VecType = ctor;
    return oldType;
  }

  function create(x, y, z) {
    var dst = new VecType(3);
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

    var lenSq = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
    var len = Math.sqrt(lenSq);
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
    "add": add,
    "copy": copy,
    "create": create,
    "cross": cross,
    "divide": divide,
    "divScalar": divScalar,
    "dot": dot,
    "lerp": lerp,
    "length": length,
    "lengthSq": lengthSq,
    "mulScalar": mulScalar,
    "multiply": multiply,
    "negate": negate,
    "normalize": normalize,
    "setDefaultType": setDefaultType,
    "subtract": subtract,
  };

})();

twgl.m4 = (function() {
  
  var MatType = Float32Array;

  var tempV3a = v3.create();
  var tempV3b = v3.create();
  var tempV3c = v3.create();

  function setDefaultType(ctor) {
    var oldType = MatType;
    MatType = ctor;
    return oldType;
  }

  function negate(m, dst) {
    dst = dst || new MatType(16);

    dst[ 0] = -m[ 0];
    dst[ 1] = -m[ 1];
    dst[ 2] = -m[ 2];
    dst[ 3] = -m[ 3];
    dst[ 4] = -m[ 4];
    dst[ 5] = -m[ 5];
    dst[ 6] = -m[ 6];
    dst[ 7] = -m[ 7];
    dst[ 8] = -m[ 8];
    dst[ 9] = -m[ 9];
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

    dst[ 0] = m[ 0];
    dst[ 1] = m[ 1];
    dst[ 2] = m[ 2];
    dst[ 3] = m[ 3];
    dst[ 4] = m[ 4];
    dst[ 5] = m[ 5];
    dst[ 6] = m[ 6];
    dst[ 7] = m[ 7];
    dst[ 8] = m[ 8];
    dst[ 9] = m[ 9];
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

    dst[ 0] = 1;
    dst[ 1] = 0;
    dst[ 2] = 0;
    dst[ 3] = 0;
    dst[ 4] = 0;
    dst[ 5] = 1;
    dst[ 6] = 0;
    dst[ 7] = 0;
    dst[ 8] = 0;
    dst[ 9] = 0;
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
      var t;

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

    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];

    dst[ 0] = m00;
    dst[ 1] = m10;
    dst[ 2] = m20;
    dst[ 3] = m30;
    dst[ 4] = m01;
    dst[ 5] = m11;
    dst[ 6] = m21;
    dst[ 7] = m31;
    dst[ 8] = m02;
    dst[ 9] = m12;
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

    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
        (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
        (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
        (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
        (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    dst[ 0] = d * t0;
    dst[ 1] = d * t1;
    dst[ 2] = d * t2;
    dst[ 3] = d * t3;
    dst[ 4] = d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
            (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30));
    dst[ 5] = d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
            (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30));
    dst[ 6] = d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
            (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30));
    dst[ 7] = d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
            (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20));
    dst[ 8] = d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
            (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33));
    dst[ 9] = d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
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

    var a00 = a[0];
    var a01 = a[1];
    var a02 = a[2];
    var a03 = a[3];
    var a10 = a[ 4 + 0];
    var a11 = a[ 4 + 1];
    var a12 = a[ 4 + 2];
    var a13 = a[ 4 + 3];
    var a20 = a[ 8 + 0];
    var a21 = a[ 8 + 1];
    var a22 = a[ 8 + 2];
    var a23 = a[ 8 + 3];
    var a30 = a[12 + 0];
    var a31 = a[12 + 1];
    var a32 = a[12 + 2];
    var a33 = a[12 + 3];
    var b00 = b[0];
    var b01 = b[1];
    var b02 = b[2];
    var b03 = b[3];
    var b10 = b[ 4 + 0];
    var b11 = b[ 4 + 1];
    var b12 = b[ 4 + 2];
    var b13 = b[ 4 + 3];
    var b20 = b[ 8 + 0];
    var b21 = b[ 8 + 1];
    var b22 = b[ 8 + 2];
    var b23 = b[ 8 + 3];
    var b30 = b[12 + 0];
    var b31 = b[12 + 1];
    var b32 = b[12 + 2];
    var b33 = b[12 + 3];

    dst[ 0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    dst[ 1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    dst[ 2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    dst[ 3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    dst[ 4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    dst[ 5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    dst[ 6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    dst[ 7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    dst[ 8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    dst[ 9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
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
      dst[ 0] = a[ 0];
      dst[ 1] = a[ 1];
      dst[ 2] = a[ 2];
      dst[ 3] = a[ 3];
      dst[ 4] = a[ 4];
      dst[ 5] = a[ 5];
      dst[ 6] = a[ 6];
      dst[ 7] = a[ 7];
      dst[ 8] = a[ 8];
      dst[ 9] = a[ 9];
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
    var off = axis * 4;
    dst[0] = m[off + 0];
    dst[1] = m[off + 1];
    dst[2] = m[off + 2];
    return dst;
  }

  function setAxis(a, v, axis, dst) {
    if (dst !== a) {
      dst = copy(a, dst);
    }
    var off = axis * 4;
    dst[off + 0] = v[0];
    dst[off + 1] = v[1];
    dst[off + 2] = v[2];
    return dst;
  }

  function perspective(fieldOfViewYInRadians, aspect, zNear, zFar, dst) {
    dst = dst || new MatType(16);

    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
    var rangeInv = 1.0 / (zNear - zFar);

    dst[0]  = f / aspect;
    dst[1]  = 0;
    dst[2]  = 0;
    dst[3]  = 0;

    dst[4]  = 0;
    dst[5]  = f;
    dst[6]  = 0;
    dst[7]  = 0;

    dst[8]  = 0;
    dst[9]  = 0;
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

    dst[0]  = 2 / (right - left);
    dst[1]  = 0;
    dst[2]  = 0;
    dst[3]  = 0;

    dst[4]  = 0;
    dst[5]  = 2 / (top - bottom);
    dst[6]  = 0;
    dst[7]  = 0;

    dst[8]  = 0;
    dst[9]  = 0;
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

    var dx = (right - left);
    var dy = (top - bottom);
    var dz = (near - far);

    dst[ 0] = 2 * near / dx;
    dst[ 1] = 0;
    dst[ 2] = 0;
    dst[ 3] = 0;
    dst[ 4] = 0;
    dst[ 5] = 2 * near / dy;
    dst[ 6] = 0;
    dst[ 7] = 0;
    dst[ 8] = (left + right) / dx;
    dst[ 9] = (top + bottom) / dy;
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

    var xAxis = tempV3a;
    var yAxis = tempV3b;
    var zAxis = tempV3c;

    v3.normalize(
        v3.subtract(eye, target, zAxis), zAxis);
    v3.normalize(v3.cross(up, zAxis, xAxis), xAxis);
    v3.normalize(v3.cross(zAxis, xAxis, yAxis), yAxis);

    dst[ 0] = xAxis[0];
    dst[ 1] = xAxis[1];
    dst[ 2] = xAxis[2];
    dst[ 3] = 0;
    dst[ 4] = yAxis[0];
    dst[ 5] = yAxis[1];
    dst[ 6] = yAxis[2];
    dst[ 7] = 0;
    dst[ 8] = zAxis[0];
    dst[ 9] = zAxis[1];
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

    dst[ 0] = 1;
    dst[ 1] = 0;
    dst[ 2] = 0;
    dst[ 3] = 0;
    dst[ 4] = 0;
    dst[ 5] = 1;
    dst[ 6] = 0;
    dst[ 7] = 0;
    dst[ 8] = 0;
    dst[ 9] = 0;
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

    var v0 = v[0];
    var v1 = v[1];
    var v2 = v[2];
    var m00 = m[0];
    var m01 = m[1];
    var m02 = m[2];
    var m03 = m[3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];

    if (m !== dst) {
      dst[ 0] = m00;
      dst[ 1] = m01;
      dst[ 2] = m02;
      dst[ 3] = m03;
      dst[ 4] = m10;
      dst[ 5] = m11;
      dst[ 6] = m12;
      dst[ 7] = m13;
      dst[ 8] = m20;
      dst[ 9] = m21;
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

    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    dst[ 0] = 1;
    dst[ 1] = 0;
    dst[ 2] = 0;
    dst[ 3] = 0;
    dst[ 4] = 0;
    dst[ 5] = c;
    dst[ 6] = s;
    dst[ 7] = 0;
    dst[ 8] = 0;
    dst[ 9] = -s;
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

    var m10 = m[4];
    var m11 = m[5];
    var m12 = m[6];
    var m13 = m[7];
    var m20 = m[8];
    var m21 = m[9];
    var m22 = m[10];
    var m23 = m[11];
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    dst[4]  = c * m10 + s * m20;
    dst[5]  = c * m11 + s * m21;
    dst[6]  = c * m12 + s * m22;
    dst[7]  = c * m13 + s * m23;
    dst[8]  = c * m20 - s * m10;
    dst[9]  = c * m21 - s * m11;
    dst[10] = c * m22 - s * m12;
    dst[11] = c * m23 - s * m13;

    if (m !== dst) {
      dst[ 0] = m[ 0];
      dst[ 1] = m[ 1];
      dst[ 2] = m[ 2];
      dst[ 3] = m[ 3];
      dst[12] = m[12];
      dst[13] = m[13];
      dst[14] = m[14];
      dst[15] = m[15];
    }

    return dst;
  }

  function rotationY(angleInRadians, dst) {
    dst = dst || new MatType(16);

    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    dst[ 0] = c;
    dst[ 1] = 0;
    dst[ 2] = -s;
    dst[ 3] = 0;
    dst[ 4] = 0;
    dst[ 5] = 1;
    dst[ 6] = 0;
    dst[ 7] = 0;
    dst[ 8] = s;
    dst[ 9] = 0;
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

    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    dst[ 0] = c * m00 - s * m20;
    dst[ 1] = c * m01 - s * m21;
    dst[ 2] = c * m02 - s * m22;
    dst[ 3] = c * m03 - s * m23;
    dst[ 8] = c * m20 + s * m00;
    dst[ 9] = c * m21 + s * m01;
    dst[10] = c * m22 + s * m02;
    dst[11] = c * m23 + s * m03;

    if (m !== dst) {
      dst[ 4] = m[ 4];
      dst[ 5] = m[ 5];
      dst[ 6] = m[ 6];
      dst[ 7] = m[ 7];
      dst[12] = m[12];
      dst[13] = m[13];
      dst[14] = m[14];
      dst[15] = m[15];
    }

    return dst;
  }

  function rotationZ(angleInRadians, dst) {
    dst = dst || new MatType(16);

    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    dst[ 0] = c;
    dst[ 1] = s;
    dst[ 2] = 0;
    dst[ 3] = 0;
    dst[ 4] = -s;
    dst[ 5] = c;
    dst[ 6] = 0;
    dst[ 7] = 0;
    dst[ 8] = 0;
    dst[ 9] = 0;
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

    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    dst[ 0] = c * m00 + s * m10;
    dst[ 1] = c * m01 + s * m11;
    dst[ 2] = c * m02 + s * m12;
    dst[ 3] = c * m03 + s * m13;
    dst[ 4] = c * m10 - s * m00;
    dst[ 5] = c * m11 - s * m01;
    dst[ 6] = c * m12 - s * m02;
    dst[ 7] = c * m13 - s * m03;

    if (m !== dst) {
      dst[ 8] = m[ 8];
      dst[ 9] = m[ 9];
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

    var x = axis[0];
    var y = axis[1];
    var z = axis[2];
    var n = Math.sqrt(x * x + y * y + z * z);
    x /= n;
    y /= n;
    z /= n;
    var xx = x * x;
    var yy = y * y;
    var zz = z * z;
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    var oneMinusCosine = 1 - c;

    dst[ 0] = xx + (1 - xx) * c;
    dst[ 1] = x * y * oneMinusCosine + z * s;
    dst[ 2] = x * z * oneMinusCosine - y * s;
    dst[ 3] = 0;
    dst[ 4] = x * y * oneMinusCosine - z * s;
    dst[ 5] = yy + (1 - yy) * c;
    dst[ 6] = y * z * oneMinusCosine + x * s;
    dst[ 7] = 0;
    dst[ 8] = x * z * oneMinusCosine + y * s;
    dst[ 9] = y * z * oneMinusCosine - x * s;
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

    var x = axis[0];
    var y = axis[1];
    var z = axis[2];
    var n = Math.sqrt(x * x + y * y + z * z);
    x /= n;
    y /= n;
    z /= n;
    var xx = x * x;
    var yy = y * y;
    var zz = z * z;
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    var oneMinusCosine = 1 - c;

    var r00 = xx + (1 - xx) * c;
    var r01 = x * y * oneMinusCosine + z * s;
    var r02 = x * z * oneMinusCosine - y * s;
    var r10 = x * y * oneMinusCosine - z * s;
    var r11 = yy + (1 - yy) * c;
    var r12 = y * z * oneMinusCosine + x * s;
    var r20 = x * z * oneMinusCosine + y * s;
    var r21 = y * z * oneMinusCosine - x * s;
    var r22 = zz + (1 - zz) * c;

    var m00 = m[0];
    var m01 = m[1];
    var m02 = m[2];
    var m03 = m[3];
    var m10 = m[4];
    var m11 = m[5];
    var m12 = m[6];
    var m13 = m[7];
    var m20 = m[8];
    var m21 = m[9];
    var m22 = m[10];
    var m23 = m[11];

    dst[ 0] = r00 * m00 + r01 * m10 + r02 * m20;
    dst[ 1] = r00 * m01 + r01 * m11 + r02 * m21;
    dst[ 2] = r00 * m02 + r01 * m12 + r02 * m22;
    dst[ 3] = r00 * m03 + r01 * m13 + r02 * m23;
    dst[ 4] = r10 * m00 + r11 * m10 + r12 * m20;
    dst[ 5] = r10 * m01 + r11 * m11 + r12 * m21;
    dst[ 6] = r10 * m02 + r11 * m12 + r12 * m22;
    dst[ 7] = r10 * m03 + r11 * m13 + r12 * m23;
    dst[ 8] = r20 * m00 + r21 * m10 + r22 * m20;
    dst[ 9] = r20 * m01 + r21 * m11 + r22 * m21;
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

    dst[ 0] = v[0];
    dst[ 1] = 0;
    dst[ 2] = 0;
    dst[ 3] = 0;
    dst[ 4] = 0;
    dst[ 5] = v[1];
    dst[ 6] = 0;
    dst[ 7] = 0;
    dst[ 8] = 0;
    dst[ 9] = 0;
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

    var v0 = v[0];
    var v1 = v[1];
    var v2 = v[2];

    dst[ 0] = v0 * m[0 * 4 + 0];
    dst[ 1] = v0 * m[0 * 4 + 1];
    dst[ 2] = v0 * m[0 * 4 + 2];
    dst[ 3] = v0 * m[0 * 4 + 3];
    dst[ 4] = v1 * m[1 * 4 + 0];
    dst[ 5] = v1 * m[1 * 4 + 1];
    dst[ 6] = v1 * m[1 * 4 + 2];
    dst[ 7] = v1 * m[1 * 4 + 3];
    dst[ 8] = v2 * m[2 * 4 + 0];
    dst[ 9] = v2 * m[2 * 4 + 1];
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
    var v0 = v[0];
    var v1 = v[1];
    var v2 = v[2];
    var d = v0 * m[0 * 4 + 3] + v1 * m[1 * 4 + 3] + v2 * m[2 * 4 + 3] + m[3 * 4 + 3];

    dst[0] = (v0 * m[0 * 4 + 0] + v1 * m[1 * 4 + 0] + v2 * m[2 * 4 + 0] + m[3 * 4 + 0]) / d;
    dst[1] = (v0 * m[0 * 4 + 1] + v1 * m[1 * 4 + 1] + v2 * m[2 * 4 + 1] + m[3 * 4 + 1]) / d;
    dst[2] = (v0 * m[0 * 4 + 2] + v1 * m[1 * 4 + 2] + v2 * m[2 * 4 + 2] + m[3 * 4 + 2]) / d;

    return dst;
  }

  function transformDirection(m, v, dst) {
    dst = dst || v3.create();

    var v0 = v[0];
    var v1 = v[1];
    var v2 = v[2];

    dst[0] = v0 * m[0 * 4 + 0] + v1 * m[1 * 4 + 0] + v2 * m[2 * 4 + 0];
    dst[1] = v0 * m[0 * 4 + 1] + v1 * m[1 * 4 + 1] + v2 * m[2 * 4 + 1];
    dst[2] = v0 * m[0 * 4 + 2] + v1 * m[1 * 4 + 2] + v2 * m[2 * 4 + 2];

    return dst;
  }

  function transformNormal(m, v, dst) {
    dst = dst || v3.create();
    var mi = inverse(m);
    var v0 = v[0];
    var v1 = v[1];
    var v2 = v[2];

    dst[0] = v0 * mi[0 * 4 + 0] + v1 * mi[0 * 4 + 1] + v2 * mi[0 * 4 + 2];
    dst[1] = v0 * mi[1 * 4 + 0] + v1 * mi[1 * 4 + 1] + v2 * mi[1 * 4 + 2];
    dst[2] = v0 * mi[2 * 4 + 0] + v1 * mi[2 * 4 + 1] + v2 * mi[2 * 4 + 2];

    return dst;
  }

  return {
    "axisRotate": axisRotate,
    "axisRotation": axisRotation,
    "create": identity,
    "copy": copy,
    "frustum": frustum,
    "getAxis": getAxis,
    "getTranslation": getTranslation,
    "identity": identity,
    "inverse": inverse,
    "lookAt": lookAt,
    "multiply": multiply,
    "negate": negate,
    "ortho": ortho,
    "perspective": perspective,
    "rotateX": rotateX,
    "rotateY": rotateY,
    "rotateZ": rotateZ,
    "rotateAxis": axisRotate,
    "rotationX": rotationX,
    "rotationY": rotationY,
    "rotationZ": rotationZ,
    "scale": scale,
    "scaling": scaling,
    "setAxis": setAxis,
    "setDefaultType": setDefaultType,
    "setTranslation": setTranslation,
    "transformDirection": transformDirection,
    "transformNormal": transformNormal,
    "transformPoint": transformPoint,
    "translate": translate,
    "translation": translation,
    "transpose": transpose,
  };
})();

export default twgl;
