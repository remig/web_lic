'use strict';

const util = require('./util');
const LDParse = require('./LDParse');
const store = require('./store');

// These will end up in the template page, when we have one
const pageMargin = 20;
const pliMargin = Math.floor(pageMargin / 1.2);
const calloutMargin = Math.floor(pliMargin / 2);
const emptyCalloutSize = 50;
const rotateIconAspectRatio = 0.94; // height / width

const api = {

	callout(callout) {
		const step = store.get.step(callout.parent.id);
		const csi = store.get.csi(step.csiID);

		if (util.isEmpty(callout.steps)) {
			callout.width = callout.height = emptyCalloutSize;
		} else {
			let totalHeight = 0, maxWidth = 0;
			callout.height = 0;
			callout.steps.forEach(stepID => {
				const step = store.get.step(stepID);
				api.step.insideOut(step, calloutMargin);
				step.x = calloutMargin;
				step.y = calloutMargin + totalHeight;
				totalHeight = step.y + step.height;
				maxWidth = Math.max(maxWidth, step.width);
			});
			callout.steps.forEach(stepID => {
				const step = store.get.step(stepID);
				step.x = calloutMargin + ((maxWidth - step.width) / 2);
			});
			callout.width = calloutMargin + maxWidth + calloutMargin;
			callout.height = calloutMargin + totalHeight;
		}
		callout.x = 10;
		callout.y = csi.y - ((callout.height - csi.height) / 2);
		api.calloutArrow(callout);
	},
	calloutArrow(callout) {
		// TODO: do not recreate callout arrow on layout; just alter the existing one
		// TODO: arrow should come out of the center of the last step in the callout
		const step = store.get.step(callout.parent.id);
		const csi = store.get.csi(step.csiID);
		callout.calloutArrows.forEach(id => {
			const arrow = store.get.calloutArrow(id);
			store.mutations.item.deleteChildList({item: arrow, listType: 'point'});
			store.mutations.item.delete({item: {type: 'calloutArrow', id}});
		});
		callout.calloutArrows = [];
		const arrow = store.mutations.item.add({item: {
			type: 'calloutArrow',
			points: [],
			direction: 'right'
		}, parent: callout});

		store.mutations.item.add({item: {
			type: 'point', x: callout.width, y: callout.height / 2
		}, parent: arrow});
		store.mutations.item.add({item: {
			type: 'point',
			x: csi ? csi.x - callout.x : callout.width + 100,
			y: callout.height / 2
		}, parent: arrow});
	},
	pli(pli) {

		if (util.isEmpty(pli.pliItems)) {
			pli.x = pli.y = pli.width = pli.height = 0;
			return;
		}

		const step = store.get.step(pli.parent.id);
		const localModel = LDParse.model.get.submodelDescendant(step.model || store.model, step.submodel);
		const qtyLabelOffset = 5;
		let maxHeight = 0, left = pliMargin + qtyLabelOffset;

		//pliItems.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
		for (let i = 0; i < pli.pliItems.length; i++) {

			const pliItem = store.get.pliItem(pli.pliItems[i]);
			const pliSize = store.render.pli(localModel.parts[pliItem.partNumbers[0]]);
			pliItem.x = left;
			pliItem.y = pliMargin;
			pliItem.width = pliSize.width;
			pliItem.height = pliSize.height;

			const lblSize = util.measureLabel('bold 10pt Helvetica', 'x' + pliItem.quantity);
			const pliQty = store.get.pliQty(pliItem.pliQtyID);
			pliQty.x = -qtyLabelOffset;
			pliQty.y = pliSize.height - qtyLabelOffset;
			pliQty.width = lblSize.width;
			pliQty.height = lblSize.height;

			left += pliSize.width + pliMargin;
			maxHeight = Math.max(maxHeight, pliSize.height - qtyLabelOffset + pliQty.height);
		}

		pli.x = pli.y = 0;
		pli.width = left;
		pli.height = pliMargin + maxHeight + pliMargin;
	},
	submodelImage(submodelImage) {
		const step = store.get.parent(submodelImage);
		const part = LDParse.model.get.submodelDescendant(step.model || store.model, submodelImage.submodel);
		const pliSize = store.render.pli(part);
		submodelImage.x = submodelImage.y = 0;
		submodelImage.contentX = submodelImage.contentY = pliMargin;
		submodelImage.width = pliMargin + pliSize.width + pliMargin;
		submodelImage.height = pliMargin + pliSize.height + pliMargin;

		if (submodelImage.pliQtyID != null) {
			const lbl = store.get.pliQty(submodelImage.pliQtyID);
			const font = store.state.template.submodelImage.quantityLabel.font;
			const lblSize = util.measureLabel(font, 'x' + submodelImage.quantity);
			submodelImage.width += lblSize.width + pliMargin;
			lbl.x = submodelImage.width - pliMargin;
			lbl.y = submodelImage.height - pliMargin;
			lbl.width = lblSize.width;
			lbl.height = lblSize.height;
		}
	},
	step: {
		outsideIn(step, box) {  // Starting with a pre-defined box, layout everything in this step inside it

			const localModel = LDParse.model.get.submodelDescendant(step.model || store.model, step.submodel);

			step.x = box.x + pageMargin;
			step.y = box.y + pageMargin;
			step.width = box.width - pageMargin - pageMargin;
			step.height = box.height - pageMargin - pageMargin;

			const submodelImage = (step.submodelImageID != null) ? store.get.submodelImage(step.submodelImageID) : null;
			if (submodelImage) {
				api.submodelImage(submodelImage);
			}
			const submodelHeight = submodelImage ? submodelImage.height + pliMargin : 0;

			const pli = (step.pliID != null && store.state.plisVisible) ? store.get.pli(step.pliID) : null;
			if (pli) {
				api.pli(pli);
				pli.y += submodelHeight;
			}
			const pliHeight = pli ? pli.height + submodelHeight : submodelHeight;

			if (step.csiID != null) {
				const csi = store.get.csi(step.csiID);
				const csiSize = store.render.csi(localModel, step, csi) || {width: 0, height: 0};
				csi.x = (step.width - csiSize.width) / 2;
				csi.y = (step.height + pliHeight - csiSize.height) / 2;
				csi.width = csiSize.width;
				csi.height = csiSize.height;
			}

			(step.callouts || []).forEach(calloutID => {
				api.callout(store.get.callout(calloutID));
			});

			if (step.numberLabelID != null) {
				const lblSize = util.measureLabel(store.state.template.step.numberLabel.font, step.number);
				const lbl = store.get.numberLabel(step.numberLabelID);
				lbl.x = 0;
				lbl.y = pliHeight ? pliHeight + pageMargin : 0;
				lbl.width = lblSize.width;
				lbl.height = lblSize.height;
			}

			if (step.rotateIconID != null && step.csiID != null) {
				const csi = store.get.csi(step.csiID);
				const icon = store.get.rotateIcon(step.rotateIconID);
				icon.width = 40;
				icon.height = icon.width * rotateIconAspectRatio;
				icon.x = csi.x - icon.width - 20;
				icon.y = csi.y - icon.height;
			}
		},
		insideOut(step, margin) {
			const localModel = LDParse.model.get.submodelDescendant(step.model || store.model, step.submodel);
			const contentSize = {width: 0, height: 0};
			margin = margin || pageMargin;

			let lblSize = {width: 0, height: 0};
			if (step.numberLabelID != null) {
				lblSize = util.measureLabel(store.state.template.step.numberLabel.font, step.number);
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
	dividers(page, layoutDirection, rows, cols) {

		// Delete any dividers already on the page, then re-add new ones in the right plaoces.
		page.dividers = page.dividers || [];
		store.mutations.item.deleteChildList({item: page, listType: 'divider'});

		const pageSize = store.state.template.page;
		const colSize = Math.floor(pageSize.width / cols);
		const rowSize = Math.floor(pageSize.height / rows);

		if (layoutDirection === 'horizontal') {
			for (let i = 1; i < rows; i++) {
				store.mutations.item.add({item: {
					type: 'divider',
					p1: {x: pageMargin, y: rowSize * i},
					p2: {x: pageSize.width - pageMargin, y: rowSize * i}
				}, parent: page});
			}
		} else {
			for (let i = 1; i < cols; i++) {
				store.mutations.item.add({item: {
					type: 'divider',
					p1: {x: colSize * i, y: pageMargin},
					p2: {x: colSize * i, y: pageSize.height - pageMargin}
				}, parent: page});
			}
		}
	},
	page(page, layout = 'horizontal') {

		if (page.type === 'titlePage') {
			api.titlePage(page);
			return;
		}

		const pageSize = store.state.template.page;
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

		page.layout = layout;
		page.actualLayout = (rows > 1 || cols > 1) ? {rows, cols, direction: layoutDirection} : 'horizontal';
		api.dividers(page, layoutDirection, rows, cols);

		if (store.state.plisVisible) {
			alignStepContent(page);
		}

		if (page.numberLabelID != null) {
			const lblSize = util.measureLabel(store.state.template.page.numberLabel.font, page.number);
			const lbl = store.get.numberLabel(page.numberLabelID);
			lbl.x = pageSize.width - pageMargin;
			lbl.y = pageSize.height - pageMargin;
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
	mergePages(pagesAdded) {
		// Starting with one step per page, move adjacent steps to the previous page until the page is full-ish

		const pages = pagesAdded.map(pageID => store.get.page(pageID));
		pages.forEach(page => api.page(page));

		const stepsToMerge = [].concat(...pages.map(page => page.steps)).slice(1);
		while (stepsToMerge.length) {

			const step = {type: 'step', id: stepsToMerge[0]};
			const originalPage = store.get.pageForItem(step);

			const prevPage = store.get.prevPage(originalPage, false);
			if (pagesAdded.includes(prevPage.id)) {  // previous page must be in the list of pages that can be altered, in order to move steps to it

				store.mutations.step.moveToPreviousPage({step});  // Move this step to previous page
				const destPage = store.get.pageForItem(step);
				const stepsOverlap = destPage.steps.some(stepID => isStepTooSmall(store.get.step(stepID)));

				if (stepsOverlap) {
					// Not enough room; move step back then start filling the next page
					store.mutations.step.moveToNextPage({step});
				} else {
					// Step fits; delete the now-empty page the step moved from
					store.mutations.page.delete({page: originalPage});
				}
			}
			util.array.removeIndex(stepsToMerge, 0);
		}
	}
};

function alignStepContent(page) {
	const steps = page.steps.map(stepID => store.get.step(stepID));
	if (steps.length < 2 || typeof page.actualLayout !== 'object' || page.actualLayout.direction !== 'horizontal') {
		return;  // only align step content across horizontally laid out pages with multiple steps
	}
	const stepsByRow = util.array.chunk(steps, page.actualLayout.cols);
	stepsByRow.forEach(stepList => {
		stepList = stepList.filter(el => el.submodelImageID == null);  // Don't adjust steps with submodel images here
		const tallestPLIHeight = Math.max(...stepList.map(step => (store.get.pli(step.pliID) || {}).height || 0));
		stepList.forEach(step => {
			const csi = store.get.csi(step.csiID);
			if (csi) {
				csi.y = (step.height + tallestPLIHeight - csi.height) / 2;
			}
			const lbl = store.get.numberLabel(step.numberLabelID);
			if (lbl) {
				lbl.y = tallestPLIHeight ? tallestPLIHeight + pageMargin : 0;
			}
		});
	});
}

function isStepTooSmall(step) {
	const csi = store.get.csi(step.csiID);
	const pli = store.state.plisVisible ? store.get.pli(step.pliID) : null;
	const pliHeight = pli ? pli.height : 0;
	const submodelImage = store.get.submodelImage(step.submodelImageID);
	const submodelHeight = submodelImage ? submodelImage.height : 0;

	if (step.width < csi.width * 1.1) {
		return true;
	} else if (pli && step.width < pli.width * 1.05) {
		return true;
	} else if (submodelImage && step.width < submodelImage.width * 1.05) {
		return true;
	} else if (step.height < (submodelHeight + pliHeight + csi.height) * 1.2) {
		return true;
	}
	return false;
}

module.exports = api;
