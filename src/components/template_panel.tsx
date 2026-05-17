/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useCallback, useEffect, useRef, useState } from "react";

import store from "../store";
import { tr } from "../translations";
import undoStack from "../undo_stack";
import _ from "../util";
import BorderPanel from "./controlPanels/border";
import CsiTemplatePanel from "./controlPanels/csi_template";
import FillBorderPanel from "./controlPanels/fill_border";
import FontPanel from "./controlPanels/font";
import PageNumberPanel from "./controlPanels/page_number";
import PageTemplatePanel from "./controlPanels/page_template";
import PliItemTemplatePanel from "./controlPanels/pli_item_template";
import PliTemplatePanel from "./controlPanels/pli_template";
import RotateIconTemplatePanel from "./controlPanels/rotate_icon_template";

interface TemplatePanelProps {
	selectedItem: any;
	app: any;
}

type TemplatePanelConfig = [React.ComponentType<any>, string] | null;

// Top level keys match the basic type of the selected item
// First level child keys match the basic type of the selected item's parent
// Second level child keys match the basic type of the selected item's parent's parent
const componentLookup: Record<string, any> = {
	page: [PageTemplatePanel, ""],
	csi: {
		step: [CsiTemplatePanel, "step.csi"],
		submodelImage: [CsiTemplatePanel, "submodelImage.csi"],
	},
	pliItem: [PliItemTemplatePanel, ""],
	pli: [PliTemplatePanel, ""],
	callout: [FillBorderPanel, "callout"],
	calloutArrow: [BorderPanel, "callout.arrow"],
	submodelImage: [FillBorderPanel, "submodelImage"],
	divider: [BorderPanel, "divider"],
	rotateIcon: [RotateIconTemplatePanel, ""],
	numberLabel: {
		page: [PageNumberPanel, ""],
		step: {
			callout: [FontPanel, "callout.step.numberLabel"],
			default: [FontPanel, "step.numberLabel"],
		},
	},
	quantityLabel: {
		submodelImage: [FontPanel, "submodelImage.quantityLabel"],
		pliItem: [FontPanel, "pliItem.quantityLabel"],
	},
};

function getCurrentTemplate(selectedItem: any): TemplatePanelConfig {
	if (!selectedItem) {
		return null;
	}
	const type = selectedItem.type;
	if (type in componentLookup) {
		const lookup = componentLookup[type];
		const parent = store.get.parent(selectedItem);
		const grandparent = parent ? store.get.parent(parent) : null;
		if (parent && parent.type in lookup) {
			if (grandparent && grandparent.type in lookup[parent.type]) {
				return lookup[parent.type][grandparent.type];
			} else if (lookup[parent.type].default) {
				return lookup[parent.type].default;
			}
			return lookup[parent.type];
		}
		return lookup;
	}
	return null;
}

export interface TemplatePanelHandle {
	forceUpdate(): void;
}

export default function TemplatePanel({
	selectedItem,
	app,
}: TemplatePanelProps) {
	const [config, setConfig] = useState<TemplatePanelConfig>(() =>
		getCurrentTemplate(selectedItem)
	);
	const lastEditRef = useRef<any>(null);
	const prevSelectedItemRef = useRef<any>(selectedItem);

	const applyChanges = useCallback(() => {
		if (!lastEditRef.current) {
			return;
		}
		const lastEdit = lastEditRef.current;
		lastEditRef.current = null;
		if (!lastEdit.noLayout) {
			store.mutations.page.markAllDirty();
		}
		let item: string = (_.last(lastEdit.type.split(".")) as string) || "";
		item = tr("glossary." + item.toLowerCase());
		const undoText = tr("action.edit.template.change.undo_@mf", { item });
		undoStack.commit("", null, undoText);
	}, []);

	useEffect(() => {
		if (prevSelectedItemRef.current !== selectedItem) {
			applyChanges();
			prevSelectedItemRef.current = selectedItem;
			// Reset config briefly then set new (mirrors Vue.nextTick behavior)
			setConfig(null);
			setTimeout(() => {
				setConfig(getCurrentTemplate(selectedItem));
			}, 0);
		}
	}, [selectedItem, applyChanges]);

	useEffect(() => {
		return () => {
			// Catch changes if user switches away from template panel
			applyChanges();
		};
	}, [applyChanges]);

	function applyDirtyAction(entryType: string) {
		const item = tr("glossary." + entryType.toLowerCase());
		const undoText = tr("action.edit.template.change.undo_@mf", { item });
		undoStack.commit("", null, undoText);
	}

	function newValues(opts: string | { type: string; noLayout?: boolean }) {
		lastEditRef.current = typeof opts === "string" ? { type: opts } : opts;
		if (!(lastEditRef.current as any).noLayout) {
			store.get.templatePage().needsLayout = true;
		}
		app.drawCurrentPage();
	}

	function getTitle() {
		return selectedItem
			? tr("glossary." + selectedItem.type.toLowerCase())
			: tr("template.select_page_item");
	}

	if (!config) {
		return (
			<div id="templatePanelContainer" onClick={(e) => e.stopPropagation()}>
				<h4>{getTitle()}</h4>
			</div>
		);
	}

	const [PanelComponent, templateEntry] = config;

	return (
		<div
			className="container"
			id="templatePanelContainer"
			onClick={(e) => e.stopPropagation()}
		>
			<h4>{getTitle()}</h4>
			<div className="panel-group">
				<PanelComponent
					selectedItem={selectedItem}
					templateEntry={templateEntry}
					onNewValues={newValues}
					onApply={() =>
						applyDirtyAction(
							templateEntry || (selectedItem ? selectedItem.type : "")
						)
					}
				/>
			</div>
		</div>
	);
}
