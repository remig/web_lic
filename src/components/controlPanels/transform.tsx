/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";

import store from "../../store";
import { tr } from "../../translations";
import undoStack from "../../undo_stack";
import _ from "../../util";
import Rotate, { RotationEntry } from "../rotate";
import PanelBase from "./panel_base";

interface TransformPanelProps {
	templateEntry: string;
	onNewValues: (opts?: any) => void;
}

export default function TransformPanel({
	templateEntry,
	onNewValues,
}: TransformPanelProps) {
	const [scale, setScale] = useState(
		() => _.get(store.state.template, templateEntry).scale
	);

	const rotation = _.get(store.state.template, templateEntry).rotation;

	function updateRotation(newRotation: RotationEntry[]) {
		const transform = _.get(store.state.template, templateEntry);
		if (newRotation && Array.isArray(newRotation)) {
			transform.rotation = newRotation;
		}
		transform.scale = scale;
		onNewValues();
	}

	return (
		<PanelBase title="template.transform.title" labelWidth="80px">
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<div className="form-row">
					<label>{tr("template.transform.scale")}</label>
					<input
						type="number"
						min={0}
						max={10}
						step={0.1}
						className="form-control"
						value={scale}
						style={{ width: 80 }}
						onChange={(e) => {
							const s = parseFloat(e.target.value);
							setScale(s);
							undoStack.commit(
								`templatePage.${templateEntry}.scale`,
								{ scale: s },
								"Scale Template CSI"
							);
						}}
					/>
				</div>
				<Rotate
					title="Rotations"
					initialRotation={rotation}
					includeLabels={false}
					onNewValues={updateRotation}
				/>
			</div>
		</PanelBase>
	);
}
