/* Web Lic - Copyright (C) 2019 Remi Gagne */

import React, { useRef } from "react";

import DialogManager from "../dialog";
import { tr } from "../translations";

const demoModels = [
	{ id: "trivial", fn: "trivial_model.ldr" },
	{ id: "alligator", fn: "20015 - Alligator.mpd" },
	{ id: "xwing", fn: "7140 - X-Wing Fighter.mpd" },
];

interface GettingStartedProps {
	app: any;
}

export default function GettingStarted({ app }: GettingStartedProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	function hideMessage() {
		containerRef.current?.classList.add("hidden");
	}

	return (
		<div ref={containerRef} className="gettingStarted panel panel-default">
			<div className="panel-heading">
				<div className="pull-right close">
					<a
						title={tr("dialog.welcome.close_tooltip")}
						onClick={(e) => {
							e.preventDefault();
							hideMessage();
						}}
					>
						<i className="fas fa-times fa-lg" />
					</a>
				</div>
				<h4>{tr("dialog.welcome.title")}</h4>
			</div>
			<ul className="list-group" data-testid="get-started-list">
				<li className="list-group-item">
					<a
						className="lineLink"
						data-testid="get-started-import"
						onClick={(e) => {
							e.preventDefault();
							app.importCustomModel();
						}}
					>
						<i className="far fa-edit fa-2x fa-pull-left" />
						{tr("dialog.welcome.import")}
					</a>
				</li>
				<li className="list-group-item">
					<a
						className="lineLink"
						data-testid="get-started-open"
						onClick={(e) => {
							e.preventDefault();
							app.openLicFile();
						}}
					>
						<i className="far fa-save fa-2x fa-pull-left" />
						{tr("dialog.welcome.open")}
					</a>
				</li>
				<li className="list-group-item">
					<span className="lineLink">
						<i className="fas fa-file-upload fa-2x fa-pull-left" />
						{tr("dialog.welcome.test")}
					</span>
					<ul className="list-inline">
						{demoModels.map((entry) => (
							<li key={entry.id}>
								<a
									data-testid={`import-${entry.id}`}
									onClick={(e) => {
										e.preventDefault();
										app.importBuiltInModel(entry.fn);
									}}
								>
									{tr("dialog.welcome.models." + entry.id)}
								</a>
							</li>
						))}
					</ul>
				</li>
				<li className="list-group-item">
					<a
						className="lineLink"
						data-testid="get-started-learn"
						onClick={(e) => {
							e.preventDefault();
							DialogManager("aboutLicDialog");
						}}
					>
						<i className="fas fa-question-circle fa-2x fa-pull-left" />
						{tr("dialog.welcome.learn")}
					</a>
				</li>
			</ul>
		</div>
	);
}
