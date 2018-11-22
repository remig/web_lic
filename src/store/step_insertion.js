/* Web Lic - Copyright (C) 2018 Remi Gagne */

'use strict';

import _ from '../util';

// Given a model with no steps, return an array of arays of parts that make up each step
// returns the same step array structure as LDParse generates:
// [{parts: [0, 1, 2]}, {parts: [3]}, {parts: [4, 5]}]
// config: {allowPartReorder, maxPartsPerStep}
export default function(model, config) {
	const partsPerStep = config.partsPerStep || 10;
	const partIndices = model.parts.map((el, idx) => idx);
	return _.chunk(partIndices, partsPerStep)
		.map(el => ({parts: el}));
}
