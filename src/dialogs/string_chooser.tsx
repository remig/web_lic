/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";

interface Props {
	title?: string;
	label?: string;
	width?: string;
	newString?: string;
	onOk: (value: string) => void;
	onCancel: () => void;
	onUpdate?: (value: any) => void;
	onClose: () => void;
}

export default function StringChooserDialog({
	title = "",
	label = "",
	width = "500px",
	newString: initialString = "",
	onOk,
	onCancel,
	onClose,
	onUpdate,
}: Props) {
	const [value, setValue] = useState(initialString ?? "");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	function ok() {
		onOk(value);
	}

	function cancel() {
		onCancel();
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			PaperProps={{ style: { width } }}
		>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					{label && <label>{label}</label>}
					<input
						ref={inputRef}
						className="form-control"
						value={value}
						style={{ flexGrow: 1 }}
						onChange={(e) => {
							setValue(e.target.value);
							onUpdate?.({ newString: e.target.value });
						}}
					/>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={cancel} />
				<Button variant="ok" onClick={ok} />
			</DialogActions>
		</Dialog>
	);
}
