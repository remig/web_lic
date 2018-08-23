/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* eslint-disable */
/* global Vue: false */
'use strict';

// TODO: set focus to correct UI widget when showing each dialog
// TODO: make dialogs draggable, so they can be moved out of the way & see stuff behind them
let component;

Vue.component('dialogManager', {
	components: {
		stringChooserDialog: () => import(
			/* webpackChunkName: "stringChooserDialog" */
			'./dialogs/string_chooser.vue'
		),
		numberChooserDialog: () => import(
			/* webpackChunkName: "numberChooserDialog" */
			'./dialogs/number_chooser.vue'
		),
		brickColorDialog: () => import(
			/* webpackChunkName: "brickColorDialog" */
			'./dialogs/brick_colors.vue'
		),
		ldColorPickerDialog: () => import(
			/* webpackChunkName: "ldColorPickerDialog" */
			'./dialogs/ld_color_picker.vue'
		),
		displacePartDialog: () => import(
			/* webpackChunkName: "displacePartDialog" */
			'./dialogs/displace_part.vue'
		),
		rotatePartImageDialog: () => import(
			/* webpackChunkName: "rotatePartImageDialog" */
			'./dialogs/rotate_part_image.vue'
		),
		transformPartDialog: () => import(
			/* webpackChunkName: "transformPartDialog" */
			'./dialogs/transform_part.vue'
		),
		pageLayoutDialog: () => import(
			/* webpackChunkName: "pageLayoutDialog" */
			'./dialogs/page_layout.vue'
		),
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
		pngExportDialog: () => import(
			/* webpackChunkName: "pngExportDialog" */
			'./dialogs/export_png.vue'
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
}
