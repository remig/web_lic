/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { lazy, Suspense, useEffect, useState } from "react";

import {
	type ActiveDialogState,
	registerDialogProvider,
	setActiveDialogActions,
} from "../dialog_2";

const dialogComponents: Record<string, React.LazyExoticComponent<any>> = {
	pageLayoutDialog: lazy(() => import("./page_layout")),
};

export function DialogProvider2() {
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
