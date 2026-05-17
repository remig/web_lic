/* Web Lic - Copyright (C) 2019 Remi Gagne */

import React, { useEffect, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

import { Button } from "../components/button";

import type { Anchors } from "../item_types";
import store from "../store";
import { tr } from "../translations";
import _ from "../util";

const anchorOffsets: Record<string, { x: number; y: number }> = {
	top_left: { x: 0, y: 0 },
	top: { x: 0.5, y: 0 },
	top_right: { x: 1, y: 0 },
	left: { x: 0, y: 0.5 },
	center: { x: 0.5, y: 0.5 },
	right: { x: 1, y: 0.5 },
	bottom_left: { x: 0, y: 1 },
	bottom: { x: 0.5, y: 1 },
	bottom_right: { x: 1, y: 1 },
};

const anchorKeys = Object.keys(anchorOffsets);

interface ImageInfo {
	filename: string;
	src: string | null;
	width: number;
	originalWidth: number;
	height: number;
	originalHeight: number;
	x: number;
	y: number;
	dpi: number;
	preserveSize: boolean;
	preserveAspectRatio: boolean;
	anchorPosition: Anchors;
	pageWidth: number;
	pageHeight: number;
}

interface Props {
	imageInfo?: Partial<ImageInfo>;
	onOk: (v: ImageInfo) => void;
	onCancel: () => void;
	onUpdate?: (v: ImageInfo) => void;
	onClose: () => void;
}

export default function ResizeImageDialog({
	imageInfo: imageInfoProp,
	onOk,
	onCancel,
	onUpdate,
	onClose,
}: Props) {
	const page = store.state.template.page;
	const [info, setInfo] = useState<ImageInfo>(() => ({
		filename: "",
		src: null,
		width: 0,
		originalWidth: 0,
		height: 0,
		originalHeight: 0,
		x: 0,
		y: 0,
		dpi: 0,
		preserveSize: true,
		preserveAspectRatio: true,
		anchorPosition: "top_left",
		pageWidth: page.width,
		pageHeight: page.height,
		...imageInfoProp,
	}));

	function computeImageInfo(i: ImageInfo): ImageInfo {
		const result = { ...i };
		if (result.preserveSize) {
			result.width = result.originalWidth;
			result.height = result.originalHeight;
		} else {
			if (result.preserveAspectRatio) {
				const ar = result.originalWidth / result.originalHeight;
				const dw = result.pageWidth - result.pageWidth / ar;
				let scaleBy: "width" | "height" = "height";
				if (result.originalWidth < result.pageWidth) {
					if (result.originalHeight < result.pageHeight && dw > 0) {
						scaleBy = "width";
					}
				} else if (result.originalHeight <= result.pageHeight) {
					scaleBy = "width";
				}
				if (scaleBy === "width") {
					result.width = result.pageWidth;
					result.height = result.width / ar;
				} else {
					result.height = result.pageHeight;
					result.width = result.height * ar;
				}
			} else {
				result.width = result.pageWidth;
				result.height = result.pageHeight;
			}
		}
		result.width = Math.round(result.width);
		result.height = Math.round(result.height);
		const anchor = anchorOffsets[result.anchorPosition];
		result.x = Math.round(
			result.pageWidth * anchor.x - result.width * anchor.x
		);
		result.y = Math.round(
			result.pageHeight * anchor.y - result.height * anchor.y
		);
		return result;
	}

	useEffect(() => {
		if (imageInfoProp) {
			const merged: ImageInfo = {
				filename: "",
				src: null,
				width: 0,
				originalWidth: 0,
				height: 0,
				originalHeight: 0,
				x: 0,
				y: 0,
				dpi: 0,
				preserveSize: true,
				preserveAspectRatio: true,
				anchorPosition: "top_left",
				pageWidth: page.width,
				pageHeight: page.height,
				...imageInfoProp,
			};
			const computed = computeImageInfo(merged);
			setInfo(computed);
		}
	}, [imageInfoProp, page.height, page.width]);

	function update(next: ImageInfo) {
		const computed = computeImageInfo(next);
		setInfo(computed);
		onUpdate?.(_.clone(computed));
	}

	const isTooBig =
		info.originalWidth > info.pageWidth ||
		info.originalHeight > info.pageHeight;
	const aspectRatiosMatch = _.equal(
		info.originalWidth / info.originalHeight,
		info.pageWidth / info.pageHeight,
		0.0001
	);
	const bodyText = tr(
		`dialog.resize_image.${isTooBig ? "too_big" : "too_small"}`
	);
	const resizeText = tr(
		`dialog.resize_image.${isTooBig ? "shrink" : "stretch"}`
	);
	const needAspectRatioUI = !info.preserveSize && !aspectRatiosMatch;
	const needPositionUI =
		info.preserveSize || aspectRatiosMatch || info.preserveAspectRatio;

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="resizeImageDialog"
			PaperProps={{ style: { width: "500px" } }}
		>
			<DialogTitle>{tr("dialog.resize_image.title")}</DialogTitle>
			<DialogContent>
				<div style={{ display: "inline-block", margin: 10 }}>{bodyText}</div>
				{info.dpi > 96 && (
					<div style={{ display: "inline-block", margin: 10 }}>
						{tr("dialog.resize_image.high_dpi_@mf", { dpi: info.dpi })}
					</div>
				)}
				<div>
					<Switch
						checked={info.preserveSize}
						onChange={(e) =>
							update({ ...info, preserveSize: e.target.checked })
						}
					/>
					<span>
						{info.preserveSize
							? tr("dialog.resize_image.do_nothing")
							: resizeText}
					</span>
				</div>
				{needAspectRatioUI && (
					<FormControlLabel
						control={
							<Checkbox
								checked={info.preserveAspectRatio}
								onChange={(e) =>
									update({ ...info, preserveAspectRatio: e.target.checked })
								}
							/>
						}
						label={tr("dialog.resize_image.preserve_aspect_ratio")}
					/>
				)}
				{needPositionUI && (
					<div className="position-picker">
						<div>{tr("dialog.resize_image.anchor_text")}</div>
						<table className="anchor-table" style={{ marginTop: 5 }}>
							<tbody>
								{[0, 1, 2].map((row) => (
									<tr key={row}>
										{[0, 1, 2].map((col) => {
											const key = anchorKeys[row * 3 + col];
											return (
												<td
													key={col}
													style={{ width: "33%", border: "1px solid #c7c7c7" }}
												>
													<Button
														variant={
															info.anchorPosition === key ? null : "text"
														}
														fullWidth
														onClick={() =>
															update({
																...info,
																anchorPosition: key as Anchors,
															})
														}
													>
														{tr(`dialog.resize_image.anchors.${key}`)}
													</Button>
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={onCancel} />
				<Button
					variant="ok"
					onClick={() => onOk(_.clone(computeImageInfo(info)))}
				/>
			</DialogActions>
		</Dialog>
	);
}
