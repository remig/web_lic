/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useRef, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";

import DialogManager from "../../dialog";
import { addCustomFont, getFamilyNames } from "../../dialogs/font_utils";
import store from "../../store";
import { tr } from "../../translations";
import _ from "../../util";
import { Button } from "../button";
import PanelBase from "./panel_base";

interface FontPanelProps {
	templateEntry: string;
	onNewValues: (opts: any) => void;
}

export default function FontPanel({
	templateEntry,
	onNewValues,
}: FontPanelProps) {
	const template = _.get(store.state.template, templateEntry);
	const initialFontParts = _.fontToFontParts(template.font);
	addCustomFont(initialFontParts.fontFamily || "");

	const [family, setFamily] = useState(initialFontParts.fontFamily || "");
	const [size, setSize] = useState(
		parseInt(initialFontParts.fontSize || "14px", 10)
	);
	const [bold, setBold] = useState(initialFontParts.fontWeight === "bold");
	const [italic, setItalic] = useState(initialFontParts.fontStyle === "italic");
	const [color, setColor] = useState(template.color || "");
	const [familyNames, setFamilyNames] = useState(getFamilyNames);
	const lastFontFamilyRef = useRef(family);

	function updateValues(
		overrides?: Partial<{
			family: string;
			size: number;
			bold: boolean;
			italic: boolean;
			color: string;
		}>
	) {
		const f = overrides?.family ?? family;
		const s = overrides?.size ?? size;
		const b = overrides?.bold ?? bold;
		const i = overrides?.italic ?? italic;
		const c = overrides?.color ?? color;
		const t = _.get(store.state.template, templateEntry);
		t.font = _.fontString({
			family: f,
			size: s,
			bold: b ? "bold" : "",
			italic: i ? "italic" : "",
		});
		t.color = c;
		onNewValues(templateEntry);
	}

	function updateColor(newColor: string) {
		const c = newColor === "transparent" ? null : newColor;
		setColor(c || "");
		updateValues({ color: c || "" });
	}

	function handleFamilyOpen() {
		lastFontFamilyRef.current = family;
	}

	function handleFamilyChange(newFamily: string) {
		if (newFamily === "Custom...") {
			DialogManager("fontNameDialog", (dialog) => {
				dialog.$on("ok", (fontName: string) => {
					setFamily(fontName);
					setFamilyNames(getFamilyNames());
					updateValues({ family: fontName });
				});
				dialog.$on("cancel", () => {
					setFamily(lastFontFamilyRef.current);
				});
				dialog.font = _.fontString({
					family,
					size,
					bold: bold ? "bold" : "",
					italic: italic ? "italic" : "",
				});
				dialog.fontName = "";
			});
		} else {
			setFamily(newFamily);
			updateValues({ family: newFamily });
		}
	}

	return (
		<PanelBase title="glossary.font" labelWidth="70px">
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<div>
					<Select
						value={family}
						className="form-dropdown"
						onOpen={handleFamilyOpen}
						onChange={(e: SelectChangeEvent) =>
							handleFamilyChange(e.target.value)
						}
					>
						{familyNames.map((group) =>
							group.options.map((f) => (
								<MenuItem key={f} value={f}>
									{f}
								</MenuItem>
							))
						)}
					</Select>
				</div>
				<div style={{ display: "flex", gap: 4 }}>
					<Button
						variant={bold ? null : "outlined"}
						onClick={() => {
							const b = !bold;
							setBold(b);
							updateValues({ bold: b });
						}}
					>
						<strong>{tr("template.font.bold_character")}</strong>
					</Button>
					<Button
						variant={italic ? null : "outlined"}
						onClick={() => {
							const i = !italic;
							setItalic(i);
							updateValues({ italic: i });
						}}
					>
						<em>{tr("template.font.italic_character")}</em>
					</Button>
				</div>
				<div className="form-row">
					<label>{tr("glossary.size")}</label>
					<input
						type="number"
						min={0}
						className="form-control"
						value={size}
						style={{ width: 80 }}
						onChange={(e) => {
							const s = parseInt(e.target.value, 10);
							setSize(s);
							updateValues({ size: s });
						}}
					/>
				</div>
				<div className="form-row">
					<label>{tr("glossary.color")}</label>
					<input
						type="color"
						value={color || "#000000"}
						onChange={(e) => updateColor(e.target.value)}
						className="form-control color-picker-button"
						style={{ marginRight: 20 }}
					/>
				</div>
			</div>
		</PanelBase>
	);
}
