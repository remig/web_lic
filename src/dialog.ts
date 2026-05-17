/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* Web Lic - Copyright (C) 2018 Remi Gagne */

import { type Anchors, type GridLayout, type Rotation } from "./item_types";

// ── Public dialog-state shape ──────────────────────────────────────────────

export interface ActiveDialogState {
	name: string;
	props: Record<string, any>;
	callbacks: Record<string, Function>;
	resolve: () => void;
}

// ── Module-level singletons (set by DialogProvider on mount) ───────────────

let setActiveDialogFn: ((d: ActiveDialogState | null) => void) | null = null;
let dialogOkFn: (() => void) | null = null;
let dialogCancelFn: (() => void) | null = null;

export function registerDialogProvider(
	setFn: (d: ActiveDialogState | null) => void
): void {
	setActiveDialogFn = setFn;
}

/** Called by DialogProvider after it builds the ok/cancel handlers. */
export function setActiveDialogActions(
	ok: (() => void) | null,
	cancel: (() => void) | null
): void {
	dialogOkFn = ok;
	dialogCancelFn = cancel;
}

// ── TypeScript interfaces for each dialog's props/callbacks ───────────────

interface StringChooserDialog {
	newString: string;
	title: string;
	label: string;
	width: string;
	$on(event: "ok", cb: (s: string) => void): void;
}

interface NumberChooserDialog {
	value: number | null;
	title: string;
	label: string;
	width: string;
	bodyText: string;
	min: number;
	max: number;
	step: number;
	$on(event: "update", cb: (v: number) => void): void;
	$on(event: "ok", cb: (v: number) => void): void;
	$on(event: "cancel", cb: () => void): void;
}

interface LdColorPickerDialog {
	$on(event: "ok", cb: (colorCode: number) => void): void;
}

interface DisplacePartValues {
	partDistance: number;
	arrowOffset: number;
	arrowLength: number;
	arrowRotation: number;
}

interface DisplacePartDialog {
	values: DisplacePartValues;
	$on(event: "update", cb: (v: DisplacePartValues) => void): void;
	$on(event: "ok" | "cancel", cb: () => void): void;
}

interface RotatePartImageValues {
	title: string;
	addRotateIcon: boolean;
	showRotateIconCheckbox: boolean;
	initialRotation: string;
	rotation: Rotation[] | null;
}

interface RotatePartImageDialog extends RotatePartImageValues {
	$on(event: "update", cb: (v: RotatePartImageValues) => void): void;
	$on(event: "ok", cb: (v: RotatePartImageValues) => void): void;
	$on(event: "cancel", cb: () => void): void;
}

interface TransformPartProps {
	title: string;
	rotation: { x: number; y: number; z: number };
	position: { x: number; y: number; z: number };
	addRotateIcon: boolean;
	showRotateIconCheckbox: boolean;
}

interface TransformPartDialog extends TransformPartProps {
	$on(event: "update", cb: (v: TransformPartProps) => void): void;
	$on(event: "ok", cb: (v: TransformPartProps) => void): void;
	$on(event: "cancel", cb: () => void): void;
}

interface PageLayoutDialog {
	autoRows: boolean;
	autoCols: boolean;
	values: GridLayout;
	$on(event: "update", cb: (v: GridLayout) => void): void;
	$on(event: "ok", cb: (v: GridLayout) => void): void;
	$on(event: "cancel", cb: () => void): void;
	show(arg?: any): void;
}

interface StyleDialogProps {
	text: string;
	color: string;
	font: string;
}

interface StyleDialog extends StyleDialogProps {
	title: string;
	family: string;
	size: string;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	$on(event: "ok", cb: (v: StyleDialogProps) => void): void;
	show(arg?: any): void;
}

interface ResizeImageDialog {
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
	};
	$on(event: string, cb: Function): void;
}

// ── DialogProxy - what callers receive in the setup callback ───────────────

interface DialogProxy {
	$on(event: string, cb: Function): void;
	show(arg?: any): void;
	[key: string]: any;
}

// ── Main openDialog() overloads ────────────────────────────────────────────

function openDialog(
	name: "stringChooserDialog",
	cb?: (d: StringChooserDialog) => void
): Promise<void>;
function openDialog(
	name: "numberChooserDialog",
	cb?: (d: NumberChooserDialog) => void
): Promise<void>;
function openDialog(
	name: "ldColorPickerDialog",
	cb?: (d: LdColorPickerDialog) => void
): Promise<void>;
function openDialog(
	name: "displacePartDialog",
	cb?: (d: DisplacePartDialog) => void
): Promise<void>;
function openDialog(
	name: "rotatePartImageDialog",
	cb?: (d: RotatePartImageDialog) => void
): Promise<void>;
function openDialog(
	name: "transformPartDialog",
	cb?: (d: TransformPartDialog) => void
): Promise<void>;
function openDialog(
	name: "pageLayoutDialog",
	cb?: (d: PageLayoutDialog) => void
): Promise<void>;
function openDialog(
	name: "styleDialog",
	cb?: (d: StyleDialog) => void
): Promise<void>;
function openDialog(
	name: "resizeImageDialog",
	cb?: (d: ResizeImageDialog) => void
): Promise<void>;
function openDialog(name: string, cb?: (d: any) => void): Promise<void>;

function openDialog(name: string, cb?: (d: any) => void): Promise<void> {
	return new Promise<void>((resolve) => {
		const callbacks: Record<string, Function> = {};
		const props: Record<string, any> = {};

		const proxy: DialogProxy = new Proxy({} as any, {
			get(_t, prop: string) {
				if (prop === "$on") {
					return (event: string, handler: Function) => {
						callbacks[event] = handler;
					};
				}
				if (prop === "show") {
					// Callers: dialog.show(arg) → stored as _showArg prop
					return (arg?: any) => {
						props._showArg = arg ?? true;
					};
				}
				return props[prop];
			},
			set(_t, prop: string, value: any) {
				props[prop] = value;
				return true;
			},
		}) as DialogProxy;

		if (cb) {
			cb(proxy);
		}

		setActiveDialogFn?.({ name, props, callbacks, resolve });
	});
}

openDialog.ok = function (): void {
	dialogOkFn?.();
};

openDialog.cancel = function (): void {
	dialogCancelFn?.();
};

export default openDialog;
