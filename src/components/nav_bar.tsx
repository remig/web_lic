/* Web Lic - Copyright (C) 2019 Remi Gagne */

import React, { useCallback, useEffect } from "react";

import packageInfo from "../../package.json";
import DialogManager from "../dialog";
import { tr } from "../translations";
import _ from "../util";
import PopupMenu, { type MenuEntry } from "./popup_menu";

interface NavBarProps {
	menuEntryList: Array<{ id: string; text: string; children: MenuEntry[] }>;
	filename: { name: string | null; isDirty: boolean } | null;
	openMenuId?: string | null;
	onOpenMenu?: (id: string | null) => void;
	onCloseMenus: () => void;
}

function hideOpenDropdowns() {
	document.querySelectorAll(".dropdown.open").forEach((el) => {
		el.classList.remove("open");
	});
}

export default function NavBar({
	menuEntryList,
	filename,
	onCloseMenus,
}: NavBarProps) {
	const version = _.version.nice(packageInfo.version);

	const showAbout = useCallback(() => {
		DialogManager("aboutLicDialog");
	}, []);

	useEffect(() => {
		function handleDocumentClick() {
			hideOpenDropdowns();
		}
		document.addEventListener("click", handleDocumentClick);
		return () => document.removeEventListener("click", handleDocumentClick);
	}, []);

	function triggerMenu(e: React.MouseEvent, menuId: string) {
		e.preventDefault();
		e.stopPropagation();
		onCloseMenus();
		const li = document.getElementById(menuId);
		li?.classList.add("open");
	}

	return (
		<nav className="navbar navbar-default">
			<ul className="nav navbar-nav">
				{menuEntryList.map((menu) => (
					<li key={menu.id} id={menu.id} className="dropdown">
						<a
							className="dropdown-toggle"
							data-toggle="dropdown"
							role="button"
							aria-haspopup="true"
							aria-expanded="false"
							onClick={(e) => triggerMenu(e, menu.id)}
						>
							{tr(menu.text)}
							<span className="caret" />
						</a>
						<PopupMenu menuEntries={menu.children} selectedItem="" />
					</li>
				))}
			</ul>
			<ul className="nav navbar-nav navbar-right">
				{filename && filename.name && (
					<>
						<li>
							<span id="filename" className="navbar-text">
								{filename.name + (filename.isDirty ? " *" : "")}
							</span>
						</li>
						<li>
							<span className="navbar-text">|</span>
						</li>
					</>
				)}
				<li>
					<a
						className="clickable"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							showAbout();
						}}
					>
						Web Lic {version}
					</a>
				</li>
			</ul>
		</nav>
	);
}
