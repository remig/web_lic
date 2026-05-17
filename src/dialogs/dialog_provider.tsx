/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { lazy, Suspense, useEffect, useState } from "react";

import {
	type ActiveDialogState,
	registerDialogProvider,
	setActiveDialogActions,
} from "../dialog";

const dialogComponents: Record<string, React.LazyExoticComponent<any>> = {
	stringChooserDialog: lazy(() => import("./string_chooser")),
	numberChooserDialog: lazy(() => import("./number_chooser")),
	whatsNewDialog: lazy(() => import("./whats_new")),
	aboutLicDialog: lazy(() => import("./about_lic")),
	missingPartsDialog: lazy(() => import("./missing_parts")),
	exportPdfDialog: lazy(() => import("./export_pdf")),
	exportPngDialog: lazy(() => import("./export_png")),
	brickColorsDialog: lazy(() => import("./brick_colors")),
	ldColorPickerDialog: lazy(() => import("./ld_color_picker")),
	styleDialog: lazy(() => import("./style")),
	pageLayoutDialog: lazy(() => import("./page_layout")),
	gridDialog: lazy(() => import("./grid_dialog")),
	transformPartDialog: lazy(() => import("./transform_part")),
	displacePartDialog: lazy(() => import("./displace_part")),
	rotatePartImageDialog: lazy(() => import("./rotate_part_image")),
	sceneRenderingDialog: lazy(() => import("./scene_rendering")),
	resizeImageDialog: lazy(() => import("./resize_image")),
	multiBookDialog: lazy(() => import("./multi_book")),
	fontNameDialog: lazy(() => import("./font_name")),
};

export function DialogProvider() {
	const [activeDialog, setActiveDialog] = useState<ActiveDialogState | null>(
		null
	);

	useEffect(() => {
		registerDialogProvider((d) => setActiveDialog(d));
	}, []);

	useEffect(() => {
		if (activeDialog) {
			const onOk = (value?: any) => {
				activeDialog.callbacks.ok?.(value);
				activeDialog.resolve();
				setActiveDialog(null);
			};
			const onCancel = (value?: any) => {
				activeDialog.callbacks.cancel?.(value);
				activeDialog.resolve();
				setActiveDialog(null);
			};
			setActiveDialogActions(onOk, onCancel);
			return () => setActiveDialogActions(null, null);
		}
		return undefined;
	}, [activeDialog]);

	if (!activeDialog) {
		return null;
	}

	const DialogComponent = dialogComponents[activeDialog.name];
	if (!DialogComponent) {
		console.warn("Unknown dialog:", activeDialog.name);
		return null;
	}

	const onClose = () => {
		activeDialog.resolve();
		setActiveDialog(null);
	};

	const onOk = (value?: any) => {
		activeDialog.callbacks.ok?.(value);
		onClose();
	};

	const onCancel = (value?: any) => {
		activeDialog.callbacks.cancel?.(value);
		onClose();
	};

	const onUpdate = (value?: any) => {
		activeDialog.callbacks.update?.(value);
	};

	const DialogComponentAny = DialogComponent as React.ComponentType<any>;
	return (
		<Suspense fallback={null}>
			<DialogComponentAny
				{...activeDialog.props}
				onOk={onOk}
				onCancel={onCancel}
				onUpdate={onUpdate}
				onClose={onClose}
			/>
		</Suspense>
	);
}
