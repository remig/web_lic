'use strict';

import _ from './util';
import LDParse from './LDParse';
import store from './store';

const emptyCalloutSize = 50;
const rotateIconAspectRatio = 0.94; // height / width

const api = {

	titlePage(page) {
		page = store.get.lookupToItem(page);
		const pageSize = store.state.template.page;
		const step = store.get.step(page.steps[0]);
		const csi = store.get.csi(step.csiID);
		const box = {x: 0, y: 0, width: pageSize.width, height: pageSize.height};
		store.mutations.step.layout({step, box});
		step.width = csi.width + 40;
		step.height = csi.height + 40;
		step.x = (pageSize.width - step.width) / 2;
		step.y = (pageSize.height - step.height) / 2;
		csi.x = csi.y = 20;

		const title = store.get.annotation(page.annotations[0]);
		api.label(title);
		title.x = (pageSize.width - title.width) / 2;
		title.y = (step.y - title.height) / 2;

		const modelInfo = store.get.annotation(page.annotations[1]);
		api.label(modelInfo);
		modelInfo.x = (pageSize.width - modelInfo.width) / 2;
		modelInfo.y = ((step.y - modelInfo.height) / 2) + step.y + step.height;
		delete page.needsLayout;
	},

	page(page, layout = 'horizontal') {

		if (page.type === 'titlePage') {
			api.titlePage(page);
			return;
		}

		// TODO: laying out offset by border width is painful.  Instead, calculate a 'innerOffset' (border width),
		// and apply that in draw, then layout everything as if (0,0) is inside the border
		// TODO: Do this for all page shapes that have borders (page, PLI, callout, etc)
		const template = store.state.template.page;
		const margin = getMargin(template.innerMargin);
		const borderWidth = template.border.width;
		const pageSize = {
			width: template.width - borderWidth - borderWidth,
			height: template.height - borderWidth - borderWidth
		};

		page.innerContentOffset = {x: borderWidth, y: borderWidth};

		if (page.numberLabelID != null) {
			const lblSize = _.measureLabel(template.numberLabel.font, page.number);
			const lbl = store.get.numberLabel(page.numberLabelID);
			lbl.width = lblSize.width;
			lbl.height = lblSize.height;
			lbl.y = pageSize.height - margin;

			let position = template.numberLabel.position;
			if (position === 'even-left') {
				position = _.isEven(page.number) ? 'left' : 'right';
			} else if (position === 'even-right') {
				position = _.isEven(page.number) ? 'right' : 'left';
			}
			if (position === 'left') {
				lbl.x = margin;
				lbl.align = 'left';
			} else {
				lbl.x = pageSize.width - margin;
				lbl.align = 'right';
			}
			pageSize.height -= lbl.height + (margin / 2);
		}

		const stepCount = page.steps.length;
		let cols = Math.ceil(Math.sqrt(stepCount));
		let rows = Math.ceil(stepCount / cols);
		let layoutDirection;
		if (layout.rows != null && layout.cols != null) {
			cols = layout.cols;
			rows = layout.rows;
			layoutDirection = layout.direction || (pageSize.width > pageSize.height ? 'horizontal' : 'vertical');
		} else {
			layoutDirection = layout;
			if (layout === 'vertical') {
				[cols, rows] = [rows, cols];
			}
		}
		const colSize = Math.floor(pageSize.width / cols);
		const rowSize = Math.floor(pageSize.height / rows);

		const box = {x: 0, y: 0, width: colSize, height: rowSize};

		for (let i = 0; i < stepCount; i++) {
			if (layoutDirection === 'vertical') {
				box.x = colSize * Math.floor(i / rows);
				box.y = rowSize * (i % rows);
			} else {
				box.x = colSize * (i % cols);
				box.y = rowSize * Math.floor(i / cols);
			}
			api.step(store.get.step(page.steps[i]), box);
		}

		if (stepCount < (rows * cols)) {  // Have fewer steps than fit in the grid; expand steps in last row / col to fill empty cell
			const emptySlots = (rows * cols) - stepCount;
			if (layoutDirection === 'vertical') {
				const stepsInLastCol = rows - emptySlots;
				box.width = colSize;
				box.height = Math.floor(pageSize.height / stepsInLastCol);
				box.x = (cols - 1) * colSize;
				for (let i = 0; i < stepsInLastCol; i++) {
					box.y = box.height * i;
					const stepIndex = ((cols - 1) * rows) + i;
					api.step(store.get.step(page.steps[stepIndex]), box);
				}
			} else {
				const stepsInLastRow = cols - emptySlots;
				box.width = Math.floor(pageSize.width / stepsInLastRow);
				box.height = rowSize;
				box.y = (rows - 1) * rowSize;
				for (let i = 0; i < stepsInLastRow; i++) {
					box.x = box.width * i;
					const stepIndex = ((rows - 1) * cols) + i;
					api.step(store.get.step(page.steps[stepIndex]), box);
				}
			}
		}

		page.layout = layout;
		page.actualLayout = (rows > 1 || cols > 1) ? {rows, cols, direction: layoutDirection} : 'horizontal';
		api.dividers(page, layoutDirection, rows, cols, pageSize);

		if (store.state.plisVisible) {
			alignStepContent(page);
		}

		delete page.needsLayout;
	},

	step(step, box, pageMargin) {  // Starting with a pre-defined box, layout everything in this step inside it
		pageMargin = (pageMargin == null) ? getMargin(store.state.template.page.innerMargin) : pageMargin;
		const margin = getMargin(store.state.template.step.innerMargin);

		if (box == null) {
			box = {};  // If no box is provided, assume step is already sized and positioned correctly, and only layout step children
		} else {
			// Position step in parent coordinates
			step.x = box.x + pageMargin;
			step.y = box.y + pageMargin;
			step.width = box.width - pageMargin - pageMargin;
			step.height = box.height - pageMargin - pageMargin;
		}

		// transform box to step coordinates
		box = _.clone(box);
		box.x = box.y = 0;
		box.width = step.width;
		box.height = step.height;

		step.submodelImages.forEach(submodelImageID => {
			const submodelImage = store.get.submodelImage(submodelImageID);
			if (submodelImage) {
				api.submodelImage(submodelImage, box);
				_.geom.moveBoxEdge(box, 'top', submodelImage.height + margin);
			}
		});

		const pli = (step.pliID != null && store.state.plisVisible) ? store.get.pli(step.pliID) : null;
		if (pli) {
			api.pli(pli);
			pli.y = box.y;
			_.geom.moveBoxEdge(box, 'top', pli.height + margin);
		}

		if (step.numberLabelID != null) {
			const lblSize = _.measureLabel(store.state.template.step.numberLabel.font, step.number);
			const lbl = store.get.numberLabel(step.numberLabelID);
			lbl.x = 0;
			lbl.y = box.y;
			lbl.width = lblSize.width;
			lbl.height = lblSize.height;
			_.geom.moveBoxEdge(box, 'top', lbl.height + margin);
		}

		step.callouts.forEach(calloutID => {
			const callout = store.get.callout(calloutID);
			api.callout(callout, box);
			_.geom.moveBoxEdge(box, 'left', callout.width + margin);
		});

		if (step.csiID == null && step.steps.length) {
			api.subSteps(step, box);
		} else if (step.csiID != null) {
			api.csi(store.get.csi(step.csiID), box);
		}

		// Layout callout arrows after CSI because arrow tip position depends on CSI layout
		step.callouts.forEach(calloutID => {
			const callout = store.get.callout(calloutID);
			api.calloutArrow(callout);
		});

		if (step.rotateIconID != null && step.csiID != null) {
			const csi = store.get.csi(step.csiID);
			const icon = store.get.rotateIcon(step.rotateIconID);
			icon.width = store.state.template.rotateIcon.size;
			icon.height = icon.width * rotateIconAspectRatio;
			icon.x = csi.x - icon.width - margin;
			icon.y = csi.y - icon.height;
		}
	},

	submodelImage(submodelImage, box) {

		// TODO: if submodel image is too big, shrink it
		const csi = store.get.csi(submodelImage.csiID);
		const part = LDParse.model.get.part(submodelImage.modelFilename);
		const csiSize = store.render.pli(part, csi);
		const margin = getMargin(store.state.template.submodelImage.innerMargin);

		csi.x = csi.y = margin;
		csi.width = csiSize.width;
		csi.height = csiSize.height;

		const borderWidth = store.state.template.submodelImage.border.width;
		submodelImage.innerContentOffset = {x: borderWidth, y: borderWidth};

		submodelImage.x = box.x;
		submodelImage.y = box.y;
		submodelImage.width = borderWidth + margin + csiSize.width + margin + borderWidth;
		submodelImage.height = borderWidth + margin + csiSize.height + margin + borderWidth;

		if (submodelImage.quantityLabelID != null) {
			const lbl = store.get.quantityLabel(submodelImage.quantityLabelID);
			const font = store.state.template.submodelImage.quantityLabel.font;
			const lblSize = _.measureLabel(font, 'x' + submodelImage.quantity);
			submodelImage.width += lblSize.width + margin;
			lbl.x = submodelImage.width - borderWidth - borderWidth - margin;
			lbl.y = submodelImage.height - borderWidth - borderWidth - margin;
			_.copy(lbl, lblSize);
		}
	},

	csi(csi, box) {
		// Draw CSI centered in box
		const step = store.get.parent(csi);
		const localModel = LDParse.model.get.part(step.model.filename);
		const csiSize = store.render.csi(localModel, step, csi, null, csi.scale) || {width: 0, height: 0};
		csi.x = box.x + ((box.width - csiSize.width) / 2);
		csi.y = box.y + ((box.height - csiSize.height) / 2);
		csi.width = csiSize.width;
		csi.height = csiSize.height;
	},

	pli(pli) {

		let pliItems = pli.pliItems;
		if (!store.state.template.pli.includeSubmodels) {
			pliItems = pliItems.filter(id => {
				return !store.get.pliItemIsSubmodel({id, type: 'pliItem'});
			});
		}

		const borderWidth = store.state.template.pli.border.width;
		pli.innerContentOffset = {x: borderWidth, y: borderWidth};

		pli.borderOffset.x = pli.borderOffset.y = 0;
		if (_.isEmpty(pliItems)) {
			pli.x = pli.y = pli.width = pli.height = 0;
			return;
		}

		const step = store.get.step(pli.parent.id);
		const localModel = LDParse.model.get.part(step.model.filename);
		const qtyLabelOffset = 5;
		const margin = getMargin(store.state.template.pli.innerMargin);
		let maxHeight = 0, left = margin + qtyLabelOffset;

		//pliItems.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
		for (let i = 0; i < pliItems.length; i++) {

			const pliItem = store.get.pliItem(pliItems[i]);
			const pliScale = store.get.pliItemTransform(pliItem).scale || 1;
			const pliSize = store.render.pli(localModel.parts[pliItem.partNumbers[0]], pliItem, pliScale);
			pliItem.x = left;
			pliItem.y = margin;
			pliItem.width = pliSize.width;
			pliItem.height = pliSize.height;

			const font = store.state.template.pliItem.quantityLabel.font;
			const lblSize = _.measureLabel(font, 'x' + pliItem.quantity);
			const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
			quantityLabel.x = -qtyLabelOffset;
			quantityLabel.y = pliSize.height - qtyLabelOffset;
			quantityLabel.width = lblSize.width;
			quantityLabel.height = lblSize.height;

			left += pliSize.width + margin;
			maxHeight = Math.max(maxHeight, pliSize.height - qtyLabelOffset + quantityLabel.height);
		}

		pli.x = pli.y = 0;
		pli.width = borderWidth + left + borderWidth;
		pli.height = borderWidth + margin + maxHeight + margin + borderWidth;
	},

	callout(callout, box) {
		// TODO: add horizontal / vertical layout options to callout
		const borderWidth = store.state.template.callout.border.width;
		const margin = getMargin(store.state.template.callout.innerMargin);
		const calloutBox = {x: 0, y: 0, width: 0, height: margin};

		if (_.isEmpty(callout.steps)) {
			calloutBox.width = calloutBox.height = emptyCalloutSize;
		} else {
			const stepSizes = callout.steps.map(stepID => {
				const step = store.get.step(stepID);
				return {step, ...measureStep(step)};
			});
			const widestStep = Math.max(...stepSizes.map(el => el.width));
			const stepBox = {x: margin, y: margin, width: widestStep, height: null};
			calloutBox.width = margin + widestStep + margin;

			stepSizes.forEach(entry => {
				if (borderWidth + stepBox.y + entry.height + margin + borderWidth > box.height) {
					// Adding this step to the bottom of the box will make the box too tall to fit; wrap to next column
					stepBox.y = margin;
					stepBox.x += widestStep + margin;
					calloutBox.width += widestStep + margin;
				}
				stepBox.height = entry.height + margin;
				api.step(entry.step, stepBox, 0);
				stepBox.y += stepBox.height + margin;
				calloutBox.height = Math.max(calloutBox.height, stepBox.y);
			});
		}

		callout.innerContentOffset = {x: borderWidth, y: borderWidth};
		callout.width = borderWidth + calloutBox.width + borderWidth;
		callout.height = borderWidth + calloutBox.height + borderWidth;
		callout.x = box.x;
		callout.y = box.y + ((box.height - callout.height) / 2);  // Center callout vertically
	},

	calloutArrow(callout) {
		// TODO: consider adding a full automatic 'stairstep' callout arrow, which maintains orthogonal segments regardless of anchor or tip movement.

		// Delete all but first callout arrow
		while (callout.calloutArrows.length > 1) {
			store.mutations.item.delete({item: {type: 'calloutArrow', id: callout.calloutArrows[1]}});
		}

		// Delete all but first & last point in first arrow
		const arrow = store.get.calloutArrow(callout.calloutArrows[0]);
		while (arrow.points.length > 2) {
			store.mutations.item.delete({item: {type: 'point', id: arrow.points[1]}});
		}

		// Coordinates for first point (base) are relative to the *callout*
		const p1 = store.get.point(arrow.points[0]);
		const h = callout.height;
		p1.x = callout.width;
		p1.y = h - (h / (callout.steps.length || 1) / 2);

		// Coordinates for last point (tip) are relative to the *CSI*
		// TODO: try to position arrow tip centered to inserted part bounding box instead of overall CSI box
		const step = store.get.step(callout.parent.id);
		const csi = store.get.csi(step.csiID);
		const p2 = store.get.point(arrow.points[1]);
		p2.relativeTo = {type: 'csi', id: csi.id};
		p2.x = 0;
		p2.y = csi ? csi.height / 2 : 50;
	},

	subSteps(step, stepBox) {
		// TODO: this dupes a lot of logic from page.layout; abstract both to a generic 'grid' layout call
		const stepCount = step.steps.length;
		let cols = Math.ceil(Math.sqrt(stepCount));
		let rows = Math.ceil(stepCount / cols);
		const layout = step.subStepLayout;
		if (layout === 'vertical') {
			[cols, rows] = [rows, cols];
		}
		const colSize = Math.floor(stepBox.width / cols);
		const rowSize = Math.floor(stepBox.height / rows);

		const box = {x: stepBox.x, y: stepBox.y, width: colSize, height: rowSize};

		for (let i = 0; i < stepCount; i++) {
			if (layout === 'vertical') {
				box.x = stepBox.x + (colSize * Math.floor(i / rows));
				box.y = stepBox.y + (rowSize * (i % rows));
			} else {
				box.x = stepBox.x + (colSize * (i % cols));
				box.y = stepBox.y + (rowSize * Math.floor(i / cols));
			}
			api.step(store.get.step(step.steps[i]), box);
		}
		api.dividers(step, step.subStepLayout, rows, cols, stepBox);
	},

	templatePageDividers(page, box) {
		const template = store.state.template.page;
		const margin = getMargin(template.innerMargin);
		const step = store.get.step(page.steps[0]);
		const csi = store.get.csi(step.csiID);
		const x = csi.x + csi.width + (margin * 5);
		store.mutations.divider.add({
			parent: page,
			p1: {x, y: margin},
			p2: {x, y: box.height - margin}
		});
	},

	dividers(target, layoutDirection, rows, cols, box) {

		// Delete any dividers already on the target, then re-add new ones in the right places
		target.dividers = target.dividers || [];
		store.mutations.item.deleteChildList({item: target, listType: 'divider'});

		if (target.type === 'templatePage') {
			api.templatePageDividers(target, box);
			return;
		}

		const x = box.x || 0, y = box.y || 0;
		const template = store.state.template;
		const margin = getMargin(template[target.type].innerMargin);
		const colSize = Math.floor(box.width / cols);
		const rowSize = Math.floor(box.height / rows);

		if (layoutDirection === 'horizontal') {
			for (let i = 1; i < rows; i++) {
				store.mutations.divider.add({
					parent: target,
					p1: {x: x + margin, y: y + (rowSize * i)},
					p2: {x: x + box.width - margin, y: y + (rowSize * i)}
				});
			}
		} else {
			for (let i = 1; i < cols; i++) {
				store.mutations.divider.add({
					parent: target,
					p1: {x: x + (colSize * i), y: y + margin},
					p2: {x: x + (colSize * i), y: y + box.height - margin}
				});
			}
		}
	},

	label(label) {
		const labelSize = _.measureLabel(label.font, label.text);
		label.width = labelSize.width;
		label.height = labelSize.height;
	},

	mergeSteps(stepsToMerge) {
		// Starting with one step per page, move adjacent steps to the previous page until the page is full-ish
		stepsToMerge = stepsToMerge.slice(1);
		while (stepsToMerge.length) {

			const step = stepsToMerge[0];
			const originalPage = store.get.pageForItem(step);
			const prevPage = store.get.prevPage(originalPage, false, false);

			store.mutations.step.moveToPreviousPage({step});

			const stepsOverlap = prevPage.steps.some(stepID => isStepTooSmall(store.get.step(stepID)));
			if (stepsOverlap) {
				// Not enough room; move step back then start filling the next page
				store.mutations.step.moveToNextPage({step});
			} else {
				// Step fits; delete the now-empty page the step moved from
				store.mutations.page.delete({page: originalPage});
			}
			_.removeIndex(stepsToMerge, 0);
		}
	},

	adjustBoundingBox: {
		// csi(item) {
		// 	const step = store.get.parent(item);
		// 	if (step.parent.type === 'callout') {
		// 	}
		// },
		pliItem(item) {
			const pli = store.get.parent(item);
			const boxes = [];
			pli.pliItems.forEach(itemID => {
				const pliItem = store.get.pliItem(itemID);
				boxes.push({
					x: pli.x + pliItem.x, y: pli.y + pliItem.y,
					width: pliItem.width, height: pliItem.height
				});
				const qtyLabel = store.get.quantityLabel(pliItem.quantityLabelID);
				boxes.push({
					x: pli.x + pliItem.x + qtyLabel.x, y: pli.y + pliItem.y + qtyLabel.y,
					width: qtyLabel.width, height: qtyLabel.height
				});
			});
			const borderWidth = store.state.template.pli.border.width;
			const margin = getMargin(store.state.template.pli.innerMargin);
			const bbox = _.geom.bbox(boxes);
			pli.borderOffset.x = bbox.x - pli.x - margin;
			pli.borderOffset.y = bbox.y - pli.y - margin;
			pli.width = borderWidth + margin + bbox.width + margin + borderWidth;
			pli.height = borderWidth + margin + bbox.height + margin + borderWidth;
		},
		quantityLabel(item) {
			if (item.parent.type === 'pliItem') {
				api.adjustBoundingBox.pliItem(store.get.parent(item));
			}
		}
	}
};

