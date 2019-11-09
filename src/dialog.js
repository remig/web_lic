/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global Vue: false */

// TODO: set focus to correct UI widget when showing each dialog
// TODO: make dialogs draggable, so they can be moved out of the way & see stuff behind them
let component;

Vue.component('dialogManager', {
	components: {
		localeChooserDialog: () => import(
			/* webpackChunkName: "localeChooserDialog" */
			'./components/translate.vue'
		),
		stringChooserDialog: () => import(
			/* webpackChunkName: "stringChooserDialog" */
			'./dialogs/string_chooser.vue'
		),
		numberChooserDialog: () => import(
			/* webpackChunkName: "numberChooserDialog" */
			'./dialogs/number_chooser.vue'
		),
		missingPartsDialog: () => import(
			/* webpackChunkName: "missingPartsDialog" */
			'./dialogs/missing_parts.vue'
		),
		sceneRenderingDialog: () => import(
			/* webpackChunkName: "sceneRenderingDialog" */
			'./dialogs/scene_rendering.vue'
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
		),
		aboutLicDialog: () => import(
			/* webpackChunkName: "aboutLicDialog" */
			'./dialogs/about_lic.vue'
		),
		resizeImageDialog: () => import(
			/* webpackChunkName: "resizeImageDialog" */
			'./dialogs/resize_image.vue'
		),
		multiBookDialog: () => import(
			/* webpackChunkName: "multiBookDialog" */
			'./dialogs/multi_book.vue'
		)
	},
	data() {
		return {
			visible: false,
			currentDialog: null
		};
	},
	render(createElement) {
		return this.visible
			? createElement(this.currentDialog, {ref: 'currentDialog', tag: 'component'})
			: null;
	},
	updated() {
		Vue.nextTick(() => {
			if (this.$refs && this.$refs.currentDialog) {
				const dlg = this.$refs.currentDialog;
				if (this.outstandingImport) {
					this.outstandingImport(dlg);
					delete this.outstandingImport;
				}
				if (dlg.$refs && dlg.$refs.set_focus) {
					dlg.$refs.set_focus.focus();
				}
				dlg.$on('close', () => {
					this.visible = false;
					this.resolve();
				});
			}
		});
	},
	mounted() {
		component = this;
	}
});

function setDialog(dialogName, cb) {
	component.currentDialog = null;  // This forces Vue to re-render a dialog if it was just opened
	component.outstandingImport = cb;
	return new Promise(resolve => {
		Vue.nextTick(() => {
			component.currentDialog = dialogName;
			component.resolve = resolve;
			component.visible = true;
		});
	});
}

setDialog.ok = function() {
	if (component.visible && component.$refs.currentDialog) {
		if (typeof component.$refs.currentDialog.ok === 'function') {
			component.$refs.currentDialog.ok();
		} else if (typeof component.$refs.currentDialog.cancel === 'function') {
			component.$refs.currentDialog.cancel();
		}
	}
};

setDialog.cancel = function() {
	if (component.visible
		&& component.$refs.currentDialog
		&& typeof component.$refs.currentDialog.cancel === 'function'
	) {
		component.$refs.currentDialog.cancel();
	}
};

export default setDialog;
