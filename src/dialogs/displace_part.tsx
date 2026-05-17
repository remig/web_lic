/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";

import { tr } from "../translations";

interface DisplaceValues {
	partDistance: number;
	arrowOffset: number;
	arrowLength: number;
	arrowRotation: number;
}

interface Props {
	values?: DisplaceValues;
	onOk: (v: DisplaceValues) => void;
	onCancel: (v: DisplaceValues) => void;
	onUpdate?: (v: DisplaceValues) => void;
	onClose: () => void;
}

export default function DisplacePartDialog({
	values: initialValues,
	onOk,
	onCancel,
	onUpdate,
	onClose,
}: Props) {
	const [values, setValues] = useState<DisplaceValues>(
		initialValues ?? {
			partDistance: 0,
			arrowOffset: 0,
			arrowLength: 0,
			arrowRotation: 0,
		}
	);

	function setField(field: keyof DisplaceValues, val: number) {
		const next = { ...values, [field]: val };
		setValues(next);
		onUpdate?.({ ...next });
	}

	function numInput(label: string, field: keyof DisplaceValues) {
		return (
			<>
				<label>{label}</label>
				<input
					type="number"
					className="form-control"
					value={values[field]}
					style={{ width: 90 }}
					onChange={(e) => setField(field, parseFloat(e.target.value) || 0)}
				/>
			</>
		);
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="displacePartDialog"
			PaperProps={{ style: { width: "550px" } }}
		>
			<DialogTitle>{tr("dialog.displace_part.title")}</DialogTitle>
			<DialogContent>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "140px 1fr 140px 1fr",
						gap: 8,
						alignItems: "center",
					}}
				>
					{numInput(tr("dialog.displace_part.part_distance"), "partDistance")}
					{numInput(tr("dialog.displace_part.arrow_length"), "arrowLength")}
					{numInput(tr("dialog.displace_part.arrow_distance"), "arrowOffset")}
					{numInput(tr("dialog.displace_part.arrow_rotation"), "arrowRotation")}
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={() => onCancel({ ...values })} />
				<Button variant="ok" onClick={() => onOk({ ...values })} />
			</DialogActions>
		</Dialog>
	);
}
