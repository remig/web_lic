/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";

import store from "../../store";
import { tr } from "../../translations";
import _ from "../../util";
import PanelBase from "./panel_base";

interface BorderPanelProps {
	templateEntry: string;
	title?: string;
	onNewValues: (opts: any) => void;
}

export default function BorderPanel({
	templateEntry,
	title = "template.border.title",
	onNewValues,
}: BorderPanelProps) {
	const template = _.get(store.state.template, templateEntry);
	const [color, setColor] = useState<string>(template.border.color || "");
	const [width, setWidth] = useState<number>(template.border.width || 0);
	const [cornerRadius, setCornerRadius] = useState<number | null>(
		template.border.cornerRadius != null ? template.border.cornerRadius : null
	);
	const [innerMargin, setInnerMargin] = useState<number | null>(
		template.innerMargin == null ? null : template.innerMargin * 100
	);

	function updateColor(newColor: string) {
		const c = newColor === "transparent" ? null : newColor;
		setColor(c || "");
		updateValues(c, width, cornerRadius, innerMargin);
	}

	function updateValues(
		c: string | null = color,
		w = width,
		cr = cornerRadius,
		im = innerMargin
	) {
		const t = _.get(store.state.template, templateEntry);
		t.border.width = w;
		t.border.color = c;
		t.border.cornerRadius = cr;
		t.innerMargin = im == null ? null : im / 100;
		onNewValues(templateEntry);
	}

	return (
		<PanelBase title={title} labelWidth="120px">
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<div className="form-row">
					<label>{tr("glossary.color")}</label>
					<input
						type="color"
						value={color || "#000000"}
						onChange={(e) => updateColor(e.target.value)}
						className="form-control color-picker-button"
					/>
				</div>
				<div className="form-row">
					<label>{tr("template.border.line_width")}</label>
					<input
						type="number"
						min={0}
						className="form-control"
						value={width}
						style={{ width: 80 }}
						onChange={(e) => {
							const v = parseFloat(e.target.value);
							setWidth(v);
							updateValues(color, v);
						}}
					/>
				</div>
				{cornerRadius != null && (
					<div className="form-row">
						<label>{tr("template.border.corner_radius")}</label>
						<input
							type="number"
							min={0}
							className="form-control"
							value={cornerRadius}
							style={{ width: 80 }}
							onChange={(e) => {
								const v = parseFloat(e.target.value);
								setCornerRadius(v);
								updateValues(color, width, v);
							}}
						/>
					</div>
				)}
				{innerMargin != null && (
					<div className="form-row">
						<label>{tr("template.border.margin")}</label>
						<input
							type="number"
							step={0.1}
							className="form-control"
							value={innerMargin}
							style={{ width: 80 }}
							onChange={(e) => {
								const v = parseFloat(e.target.value);
								setInnerMargin(v);
								updateValues(color, width, cornerRadius, v);
							}}
						/>
					</div>
				)}
			</div>
		</PanelBase>
	);
}
