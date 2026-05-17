/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";

import { Button } from "../components/button";

import { tr } from "../translations";
import _ from "../util";
import { addCustomFont, getFamilyNames } from "./font_utils";

interface StyleDialogProps {
	title?: string;
	text?: string;
	color?: string;
	font?: string;
	onOk: (v: { text: string; font: string; color: string }) => void;
	onCancel: () => void;
	onClose: () => void;
}

export default function StyleDialog({
	title: titleProp,
	text: textProp = "",
	color: colorProp = "",
	font: fontProp = "",
	onOk,
	onCancel,
	onClose,
}: StyleDialogProps) {
	const [title] = useState(titleProp || tr("dialog.style.title"));
	const [text, setText] = useState(textProp);
	const [color, setColor] = useState("");
	const [family, setFamily] = useState("");
	const [size, setSize] = useState(0);
	const [bold, setBold] = useState(false);
	const [italic, setItalic] = useState(false);
	const familyNames = getFamilyNames();

	useEffect(() => {
		const parsedColor = _.color.toRGB(colorProp).toString();
		setColor(parsedColor);
		const fontParts = _.fontToFontParts(fontProp);
		addCustomFont(fontParts.fontFamily || "");
		setFamily(fontParts.fontFamily || "");
		setSize(parseInt(fontParts.fontSize || "14px", 10));
		setBold(fontParts.fontWeight === "bold");
		setItalic(fontParts.fontStyle === "italic");
	}, [colorProp, fontProp]);

	function ok() {
		onOk({
			text,
			font: _.fontString({
				family,
				size,
				bold: bold ? "bold" : "",
				italic: italic ? "italic" : "",
			}),
			color,
		});
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="styleDialog"
			PaperProps={{ style: { width: "500px" } }}
		>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "100px 1fr",
						gap: 8,
						alignItems: "start",
					}}
				>
					<label>{tr("dialog.style.label_text")}</label>
					<textarea
						rows={2}
						className="form-control"
						value={text}
						onChange={(e) => setText(e.target.value)}
					/>
					<label>{tr("glossary.font")}</label>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							flexWrap: "wrap",
						}}
					>
						<Select
							value={family}
							className="form-dropdown"
							onChange={(e: SelectChangeEvent) => setFamily(e.target.value)}
						>
							{familyNames.map((group) =>
								group.options.map((font) => (
									<MenuItem key={font} value={font}>
										{font}
									</MenuItem>
								))
							)}
						</Select>
						<Button
							variant={bold ? null : "outlined"}
							onClick={() => setBold((b) => !b)}
						>
							<strong>B</strong>
						</Button>
						<Button
							variant={italic ? null : "outlined"}
							onClick={() => setItalic((i) => !i)}
						>
							<em>I</em>
						</Button>
					</div>
					<label>{tr("glossary.font_size")}</label>
					<input
						type="number"
						className="form-control"
						min={0}
						value={size}
						style={{ width: 75 }}
						onChange={(e) => setSize(parseInt(e.target.value, 10))}
					/>
					<label>{tr("glossary.color")}</label>
					<input
						type="color"
						value={color}
						onChange={(e) => setColor(e.target.value)}
						className="form-control color-picker-button"
					/>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="outlined" onClick={onCancel}>
					{tr("dialog.cancel")}
				</Button>
				<Button onClick={ok}>{tr("dialog.ok")}</Button>
			</DialogActions>
		</Dialog>
	);
}
