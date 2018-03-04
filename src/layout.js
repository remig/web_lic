/* global module: false, util: false, store: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
Layout = (function() {
'use strict';

// These will end up in the template page, when we have one
const pageMargin = 20;
const pliMargin = pageMargin / 1.2;

const Layout = {

	step(opts) {  // opts: {step, box}

		const {step, box} = opts;
		const localModel = LDParse.model.get.submodelDescendant(store.model, step.submodel);

		step.x = box.x + pageMargin;
		step.y = box.y + pageMargin;
		step.width = box.width - pageMargin - pageMargin;
		step.height = box.height - pageMargin - pageMargin;

		let csi;
		if (step.csiID != null) {
			const csiSize = store.render.csi(localModel, step);
			csi = store.get.csi(step.csiID);
			csi.x = Math.floor((step.width - csiSize.width) / 2);
			csi.y = Math.floor((step.height - csiSize.height) / 2);
			csi.width = csiSize.width;
			csi.height = csiSize.height;
		}

		(step.callouts || []).forEach(calloutID => {
			const callout = store.get.callout(calloutID);
			if (util.isEmpty(callout.steps)) {
				callout.width = callout.height = 50;
				callout.x = 10;
				callout.y = Math.floor((step.height - callout.height) / 2);
				(callout.calloutArrows || []).forEach(arrowID => {
					store.mutations.deleteItem({type: 'calloutArrow', id: arrowID});
				});
				callout.calloutArrows = [];
				const arrow = store.mutations.addStateItem({
					type: 'calloutArrow',
					points: [],
					direction: 'right'
				}, callout);

				store.mutations.addStateItem({
					type: 'point', x: callout.width, y: callout.height / 2
				}, arrow);
				store.mutations.addStateItem({
					type: 'point',
					x: csi ? ((step.width - csi.width) / 2) - callout.x : callout.width + 100,
					y: callout.height / 2
				}, arrow);
			} else {
			}
		});

		const qtyLabelOffset = 5;
		let maxHeight = 0;
		let left = pliMargin + qtyLabelOffset;

		if (step.pliID != null && store.state.plisVisible) {

			const pli = store.get.pli(step.pliID);
			if (util.isEmpty(pli.pliItems)) {
				pli.x = pli.y = pli.width = pli.height = 0;
			} else {

				//pliItems.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
				for (let i = 0; i < pli.pliItems.length; i++) {

					const pliItem = store.get.pliItem(pli.pliItems[i]);
					const pliSize = store.render.pli(localModel.parts[pliItem.partNumbers[0]]);
					pliItem.x = Math.floor(left);
					pliItem.y = Math.floor(pliMargin);
					pliItem.width = pliSize.width;
					pliItem.height = pliSize.height;

					const lblSize = util.measureLabel('bold 10pt Helvetica', 'x' + pliItem.quantity);
					const pliQty = store.get.pliQty(pliItem.pliQtyID);
					pliQty.x = -qtyLabelOffset;
					pliQty.y = pliSize.height - qtyLabelOffset;
					pliQty.width = lblSize.width;
					pliQty.height = lblSize.height;

					left += Math.floor(pliSize.width + pliMargin);
					maxHeight = Math.max(maxHeight, pliSize.height - qtyLabelOffset + pliQty.height);
				}

				maxHeight = pliMargin + maxHeight + pliMargin;
				pli.x = pli.y = 0;
				pli.width = left;
				pli.height = maxHeight;
			}
		}

		if (step.numberLabel != null) {
			const lblSize = util.measureLabel('bold 20pt Helvetica', step.number);
			const lbl = store.get.stepNumber(step.numberLabel);
			lbl.x = 0;
			lbl.y = maxHeight ? maxHeight + pageMargin : 0;
			lbl.width = lblSize.width;
			lbl.height = lblSize.height;
		}
	},
	page(opts) {  // opts: {page, layout}, layout = 'horizontal' or 'vertical' or {rows, cols}

		const page = store.get.lookupToItem(opts.page);
		if (page.type === 'titlePage') {
			store.mutations.layoutTitlePage(page);
			return;
		}

		if (opts.layout) {
			page.layout = opts.layout;
		}

		let layout = page.layout || 'horizontal';
		const pageSize = store.state.pageSize;
		const stepCount = page.steps.length;
		let cols = Math.ceil(Math.sqrt(stepCount));
		let rows = Math.ceil(stepCount / cols);
		if (layout === 'vertical') {
			[cols, rows] = [rows, cols];
		} else if (layout.rows != null && layout.cols != null) {
			cols = layout.cols;
			rows = layout.rows;
			layout = layout.direction || (pageSize.width > pageSize ? 'horizontal' : 'vertical');
		}
		const colSize = Math.floor(pageSize.width / cols);
		const rowSize = Math.floor(pageSize.height / rows);

		const box = {x: 0, y: 0, width: colSize, height: rowSize};

		for (let i = 0; i < stepCount; i++) {
			if (layout === 'vertical') {
				box.x = colSize * Math.floor(i / rows);
				box.y = rowSize * (i % rows);
			} else {
				box.x = colSize * (i % cols);
				box.y = rowSize * Math.floor(i / cols);
			}
			store.mutations.layoutStep({step: store.get.step(page.steps[i]), box});
		}

		if (page.numberLabel != null) {
			const lblSize = util.measureLabel('bold 20pt Helvetica', page.number);
			const lbl = store.get.pageNumber(page.numberLabel);
			lbl.x = pageSize.width - pageMargin - lblSize.width;
			lbl.y = pageSize.height - pageMargin - lblSize.height;
			lbl.width = lblSize.width;
			lbl.height = lblSize.height;
		}
		delete page.needsLayout;
	},
	titlePage(page) {
		page = store.get.lookupToItem(page);
		const pageSize = store.state.pageSize;
		const step = store.get.step(page.steps[0]);
		const csi = store.get.csi(step.csiID);
		const box = {x: 0, y: 0, width: pageSize.width, height: pageSize.height};
		store.mutations.layoutStep({step, box});
		step.width = csi.width + 40;
		step.height = csi.height + 40;
		step.x = Math.floor((pageSize.width - step.width) / 2);
		step.y = Math.floor((pageSize.height - step.height) / 2);
		csi.x = csi.y = 20;

		const title = store.get.label(page.labels[0]);
		const titleSize = util.measureLabel(title.font, title.text);
		title.x = (pageSize.width - titleSize.width) / 2;
		title.y = (step.y - titleSize.height) / 2;
		title.width = titleSize.width;
		title.height = titleSize.height;

		const modelInfo = store.get.label(page.labels[1]);
		const modelInfoSize = util.measureLabel(modelInfo.font, modelInfo.text);
		modelInfo.x = (pageSize.width - modelInfoSize.width) / 2;
		modelInfo.y = ((step.y - modelInfoSize.height) / 2) + step.y + step.height;
		modelInfo.width = modelInfoSize.width;
		modelInfo.height = modelInfoSize.height;
		delete page.needsLayout;
	}
};

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = Layout;
}

return Layout;

})();
