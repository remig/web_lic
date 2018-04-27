'use strict';

// All margins are decimal percentages of max(pageWidth, pageHeight)
const template = {
	page: {
		width: 900,
		height: 700,
		innerMargin: 0.025,
		numberLabel: {
			font: 'bold 18pt Helvetica',
			color: 'black',
			position: 'right'  // One of "right', "left", "even-right", "even-left"
		},
		divider: {
			border: {
				width: 2,
				color: 'black'
			}
		},
		fill: {
			color: 'white'
		},
		border: {
			width: 0,
			color: 'black',
			cornerRadius: 0
		}
	},
	step: {
		innerMargin: 0.02,
		numberLabel: {
			font: 'bold 22pt Helvetica',
			color: 'black'
		}
	},
	submodelImage: {
		innerMargin: 0.017,
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
			font: 'bold 18pt Helvetica',
			color: 'black'
		}
	},
	csi: {
		scale: 1,
		rotation: null
	},
	pli: {
		innerMargin: 0.017,
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
		innerMargin: 0.012,
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: 'black',
			cornerRadius: 10
		},
		arrow: {
			border: {
				width: 2,
				color: 'black'
			}
		},
		step: {
			numberLabel: {
				font: 'bold 18pt Helvetica',
				color: 'black'
			}
		}
	},
	rotateIcon: {
		size: 40,
		fill: {
			color: null
		},
		border: {
			width: 2,
			color: 'black',
			cornerRadius: 10
		},
		arrow: {
			border: {
				width: 3,
				color: 'black'
			}
		}
	}
};

module.exports = template;
