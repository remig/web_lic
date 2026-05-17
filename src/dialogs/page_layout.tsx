/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";

import { Button } from "../components/button";

import EventBus from "../event_bus";
import type { GridLayout, LookupItem, Orientations } from "../item_types";
import store from "../store";
import { tr } from "../translations";
import undoStack from "../undo_stack";

interface Props {
	_showArg: { values: GridLayout; page: LookupItem };
	onClose: () => void;
}

export default function PageLayoutDialog({ _showArg, onClose }: Props) {
	const [rows, setRows] = useState(1);
	const [autoRows, setAutoRows] = useState(true);
	const [cols, setCols] = useState(1);
	const [autoCols, setAutoCols] = useState(true);
	const [direction, setDirection] = useState<Orientations>("horizontal");

	const initialValues = _showArg.values;

	useEffect(() => {
		if (initialValues.rows !== rows && initialValues.rows !== "auto") {
			setRows(initialValues.rows);
		}
		if (
			(initialValues.rows === "auto" && !autoRows) ||
			(initialValues.rows !== "auto" && autoRows)
		) {
			setAutoRows(initialValues.rows === "auto");
		}

		if (initialValues.cols !== cols && initialValues.cols !== "auto") {
			setCols(initialValues.cols);
		}
		if (
			(initialValues.cols === "auto" && !autoCols) ||
			(initialValues.cols !== "auto" && autoCols)
		) {
			setAutoCols(initialValues.cols === "auto");
		}

		if (initialValues.direction !== direction) {
			setDirection(initialValues.direction);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function update(values: GridLayout) {
		store.mutations.page.layout({ page: _showArg.page, layout: values });
		EventBus.emit("redraw-ui", undefined);
	}

	function onOk() {
		undoStack.commit(
			"page.layout",
			{
				page: _showArg.page,
				layout: {
					rows: autoRows ? "auto" : rows,
					cols: autoCols ? "auto" : cols,
					direction,
				},
			},
			tr("action.layout.by_row_and_column.undo")
		);
		onClose();
	}

	function onCancel() {
		console.log("cancelling, reverting to: ", _showArg.values);
		store.mutations.page.layout({
			page: _showArg.page,
			layout: _showArg.values,
		});
		EventBus.emit("redraw-ui", undefined);
		onClose();
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="pageLayoutDialog"
			PaperProps={{ style: { width: "500px" } }}
		>
			<DialogTitle>{tr("dialog.page_layout.title")}</DialogTitle>
			<DialogContent>
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<label style={{ width: 100 }}>
							{tr("dialog.page_layout.rows")}
						</label>
						<FormControlLabel
							className="el-checkbox"
							control={
								<Checkbox
									checked={autoRows}
									onChange={(e) => {
										console.log("auto rows CHECKED: ", e.target.checked);
										setAutoRows(e.target.checked);
										update({
											rows: e.target.checked ? "auto" : rows,
											cols: autoCols ? "auto" : cols,
											direction,
										});
									}}
								/>
							}
							label={tr("glossary.auto")}
						/>
						<input
							type="number"
							min={1}
							className="form-control"
							value={rows}
							disabled={autoRows}
							style={{ width: 90 }}
							onChange={(e) => {
								const newRows = parseInt(e.target.value, 10);
								setRows(newRows);
								update({
									rows: newRows,
									cols: autoCols ? "auto" : cols,
									direction,
								});
							}}
						/>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<label style={{ width: 100 }}>
							{tr("dialog.page_layout.cols")}
						</label>
						<FormControlLabel
							className="el-checkbox"
							control={
								<Checkbox
									checked={autoCols}
									onChange={(e) => {
										setAutoCols(e.target.checked);
										update({
											rows: autoRows ? "auto" : rows,
											cols: e.target.checked ? "auto" : cols,
											direction,
										});
									}}
								/>
							}
							label={tr("glossary.auto")}
						/>
						<input
							type="number"
							min={1}
							className="form-control"
							value={cols}
							disabled={autoCols}
							style={{ width: 90 }}
							onChange={(e) => {
								const newCols = parseInt(e.target.value, 10);
								setCols(newCols);
								update({
									rows: autoRows ? "auto" : rows,
									cols: newCols,
									direction,
								});
							}}
						/>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<label style={{ width: 100 }}>
							{tr("dialog.page_layout.orientation")}
						</label>
						<RadioGroup
							row
							value={direction}
							onChange={(e) => {
								const newDirection = e.target.value;
								if (
									newDirection === "horizontal" ||
									newDirection === "vertical"
								) {
									setDirection(newDirection);
									update({
										rows: autoRows ? "auto" : rows,
										cols: autoCols ? "auto" : cols,
										direction: newDirection,
									});
								}
							}}
						>
							<FormControlLabel
								value="horizontal"
								control={<Radio />}
								label={tr("dialog.page_layout.horizontal")}
								className="el-radio"
							/>
							<FormControlLabel
								value="vertical"
								control={<Radio />}
								label={tr("dialog.page_layout.vertical")}
								className="el-radio"
							/>
						</RadioGroup>
					</div>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={onCancel} />
				<Button variant="ok" onClick={onOk} />
			</DialogActions>
		</Dialog>
	);
}
