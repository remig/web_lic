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
	value?: number | null;
	bodyText?: string;
	min?: number;
	max?: number;
	step?: number;
	onOk: (value: number) => void;
	onCancel: () => void;
	onUpdate?: (value: number) => void;
	onClose: () => void;
}

export default function NumberChooserDialog({
	title = "",
	label = "",
	width = "500px",
	value: initialValue = null,
	bodyText = "",
	min = 0,
	max = 100,
	step = 1,
	onOk,
	onCancel,
	onUpdate,
	onClose,
}: Props) {
	const [value, setValue] = useState<number>(initialValue ?? 0);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			PaperProps={{ style: { width } }}
		>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "left",
							gap: "10px",
						}}
					>
						{label && <label style={{ whiteSpace: "nowrap" }}>{label}</label>}
						<input
							ref={inputRef}
							type="number"
							className="form-control"
							min={min}
							max={max}
							step={step}
							value={value}
							onChange={(e) => {
								const n = parseFloat(e.target.value);
								setValue(n);
								onUpdate?.(n);
							}}
						/>
					</div>
					{bodyText && (
						<div
							style={{ marginTop: 15 }}
							dangerouslySetInnerHTML={{ __html: bodyText }}
						/>
					)}
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={onCancel} />
				<Button variant="ok" onClick={() => onOk(value)} />
			</DialogActions>
		</Dialog>
	);
}
