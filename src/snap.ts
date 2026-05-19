/* Web Lic - Copyright (C) 2018 Remi Gagne */

import type { Box, ItemTypes, Page } from './item_types';
import { store } from './store';

export interface SnapGuide {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface SnapResult {
	dx: number;
	dy: number;
	guides: SnapGuide[];
}

const SNAP_THRESHOLD = 5;
const MIN_SNAP_SIZE = 10;
const GUIDE_OVERHANG = 10;

function addBox(boxes: Box[], item: ItemTypes, exclude: ItemTypes) {
	if (item.id === exclude.id && item.type === exclude.type) {
		return;
	}
	const box = store.get.targetBox(item);
	if (box && box.width > MIN_SNAP_SIZE && box.height > MIN_SNAP_SIZE) {
		boxes.push(box);
	}
}

// Candidates when dragging inside a PLI: all pliItems and their quantityLabels in the same PLI.
function getPliItemCandidates(draggedItem: ItemTypes): Box[] {
	let pliId: number;
	if (draggedItem.type === 'pliItem') {
		pliId = draggedItem.parent.id;
	} else if (draggedItem.type === 'quantityLabel' && draggedItem.parent.type === 'pliItem') {
		pliId = store.get.pliItem(draggedItem.parent.id).parent.id;
	} else {
		return [];
	}
	const boxes: Box[] = [];
	const pli = store.get.pli(pliId);
	for (const id of pli.pliItems) {
		const pliItem = store.get.pliItem(id);
		const isDraggedPliItem = draggedItem.type === 'pliItem' && pliItem.id === draggedItem.id;
		addBox(boxes, pliItem, draggedItem);
		if (pliItem.quantityLabelID != null && !isDraggedPliItem) {
			addBox(boxes, store.get.quantityLabel(pliItem.quantityLabelID), draggedItem);
		}
	}
	return boxes;
}

// Candidates when dragging a direct child of a step: all step children across every step on the page.
function getStepChildCandidates(page: Page, draggedItem: ItemTypes): Box[] {
	const boxes: Box[] = [];
	for (const stepId of page.steps) {
		const step = store.get.step(stepId);
		if (step.csiID != null) {
			addBox(boxes, store.get.csi(step.csiID), draggedItem);
		}
		if (step.pliID != null && store.state.plisVisible) {
			addBox(boxes, store.get.pli(step.pliID), draggedItem);
		}
		for (const id of step.submodelImages) {
			addBox(boxes, store.get.submodelImage(id), draggedItem);
		}
		for (const id of step.callouts) {
			addBox(boxes, store.get.callout(id), draggedItem);
		}
		if (step.numberLabelID != null) {
			addBox(boxes, store.get.numberLabel(step.numberLabelID), draggedItem);
		}
		if (step.rotateIconID != null) {
			addBox(boxes, store.get.rotateIcon(step.rotateIconID), draggedItem);
		}
	}
	return boxes;
}

// Default candidates: steps and their major children (CSI, PLI, submodelImages, callouts).
function getDefaultCandidates(page: Page, draggedItem: ItemTypes): Box[] {
	const boxes: Box[] = [];
	for (const stepId of page.steps) {
		const step = store.get.step(stepId);
		addBox(boxes, step, draggedItem);
		if (step.csiID != null) {
			addBox(boxes, store.get.csi(step.csiID), draggedItem);
		}
		if (step.pliID != null && store.state.plisVisible) {
			addBox(boxes, store.get.pli(step.pliID), draggedItem);
		}
		for (const id of step.submodelImages) {
			addBox(boxes, store.get.submodelImage(id), draggedItem);
		}
		for (const id of step.callouts) {
			addBox(boxes, store.get.callout(id), draggedItem);
		}
	}
	return boxes;
}

function getSnapCandidates(page: Page, draggedItem: ItemTypes): Box[] {
	const isPliChild =
		draggedItem.type === 'pliItem' ||
		(draggedItem.type === 'quantityLabel' && draggedItem.parent.type === 'pliItem');
	if (isPliChild) {
		return getPliItemCandidates(draggedItem);
	}
	if (draggedItem.parent.type === 'step') {
		return getStepChildCandidates(page, draggedItem);
	}
	return getDefaultCandidates(page, draggedItem);
}

export function computeSnap(
	draggedItem: ItemTypes,
	page: Page,
	dx: number,
	dy: number,
): SnapResult {
	const baseBox = store.get.targetBox(draggedItem);
	if (!baseBox) {
		return { dx, dy, guides: [] };
	}

	const proposed: Box = {
		x: baseBox.x + dx,
		y: baseBox.y + dy,
		width: baseBox.width,
		height: baseBox.height,
	};

	const candidates = getSnapCandidates(page, draggedItem);

	let snapDx = dx;
	let snapDy = dy;
	let bestXDist = SNAP_THRESHOLD + 1;
	let bestYDist = SNAP_THRESHOLD + 1;
	let xSnapVal: number | null = null;
	let xSnapBox: Box | null = null;
	let ySnapVal: number | null = null;
	let ySnapBox: Box | null = null;

	const dragEdgesX = [proposed.x, proposed.x + proposed.width];
	const dragEdgesY = [proposed.y, proposed.y + proposed.height];

	// When dragging a pliItem, also snap from its outer bounding box (image + quantity label).
	if (draggedItem.type === 'pliItem' && draggedItem.quantityLabelID != null) {
		const lbl = store.get.quantityLabel(draggedItem.quantityLabelID);
		const lblBox = store.get.targetBox(lbl);
		if (lblBox) {
			dragEdgesX.push(
				Math.min(proposed.x, lblBox.x + dx),
				Math.max(proposed.x + proposed.width, lblBox.x + dx + lblBox.width),
			);
			dragEdgesY.push(
				Math.min(proposed.y, lblBox.y + dy),
				Math.max(proposed.y + proposed.height, lblBox.y + dy + lblBox.height),
			);
		}
	}

	for (const candidate of candidates) {
		const candEdgesX = [candidate.x, candidate.x + candidate.width];
		const candEdgesY = [candidate.y, candidate.y + candidate.height];

		for (const dEdge of dragEdgesX) {
			for (const cEdge of candEdgesX) {
				const dist = Math.abs(dEdge - cEdge);
				if (dist < bestXDist) {
					bestXDist = dist;
					xSnapVal = cEdge;
					xSnapBox = candidate;
					snapDx = dx + (cEdge - dEdge);
				}
			}
		}

		for (const dEdge of dragEdgesY) {
			for (const cEdge of candEdgesY) {
				const dist = Math.abs(dEdge - cEdge);
				if (dist < bestYDist) {
					bestYDist = dist;
					ySnapVal = cEdge;
					ySnapBox = candidate;
					snapDy = dy + (cEdge - dEdge);
				}
			}
		}
	}

	const guides: SnapGuide[] = [];
	const snappedX = baseBox.x + (bestXDist <= SNAP_THRESHOLD ? snapDx : dx);
	const snappedY = baseBox.y + (bestYDist <= SNAP_THRESHOLD ? snapDy : dy);

	if (xSnapVal != null && xSnapBox != null && bestXDist <= SNAP_THRESHOLD) {
		const yMin = Math.min(snappedY, xSnapBox.y) - GUIDE_OVERHANG;
		const yMax = Math.max(snappedY + baseBox.height, xSnapBox.y + xSnapBox.height) + GUIDE_OVERHANG;
		guides.push({ x1: xSnapVal, y1: yMin, x2: xSnapVal, y2: yMax });
	}

	if (ySnapVal != null && ySnapBox != null && bestYDist <= SNAP_THRESHOLD) {
		const xMin = Math.min(snappedX, ySnapBox.x) - GUIDE_OVERHANG;
		const xMax = Math.max(snappedX + baseBox.width, ySnapBox.x + ySnapBox.width) + GUIDE_OVERHANG;
		guides.push({ x1: xMin, y1: ySnapVal, x2: xMax, y2: ySnapVal });
	}

	return {
		dx: bestXDist <= SNAP_THRESHOLD ? snapDx : dx,
		dy: bestYDist <= SNAP_THRESHOLD ? snapDy : dy,
		guides,
	};
}
