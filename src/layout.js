'use strict';

const util = require('./util');
const LDParse = require('./LDParse');
const store = require('./store');

const emptyCalloutSize = 50;
const rotateIconAspectRatio = 0.94; // height / width

const api = {

	callout(callout) {
		const step = store.get.step(callout.parent.id);
		const csi = store.get.csi(step.csiID);
		const margin = getMargin(store.state.template.callout.innerMargin);

		if (util.isEmpty(callout.steps)) {
			callout.width = callout.height = emptyCalloutSize;
		} else {
			let totalHeight = 0, maxWidth = 0;
			callout.height = 0;
			callout.steps.forEach(stepID => {
				const step = store.get.step(stepID);
				api.step.insideOut(step, margin);
				step.x = margin;
				step.y = margin + totalHeight;
				totalHeight = step.y + step.height;
				maxWidth = Math.max(maxWidth, step.width);
			});
			callout.steps.forEach(stepID => {
				const step = store.get.step(stepID);
				step.x = margin + ((maxWidth - step.width) / 2);
			});
			callout.width = margin + maxWidth + margin;
			callout.height = margin + totalHeight;
		}
		callout.x = 10;
		callout.y = csi.y - ((callout.height - csi.height) / 2);
		api.calloutArrow(callout);
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
		const step = store.get.step(callout.parent.id);
		const csi = store.get.csi(step.csiID);
		const p2 = store.get.point(arrow.points[1]);
		p2.relativeTo = {type: 'csi', id: csi.id};
		p2.x = 0;
		p2.y = csi ? csi.height / 2 : 50;
	},
	pli(pli) {

		let pliItems = pli.pliItems;
		if (!store.state.template.pli.includeSubmodels) {
			pliItems = pliItems.filter(id => {
				return !store.get.pliItemIsSubmodel({id, type: 'pliItem'});
			});
		}

		pli.borderOffset.x = pli.borderOffset.y = 0;
		if (util.isEmpty(pliItems)) {
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
			const pliSize = store.render.pli(localModel.parts[pliItem.partNumbers[0]], pliItem);
			pliItem.x = left;
			pliItem.y = margin;
			pliItem.width = pliSize.width;
			pliItem.height = pliSize.height;

			const font = store.state.template.pliItem.quantityLabel.font;
			const lblSize = util.measureLabel(font, 'x' + pliItem.quantity);
			const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
			quantityLabel.x = -qtyLabelOffset;
			quantityLabel.y = pliSize.height - qtyLabelOffset;
			quantityLabel.width = lblSize.width;
			quantityLabel.height = lblSize.height;

			left += pliSize.width + margin;
			maxHeight = Math.max(maxHeight, pliSize.height - qtyLabelOffset + quantityLabel.height);
		}

		pli.x = pli.y = 0;
		pli.width = left;
		pli.height = margin + maxHeight + margin;
	},
	csi(csi, box) {
		// Draw CSI centered in box
		const step = store.get.parent(csi);
		const localModel = LDParse.model.get.part(step.model.filename);
		const csiSize = store.render.csi(localModel, step, csi) || {width: 0, height: 0};
		csi.x = box.x + ((box.width - csiSize.width) / 2);
		csi.y = box.y + ((box.height - csiSize.height) / 2);
		csi.width = csiSize.width;
		csi.height = csiSize.height;
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

		submodelImage.x = box.x;
		submodelImage.y = box.y;
		submodelImage.width = margin + csiSize.width + margin;
		submodelImage.height = margin + csiSize.height + margin;

		if (submodelImage.quantityLabelID != null) {
			const lbl = store.get.quantityLabel(submodelImage.quantityLabelID);
			const font = store.state.template.submodelImage.quantityLabel.font;
			const lblSize = util.measureLabel(font, 'x' + submodelImage.quantity);
			submodelImage.width += lblSize.width + margin;
			lbl.x = submodelImage.x + submodelImage.width - margin;
			lbl.y = submodelImage.y + submodelImage.height - margin;
			lbl.width = lblSize.width;
			lbl.height = lblSize.height;
		}
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
			api.step.outsideIn(store.get.step(step.steps[i]), box);
		}
		api.dividers(step, step.subStepLayout, rows, cols, stepBox);
	},
	step: {
		outsideIn(step, box) {  // Starting with a pre-defined box, layout everything in this step inside it

			const pageMargin = getMargin(store.state.template.page.innerMargin);
			const innerMargin = getMargin(store.state.template.step.innerMargin);

			// Position step in parent coordinates
			step.x = box.x + pageMargin;
			step.y = box.y + pageMargin;
			step.width = box.width - pageMargin - pageMargin;
			step.height = box.height - pageMargin - pageMargin;

			// transform box to step coordinates
			box = util.clone(box);
			box.x = box.y = 0;
			box.width = step.width;
			box.height = step.height;

			(step.submodelImages || []).forEach(submodelImageID => {
				const submodelImage = store.get.submodelImage(submodelImageID);
				if (submodelImage) {
					api.submodelImage(submodelImage, box);
					util.geom.moveBoxEdge(box, 'top', submodelImage.height + innerMargin);
				}
			});

			const pli = (step.pliID != null && store.state.plisVisible) ? store.get.pli(step.pliID) : null;
			if (pli) {
				api.pli(pli);
				pli.y = box.y;
				util.geom.moveBoxEdge(box, 'top', pli.height + innerMargin);
			}

			if (step.numberLabelID != null) {
				const lblSize = util.measureLabel(store.state.template.step.numberLabel.font, step.number);
				const lbl = store.get.numberLabel(step.numberLabelID);
				lbl.x = 0;
				lbl.y = box.y;
				lbl.width = lblSize.width;
				lbl.height = lblSize.height;
				util.geom.moveBoxEdge(box, 'top', lbl.height + innerMargin);
			}

			if (step.csiID == null && step.steps.length) {
				api.subSteps(step, box);
			} else if (step.csiID != null) {
				api.csi(store.get.csi(step.csiID), box);
			}

			(step.callouts || []).forEach(calloutID => {
				api.callout(store.get.callout(calloutID));
			});

			if (step.rotateIconID != null && step.csiID != null) {
				const csi = store.get.csi(step.csiID);
				const icon = store.get.rotateIcon(step.rotateIconID);
				icon.width = store.state.template.rotateIcon.size;
				icon.height = icon.width * rotateIconAspectRatio;
				icon.x = csi.x - icon.width - innerMargin;
				icon.y = csi.y - icon.height;
			}
		},
		insideOut(step, margin) {
			const localModel = LDParse.model.get.part(step.model.filename);
			const contentSize = {width: 0, height: 0};
			margin = margin || getMargin(store.state.template.page.innerMargin);

			let lblSize = {width: 0, height: 0};
			if (step.numberLabelID != null) {
				lblSize = util.measureLabel(store.state.template.callout.step.numberLabel.font, step.number);
				const lbl = store.get.numberLabel(step.numberLabelID);
				lbl.x = lbl.y = 0;
				lbl.width = lblSize.width;
				lbl.height = lblSize.height;
			}

			if (step.csiID != null) {
				const emptyCSISize = emptyCalloutSize - (margin * 4);
				const csi = store.get.csi(step.csiID);
				const csiSize = store.render.csi(localModel, step, csi) || {width: emptyCSISize, height: emptyCSISize};
				csi.x = lblSize.width + margin;
				csi.y = lblSize.height + margin;
				csi.width = contentSize.width = csiSize.width;
				csi.height = contentSize.height = csiSize.height;
			}

			// step x & y set outside this call
			step.width = margin + lblSize.width + contentSize.width + margin;
			step.height = margin + lblSize.height + contentSize.height + margin;
		}
	},
	templatePageDividers(page) {
		const template = store.state.template.page;
		const margin = getMargin(store.state.template.page.innerMargin);
		const step = store.get.step(page.steps[0]);
		const csi = store.get.csi(step.csiID);
		const x = csi.x + csi.width + (margin * 5);
		store.mutations.divider.add({
			parent: page,
			p1: {x, y: margin},
			p2: {x, y: template.height - margin}
		});
	},
	dividers(target, layoutDirection, rows, cols, box) {

		// Delete any dividers already on the target, then re-add new ones in the right places
		target.dividers = target.dividers || [];
		store.mutations.item.deleteChildList({item: target, listType: 'divider'});

		if (target.type === 'templatePage') {
			api.templatePageDividers(target);
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
	page(page, layout = 'horizontal') {

		if (page.type === 'titlePage') {
			api.titlePage(page);
			return;
		}

		const pageSize = store.state.template.page;
		const margin = getMargin(store.state.template.page.innerMargin);
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
			api.step.outsideIn(store.get.step(page.steps[i]), box);
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
					api.step.outsideIn(store.get.step(page.steps[stepIndex]), box);
				}
			} else {
				const stepsInLastRow = cols - emptySlots;
				box.width = Math.floor(pageSize.width / stepsInLastRow);
				box.height = rowSize;
				box.y = (rows - 1) * rowSize;
				for (let i = 0; i < stepsInLastRow; i++) {
					box.x = box.width * i;
					const stepIndex = ((rows - 1) * cols) + i;
					api.step.outsideIn(store.get.step(page.steps[stepIndex]), box);
				}
			}
		}

		page.layout = layout;
		page.actualLayout = (rows > 1 || cols > 1) ? {rows, cols, direction: layoutDirection} : 'horizontal';
		api.dividers(page, layoutDirection, rows, cols, pageSize);

		if (store.state.plisVisible) {
			alignStepContent(page);
		}

		if (page.numberLabelID != null) {
			const lblSize = util.measureLabel(store.state.template.page.numberLabel.font, page.number);
			const lbl = store.get.numberLabel(page.numberLabelID);
			lbl.x = pageSize.width - margin;
			lbl.y = pageSize.height - margin;
			lbl.width = lblSize.width;
			lbl.height = lblSize.height;
		}
		delete page.needsLayout;
	},
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
	label(label) {
		const labelSize = util.measureLabel(label.font, label.text);
		label.width = labelSize.width;
		label.height = labelSize.height;
	},
	mergeSteps(stepsToMerge) {
		// Starting with one step per page, move adjacent steps to the previous page until the page is full-ish
		stepsToMerge = stepsToMerge.slice(1);
		while (stepsToMerge.length) {

			const step = stepsToMerge[0];
			const originalPage = store.get.pageForItem(step);
			const prevPage = store.get.prevPage(originalPage, false);

			store.mutations.step.moveToPreviousPage({step});

			const stepsOverlap = prevPage.steps.some(stepID => isStepTooSmall(store.get.step(stepID)));
			if (stepsOverlap) {
				// Not enough room; move step back then start filling the next page
				store.mutations.step.moveToNextPage({step});
			} else {
				// Step fits; delete the now-empty page the step moved from
				store.mutations.page.delete({page: originalPage});
			}
			util.array.removeIndex(stepsToMerge, 0);
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
			const margin = getMargin(store.state.template.pli.innerMargin);
			const bbox = util.geom.bbox(boxes);
			pli.borderOffset.x = bbox.x - pli.x - margin;
			pli.borderOffset.y = bbox.y - pli.y - margin;
			pli.width = margin + bbox.width + margin;
			pli.height = margin + bbox.height + margin;
		},
		quantityLabel(item) {
			if (item.parent.type === 'pliItem') {
				api.adjustBoundingBox.pliItem(store.get.parent(item));
			}
		}
	}
};

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
	const stepsByRow = util.array.chunk(steps, page.actualLayout.cols);
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
	(step.submodelImages || []).forEach(submodelImageID => {
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

module.exports = api;
