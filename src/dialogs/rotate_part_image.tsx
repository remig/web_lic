/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";

import { Button } from "../components/button";
import Rotate from "../components/rotate";

import type { Rotation } from "../item_types";
import { tr } from "../translations";
import _ from "../util";

interface Props {
	title?: string;
	addRotateIcon?: boolean;
	showRotateIconCheckbox?: boolean;
	initialRotation?: Rotation[];
	onOk: (v: any) => void;
	onCancel: (v: any) => void;
	onUpdate?: (v: any) => void;
	onClose: () => void;
}

export default function RotatePartImageDialog({
	title: titleProp = "",
	addRotateIcon: addIconProp = true,
	showRotateIconCheckbox = true,
	initialRotation = [],
	onOk,
	onCancel,
	onUpdate,
	onClose,
}: Props) {
	const [rotation, setRotation] = useState<Rotation[]>(
		_.cloneDeep(initialRotation)
	);
	const [addRotateIcon, setAddRotateIcon] = useState(addIconProp);

	function getData() {
		return {
			title: titleProp,
			rotation,
			addRotateIcon,
			showRotateIconCheckbox,
			initialRotation,
		};
	}

	function updateValues(newRotation?: Rotation[]) {
		const r =
			newRotation && Array.isArray(newRotation) ? newRotation : rotation;
		if (newRotation && Array.isArray(newRotation)) {
			setRotation(r);
		}
		onUpdate?.({ ...getData(), rotation: r });
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="rotatePartImageDialog"
			PaperProps={{ style: { width: "400px" } }}
		>
			<DialogTitle>{titleProp}</DialogTitle>
			<DialogContent>
				<Rotate
					title=""
					initialRotation={rotation}
					includeLabels={false}
					onNewValues={updateValues}
				/>
				{showRotateIconCheckbox && (
					<FormControlLabel
						className="el-checkbox"
						control={
							<Checkbox
								checked={addRotateIcon}
								onChange={(e) => {
									setAddRotateIcon(e.target.checked);
									updateValues();
								}}
								data-testid="rotate-add-icon"
							/>
						}
						label={tr("dialog.rotate_part_image.add_rotate_icon")}
					/>
				)}
			</DialogContent>
			<DialogActions>
				<Button
					variant="outlined"
					onClick={() => onCancel(getData())}
					data-testid="rotate-cancel"
				>
					{tr("dialog.cancel")}
				</Button>
				<Button onClick={() => onOk(getData())} data-testid="rotate-ok">
					{tr("dialog.ok")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