function measureStep(step) {

	const margin = getMargin(store.state.template.step.innerMargin);
	let lblSize = {width: 0, height: 0};
	if (step.numberLabelID != null) {
		lblSize = _.measureLabel(store.state.template.callout.step.numberLabel.font, step.number);
		lblSize.width += margin;
		lblSize.height += margin;
	}

	const csi = store.get.csi(step.csiID);
	const localModel = LDParse.model.get.part(step.model.filename);
	const csiSize = store.render.csi(localModel, step, csi, null, csi.scale);
	if (!csiSize) {
		const emptyCSISize = emptyCalloutSize - (margin * 4);
		return {
			width: Math.max(emptyCSISize, lblSize.width),
			height: Math.max(emptyCSISize, lblSize.height)
		};
	}
	return {
		width: lblSize.width + csiSize.width,
		height: lblSize.height + csiSize.height
	};
}

function getMargin(margin) {
	const pageSize = store.state.template.page;
	return margin * Math.max(pageSize.width, pageSize.height);
}

// TODO: should push callouts down too
function alignStepContent(page) {
	const margin = getMargin(store.state.template.step.innerMargin);
	const steps = page.steps.map(stepID => store.get.step(stepID));
	if (steps.length < 2 || typeof page.actualLayout !== 'object' || page.actualLayout.direction !== 'horizontal') {
		return;  // only align step content across horizontally laid out pages with multiple steps
	}
	const stepsByRow = _.chunk(steps, page.actualLayout.cols);
	stepsByRow.forEach(stepList => {
		stepList = stepList.filter(el => !el.submodelImages.length);  // Don't adjust steps with submodel images here
		const tallestPLIHeight = Math.max(...stepList.map(step => (store.get.pli(step.pliID) || {}).height || 0));
		stepList.forEach(step => {
			const csi = store.get.csi(step.csiID);
			if (csi) {
				csi.y = (step.height + tallestPLIHeight - csi.height) / 2;
			}
			const lbl = store.get.numberLabel(step.numberLabelID);
			if (lbl) {
				lbl.y = tallestPLIHeight ? tallestPLIHeight + margin : 0;
			}
		});
	});
}

function isStepTooSmall(step) {
	const csi = store.get.csi(step.csiID);
	const pli = store.state.plisVisible ? store.get.pli(step.pliID) : null;
	const pliHeight = pli ? pli.height : 0;
	const submodelSpace = {width: 0, height: 0};
	step.submodelImages.forEach(submodelImageID => {
		const submodelImage = store.get.submodelImage(submodelImageID);
		submodelSpace.width = Math.max(submodelImage.width * 1.05, submodelSpace.width);
		submodelSpace.height += submodelImage.height;
	});

	if (step.width < csi.width * 1.1) {
		return true;
	} else if (pli && step.width < pli.width * 1.05) {
		return true;
	} else if (step.width < submodelSpace.width) {
		return true;
	} else if (step.height < (submodelSpace.height + pliHeight + csi.height) * 1.2) {
		return true;
	}
	return false;
}

export default api;
