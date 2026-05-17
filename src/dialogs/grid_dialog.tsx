/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";

import { Button } from "../components/button";

import cache from "../cache";
import EventBus from "../event_bus";
import { tr } from "../translations";
import uiState from "../ui_state";
import undoStack from "../undo_stack";
import _ from "../util";

interface Props {
	_showArg?: any;
	onClose: () => void;
}

export default function GridDialog({ _showArg, onClose }: Props) {
	const [newState, setNewState] = useState<any>(() =>
		_.cloneDeep(uiState.get("grid"))
	);
	const [useAutoColor, setUseAutoColor] = useState(true);
	const [lineColor, setLineColor] = useState("rgb(0, 0, 0)");
	const originalStateRef = React.useRef<any>(null);

	useEffect(() => {
		const grid = uiState.get("grid");
		const color = grid.line.color;
		setUseAutoColor(color === "auto");
		setLineColor(
			color === "auto" ? "rgb(0, 0, 0)" : _.color.toRGB(color).toString()
		);
		const cloned = _.cloneDeep(grid);
		setNewState(cloned);
		originalStateRef.current = grid;
	}, []);

	function update(updatedState?: any) {
		const state = updatedState ?? newState;
		if (useAutoColor) {
			state.line.color = "auto";
		} else {
			state.line.color = lineColor;
		}
		uiState.set("grid", _.cloneDeep(state));
		cache.set("uiState", "gridPath", null);
		EventBus.emit("redraw-ui", undefined);
	}

	function ok() {
		const storeOp = {
			root: cache.get("uiState", "gridPath"),
			op: "replace",
			path: "/",
			value: null,
		};
		const root = uiState.getCurrentState(),
			op = "replace",
			path = "/grid";
		const change = {
			redo: [{ root, op, path, value: _.cloneDeep(newState) }, storeOp],
			undo: [{ root, op, path, value: originalStateRef.current }, storeOp],
		};
		undoStack.commit(change, null, "Style Grid");
		onClose();
	}

	function cancel() {
		uiState.set("grid", originalStateRef.current);
		cache.set("uiState", "gridPath", null);
		EventBus.emit("redraw-ui", undefined);
		onClose();
	}

	function setField(path: string, value: any) {
		const next = _.cloneDeep(newState);
		_.set(next, path, value);
		setNewState(next);
		update(next);
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="gridDialog"
			PaperProps={{ style: { width: "500px" } }}
		>
			<DialogTitle>{tr("dialog.grid.title")}</DialogTitle>
			<DialogContent>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "140px 1fr",
						gap: "8px 0",
						alignItems: "center",
					}}
				>
					<label>{tr("dialog.grid.enabled")}</label>
					<Checkbox
						checked={!!newState?.enabled}
						onChange={(e) => setField("enabled", e.target.checked)}
					/>
					<label>{tr("dialog.grid.spacing")}</label>
					<input
						type="number"
						className="form-control"
						min={1}
						max={10000}
						value={newState?.spacing ?? 0}
						disabled={!newState?.enabled}
						style={{ width: 80 }}
						onChange={(e) => setField("spacing", parseInt(e.target.value, 10))}
					/>
					<label>{tr("dialog.grid.offset")}</label>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<span style={{ marginRight: 10 }}>
							{tr("dialog.grid.offset_top")}
						</span>
						<input
							type="number"
							className="form-control"
							min={-1000}
							max={10000}
							value={newState?.offset?.top ?? 0}
							disabled={!newState?.enabled}
							style={{ width: 80 }}
							onChange={(e) =>
								setField("offset.top", parseInt(e.target.value, 10))
							}
						/>
						<span style={{ margin: "0 10px" }}>
							{tr("dialog.grid.offset_left")}
						</span>
						<input
							type="number"
							className="form-control"
							min={-1000}
							max={10000}
							value={newState?.offset?.left ?? 0}
							disabled={!newState?.enabled}
							style={{ width: 80 }}
							onChange={(e) =>
								setField("offset.left", parseInt(e.target.value, 10))
							}
						/>
					</div>
					<label>{tr("dialog.grid.line_style")}</label>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<label style={{ width: 70 }}>{tr("glossary.color")}</label>
							<FormControlLabel
								control={
									<Checkbox
										checked={useAutoColor}
										disabled={!newState?.enabled}
										onChange={(e) => {
											setUseAutoColor(e.target.checked);
											update();
										}}
									/>
								}
								label={tr("dialog.grid.auto_color")}
								style={{ marginRight: 15 }}
							/>
							<input
								type="color"
								value={lineColor}
								disabled={useAutoColor || !newState?.enabled}
								onChange={(e) => {
									setLineColor(e.target.value);
									setField("line.color", e.target.value);
								}}
							/>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<label style={{ width: 70 }}>{tr("dialog.grid.width")}</label>
							<input
								type="number"
								className="form-control"
								min={1}
								max={100}
								value={newState?.line?.width ?? 1}
								disabled={!newState?.enabled}
								style={{ width: 80 }}
								onChange={(e) =>
									setField("line.width", parseInt(e.target.value, 10))
								}
							/>
						</div>
					</div>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={cancel} />
				<Button variant="ok" onClick={ok} />
			</DialogActions>
		</Dialog>
	);
}
