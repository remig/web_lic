/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import NavTree from "../navtree";
import { tr } from "../translations";
import uiState from "../ui_state";
import { Button } from "./button";

interface TreeElement {
	name: string;
	value?: string;
	checked?: boolean;
	child?: boolean;
}

const treeElementList: TreeElement[] = [
	{ name: "nav_tree.all", value: "all", checked: true },
	{ name: "nav_tree.page_step_part", value: "page_step_part", checked: false },
	{ name: "divider" },
	{ name: "nav_tree.steps", value: "step", checked: true, child: true },
	{
		name: "nav_tree.submodel_images",
		value: "submodelImage",
		checked: true,
		child: true,
	},
	{ name: "nav_tree.csis", value: "csi", checked: true, child: true },
	{ name: "nav_tree.parts", value: "part", checked: true, child: true },
	{ name: "nav_tree.plis", value: "pli", checked: true, child: true },
	{ name: "nav_tree.pli_items", value: "pliItem", checked: true, child: true },
	{ name: "nav_tree.callouts", value: "callout", checked: true, child: true },
	{
		name: "nav_tree.callout_arrows",
		value: "calloutArrow",
		checked: true,
		child: true,
	},
	{
		name: "nav_tree.annotations",
		value: "annotation",
		checked: true,
		child: true,
	},
	{
		name: "nav_tree.number_labels",
		value: "numberLabel",
		checked: true,
		child: true,
	},
	{
		name: "nav_tree.quantity_labels",
		value: "quantityLabel",
		checked: true,
		child: true,
	},
	{ name: "nav_tree.dividers", value: "divider", checked: true, child: true },
	{ name: "divider" },
	{ name: "nav_tree.group_parts", value: "group_parts", checked: false },
];

const checkedItems = uiState.get("navTree.checkedItems");
if (checkedItems) {
	treeElementList.forEach((el) => {
		if (el.value && el.value in checkedItems) {
			el.checked = checkedItems[el.value];
		}
	});
}

export default function NavTreeContainer() {
	const [elements, setElements] = useState<TreeElement[]>(() =>
		treeElementList.map((el) => ({ ...el }))
	);
	const [expandedLevel, setExpandedLevel] = useState(0);
	const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

	function updateCheckState(updated: TreeElement[]) {
		const hiddenTypes = updated
			.filter((el) => !el.checked && el.child)
			.map((el) => el.value as string);
		NavTree.setInvisibleNodeTypes(hiddenTypes);
		updated.forEach((el) => {
			if (el.value !== undefined) {
				uiState.set("navTree.checkedItems." + el.value, el.checked);
			}
		});
	}

	function checkAll(updated: TreeElement[]) {
		return updated.map((el) => {
			if (el.child !== undefined || el.value === "all") {
				return { ...el, checked: true };
			} else if (el.value === "page_step_part") {
				return { ...el, checked: false };
			}
			return el;
		});
	}

	function checkPageStepParts(updated: TreeElement[]) {
		return updated.map((el) => {
			if (
				el.value === "step" ||
				el.value === "csi" ||
				el.value === "part" ||
				el.value === "page_step_part"
			) {
				return { ...el, checked: true };
			} else if (el.child !== undefined || el.value === "all") {
				return { ...el, checked: false };
			}
			return el;
		});
	}

	function checkItem(item: TreeElement) {
		if (!item || !item.value) {
			return;
		}
		let updated = elements.map((el) =>
			el.value === item.value ? { ...el, checked: !el.checked } : el
		);
		const newItem = updated.find((el) => el.value === item.value)!;
		if (item.value === "all") {
			updated = newItem.checked
				? checkAll(updated)
				: checkPageStepParts(updated);
		} else if (item.value === "page_step_part") {
			updated = newItem.checked
				? checkPageStepParts(updated)
				: checkAll(updated);
		}
		setElements(updated);
		updateCheckState(updated);
	}

	function expand() {
		const level = expandedLevel + 1;
		setExpandedLevel(level);
		NavTree.expandToLevel(level);
	}

	function collapse() {
		setExpandedLevel(0);
		NavTree.collapseAll();
	}

	return (
		<div id="tree">
			<div className="treeButtons">
				<Button variant="outlined" onClick={expand}>
					<i className="fas fa-expand-arrows-alt" />
				</Button>
				<Button variant="outlined" onClick={collapse}>
					<i className="fas fa-compress" />
				</Button>
				<Button
					variant="outlined"
					onClick={(e) => setMenuAnchor(e.currentTarget)}
				>
					{tr("nav_tree.show")}
				</Button>
				<Menu
					id="treeShowHideMenu"
					anchorEl={menuAnchor}
					open={Boolean(menuAnchor)}
					onClose={() => setMenuAnchor(null)}
					slotProps={{ paper: { sx: { minWidth: 190 } } }}
				>
					{elements.map((el, idx) => {
						if (el.name === "divider") {
							return <hr key={`divider_${idx}`} />;
						}
						return (
							<MenuItem
								key={`${el.value}_${idx}`}
								dense
								onClick={() => checkItem(el)}
							>
								{tr(el.name)}
								{el.checked && (
									<i
										className="fas fa-check"
										style={{ marginLeft: "auto", paddingLeft: 8 }}
									/>
								)}
							</MenuItem>
						);
					})}
				</Menu>
			</div>
			<div id="nav-tree" className="treeScroll" />
		</div>
	);
}
