/* Web Lic - Copyright (C) 2018 Remi Gagne */
import { createApp } from 'vue';

import LocaleChooser from './components/translate.vue';

import AboutLic from './dialogs/about_lic.vue';
import BrickColors from './dialogs/brick_colors.vue';
import DisplacePart from './dialogs/displace_part.vue';
import ExportPdf from './dialogs/export_pdf.vue';
import ExportPng from './dialogs/export_png.vue';
import GridDialog from './dialogs/grid_dialog.vue';
import ImportModel from './dialogs/import_model.vue';
import LdColorPicker from './dialogs/ld_color_picker.vue';
import MissingParts from './dialogs/missing_parts.vue';
import MultiBook from './dialogs/multi_book.vue';
import NumberChooser from './dialogs/number_chooser.vue';
import PageLayout from './dialogs/page_layout.vue';
import ResizeImage from './dialogs/resize_image.vue';
import RotatePartImage from './dialogs/rotate_part_image.vue';
import SceneRendering from './dialogs/scene_rendering.vue';
import StringChooser from './dialogs/string_chooser.vue';
import StyleVue from './dialogs/style.vue';
import TransformPart from './dialogs/transform_part.vue';
import WhatsNew from './dialogs/whats_new.vue';
import { type Anchors, type GridLayout, type Rotation } from './item_types';
import { type UnitTypes } from './util';

type ExtraOn = { [event: string]: ((...args: any[]) => void) | undefined };

function mountDialog<Props extends object, Result>(
	Component: any,
	props: Props,
	extraOn?: ExtraOn,
): Promise<Result | null> {
	return new Promise((resolve) => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		const eventProps: Record<string, any> = {};
		for (const [key, handler] of Object.entries(extraOn ?? {})) {
			if (handler !== undefined && key !== 'cancel') {
				eventProps['on' + key.charAt(0).toUpperCase() + key.slice(1)] = handler;
			}
		}
		const app = createApp(Component, {
			...props,
			...eventProps,
			onOk: (val: Result) => {
				app.unmount();
				el.remove();
				resolve(val);
			},
			onCancel: () => {
				(extraOn?.cancel as (() => void) | undefined)?.();
				app.unmount();
				el.remove();
				resolve(null);
			},
		});
		app.mount(el);
	});
}

function makeSimpleDialog(Component: any): () => Promise<void | null> {
	return () => mountDialog<{}, void>(Component, {});
}

export const showMissingPartsDialog = makeSimpleDialog(MissingParts);
export const showWhatsNewDialog = makeSimpleDialog(WhatsNew);
export const showAboutLicDialog = makeSimpleDialog(AboutLic);
export const showBrickColorDialog = makeSimpleDialog(BrickColors);
export const showGridDialog = makeSimpleDialog(GridDialog);

type StringChooserProps = {
	title: string;
	label: string;
	initialValue?: string | null;
	width?: string;
};

export function showStringChooserDialog(props: StringChooserProps): Promise<string | null> {
	return mountDialog<StringChooserProps, string>(StringChooser, props);
}

interface NumberChooserProps {
	title: string;
	label?: string;
	initialValue?: number | null;
	min?: number;
	max?: number;
	step?: number;
	bodyText?: string;
	width?: string;
}

export function showNumberChooserDialog(
	props: NumberChooserProps,
	callbacks?: { onUpdate?: (val: number) => void; onCancel?: () => void },
): Promise<number | null> {
	return mountDialog<NumberChooserProps, number>(NumberChooser, props, {
		update: callbacks?.onUpdate,
		cancel: callbacks?.onCancel,
	});
}

export function showSceneRenderingDialog(): Promise<void | null> {
	return mountDialog<{}, void>(SceneRendering, {});
}

export function showLocaleChooserDialog(): Promise<void | null> {
	return mountDialog<{}, void>(LocaleChooser, {});
}

export function showLdColorPickerDialog(): Promise<number | null> {
	return mountDialog<{}, number>(LdColorPicker, {});
}

interface DisplacePartValues {
	partDistance: number;
	arrowOffset: number;
	arrowLength: number;
	arrowRotation: number;
}

