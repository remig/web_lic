/* global Vue: false, $: false */
'use strict';

const util = require('./util');

Vue.component('baseDialog', {
	template: '#baseDialogTemplate',
	data: function() {
		return {
			visible: false,
			position: {x: 0, y: 0}
		};
	},
	props: {
		title: '',
		okButtonText: {type: String, default: 'Ok'},
		cancelButtonText: {type: String, default: 'Cancel'}
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
	importModel: {
		hasSteps: false,
		stepsPerPage: 1,
		useMaxSteps: false,
		includeTitlePage: false,
		includePartListPage: false,
		includePLIs: false
	},
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
		rotation: {
			x: 0, y: 0, z: 0
		},
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

util.forEach(dialogs, (name, data) => {
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
	template: `#fontNameTemplate`,
	mixins: [baseDialogPropagator],
	data: function() {
		return {
			font: '',
			fontName: ''
		};
	},
	methods: {
		updateValues() {
			const fontParts = util.fontToFontParts(this.font);
			fontParts.fontFamily = this.fontName;
			this.font = util.fontPartsToFont(fontParts);
			this.$emit('update', {fontName: this.fontName});
		}
	}
});
