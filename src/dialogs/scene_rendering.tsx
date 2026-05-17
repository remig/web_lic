/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";
import Rotate from "../components/rotate";

import EventBus from "../event_bus";
import store from "../store";
import { tr } from "../translations";
import undoStack from "../undo_stack";
import _ from "../util";

interface Props {
	onClose: () => void;
}

export default function SceneRenderingDialog({ onClose }: Props) {
	const originalRef = useRef(_.cloneDeep(store.state.template.sceneRendering));
	const [values, setValues] = useState(
		_.cloneDeep(store.state.template.sceneRendering)
	);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	function update(newValues: any) {
		store.mutations.sceneRendering.set({ ...newValues, refresh: true });
		EventBus.emit("redraw-ui", { clearSelection: true });
	}

	function setField(field: string, val: any) {
		const next = { ...values, [field]: val };
		setValues(next);
		update(next);
	}

	function ok() {
		undoStack.commit(
			"sceneRendering.zoom",
			values,
			tr("dialog.scene_rendering.undo"),
			["renderer"]
		);
		onClose();
	}

	function cancel() {
		store.mutations.sceneRendering.set({
			...originalRef.current,
			refresh: true,
		});
		EventBus.emit("redraw-ui", { clearSelection: true });
		onClose();
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="sceneRenderingDialog"
			PaperProps={{ style: { width: "420px" } }}
		>
			<DialogTitle>{tr("dialog.scene_rendering.title")}</DialogTitle>
			<DialogContent>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "180px 1fr",
						gap: 8,
						alignItems: "center",
					}}
				>
					<label>{tr("dialog.scene_rendering.edge_width")}</label>
					<input
						type="number"
						className="form-control sceneRenderingInput"
						min={0}
						max={10}
						value={(values as any).edgeWidth ?? 0}
						style={{ width: 95 }}
						onChange={(e) => setField("edgeWidth", parseFloat(e.target.value))}
					/>
					<label>{tr("dialog.scene_rendering.zoom")}</label>
					<input
						ref={inputRef}
						type="number"
						className="form-control sceneRenderingInput"
						value={(values as any).zoom ?? 0}
						style={{ width: 95 }}
						onChange={(e) => setField("zoom", parseFloat(e.target.value))}
					/>
				</div>
				<Rotate
					title={tr("dialog.scene_rendering.rotate_title")}
					initialRotation={(values as any).rotation ?? []}
					onNewValues={(newRot) => {
						const next = { ...values, rotation: newRot };
						setValues(next);
						update(next);
					}}
				/>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={cancel} />
				<Button variant="ok" onClick={ok} />
			</DialogActions>
		</Dialog>
	);
}
