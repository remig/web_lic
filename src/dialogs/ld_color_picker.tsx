/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";

import LDParse from "../ld_parse";
import Storage from "../storage";
import { tr } from "../translations";
import _ from "../util";

const customColors = Storage.get.customBrickColors() as any;

function buildColorTable() {
	const colors: { id: number; name: string; color: string; edge: string }[] =
		[];
	_.forOwn(LDParse.colorTable as any, (v: any, k: string) => {
		if (v.color < 0 || v.edge < 0) {
			return;
		}
		const id = parseInt(k, 10);
		const customColor = customColors[id] || {};
		colors.push({
			id,
			name: v.name,
			color: customColor.color || v.color,
			edge: customColor.edge || v.edge,
		});
	});
	return colors;
}

const colorData = buildColorTable();

interface Props {
	onOk: (colorCode: number) => void;
	onCancel: () => void;
	onClose: () => void;
}

export default function LdColorPickerDialog({
	onOk,
	onCancel,
	onClose,
}: Props) {
	function pick(colorCode: number) {
		onOk(colorCode);
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="ldColorPickerDialog"
			PaperProps={{ style: { width: "500px" } }}
		>
			<DialogTitle>{tr("dialog.ld_color_picker.title")}</DialogTitle>
			<DialogContent style={{ maxHeight: "70vh" }}>
				<table style={{ tableLayout: "fixed", width: "100%" }}>
					<thead>
						<tr>
							<th style={{ width: 100 }}>
								{tr("dialog.ld_color_picker.ld_code")}
							</th>
							<th style={{ width: 140, textAlign: "left" }}>
								{tr("dialog.ld_color_picker.name")}
							</th>
							<th style={{ width: 50, textAlign: "left" }}>
								{tr("dialog.ld_color_picker.choose")}
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
					<table style={{ tableLayout: "fixed", width: "100%" }}>
						<tbody>
							{colorData.map((row) => (
								<tr key={row.id} style={{ height: 44 }}>
									<td style={{ width: 100, textAlign: "center" }}>{row.id}</td>
									<td style={{ width: 140, textAlign: "left" }}>
										{_.startCase(row.name)}
									</td>
									<td style={{ width: 50, textAlign: "center" }}>
										<div
											onClick={() => pick(row.id)}
											style={{
												width: 30,
												height: 30,
												border: "1px solid #ccc",
												borderRadius: 4,
												padding: 3,
												marginLeft: 20,
												cursor: "pointer",
											}}
										>
											<div
												style={{
													width: "100%",
													height: "100%",
													backgroundColor: row.color,
													border: "1px solid #999",
													borderRadius: 2,
												}}
											/>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={onCancel} />
			</DialogActions>
		</Dialog>
	);
}
