'use strict';

const template = {
	page: {
		width: 900,
		height: 700,
		numberLabel: {
			font: 'bold 20pt Helvetica',
			color: 'black',
			position: 'right'  // One of "right', "left", "even-right", "even-left"
		},
		dividers: {
			width: 2,
			color: 'black'
		},
		border: {
			width: 0,
			color: null,
			cornerRadius: 0
		}
	},
	step: {
		numberLabel: {
			font: 'bold 20pt Helvetica',
			color: 'black'
		}
	},
	submodelImage: {
		csi: {
			scale: 1,
			rotation: null
		},
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: 'black',
			cornerRadius: 10
		},
		quantityLabel: {
			font: 'bold 16pt Helvetica',
			color: 'black'
		}
	},
	csi: {
		scale: 1,
		rotation: null
	},
	pli: {
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: 'black',
			cornerRadius: 10
		}
	},
	pliItem: {
		csi: {
			scale: 1,
			rotation: null
		},
		quantityLabel: {
			font: 'bold 10pt Helvetica',
			color: 'black'
		}
	},
	callout: {
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: 'black',
			cornerRadius: 10
		},
		arrow: {
			width: 2,
			color: 'black'
		}
	},
	rotateIcon: {
		border: {
			width: 2,
			color: 'black',
			cornerRadius: 10
		},
		arrow: {
			width: 3,
			color: 'black'
		}
	}
};

module.exports = template;
