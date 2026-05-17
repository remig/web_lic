/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React from "react";

import store from "../../store";
import TransformPanel from "./transform";

interface PliItemTemplatePanelProps {
	selectedItem: any;
	onNewValues: (type: string) => void;
	onApply?: () => void;
}

export default function PliItemTemplatePanel({
	selectedItem,
	onNewValues,
}: PliItemTemplatePanelProps) {
	function newValues() {
		const pli = store.get.parent(selectedItem);
		if (pli) {
			(pli as any).pliItems.forEach(
				(id: number) => (store.get.pliItem(id).isDirty = true)
			);
		}
		onNewValues("pliitem");
	}

	return <TransformPanel templateEntry="pliItem" onNewValues={newValues} />;
}
