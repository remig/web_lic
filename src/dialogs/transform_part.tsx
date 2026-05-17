/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Button } from "../components/button";

import { tr } from "../translations";

interface Vec3 {
	x: number;
	y: number;
	z: number;
}

interface Props {
	title?: string;
	rotation?: Vec3;
	position?: Vec3;
	addRotateIcon?: boolean;
	showRotateIconCheckbox?: boolean;
	onOk: (v: any) => void;
	onCancel: (v: any) => void;
	onUpdate?: (v: any) => void;
	onClose: () => void;
}

export default function TransformPartDialog({
	title: titleProp = "",
	rotation: rotProp = { x: 0, y: 0, z: 0 },
	position: posProp = { x: 0, y: 0, z: 0 },
	addRotateIcon: addRotateIconProp = true,
	showRotateIconCheckbox: showCheckboxProp = true,
	onOk,
	onCancel,
	onUpdate,
	onClose,
}: Props) {
	const [rotation, setRotation] = useState<Vec3>(rotProp);
	const [position, setPosition] = useState<Vec3>(posProp);
	const [addRotateIcon] = useState(addRotateIconProp);
	const [showRotateIconCheckbox] = useState(showCheckboxProp);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	function getData() {
		return {
			title: titleProp,
			rotation,
			position,
			addRotateIcon,
			showRotateIconCheckbox,
		};
	}

	function setPos(axis: "x" | "y" | "z", val: number) {
		const next = { ...position, [axis]: val };
		setPosition(next);
		onUpdate?.({
			title: titleProp,
			rotation,
			position: next,
			addRotateIcon,
			showRotateIconCheckbox,
		});
	}

	function setRot(axis: "x" | "y" | "z", val: number) {
		const next = { ...rotation, [axis]: val };
		setRotation(next);
		onUpdate?.({
			title: titleProp,
			rotation: next,
			position,
			addRotateIcon,
			showRotateIconCheckbox,
		});
	}

	function numInput(
		val: number,
		onChange: (v: number) => void,
		ref?: React.Ref<HTMLInputElement>
	) {
		return (
			<input
				ref={ref as any}
				type="number"
				className="form-control"
				value={val}
				style={{ width: 80 }}
				onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
			/>
		);
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="transformPartDialog"
			PaperProps={{ style: { width: "600px" } }}
		>
			<DialogTitle>{tr("dialog.transform_part.title")}</DialogTitle>
			<DialogContent>
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<label style={{ width: 90 }}>
							{tr("dialog.transform_part.position")}
						</label>
						<label style={{ width: 40 }}>{tr("glossary.x")}</label>
						{numInput(position.x, (v) => setPos("x", v), inputRef)}
						<label style={{ width: 40 }}>{tr("glossary.y")}</label>
						{numInput(position.y, (v) => setPos("y", v))}
						<label style={{ width: 40 }}>{tr("glossary.z")}</label>
						{numInput(position.z, (v) => setPos("z", v))}
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<label style={{ width: 90 }}>
							{tr("dialog.transform_part.rotation")}
						</label>
						<label style={{ width: 40 }}>{tr("glossary.x")}</label>
						{numInput(rotation.x, (v) => setRot("x", v))}
						<label style={{ width: 40 }}>{tr("glossary.y")}</label>
						{numInput(rotation.y, (v) => setRot("y", v))}
						<label style={{ width: 40 }}>{tr("glossary.z")}</label>
						{numInput(rotation.z, (v) => setRot("z", v))}
					</div>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="cancel" onClick={() => onCancel(getData())} />
				<Button variant="ok" onClick={() => onOk(getData())} />
			</DialogActions>
		</Dialog>
	);
}
