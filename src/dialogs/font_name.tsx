/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";

import { tr } from "../translations";
import _ from "../util";
import { addCustomFont } from "./font_utils";

interface Props {
	font?: string;
	fontName?: string;
	onOk: (fontName: string) => void;
	onCancel: () => void;
	onClose: () => void;
}

export default function FontNameDialog({
	font: fontProp = "",
	fontName: fontNameProp = "",
	onOk,
	onCancel,
	onClose,
}: Props) {
	const [font, setFont] = useState(fontProp);
	const [fontName, setFontName] = useState(fontNameProp);

	function updateValues(name: string) {
		setFontName(name);
		const fontParts = _.fontToFontParts(font);
		fontParts.fontFamily = name;
		setFont(_.fontPartsToFont(fontParts));
	}

	function ok() {
		addCustomFont(fontName);
		onOk(fontName);
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="fontNameDialog"
			PaperProps={{ style: { width: "630px" } }}
		>
			<DialogTitle>{tr("dialog.custom_font.title")}</DialogTitle>
			<DialogContent>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "160px 1fr",
						gap: 8,
						alignItems: "center",
					}}
				>
					<label style={{ lineHeight: "2rem" }}>
						{tr("dialog.custom_font.name_input")}
					</label>
					<input
						className="form-control"
						value={fontName}
						onChange={(e) => updateValues(e.target.value)}
					/>
					<label>{tr("dialog.custom_font.sample_text")}</label>
					<div style={{ font, lineHeight: "15px" }} className="fontNameDisplay">
						{tr("dialog.custom_font.sample_characters")}
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
