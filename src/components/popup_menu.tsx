/* Web Lic - Copyright (C) 2019 Remi Gagne */

import React from "react";

import { tr } from "../translations";
import _ from "../util";

export interface MenuEntry {
	id?: string;
	text: string | ((selectedItem: any) => string);
	shortcut?: string;
	shown?: (selectedItem: any) => boolean;
	enabled?: boolean | ((selectedItem: any) => boolean);
	selectedItem?: { type: string };
	children?: MenuEntry[] | ((selectedItem: any) => MenuEntry[]);
	cb?: (selectedItem: any) => void;
}

interface PopupMenuProps {
	menuEntries: MenuEntry[];
	selectedItem: any;
	id?: string;
	className?: string;
	position?: { x: number; y: number };
	onHide?: () => void;
}

function hideSubMenus() {
	document.querySelectorAll(".dropdown-submenu.open").forEach((el) => {
		el.classList.remove("open");
	});
}

function toggleSubMenu(e: React.MouseEvent) {
	e.preventDefault();
	e.stopPropagation();
	hideSubMenus();
	const target = (e.target as HTMLElement).parentElement!;
	target.classList.add("open");

	const menuBox = target.getBoundingClientRect();
	const submenu = target.querySelector("ul") as HTMLElement;
	if (!submenu) {
		return;
	}
	const submenuRightEdge = menuBox.x + menuBox.width + submenu.clientWidth;
	if (submenuRightEdge > document.documentElement.clientWidth - 20) {
		submenu.style.left = "unset";
		submenu.style.right = "100%";
	} else {
		submenu.style.left = "100%";
		submenu.style.right = "unset";
	}
	const submenuBottomEdge = menuBox.y + submenu.clientHeight;
	if (submenuBottomEdge > document.documentElement.clientHeight - 20) {
		const dy = document.documentElement.clientHeight - submenuBottomEdge - 10;
		submenu.style.marginTop = dy + "px";
	} else {
		submenu.style.removeProperty("margin-top");
	}
}

function resolveProperty<T>(p: T | ((s: any) => T), selectedItem: any): T {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	return typeof p === "function" ? (p as Function)(selectedItem) : p;
}

function getEntryClasses(entry: MenuEntry, selectedItem: any): string {
	const classes: string[] = [];
	if (entry.text === "separator") {
		classes.push("divider");
	}
	if (entry.children) {
		classes.push("dropdown-submenu");
	}
	if (
		entry.enabled != null &&
		selectedItem != null &&
		!(typeof entry.enabled === "function"
			? entry.enabled(selectedItem)
			: entry.enabled)
	) {
		classes.push("disabled");
	}
	return classes.join(" ");
}

function getVisibleEntries(
	menuEntries: MenuEntry[],
	selectedItem: any
): MenuEntry[] {
	return (menuEntries || []).filter((entry) => {
		if (selectedItem == null) {
			return false;
		} else if (
			entry.selectedItem &&
			entry.selectedItem.type !== selectedItem.type
		) {
			return false;
		} else if (entry.shown) {
			return entry.shown(selectedItem);
		} else if (entry.children) {
			if (typeof entry.children === "function") {
				return !_.isEmpty(entry.children(selectedItem));
			}
			return entry.children.some((el) =>
				el.shown ? el.shown(selectedItem) : true
			);
		}
		return true;
	});
}

export default function PopupMenu({
	menuEntries,
	selectedItem,
	id,
	className,
	position,
	onHide,
}: PopupMenuProps) {
	const visibleEntries = getVisibleEntries(menuEntries, selectedItem);

	if (position) {
		// Standalone context menu: absolutely positioned, always visible
		return (
			<ul
				id={id}
				className={`dropdown-menu${className ? " " + className : ""}`}
				style={{
					display: "block",
					position: "fixed",
					left: position.x,
					top: position.y,
					zIndex: 9999,
				}}
			>
				{visibleEntries.map((entry, idx) => {
					const key = entry.id ?? `entry-${idx}`;
					const resolvedChildren = entry.children
						? (resolveProperty(entry.children, selectedItem) as MenuEntry[])
						: undefined;
					return (
						<li
							key={key}
							id={entry.id}
							className={getEntryClasses(entry, selectedItem)}
						>
							{entry.text !== "separator" && (
								<a
									className={`clickable${entry.shortcut ? " shortcut-parent" : ""}`}
									onClick={(e) => {
										if (entry.children) {
											toggleSubMenu(e);
										} else {
											e.stopPropagation();
											entry.cb?.(selectedItem);
											onHide?.();
										}
									}}
								>
									<span className="menu-text">
										{tr(resolveProperty(entry.text, selectedItem) as string)}
									</span>
									{entry.shortcut && (
										<span className="menu-text shortcut small">
											{tr(entry.shortcut)}
										</span>
									)}
								</a>
							)}
							{resolvedChildren && (
								<PopupMenu
									menuEntries={resolvedChildren}
									selectedItem={selectedItem}
								/>
							)}
						</li>
					);
				})}
			</ul>
		);
	}

	return (
		<ul className="dropdown-menu">
			{visibleEntries.map((entry, idx) => {
				const key = entry.id ?? `entry-${idx}`;
				const resolvedChildren = entry.children
					? (resolveProperty(entry.children, selectedItem) as MenuEntry[])
					: undefined;
				return (
					<li
						key={key}
						id={entry.id}
						className={getEntryClasses(entry, selectedItem)}
					>
						{entry.text !== "separator" && (
							<a
								className={`clickable${entry.shortcut ? " shortcut-parent" : ""}`}
								data-toggle="dropdown"
								onClick={(e) => {
									if (entry.children) {
										toggleSubMenu(e);
									} else {
										entry.cb?.(selectedItem);
									}
								}}
							>
								<span className="menu-text">
									{tr(resolveProperty(entry.text, selectedItem) as string)}
								</span>
								{entry.shortcut && (
									<span className="menu-text shortcut small">
										{tr(entry.shortcut)}
									</span>
								)}
							</a>
						)}
						{resolvedChildren && (
							<PopupMenu
								menuEntries={resolvedChildren}
								selectedItem={selectedItem}
							/>
						)}
					</li>
				);
			})}
		</ul>
	);
}
