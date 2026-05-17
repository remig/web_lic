/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Tooltip from "@mui/material/Tooltip";

import { Button } from "../components/button";

import openFileHandler from "../file_uploader";
import LDParse from "../ld_parse";
import { tr } from "../translations";
import _ from "../util";

interface MissingPartEntry {
	uploaded: boolean;
	count: number;
}

function buildMissingPartsTable(): Record<string, MissingPartEntry> {
	const missingParts = _.cloneDeep(LDParse.missingParts);
	const result: Record<string, MissingPartEntry> = {};
	_.forOwn(missingParts, (value: number, key: string) => {
		result[key] = { uploaded: false, count: value };
	});
	return result;
}

interface Props {
	onClose: () => void;
}

export default function MissingPartsDialog({ onClose }: Props) {
	const [missingPartsData, setMissingPartsData] = useState(
		buildMissingPartsTable
	);
	const [loadedPartContent, setLoadedPartContent] = useState<
		Record<string, string | null>
	>({});
	const enablePartSend = window.location.host
		.toLowerCase()
		.includes("bugeyedmonkeys");

	const stillHaveMissingParts = _.some(missingPartsData, (p) => !p.uploaded);

	function ok() {
		if (stillHaveMissingParts) {
			LDParse.model.removeMissingParts();
		}
		onClose();
	}

	function upload(filename: string) {
		openFileHandler(
			".dat, .ldr, .mpd",
			"text",
			(content: string | ArrayBuffer | null) => {
				LDParse.loadPartContent(filename, content as string).then(() => {
					setLoadedPartContent((prev) => ({
						...prev,
						[filename]: content as string,
					}));
					setMissingPartsData((prev) => {
						const next = {
							...prev,
							[filename]: { ...prev[filename], uploaded: true },
						};
						_.each(LDParse.missingParts, (count: number, fn: string) => {
							if (!(fn in next)) {
								next[fn] = { uploaded: false, count };
							}
						});
						return next;
					});
				});
			}
		);
	}

	function sendToRemote(filename: string) {
		if (enablePartSend) {
			const xhr = new XMLHttpRequest();
			xhr.open("POST", "http://bugeyedmonkeys.com/lic/upload_part.php", true);
			xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			const content = `&content=filename: ${filename}\n-----\n${loadedPartContent[filename]}\n-----`;
			xhr.send(content);
		}
		setLoadedPartContent((prev) => ({ ...prev, [filename]: null }));
	}

	function showSendButton(filename: string): boolean {
		return (
			!!missingPartsData[filename]?.uploaded &&
			enablePartSend &&
			loadedPartContent[filename] != null
		);
	}

	const okText = stillHaveMissingParts
		? tr("dialog.missing_parts.proceed")
		: tr("dialog.ok");

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="missingPartsDialog"
			PaperProps={{ style: { width: "550px" } }}
		>
			<DialogTitle>{tr("dialog.missing_parts.title")}</DialogTitle>
			<DialogContent style={{ maxHeight: "70vh" }}>
				<div
					className="subheading"
					style={{
						paddingBottom: 20,
						borderBottom: "1px solid #ddd",
						marginBottom: 20,
					}}
					dangerouslySetInnerHTML={{
						__html: tr("dialog.missing_parts.subtitle"),
					}}
				/>
				<table
					className="missingPartsTable"
					style={{ tableLayout: "fixed", width: "100%" }}
				>
					<tbody>
						{Object.entries(missingPartsData).map(([filename, value]) => (
							<tr key={filename} style={{ height: 50 }}>
								<td style={{ textAlign: "right" }}>
									{value.uploaded && (
										<i
											className="fas fa-check"
											style={{ color: "#00c700", marginRight: 10 }}
										/>
									)}
									{filename}
								</td>
								<td style={{ width: 125, textAlign: "center" }}>
									{tr("dialog.missing_parts.used_@mf", { count: value.count })}
								</td>
								<td style={{ width: 200, textAlign: "center" }}>
									{showSendButton(filename) ? (
										<Tooltip
											title={
												<span
													dangerouslySetInnerHTML={{
														__html: tr(
															"dialog.missing_parts.send_to_remote.tooltip"
														),
													}}
												/>
											}
										>
											<Button wide onClick={() => sendToRemote(filename)}>
												{tr("dialog.missing_parts.send_to_remote.title")}
											</Button>
										</Tooltip>
									) : !value.uploaded ? (
										<Button wide onClick={() => upload(filename)}>
											{tr("glossary.import")}
										</Button>
									) : null}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</DialogContent>
			<DialogActions>
				<Button wide onClick={ok}>
					{okText}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
