/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React from "react";

import BorderPanel from "./border";
import FillPanel from "./fill";

interface Props {
	templateEntry: string;
	onNewValues: (opts: any) => void;
}

export default function FillBorderPanel({ templateEntry, onNewValues }: Props) {
	return (
		<div>
			<FillPanel templateEntry={templateEntry} onNewValues={onNewValues} />
			<BorderPanel templateEntry={templateEntry} onNewValues={onNewValues} />
		</div>
	);
}
