/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";

import packageInfo from "../../package.json";
import { tr } from "../translations";

interface Props {
	onClose: () => void;
}

export default function AboutLicDialog({ onClose }: Props) {
	const version = packageInfo.version;

	return (
		<Dialog
			open
			id="about_lic_dialog"
			onClose={onClose}
			maxWidth={false}
			className="aboutLicDialog"
			PaperProps={{ style: { width: "700px" } }}
		>
			<DialogTitle>{tr("dialog.about_lic.title")}</DialogTitle>
			<DialogContent>
				<h4>{tr("dialog.about_lic.version_@mf", { version })}</h4>
				<div
					dangerouslySetInnerHTML={{
						__html: tr(
							"dialog.about_lic.free_@link",
							"https://github.com/remig/web_lic"
						),
					}}
				/>
				<div
					dangerouslySetInnerHTML={{
						__html: tr(
							"dialog.about_lic.read_more_@link",
							"http://bugeyedmonkeys.com/lic/about/"
						),
					}}
				/>
				<div
					dangerouslySetInnerHTML={{
						__html: tr(
							"dialog.about_lic.ldraw_@link",
							"https://www.ldraw.org/"
						),
					}}
				/>
				<div
					dangerouslySetInnerHTML={{
						__html: tr(
							"dialog.about_lic.contact_@link",
							"https://github.com/remig/web_lic/issues"
						),
					}}
				/>
				<div
					dangerouslySetInnerHTML={{
						__html: tr(
							"dialog.about_lic.lang_@link",
							"https://github.com/remig/web_lic/wiki/Translating-Lic"
						),
					}}
				/>
				<div>
					<strong>{tr("dialog.about_lic.thanks")}</strong>
					<ul style={{ paddingLeft: 30 }}>
						<li>
							{tr("dialog.about_lic.feedback") + " "}
							<a
								href="https://www.flickr.com/photos/legohaulic/"
								target="_blank"
								rel="noreferrer"
							>
								Tyler Clites
							</a>
							{" " + tr("dialog.about_lic.and") + " "}
							<a
								href="http://constructibles.net/"
								target="_blank"
								rel="noreferrer"
							>
								Jason Petrasich
							</a>
						</li>
						<li>
							{tr("dialog.about_lic.german") + " "}
							<a
								href="https://github.com/mried"
								target="_blank"
								rel="noreferrer"
							>
								mried
							</a>
						</li>
						<li>{tr("dialog.about_lic.french")}Jean-Philippe Lechêne</li>
					</ul>
				</div>
				<br />
				<div>
					{tr("dialog.about_lic.copyright") + " "}
					<a href="mailto:lic@bugeyedmonkeys.com">Remi Gagne</a>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="ok" onClick={onClose} />
			</DialogActions>
		</Dialog>
	);
}
