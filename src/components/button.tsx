/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { PropsWithChildren } from "react";

import { tr } from "../translations";

interface ButtonProps {
	variant?: "outlined" | "text" | "ok" | "cancel" | null;
	wide?: boolean | null;
	fullWidth?: boolean | null;
	onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
	style?: React.CSSProperties | null;
}

export function Button({
	children,
	variant = null,
	wide = false,
	fullWidth = false,
	onClick,
	style,
}: PropsWithChildren<ButtonProps>) {
	let variantClass = variant;
	let text = children;
	const localStyle = style ?? {};

	if (variant === "ok") {
		variantClass = null;
		text = tr("dialog.ok");
		localStyle.padding = "0 20px";
	} else if (variant === "cancel") {
		variantClass = "outlined";
		text = tr("dialog.cancel");
		localStyle.padding = "0 20px";
	}

	return (
		<button
			className={`button ${variantClass ?? ""} ${fullWidth ? "fullWidth" : ""} ${wide ? "wide" : ""}`}
			onClick={onClick}
			style={localStyle}
		>
			{text || children}
		</button>
	);
}
