/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";

import cache from "../../cache";
import { readDpi } from "../../changedpi";
import DialogManager from "../../dialog";
import openFileHandler from "../../file_uploader";
import store from "../../store";
import { tr } from "../../translations";
import _ from "../../util";
import { Button } from "../button";
import PanelBase from "./panel_base";

interface FillPanelProps {
	templateEntry: string;
	title?: string;
	onNewValues: (opts: any) => void;
}

export default function FillPanel({
	templateEntry,
	title = "template.fill.title",
	onNewValues,
}: FillPanelProps) {
	const template = _.get(store.state.template, templateEntry).fill;
	const [color, setColor] = useState<string>(template.color || "");
	const [imageFilename, setImageFilename] = useState<string | null>(
		template.image == null ? null : template.image.filename || ""
	);

	const gradient = template.gradient;

	function updateColor(newColor: string) {
		const c = newColor === "transparent" ? null : newColor;
		setColor(c || "");
		const t = _.get(store.state.template, templateEntry).fill;
		t.color = c;
		onNewValues({ type: templateEntry, noLayout: true });
	}

	function updateValues() {
		const t = _.get(store.state.template, templateEntry).fill;
		t.color = color;
		onNewValues({ type: templateEntry, noLayout: true });
	}

	function pickImage() {
		openFileHandler(
			".png",
			"dataURL",
			(src: string | ArrayBuffer | null, filename: string) => {
				const t = _.get(store.state.template, templateEntry);
				const dpi = Math.round(readDpi(src as string) || 96);
				const originalFillImage = _.cloneDeep(t.fill.image);
				if (_.isEmpty(t.fill.image)) {
					t.fill.image = {};
				}
				t.fill.image.filename = filename;
				t.fill.image.src = src as string;
				t.fill.image.dpi = dpi;
				setImageFilename(filename);

				const image = new Image();
				image.onload = () => {
					if (templateEntry === "page") {
						if (image.width !== t.width || image.height !== t.height) {
							DialogManager("resizeImageDialog", (dialog) => {
								dialog.$on("update", (newImageInfo: any) => {
									t.fill.image = newImageInfo;
									onNewValues({ type: templateEntry, noLayout: true });
								});
								dialog.$on("ok", (newImageInfo: any) => {
									t.fill.image = newImageInfo;
									onNewValues({ type: templateEntry, noLayout: true });
								});
								dialog.$on("cancel", () => {
									t.fill.image = originalFillImage;
									onNewValues({ type: templateEntry, noLayout: true });
								});
								const imgInfo = t.fill.image;
								imgInfo.width = imgInfo.originalWidth = image.width;
								imgInfo.height = imgInfo.originalHeight = image.height;
								_.assign(dialog.imageInfo, t.fill.image);
							});
						}
					}
					cache.set("page", "backgroundImage", image);
					onNewValues({ type: templateEntry, noLayout: true });
				};
				image.src = src as string;
			}
		);
	}

	function removeImage() {
		const t = _.get(store.state.template, templateEntry).fill;
		t.image = "";
		setImageFilename("");
		onNewValues({ type: templateEntry, noLayout: true });
	}

	const truncatedName =
		imageFilename && imageFilename.length > 12
			? imageFilename.substr(0, 5) + "...png"
			: imageFilename;

	return (
		<PanelBase title={title} labelWidth="80px">
			<div className="form-row">
				<label>{tr("glossary.color")}</label>
				<input
					type="color"
					value={color || "#ffffff"}
					onChange={(e) => updateColor(e.target.value)}
					onBlur={updateValues}
					className="form-control color-picker-button"
				/>
			</div>
			{gradient != null && (
				<div className="form-row">
					<label>{tr("template.fill.gradient")}</label>
					<label>NYI</label>
				</div>
			)}
			{imageFilename != null && (
				<div className="form-row">
					<label>{tr("template.fill.image")}</label>
					{imageFilename ? (
						<>
							<Button
								variant="outlined"
								onClick={pickImage}
								style={{
									padding: "0 5px",
									overflow: "hidden",
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								<i className="far fa-image" style={{ fontSize: 24 }} />
								{truncatedName}
							</Button>
							<Button
								variant="outlined"
								onClick={removeImage}
								style={{ padding: "0 5px" }}
							>
								<i className="far fa-times-circle" />
							</Button>
						</>
					) : (
						<Button
							variant="outlined"
							onClick={pickImage}
							style={{ width: 80, justifyContent: "center" }}
						>
							<i
								className="far fa-image"
								style={{ fontSize: 24, padding: "0 5px" }}
							/>
						</Button>
					)}
				</div>
			)}
		</PanelBase>
	);
}
