/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React from "react";

import { tr } from "../../translations";

interface PanelBaseProps {
	title: string;
	labelWidth?: string;
	children?: React.ReactNode;
}

export default function PanelBase({ title, children }: PanelBaseProps) {
	return (
		<div className="panel-template">
			<h5>{tr(title)}</h5>
			<div className="panel-body">{children}</div>
		</div>
	);
}