export function showDisplacePartDialog(
	props: { initialValues: DisplacePartValues },
	callbacks?: {
		onUpdate?: (vals: DisplacePartValues) => void;
		onCancel?: () => void;
	},
): Promise<DisplacePartValues | null> {
	return mountDialog<{ initialValues: DisplacePartValues }, DisplacePartValues>(
		DisplacePart,
		props,
		{
			update: callbacks?.onUpdate,
			cancel: callbacks?.onCancel,
		},
	);
}

interface RotatePartImageProps {
	title: string;
	rotation: Rotation[] | null;
	addRotateIcon?: boolean;
	showRotateIconCheckbox?: boolean;
}

interface RotatePartImageResult {
	title: string;
	addRotateIcon: boolean;
	rotation: Rotation[];
}

export function showRotatePartImageDialog(
	props: RotatePartImageProps,
	callbacks?: {
		onUpdate?: (vals: RotatePartImageResult) => void;
		onCancel?: () => void;
	},
): Promise<RotatePartImageResult | null> {
	return mountDialog<RotatePartImageProps, RotatePartImageResult>(RotatePartImage, props, {
		update: callbacks?.onUpdate,
		cancel: callbacks?.onCancel,
	});
}

interface TransformValues {
	rotation: { x: number; y: number; z: number };
	position: { x: number; y: number; z: number };
}

export function showTransformPartDialog(
	props: TransformValues,
	callbacks?: {
		onUpdate?: (vals: TransformValues) => void;
		onCancel?: () => void;
	},
): Promise<TransformValues | null> {
	return mountDialog<TransformValues, TransformValues>(TransformPart, props, {
		update: callbacks?.onUpdate,
		cancel: callbacks?.onCancel,
	});
}

interface PdfExportResult {
	dpi: number;
	units: UnitTypes;
	pageSize: { width: number; height: number };
}

type ExportDialogProps = {
	pageSizeInPixels: { width: number; height: number };
};

export function showPdfExportDialog(props: ExportDialogProps): Promise<PdfExportResult | null> {
	return mountDialog<ExportDialogProps, PdfExportResult>(ExportPdf, props);
}

interface PngExportResult {
	scale: number;
	dpi: number;
}

export function showPngExportDialog(props: ExportDialogProps): Promise<PngExportResult | null> {
	return mountDialog<ExportDialogProps, PngExportResult>(ExportPng, props);
}

interface StyleResult {
	text: string;
	font: string;
	color: string;
}
type StyleProps = { title: string; text: string; color: string; font: string };

export function showStyleDialog(props: StyleProps): Promise<StyleResult | null> {
	return mountDialog<StyleProps, StyleResult>(StyleVue, props);
}

export function showPageLayoutDialog(
	props: { initialLayout: GridLayout },
	callbacks?: { onUpdate?: (vals: GridLayout) => void; onCancel?: () => void },
): Promise<GridLayout | null> {
	return mountDialog<{ initialLayout: GridLayout }, GridLayout>(PageLayout, props, {
		update: callbacks?.onUpdate,
		cancel: callbacks?.onCancel,
	});
}

interface ImportModelResult {
	partsPerStep: number | null;
	stepsPerPage: number;
	useMaxSteps: boolean;
	include: { pli: boolean; partListPage: boolean; titlePage: boolean };
}
type ImportModelProps = { includePartsPerStep: boolean; partsPerStep: number | null };

export function showImportModelDialog(props: ImportModelProps): Promise<ImportModelResult | null> {
	return mountDialog<ImportModelProps, ImportModelResult>(ImportModel, props);
}

interface ResizeImageInfo {
	filename: string;
	src: string | null;
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
}
type ResizeImageProps = { initialImageInfo: ResizeImageInfo };

export function showResizeImageDialog(
	props: ResizeImageProps,
	callbacks?: {
		onUpdate?: (v: ResizeImageInfo) => void;
		onCancel?: () => void;
	},
): Promise<ResizeImageInfo | null> {
	return mountDialog<ResizeImageProps, ResizeImageInfo>(ResizeImage, props, {
		update: callbacks?.onUpdate,
		cancel: callbacks?.onCancel,
	});
}

interface MultiBookResult {
	bookDivisions: any[];
	includeTitlePages: boolean;
	noSplitSubmodels: boolean;
	firstPageNumber: string;
	fileSplit: string;
}

export function showMultiBookDialog(): Promise<MultiBookResult | null> {
	return mountDialog<{}, MultiBookResult>(MultiBook, {});
}
