/* global Vue: false, $: false */
'use strict';

import _ from './util';

// TODO: set focus to correct UI widget when showing each dialog
Vue.component('baseDialog', {
	template: '#baseDialogTemplate',
	props: {
		title: '',
		okButtonText: {type: String, default: 'Ok'},
		cancelButtonText: {type: String, default: 'Cancel'}
	},
	data: function() {
		return {
			visible: false,
			position: {x: 0, y: 0}
		};
	},
	methods: {
		show() {
			$(`#${this.$el.id}`).modal({backdrop: false});
		},
		ok() {
			this.$emit('ok');
		},
		cancel() {
			this.$emit('cancel');
		}
	}
});

// Pass along 'ok' and 'cancel' events from child (baseDialog) to this dialog,
// and pass along position and show() from this dialog to child.
const baseDialogPropagator = {
	mounted() {
		this.$children[0].$on('ok', () => this.$emit('ok', {...this.$data}));
		this.$children[0].$on('cancel', () => this.$emit('cancel', {...this.$data}));
	},
	methods: {
		show(position) {
			this.$children[0].position = position;
			this.$children[0].show();
		}
	}
};

const dialogs = {
	pageSize: {
		maintainAspectRatio: true,
		width: 900,
		height: 700
	},
	partDisplacement: {
		partDistance: 60,
		arrowOffset: 0,
		arrowLength: 0,
		arrowRotation: 0
	},
	pageRowColLayout: {
		rows: 2,
		cols: 2,
		direction: 'vertical'
	},
	rotateCSI: {
		title: '',
		rotation: {
			x: 0, y: 0, z: 0
		},
		showRotateIconCheckbox: true,
		addRotateIcon: true
	},
	copyRotation: {
		nextXSteps: 0
	},
	string: {
		title: '',
		labelText: '',
		string: ''
	},
	color: {
		color: ''
	},
	border: {
		width: 0,
		color: '',
		cornerRadius: 0
	}
};

_.forEach(dialogs, (name, data) => {
	Vue.component(name + 'Dialog', {
		template: `#${name}Template`,
		mixins: [baseDialogPropagator],
		data: function() {
			return data;
		},
		methods: {
			updateValues() {
				this.$emit('update', {...this.$data});
			}
		}
	});
});

Vue.component('fontNameDialog', {
	template: '#fontNameTemplate',
	mixins: [baseDialogPropagator],
	data: function() {
		return {
			font: '',
			fontName: ''
		};
	},
	methods: {
		updateValues() {
			const fontParts = _.fontToFontParts(this.font);
			fontParts.fontFamily = this.fontName;
			this.font = _.fontPartsToFont(fontParts);
			this.$emit('update', {fontName: this.fontName});
		}
	}
});

Vue.component('pdfExportDialog', {
	template: '#pdfExportDialogTemplate',
	data: function() {
		return {
			visible: false,
			dpi: 0,
			aspectRatio: 0,
			units: 'point',
			pageSize: {width: 0, height: 0},  // stored in this.units
			unitConversions: {  // this conversion factor * pixel count = units
				point: 0.75,
				in: 0.75 / 72,
				mm: 0.75 / 72 * 25.4,
				cm: 0.75 / 72 * 2.54
			}
		};
	},
	methods: {
		show(pageSizeInPixels) {
			this.aspectRatio = pageSizeInPixels.width / pageSizeInPixels.height;
			this.pageSize.width = this.pixelsToUnits(pageSizeInPixels.width);
			this.pageSize.height = this.pixelsToUnits(pageSizeInPixels.height);
			this.visible = true;
		},
		updateWidth(newWidth) {
			this.pageSize.width = _.round(parseFloat(newWidth), 2);
			this.pageSize.height = _.round(this.pageSize.width / this.aspectRatio, 2);
		},
		updateHeight(newHeight) {
			this.pageSize.height = _.round(parseFloat(newHeight), 2);
			this.pageSize.width = _.round(this.pageSize.height * this.aspectRatio, 2);
		},
		updateUnits(newUnits) {
			const widthInPixels = this.unitsToPixels(this.pageSize.width, this.units);
			this.pageSize.width = _.round(this.pixelsToUnits(widthInPixels, newUnits), 2);
			const heightInPixels = this.unitsToPixels(this.pageSize.height, this.units);
			this.pageSize.height = _.round(this.pixelsToUnits(heightInPixels, newUnits));
			this.units = newUnits;
		},
		pixelsToUnits(pixelCount, units) {
			units = units || this.units;
			return pixelCount * this.unitConversions[units];
		},
		unitsToPixels(unitCount, units) {
			units = units || this.units;
			return unitCount / this.unitConversions[units];
		},
		unitToPoints(unitCount) {
			const pixels = this.unitsToPixels(unitCount);
			return this.pixelsToUnits(pixels, 'point');
		},
		ok() {
			this.visible = false;
			this.$emit('ok', {
				dpi: this.dpi,
				units: this.units,
				pageSize: {
					width: this.unitToPoints(this.pageSize.width),
					height: this.unitToPoints(this.pageSize.height)
				}
			});
		},
		cancel() {
			this.visible = false;
		}
	}
});

const elDialogs = {
	numberChooser: {
		// TODO: Element's inputNumber is broken; it doesn't emit input events and doesn't filter non-numeric keys.
		// TODO: Need to implement my own better looking number input, with nice scroll buttons.
		title: '',
		value: 0,
		bodyText: '',
		min: 0,
		max: 100,
		step: 1
	}
};

_.forEach(elDialogs, (name, data) => {
	Vue.component(name + 'Dialog', {
		template: `#${name}DialogTemplate`,
		data: function() {
			data = _.clone(data);
			data.visible = false;
			return data;
		},
		methods: {
			updateValues() {
				this.$emit('update', {...this.$data});
			},
			ok() {
				this.visible = false;
				this.$emit('ok', {...this.$data});
			},
			cancel() {
				this.visible = false;
				this.$emit('cancel');
			}
		}
	});
});

let component;

Vue.component('dialogManager', {
	data() {
		return {currentDialog: null};
	},
	render(createElement) {
		return createElement(this.currentDialog, {ref: 'currentDialog', tag: 'component'});
	},
	mounted() {
		component = this;
	}
});

export default {
	getDialog() {
		return component.$refs.currentDialog;
	},
	setDialog(dialogName) {
		component.currentDialog = dialogName;
	}
};
