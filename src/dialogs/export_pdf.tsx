/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";

import { Button } from "../components/button";

import { tr } from "../translations";
import uiState from "../ui_state";
import _ from "../util";

type Unit = "point" | "mm" | "cm" | "in";

interface Props {
	_showArg?: { width: number; height: number };
	onOk: (v: {
		dpi: number;
		units: Unit;
		pageSize: { width: number; height: number };
	}) => void;
	onCancel: () => void;
	onClose: () => void;
}

export default function ExportPdfDialog({
	_showArg,
	onOk,
	onCancel,
	onClose,
}: Props) {
	const exportState = uiState.get("dialog.export.pdf");
	const [units, setUnits] = useState<Unit>(exportState.units || "point");
	const [dpi, setDpi] = useState<number>(exportState.dpi || 96);
	const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
	const aspectRatioRef = useRef(1);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (_showArg) {
			const w = _.units.pixelsToUnits(_showArg.width, units);
			const h = _.units.pixelsToUnits(_showArg.height, units);
			setPageSize({ width: w, height: h });
			aspectRatioRef.current = _showArg.width / _showArg.height;
		}
		inputRef.current?.focus();
	}, [_showArg, units]);

	function updateWidth(newWidth: number) {
		setPageSize({
			width: _.round(newWidth, 2),
			height: _.round(newWidth / aspectRatioRef.current, 2),
		});
	}

	function updateHeight(newHeight: number) {
		setPageSize({
			width: _.round(newHeight * aspectRatioRef.current, 2),
			height: _.round(newHeight, 2),
		});
	}

	function updateUnits(newUnits: Unit) {
		const widthInPixels = _.units.unitsToPixels(pageSize.width, units);
		const heightInPixels = _.units.unitsToPixels(pageSize.height, units);
		setPageSize({
			width: _.round(_.units.pixelsToUnits(widthInPixels, newUnits), 2),
			height: _.round(_.units.pixelsToUnits(heightInPixels, newUnits)),
		});
		setUnits(newUnits);
	}

	function ok() {
		onOk({
			dpi,
			units,
			pageSize: {
				width: _.units.unitToPoints(pageSize.width, units),
				height: _.units.unitToPoints(pageSize.height, units),
			},
		});
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="pdfExportDialog"
			PaperProps={{ style: { width: "525px" } }}
		>
			<DialogTitle>{tr("dialog.export_hi_res_pdf.title")}</DialogTitle>
			<DialogContent>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "140px 1fr",
						gap: "8px 0",
						alignItems: "center",
					}}
				>
					<label>{tr("dialog.export_hi_res_pdf.page_size")}</label>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<input
							ref={inputRef}
							type="number"
							className="form-control"
							min={0}
							max={10000}
							value={pageSize.width}
							style={{ display: "inline", width: 95 }}
							onChange={(e) => updateWidth(parseFloat(e.target.value))}
						/>
						<span>{tr("dialog.export_hi_res_pdf.by")}</span>
						<input
							type="number"
							className="form-control"
							min={0}
							max={10000}
							value={pageSize.height}
							style={{ display: "inline", width: 95 }}
							onChange={(e) => updateHeight(parseFloat(e.target.value))}
						/>
						<Select
							value={units}
							className="form-dropdown"
							onChange={(e: SelectChangeEvent) =>
								updateUnits(e.target.value as Unit)
							}
						>
							<MenuItem value="point">point</MenuItem>
							<MenuItem value="mm">mm</MenuItem>
							<MenuItem value="cm">cm</MenuItem>
							<MenuItem value="in">in</MenuItem>
						</Select>
					</div>
					<label>{tr("dialog.export_hi_res_pdf.image_res")}</label>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<input
							type="number"
							className="form-control"
							min={0}
							max={1000}
							value={dpi}
							style={{ width: 95 }}
							onChange={(e) => setDpi(parseFloat(e.target.value))}
						/>
						<span>{tr("dialog.export_hi_res_pdf.dpi")}</span>
					</div>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={onCancel} />
				<Button variant="ok" onClick={ok} />
			</DialogActions>
		</Dialog>
	);
}
