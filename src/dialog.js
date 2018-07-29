/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* eslint-disable */
/* global Vue: false, $: false */
'use strict';

import _ from './util';
import stringChooserDialog from './dialogs/string_chooser.vue'
import numberChooserDialog from './dialogs/number_chooser.vue'

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

let component;

Vue.component('dialogManager', {
	components: {
		stringChooserDialog,
		numberChooserDialog,
		brickColorDialog: () => import(
			/* webpackChunkName: "brickColorDialog" */
			'./dialogs/brick_colors.vue'
		),
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
