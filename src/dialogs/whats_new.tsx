/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";

import { tr } from "../translations";

interface WhatsNewEntry {
	version: string;
	date: string;
	features?: string[];
	bug_fixes?: string[];
}

interface Props {
	onClose: () => void;
}

export default function WhatsNewDialog({ onClose }: Props) {
	const [content, setContent] = useState<WhatsNewEntry[]>([]);

	useEffect(() => {
		fetch("whats_new.json")
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					setContent(data);
				}
			})
			.catch(() => {});
	}, []);

	function niceDate(date: string): string {
		const opts: Intl.DateTimeFormatOptions = {
			month: "long",
			day: "numeric",
			year: "numeric",
		};
		return new Date(date).toLocaleDateString("en-us", opts);
	}

	return (
		<Dialog
			open
			id="whats_new_dialog"
			onClose={onClose}
			maxWidth={false}
			className="whatsNewDialog"
			PaperProps={{ style: { width: "700px" } }}
		>
			<DialogTitle>{tr("dialog.whats_new.title")}</DialogTitle>
			<DialogContent style={{ maxHeight: "40vh", overflowY: "auto" }}>
				{content.map((entry, eID) => (
					<div key={`entry_${eID}`} className="oneEntry">
						<h4>
							{tr("dialog.whats_new.version")}
							<strong style={{ padding: "0 5px" }}>{entry.version},</strong>
							<span className="date" style={{ fontSize: "85%" }}>
								{niceDate(entry.date)}
							</span>
						</h4>
						<div className="innerContent" style={{ padding: "5px 0 0 15px" }}>
							{entry.features && entry.features.length > 0 && (
								<>
									<h5>{tr("dialog.whats_new.features")}</h5>
									<ul style={{ paddingLeft: 35 }}>
										{entry.features.map((f, fID) => (
											<li key={`feature_${eID}_${fID}`} style={{ padding: 5 }}>
												{f}
											</li>
										))}
									</ul>
								</>
							)}
							{entry.bug_fixes && entry.bug_fixes.length > 0 && (
								<>
									<h5>{tr("dialog.whats_new.bug_fixes")}</h5>
									<ul style={{ paddingLeft: 35 }}>
										{entry.bug_fixes.map((b, bID) => (
											<li key={`bug_${eID}_${bID}`} style={{ padding: 5 }}>
												{b}
											</li>
										))}
									</ul>
								</>
							)}
						</div>
					</div>
				))}
			</DialogContent>
			<DialogActions>
				<Button variant="ok" onClick={onClose} />
			</DialogActions>
		</Dialog>
	);
}
