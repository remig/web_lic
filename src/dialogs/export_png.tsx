/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useRef, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";

import { Button } from "../components/button";

import { tr } from "../translations";
import uiState from "../ui_state";
import _ from "../util";

interface Props {
	_showArg?: { width: number; height: number };
	onOk: (v: { scale: number; dpi: number }) => void;
	onCancel: () => void;
	onClose: () => void;
}

export default function ExportPngDialog({
	_showArg,
	onOk,
	onCancel,
	onClose,
}: Props) {
	const [scale, setScale] = useState<number>(
		uiState.get("dialog.export.images.scale") || 1
	);
	const [dpi, setDpi] = useState<number>(
		uiState.get("dialog.export.images.dpi") || 96
	);
	const [maintainPrintSize, setMaintainPrintSize] = useState<boolean>(
		uiState.get("dialog.export.images.maintainPrintSize") || false
	);
	const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (_showArg) {
			setPageSize({ ..._showArg });
		}
		inputRef.current?.focus();
	}, [_showArg]);

	function updateScale(newScale: number) {
		setScale(newScale);
		if (maintainPrintSize) {
			setDpi(96 * newScale);
		}
	}

	function updateDpi(newDpi: number) {
		setDpi(newDpi);
		if (maintainPrintSize) {
			setScale(newDpi / 96);
		}
	}

	const scaledPageSize = {
		width: Math.floor(pageSize.width * scale),
		height: Math.floor(pageSize.height * scale),
	};

	const dpiScale = 96 / dpi;
	const scaledPrintSize = {
		cm_width: _.round(
			_.units.pixelsToUnits(scaledPageSize.width, "cm") * dpiScale,
			2
		),
		cm_height: _.round(
			_.units.pixelsToUnits(scaledPageSize.height, "cm") * dpiScale,
			2
		),
		in_width: _.round(
			_.units.pixelsToUnits(scaledPageSize.width, "in") * dpiScale,
			2
		),
		in_height: _.round(
			_.units.pixelsToUnits(scaledPageSize.height, "in") * dpiScale,
			2
		),
	};

	function ok() {
		uiState.get("dialog.export.images").scale = scale;
		uiState.get("dialog.export.images").dpi = dpi;
		uiState.get("dialog.export.images").maintainPrintSize = maintainPrintSize;
		onOk({ scale, dpi });
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="pngExportDialog"
			PaperProps={{ style: { width: "550px" } }}
		>
			<DialogTitle>{tr("dialog.export_hi_res_png.title")}</DialogTitle>
			<DialogContent>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "140px 1fr",
						gap: "8px 0",
					}}
				>
					<label>{tr("dialog.export_hi_res_png.scale")}</label>
					<input
						ref={inputRef}
						type="number"
						className="form-control"
						min={0}
						max={100}
						step={0.1}
						value={scale}
						onChange={(e) => updateScale(parseFloat(e.target.value))}
					/>
					<div style={{ gridColumn: "2 / -1" }}>
						<FormControlLabel
							className="el-checkbox"
							control={
								<Checkbox
									checked={maintainPrintSize}
									onChange={(e) => setMaintainPrintSize(e.target.checked)}
								/>
							}
							label={tr("dialog.export_hi_res_png.maintain_print_size")}
						/>
					</div>
					<label>{tr("dialog.export_hi_res_png.dpi")}</label>
					<input
						type="number"
						className="form-control"
						min={0}
						max={10000}
						value={dpi}
						onChange={(e) => updateDpi(parseFloat(e.target.value))}
					/>
					<div style={{ gridColumn: "2 / -1" }}>
						<div
							className="form-label"
							style={{ textAlign: "left" }}
							dangerouslySetInnerHTML={{
								__html: tr("dialog.export_hi_res_png.size_@mf", scaledPageSize),
							}}
						/>
						<div
							className="form-label"
							style={{ textAlign: "left" }}
							dangerouslySetInnerHTML={{
								__html: tr(
									"dialog.export_hi_res_png.print_size_@mf",
									scaledPrintSize
								),
							}}
						/>
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
