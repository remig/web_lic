/* Web Lic - Copyright (C) 2019 Remi Gagne */

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";

import EventBus from "../event_bus";
import * as translate from "../translations";
import { tr } from "../translations";
import { Button } from "./button";

interface TranslateDialogProps {
	onClose: () => void;
}

export function TranslateDialog({ onClose }: TranslateDialogProps) {
	const [chosenLocaleCode, setChosenLocaleCode] = useState("en");

	function changeLanguage(e: SelectChangeEvent) {
		const code = e.target.value;
		setChosenLocaleCode(code);
		translate.setLocale(code);
		EventBus.emit("redraw-ui", undefined);
	}

	function ok() {
		translate.setLocale(chosenLocaleCode);
		onClose();
	}

	return (
		<Dialog open id="locale_chooser_dialog" maxWidth="xs" fullWidth>
			<DialogTitle>{tr("dialog.locale_chooser.title")}</DialogTitle>
			<DialogContent>
				<Select
					id="localeChooserSelect"
					className="form-dropdown"
					value={chosenLocaleCode}
					onChange={changeLanguage}
					fullWidth
				>
					{translate.LanguageList.map((item) => (
						<MenuItem
							key={item.code}
							id={`locale_${item.code}`}
							value={item.code}
						>
							{item.language}
						</MenuItem>
					))}
				</Select>
			</DialogContent>
			<DialogActions>
				<Button variant="ok" onClick={ok} />
			</DialogActions>
		</Dialog>
	);
}

TranslateDialog.needLocale = function () {
	const currentLocale = translate.getLocale();
	if (currentLocale != null || translate.LanguageList.length < 2) {
		return false;
	}
	return true;
};
