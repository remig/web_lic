/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useEffect, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";

import { tr } from "../translations";
import _ from "../util";
import { Button } from "./button";

export interface RotationEntry {
	axis: "x" | "y" | "z";
	angle: number;
}

export interface RotateProps {
	title?: string;
	initialRotation?: RotationEntry[];
	includeLabels?: boolean;
	onNewValues: (rotation: RotationEntry[]) => void;
}

export default function Rotate({
	title = tr("dialog.rotation.title"),
	initialRotation,
	includeLabels = true,
	onNewValues,
}: RotateProps) {
	const [rotation, setRotation] = useState<RotationEntry[]>(
		_.cloneDeep(initialRotation || [])
	);

	useEffect(() => {
		setRotation(_.cloneDeep(initialRotation || []));
	}, [initialRotation]);

	function updateValues(updated: RotationEntry[]) {
		setRotation(updated);
		onNewValues(_.cloneDeep(updated));
	}

	function addRotation() {
		updateValues([...rotation, { axis: "x", angle: 0 }]);
	}

	function removeRotation(idx: number) {
		const next = rotation.filter((_, i) => i !== idx);
		updateValues(next);
	}

	function setAxis(idx: number, axis: "x" | "y" | "z") {
		const next = rotation.map((r, i) => (i === idx ? { ...r, axis } : r));
		updateValues(next);
	}

	function setAngle(idx: number, angle: number) {
		const next = rotation.map((r, i) => (i === idx ? { ...r, angle } : r));
		updateValues(next);
	}

	return (
		<div>
			{title && <label>{title}</label>}
			<div className="rotationListBox">
				{rotation.map((rot, idx) => (
					<div
						key={`rotation_${idx}`}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
							marginBottom: 4,
						}}
					>
						{includeLabels && <label>{tr("dialog.rotation.axis")}</label>}
						<Select
							value={rot.axis}
							className="form-dropdown"
							inputProps={{ "data-testid": "rotate-axis-select" }}
							onChange={(e: SelectChangeEvent) =>
								setAxis(idx, e.target.value as "x" | "y" | "z")
							}
						>
							<MenuItem value="x">X</MenuItem>
							<MenuItem value="y">Y</MenuItem>
							<MenuItem value="z">Z</MenuItem>
						</Select>
						{includeLabels && (
							<label style={{ marginLeft: 10 }}>
								{tr("dialog.rotation.angle")}
							</label>
						)}
						<input
							type="number"
							min={-360}
							max={360}
							className="form-control"
							data-testid="rotate-angle-input"
							value={rot.angle}
							onChange={(e) => setAngle(idx, parseFloat(e.target.value) || 0)}
							style={{ width: 80 }}
						/>
						<Button variant="outlined" onClick={() => removeRotation(idx)}>
							<i className="fas fa-minus" style={{ fontSize: 10 }} />
						</Button>
					</div>
				))}
				<Button variant="outlined" onClick={addRotation}>
					<i className="fas fa-plus" style={{ fontSize: 10 }} />
				</Button>
			</div>
		</div>
	);
}
