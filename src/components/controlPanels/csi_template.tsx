/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React from "react";

import store from "../../store";
import FillPanel from "./fill";
import TransformPanel from "./transform";

interface CsiTemplatePanelProps {
	selectedItem: any;
	templateEntry: string;
	onNewValues: (opts: string | { type: string; noLayout?: boolean }) => void;
}

export default function CsiTemplatePanel({
	selectedItem,
	templateEntry,
	onNewValues,
}: CsiTemplatePanelProps) {
	function newArrowStyle() {
		store.get.csi(selectedItem).isDirty = true;
		onNewValues("csi");
	}

	function newValues() {
		store.get.csi(selectedItem).isDirty = true;
		onNewValues({ type: "csi", noLayout: true });
	}

	return (
		<div>
			<TransformPanel templateEntry={templateEntry} onNewValues={newValues} />
			<FillPanel
				title="template.csi.displacement_arrow_color"
				templateEntry="step.csi.displacementArrow"
				onNewValues={newArrowStyle}
			/>
		</div>
	);
}
