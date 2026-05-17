/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";

import EventBus from "../../event_bus";
import store from "../../store";
import { tr } from "../../translations";
import _ from "../../util";
import BorderPanel from "./border";
import FillPanel from "./fill";
import PanelBase from "./panel_base";

interface PageTemplatePanelProps {
	onNewValues: (type: string) => void;
}

const pageSizeLookups: Record<string, [number, number]> = {
	a3: [1123, 1587],
	a4: [794, 1123],
	a5: [559, 794],
	letter: [816, 1056],
	"gov-letter": [768, 1008],
	legal: [816, 1344],
	"junior-legal": [480, 768],
};

export default function PageTemplatePanel({
	onNewValues,
}: PageTemplatePanelProps) {
	const template = store.state.template.page;
	const [width, setWidth] = useState(template.width);
	const [height, setHeight] = useState(template.height);
	const [sizePreset, setSizePreset] = useState({
		format: (template.sizePreset as any)?.format || "custom",
		orientation: (template.sizePreset as any)?.orientation || "vertical",
	});
	const [aspectRatio, setAspectRatio] = useState(
		template.width / template.height
	);
	const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

	const haveCustomFormat = sizePreset.format === "custom";

	function newValues() {
		EventBus.emit("page-resize", undefined);
		onNewValues("page");
	}

	function updateValues(
		newWidth: number,
		newHeight: number,
		newPreset = sizePreset
	) {
		let w = newWidth;
		let h = newHeight;
		const t = store.state.template.page;
		let haveChange = false;
		if (w !== t.width || h !== t.height) {
			if (maintainAspectRatio) {
				if (w !== t.width) {
					h = Math.floor(w / aspectRatio);
				} else if (h !== t.height) {
					w = Math.floor(h * aspectRatio);
				}
			}
			t.width = w;
			t.height = h;
			setWidth(w);
			setHeight(h);
			haveChange = true;
		}
		if (!_.isEqual(t.sizePreset, newPreset)) {
			t.sizePreset = { ...newPreset } as any;
			haveChange = true;
		}
		if (haveChange) {
			newValues();
		}
	}

	function updatePagePreset(newFormat: string) {
		const newPreset = { ...sizePreset, format: newFormat };
		let w = width;
		let h = height;
		let newAspectRatio = aspectRatio;
		if (newFormat !== "custom") {
			setMaintainAspectRatio(false);
			const pageSize = pageSizeLookups[newFormat];
			if (sizePreset.orientation === "vertical") {
				w = pageSize[0];
				h = pageSize[1];
			} else {
				w = pageSize[1];
				h = pageSize[0];
			}
			newAspectRatio = w / h;
			setAspectRatio(newAspectRatio);
		}
		setSizePreset(newPreset);
		updateValues(w, h, newPreset);
	}

	function updateOrientation(newOrientation: string) {
		const newPreset = { ...sizePreset, orientation: newOrientation };
		const newWidth = height;
		const newHeight = width;
		const newAspectRatio = 1 / aspectRatio;
		setAspectRatio(newAspectRatio);
		setSizePreset(newPreset);
		updateValues(newWidth, newHeight, newPreset);
	}

	function changeAspectRatio(checked: boolean) {
		setMaintainAspectRatio(checked);
		if (checked) {
			const newHeight = Math.floor(width / aspectRatio);
			updateValues(width, newHeight);
		}
	}

	function printedSize(unit: string) {
		return {
			width: _.round(_.units.pixelsToUnits(width, unit as "cm" | "in"), 2),
			height: _.round(_.units.pixelsToUnits(height, unit as "cm" | "in"), 2),
		};
	}

	return (
		<div>
			<PanelBase title="template.page.title" labelWidth="100px">
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<Select
						value={sizePreset.format}
						className="form-dropdown"
						onChange={(e) => updatePagePreset(e.target.value)}
					>
						<MenuItem value="custom">
							{tr("template.page.formats.custom")}
						</MenuItem>
						{Object.keys(pageSizeLookups).map((key) => (
							<MenuItem key={key} value={key}>
								{tr(`template.page.formats.${key}`)}
							</MenuItem>
						))}
					</Select>
					<RadioGroup
						row
						value={sizePreset.orientation}
						onChange={(e) => updateOrientation(e.target.value)}
					>
						<FormControlLabel
							className="el-radio"
							value="horizontal"
							disabled={haveCustomFormat}
							control={<Radio />}
							label={tr("template.page.orientation.landscape")}
						/>
						<FormControlLabel
							className="el-radio"
							value="vertical"
							disabled={haveCustomFormat}
							control={<Radio />}
							label={tr("template.page.orientation.portrait")}
						/>
					</RadioGroup>
					<div className="form-row">
						<label>{tr("template.page.width")}</label>
						<input
							type="number"
							min={0}
							disabled={!haveCustomFormat}
							className="form-control"
							value={width}
							style={{ width: 100 }}
							onChange={(e) => {
								const v = parseInt(e.target.value, 10) || 0;
								setWidth(v);
								updateValues(v, height);
							}}
						/>
					</div>
					<div className="form-row">
						<label>{tr("template.page.height")}</label>
						<input
							type="number"
							min={0}
							disabled={!haveCustomFormat}
							className="form-control"
							value={height}
							style={{ width: 100 }}
							onChange={(e) => {
								const v = parseInt(e.target.value, 10) || 0;
								setHeight(v);
								updateValues(width, v);
							}}
						/>
					</div>
					<FormControlLabel
						className="el-checkbox"
						disabled={!haveCustomFormat}
						control={
							<Checkbox
								size="large"
								checked={maintainAspectRatio}
								onChange={(e) => changeAspectRatio(e.target.checked)}
							/>
						}
						label={tr("template.page.aspect_ratio_@mf", {
							aspect_ratio: aspectRatio.toFixed(2),
						})}
					/>
					<div className="pageSizeInfo">
						<div
							dangerouslySetInnerHTML={{
								__html: tr("template.page.printed_size"),
							}}
						/>
						<div
							dangerouslySetInnerHTML={{
								__html: tr(
									"template.page.centimeter_size_@mf",
									printedSize("cm")
								),
							}}
						/>
						<div
							dangerouslySetInnerHTML={{
								__html: tr("template.page.inch_size_@mf", printedSize("in")),
							}}
						/>
					</div>
				</div>
			</PanelBase>
			<FillPanel templateEntry="page" onNewValues={newValues} />
			<BorderPanel templateEntry="page" onNewValues={newValues} />
		</div>
	);
}
