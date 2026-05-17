/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";

import backwardCompat from "../backward_compat";
import EventBus from "../event_bus";
import { type ColorTableEntry, type LDrawColorCode } from "../item_types";
import LDParse from "../ld_parse";
import Storage from "../storage";
import store from "../store";
import { tr } from "../translations";
import _ from "../util";

const customColors = Storage.get.customBrickColors();

interface ColorRow {
	id: LDrawColorCode;
	name: string;
	color: string;
	edge: string;
}

function buildColorTable(): ColorRow[] {
	const colors: ColorRow[] = [];
	_.forOwn(LDParse.colorTable, (v: ColorTableEntry, k: string) => {
		const id = parseInt(k, 10);
		const customColor = (customColors as any)[id] || {};
		colors.push({
			id,
			name: v.name,
			color: customColor.color || v.color,
			edge: customColor.edge || v.edge,
		});
	});
	return colors;
}

interface Props {
	onClose: () => void;
}

export default function BrickColorsDialog({ onClose }: Props) {
	const [colorData, setColorData] = useState<ColorRow[]>(buildColorTable);

	function updateColor(idx: number, field: "color" | "edge", value: string) {
		setColorData((prev) =>
			prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
		);
	}

	function reset() {
		setColorData(
			LDParse.colorTable
				? Object.entries(LDParse.colorTable as any).map(([k, v]: any) => ({
						id: parseInt(k, 10),
						name: v.name,
						color: v.color,
						edge: v.edge,
					}))
				: []
		);
	}

	function ok() {
		colorData.forEach((el) => {
			const ldColor = (LDParse.colorTable as any)[el.id];
			let customColor = (customColors as any)[el.id];
			if (ldColor.color === el.color && customColor) {
				delete customColor.color;
				delete customColor.rgba;
			} else if (ldColor.color !== el.color) {
				customColor = (customColors as any)[el.id] =
					(customColors as any)[el.id] || {};
				customColor.color = el.color;
			}
			if (ldColor.edge === el.edge && customColor) {
				delete customColor.edge;
				delete customColor.edgeRgba;
			} else if (ldColor.edge !== el.edge) {
				customColor = (customColors as any)[el.id] =
					(customColors as any)[el.id] || {};
				customColor.edge = el.edge;
			}
			if (_.isEmpty(customColor)) {
				delete (customColors as any)[el.id];
			}
		});
		const fixedColors = backwardCompat.fixColorTable(customColors);
		LDParse.setCustomColorTable(fixedColors);
		Storage.replace.customBrickColors(fixedColors);
		store.mutations.csi.markAllDirty();
		store.mutations.pliItem.markAllDirty();
		EventBus.emit("redraw-ui", undefined);
		onClose();
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="brickColorDialog"
			PaperProps={{ style: { width: "500px" } }}
		>
			<DialogTitle>{tr("dialog.brick_colors.title")}</DialogTitle>
			<DialogContent style={{ maxHeight: "70vh" }}>
				<table style={{ tableLayout: "fixed", width: 440 }}>
					<thead>
						<tr>
							<th style={{ width: 110 }}>
								{tr("dialog.brick_colors.ld_code")}
							</th>
							<th style={{ width: 160, textAlign: "left" }}>
								{tr("dialog.brick_colors.name")}
							</th>
							<th style={{ width: 60 }}>{tr("glossary.color")}</th>
							<th style={{ width: 110 }}>
								{tr("dialog.brick_colors.edge_color")}
							</th>
						</tr>
					</thead>
				</table>
				<div
					style={{
						maxHeight: "64vh",
						overflowX: "hidden",
						overflowY: "scroll",
					}}
				>
					<table style={{ tableLayout: "fixed", width: 440 }}>
						<tbody>
							{colorData.map((row, idx) => (
								<tr key={row.id} style={{ height: 44, padding: "5px 0" }}>
									<td style={{ width: 110, textAlign: "center" }}>{row.id}</td>
									<td style={{ width: 160, textAlign: "left" }}>
										{_.startCase(row.name)}
									</td>
									<td style={{ width: 60, textAlign: "center" }}>
										<input
											type="color"
											className="form-control color-picker-button"
											value={row.color}
											onChange={(e) =>
												updateColor(idx, "color", e.target.value)
											}
										/>
									</td>
									<td style={{ width: 110, textAlign: "center" }}>
										<input
											type="color"
											className="form-control color-picker-button"
											value={row.edge}
											onChange={(e) => updateColor(idx, "edge", e.target.value)}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" wide onClick={reset}>
					{tr("dialog.reset")}
				</Button>
				<Button variant="cancel" onClick={onClose} />
				<Button variant="ok" onClick={ok} />
			</DialogActions>
		</Dialog>
	);
}
