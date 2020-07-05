/* Web Lic - Copyright (C) 2018 Remi Gagne */
import Vue, {VNode} from 'vue';

type DialogEvent = 'ok' | 'cancel' | 'update';
export interface DialogInterface {
	$on(event: DialogEvent, cb: any): void;
	show(app?: any): void;
}

// Can't export type information from a vue file, so must
// declare each dialog's property interface here. Ugh.
interface LocaleChooserDialog extends DialogInterface {
	visible: boolean;
}

interface StringChooserDialog extends DialogInterface {
	newString: string;
	title: string;
	label: string;
	width: string;
	$on(event: 'ok', cb: (filename: string) => void): void;
}

interface NumberChooserDialog extends DialogInterface {
	value: number | null;
	title: string;
	label: string;
	width: string;
	bodyText: string;
	min: number;
	max: number;
	step: number;
	$on(event: 'update', cb: (newValue: number) => void): void;
	$on(event: 'ok', cb: (newValue: number) => void): void;
	$on(event: 'cancel', cb: () => void): void;
}

interface LdColorPickerDialog extends DialogInterface {
	$on(event: 'ok', cb: (newColorCode: number) => void): void;
}

interface DisplacePartValues {
	partDistance: number;
	arrowOffset: number;
	arrowLength: number;
	arrowRotation: number;
}

interface DisplacePartDialog extends DialogInterface {
	values: DisplacePartValues,
	$on(event: 'update', cb: (newValues: DisplacePartValues) => void): void;
	$on(event: 'ok' | 'cancel', cb: () => void): void;
}

interface RotatePartImageValues {
	title: string;
	addRotateIcon: boolean;
	showRotateIconCheckbox: boolean;
	initialRotation: string;
	rotation: Rotation[] | null;
}

interface RotatePartImageDialog extends RotatePartImageValues, DialogInterface {
	$on(event: 'update', cb: (newValues: RotatePartImageValues) => void): void;
	$on(event: 'ok', cb: (newValues: RotatePartImageValues) => void): void;
	$on(event: 'cancel', cb: () => void): void;
}

interface TransformPartProps {
	title: string;
	rotation: {x: number, y: number, z: number};
	position: {x: number, y: number, z: number};
	addRotateIcon: boolean;
	showRotateIconCheckbox: boolean;
}

interface TransformPartDialog extends DialogInterface, TransformPartProps {
	$on(event: 'update', cb: (newTransform: TransformPartProps) => void): void;
	$on(event: 'ok', cb: (newTransform: TransformPartProps) => void): void;
	$on(event: 'cancel', cb: () => void): void;
}

interface PageLayoutDialog extends DialogInterface {
	autoRows: boolean;
	autoCols: boolean;
	values: GridLayout;
	$on(event: 'update', cb: (newValues: GridLayout) => void): void;
	$on(event: 'ok', cb: (newValues: GridLayout) => void): void;
	$on(event: 'cancel', cb: () => void): void;
}

interface StyleDialogProps {
	text: string;
	color: string;
	font: string;
}

interface StyleDialog extends StyleDialogProps, DialogInterface {
	title: string;
	family: string;
	size: string;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	$on(event: 'ok', cb: (newProperties: StyleDialogProps) => void): void;
}

interface ImportModelDialog extends DialogInterface {
	includePartsPerStep: boolean;
	newState: any;
}

interface ResizeImageDialog extends DialogInterface {
	imageInfo: {
		filename: string;
		src: string;
		width: number;
		originalWidth: number;
		height: number;
		originalHeight: number;
		x: number;
		y: number;
		dpi: number;
		preserveSize: boolean;
		preserveAspectRatio: boolean;
		anchorPosition: Anchors;
		pageWidth: number;
		pageHeight: number;
	},
}

// TODO: set focus to correct UI widget when showing each dialog
// TODO: make dialogs draggable, so they can be moved out of the way & see stuff behind them
let component: any;

interface DialogProps {
	visible: boolean;
	currentDialog: any;
	outstandingImport: any;
	resolve: any;
}

type DialogNames =
	'localeChooserDialog' | 'stringChooserDialog' | 'numberChooserDialog'
	| 'missingPartsDialog' | 'sceneRenderingDialog' | 'ldColorPickerDialog' | 'displacePartDialog'
	| 'rotatePartImageDialog' | 'transformPartDialog' | 'pageLayoutDialog' | 'brickColorDialog'
	| 'gridDialog' | 'pdfExportDialog' | 'pngExportDialog' | 'styleDialog' | 'importModelDialog'
	| 'whatsNewDialog' | 'aboutLicDialog' | 'resizeImageDialog' | 'multiBookDialog';

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
		),
	},
	data(): DialogProps {
		return {
			visible: false,
			currentDialog: null,
			outstandingImport: null,
			resolve: null,
		};
	},
	render(createElement): VNode {
		return this.visible
			? createElement(this.currentDialog, {ref: 'currentDialog', tag: 'component'})
			: createElement();
	},
	updated() {
		Vue.nextTick(() => {
			if (this.$refs && this.$refs.currentDialog) {
				const dlg: any = this.$refs.currentDialog;
				if (typeof this.outstandingImport === 'function') {
					this.outstandingImport(dlg);
					this.outstandingImport = null;
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
	},
});

/* eslint-disable max-len */
function setDialog(dialogName: 'localeChooserDialog', cb?: (dialog: LocaleChooserDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'stringChooserDialog', cb?: (dialog: StringChooserDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'numberChooserDialog', cb?: (dialog: NumberChooserDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'ldColorPickerDialog', cb?: (dialog: LdColorPickerDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'displacePartDialog', cb?: (dialog: DisplacePartDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'rotatePartImageDialog', cb?: (dialog: RotatePartImageDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'transformPartDialog', cb?: (dialog: TransformPartDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'pageLayoutDialog', cb?: (dialog: PageLayoutDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'styleDialog', cb?: (dialog: StyleDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'importModelDialog', cb?: (dialog: ImportModelDialog) => void): Promise<unknown>;
function setDialog(dialogName: 'resizeImageDialog', cb?: (dialog: ResizeImageDialog) => void): Promise<unknown>;
function setDialog(dialogName: DialogNames, cb?: (dialog: DialogInterface) => void): Promise<unknown>;
function setDialog(dialogName: DialogNames, cb?: (dialog: any) => any) {
/* eslint-enable max-len */
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
