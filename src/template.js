/* Web Lic - Copyright (C) 2018 Remi Gagne */

'use strict';

// All margins are decimal percentages of max(pageWidth, pageHeight)
const template = {
	page: {
		width: 900,
		height: 700,
		sizePreset: null,  // {format, orientation}, formats defined in page_template.vue: pageSizeLookups
		innerMargin: 0.025,
		numberLabel: {
			font: 'bold 18pt Helvetica',
			color: '#000000',
			position: 'right'  // One of "right', "left", "even-right", "even-left"
		},
		fill: {
			color: '#ffffff',
			gradient: '',
			image: ''
		},
		border: {
			width: 0,
			color: '#000000',
			cornerRadius: 0
		}
	},
	step: {
		innerMargin: 0.02,
		csi: {
			scale: 1,
			rotation: {x: 0, y: 0, z: 0},
			displacementArrow: {
				fill: {
					color: '#ff0000'
				},
				border: {
					width: 0,
					color: null
				}
			}
		},
		numberLabel: {
			font: 'bold 22pt Helvetica',
			color: '#000000'
		}
	},
	submodelImage: {
		innerMargin: 0.017,
		maxHeight: 0.3,  // as a percentage of page height
		csi: {
			scale: 1,
			rotation: {x: 0, y: 0, z: 0}
		},
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: '#000000',
			cornerRadius: 10
		},
		quantityLabel: {
			font: 'bold 18pt Helvetica',
			color: '#000000'
		}
	},
	pli: {
		innerMargin: 0.017,
		includeSubmodels: true,
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: '#000000',
			cornerRadius: 10
		}
	},
	pliItem: {
		scale: 1,
		rotation: {x: 0, y: 0, z: 0},
		quantityLabel: {
			font: 'bold 10pt Helvetica',
			color: '#000000'
		}
	},
	callout: {
		innerMargin: 0.015,
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: '#000000',
			cornerRadius: 10
		},
		arrow: {
			border: {
				width: 2,
				color: '#000000'
			}
		},
		step: {
			innerMargin: 0.02,
			numberLabel: {
				font: 'bold 18pt Helvetica',
				color: '#000000'
			}
		}
	},
	divider: {
		border: {
			width: 2,
			color: '#000000'
		}
	},
	rotateIcon: {
		size: 40,
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: '#000000',
			cornerRadius: 10
		},
		arrow: {
			border: {
				width: 3,
				color: '#000000'
			}
		}
	}
};

const part1 = {
	colorCode: 1, filename: '3001.dat',
	matrix: [0, 0, 0, 0, 0, -1, 0, 1, 0, 1, 0, 0]
};
const part2 = {
	colorCode: 4, filename: '3003.dat',
	matrix: [0, -24, 20, 1, 0, 0, 0, 1, 0, 0, 0, 1]
};
const model = {
	filename: 'templateModel.ldr',
	name: 'templateModel.ldr',
	parts: [part1, part2],
	primitives: []
};

template.modelData = {
	model, part1, part2
};

export default template;
