/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* Web Lic - Copyright (C) 2018 Remi Gagne */

import { type GridLayout } from "./item_types";

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

interface PageLayoutDialog {
	autoRows: boolean;
	autoCols: boolean;
	values: GridLayout;
	$on(event: "update", cb: (v: GridLayout) => void): void;
	$on(event: "ok", cb: (v: GridLayout) => void): void;
	$on(event: "cancel", cb: () => void): void;
	show(arg?: any): void;
}

// ── DialogProxy - what callers receive in the setup callback ───────────────

interface DialogProxy {
	$on(event: string, cb: Function): void;
	show(arg?: any): void;
	[key: string]: any;
}

// ── Main openDialog() overloads ────────────────────────────────────────────

function openDialog(
	name: "pageLayoutDialog",
	args: any,
	cb?: (d: PageLayoutDialog) => void
): Promise<void>;
function openDialog(
	name: string,
	args: any,
	cb?: (d: any) => void
): Promise<void>;

function openDialog(
	name: string,
	args: any,
	cb?: (d: any) => void
): Promise<void> {
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
