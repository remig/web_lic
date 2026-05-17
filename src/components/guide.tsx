/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, { forwardRef, useImperativeHandle, useRef } from "react";

import type { Size } from "../item_types";
import uiState from "../ui_state";
import undoStack from "../undo_stack";
import _ from "../util";

export interface GuideHandle {
	moveBy(dx: number, dy: number): void;
	savePosition(): void;
}

interface GuideProps {
	position: number;
	orientation: "vertical" | "horizontal";
	pageSize: Size;
	id: number;
}

const Guide = forwardRef<GuideHandle, GuideProps>(function Guide(
	{ position, orientation, pageSize, id },
	ref
) {
	const elRef = useRef<HTMLDivElement>(null);

	useImperativeHandle(
		ref,
		() => ({
			moveBy(dx: number, dy: number) {
				const el = elRef.current;
				if (!el) {
					return;
				}
				if (orientation === "vertical") {
					let left = parseFloat(el.style.left) + dx;
					left = _.clamp(left, 0, pageSize.width);
					document
						.querySelectorAll<HTMLElement>(`[data-id="guide-${id}"]`)
						.forEach((e) => {
							e.style.left = left + "px";
						});
				} else {
					let top = parseFloat(el.style.top) + dy;
					top = _.clamp(top, 0, pageSize.height);
					document
						.querySelectorAll<HTMLElement>(`[data-id="guide-${id}"]`)
						.forEach((e) => {
							e.style.top = top + "px";
						});
				}
			},
			savePosition() {
				const el = elRef.current;
				if (!el) {
					return;
				}
				const attr = orientation === "vertical" ? "left" : "top";
				const pos = parseFloat(el.style[attr as "left" | "top"]);
				const change = uiState.mutations.guides.setPosition(id, pos);
				undoStack.commit(change, null, "Move Guide");
			},
		}),
		[orientation, pageSize, id]
	);

	const isVertical = orientation === "vertical";
	const style: React.CSSProperties = isVertical
		? { left: position + "px", height: pageSize.height + 20 + "px" }
		: { top: position + "px", width: pageSize.width + 20 + "px" };

	return (
		<div
			ref={elRef}
			data-id={`guide-${id}`}
			className={`guide ${isVertical ? "guide-vertical" : "guide-horizontal"}`}
			style={style}
		/>
	);
});

export default Guide;
