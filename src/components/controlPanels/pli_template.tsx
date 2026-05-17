/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import store from "../../store";
import { tr } from "../../translations";
import BorderPanel from "./border";
import FillPanel from "./fill";
import PanelBase from "./panel_base";

interface PliTemplatePanelProps {
	onNewValues: (type: string) => void;
}

export default function PliTemplatePanel({
	onNewValues,
}: PliTemplatePanelProps) {
	const [includeSubmodels, setIncludeSubmodels] = useState(
		() => store.state.template.pli.includeSubmodels
	);

	function updateValues(checked: boolean) {
		const template = store.state.template.pli;
		if (checked !== template.includeSubmodels) {
			template.includeSubmodels = checked;
			setIncludeSubmodels(checked);
			onNewValues("pli");
		}
	}

	return (
		<div>
			<PanelBase title="template.pli.content" labelWidth="100px">
				<FormControlLabel
					className="el-checkbox"
					control={
						<Checkbox
							checked={includeSubmodels}
							onChange={(e) => updateValues(e.target.checked)}
						/>
					}
					label={tr("template.pli.include_submodels")}
				/>
			</PanelBase>
			<FillPanel templateEntry="pli" onNewValues={() => onNewValues("pli")} />
			<BorderPanel templateEntry="pli" onNewValues={() => onNewValues("pli")} />
		</div>
	);
}
