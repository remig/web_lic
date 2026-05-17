/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

import store from "../../store";
import { tr } from "../../translations";
import FontPanel from "./font";
import PanelBase from "./panel_base";

interface PageNumberPanelProps {
	onNewValues: (type: string) => void;
}

const positions = ["right", "left", "even-left", "even-right"] as const;

export default function PageNumberPanel({ onNewValues }: PageNumberPanelProps) {
	const [position, setPosition] = useState(
		() =>
			store.state.template.page.numberLabel.position as
				| "right"
				| "left"
				| "even-left"
				| "even-right"
	);

	function updatePosition(newPosition: string) {
		store.state.template.page.numberLabel.position = newPosition as
			| "right"
			| "left"
			| "even-left"
			| "even-right";
		setPosition(newPosition as "right" | "left" | "even-left" | "even-right");
		onNewValues("pagenumber");
	}

	return (
		<div>
			<PanelBase title="template.page_number.position">
				<Select
					value={position}
					className="form-dropdown"
					onChange={(e) => updatePosition(e.target.value)}
				>
					{positions.map((pos) => (
						<MenuItem key={pos} value={pos}>
							{tr("template.page_number.positions." + pos)}
						</MenuItem>
					))}
				</Select>
			</PanelBase>
			<FontPanel
				templateEntry="page.numberLabel"
				onNewValues={() => onNewValues("pagenumber")}
			/>
		</div>
	);
}
