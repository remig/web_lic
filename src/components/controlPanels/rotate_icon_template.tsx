/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React from "react";

import BorderPanel from "./border";
import FillPanel from "./fill";

interface RotateIconTemplatePanelProps {
	onNewValues: (type: string) => void;
}

export default function RotateIconTemplatePanel({
	onNewValues,
}: RotateIconTemplatePanelProps) {
	function newValues() {
		onNewValues("rotateicon");
	}

	return (
		<div>
			<FillPanel templateEntry="rotateIcon" onNewValues={newValues} />
			<BorderPanel templateEntry="rotateIcon" onNewValues={newValues} />
			<BorderPanel
				templateEntry="rotateIcon.arrow"
				title="glossary.arrow"
				onNewValues={newValues}
			/>
		</div>
	);
}
