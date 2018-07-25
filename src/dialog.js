/* eslint-disable */
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
	}
};

_.forOwn(dialogs, (data, name) => {
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

const elDialogs = {
	numberChooser: {
		// TODO: Element inputNumber is broken; doesn't emit input events and doesn't filter non-numeric keys
		// TODO: Need to implement my own better looking number input, with nice scroll buttons.
		title: '',
		value: 0,
		bodyText: '',
		min: 0,
		max: 100,
		step: 1
	}
};

_.forOwn(elDialogs, (data, name) => {
	Vue.component(name + 'Dialog', {
		template: `#${name}DialogTemplate`,
		data: function() {
			data = _.cloneDeep(data);
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
	components: {
		gridDialog: () => import(
			/* webpackChunkName: "gridDialog" */
			'./dialogs/grid_dialog.vue'
		),
		pdfExportDialog: () => import(
			/* webpackChunkName: "pdfExportDialog" */
			'./dialogs/export_pdf.vue'
		),
		styleDialog: () => import(
			/* webpackChunkName: "styleDialog" */
			'./dialogs/style.vue'
		),
		importModelDialog: () => import(
			/* webpackChunkName: "importModelDialog" */
			'./dialogs/import_model.vue'
		),
		whatsNewDialog: () => import(
			/* webpackChunkName: "whatsNewDialog" */
			'./dialogs/whats_new.vue'
		)
	},
	data() {
		return {currentDialog: null};
	},
	render(createElement) {
		return createElement(this.currentDialog, {ref: 'currentDialog', tag: 'component'});
	},
	updated() {
		if (this.outstandingImport) {
			Vue.nextTick(() => {
				if (this.$refs && this.$refs.currentDialog) {
					this.outstandingImport(this.$refs.currentDialog);
					delete this.outstandingImport;
				}
			});
		}
	},
	mounted() {
		component = this;
	}
});

export default function setDialog(dialogName, cb) {
	component.currentDialog = null;  // This forces Vue to re-render a dialog if it was just opened
	component.outstandingImport = cb;
	Vue.nextTick(() => {
		component.currentDialog = dialogName;
	});
};
