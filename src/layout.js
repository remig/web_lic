/* global module: false, util: false, store: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
Layout = (function() {
'use strict';

// These will end up in the template page, when we have one
const pageMargin = 20;
const pliMargin = Math.floor(pageMargin / 1.2);
const calloutMargin = Math.floor(pliMargin / 2);

const Layout = {

	callout(callout) {
		const step = store.get.step(callout.parent.id);
		const csi = store.get.csi(step.csiID);

		if (util.isEmpty(callout.steps)) {
			callout.width = callout.height = 50;
		} else {
			let totalHeight = 0, maxWidth = 0;
			callout.height = 0;
			callout.steps.forEach(stepID => {
				const step = store.get.step(stepID);
				Layout.step.insideOut(step, calloutMargin);
				step.x = calloutMargin;
				step.y = Math.floor(calloutMargin + totalHeight);
				totalHeight = step.y + step.height;
				maxWidth = Math.max(maxWidth, step.width);
			});
			callout.steps.forEach(stepID => {
				const step = store.get.step(stepID);
				step.x = Math.floor(calloutMargin + ((maxWidth - step.width) / 2));
			});
			callout.width = calloutMargin + maxWidth + calloutMargin;
			callout.height = calloutMargin + totalHeight;
		}
		callout.x = 10;
		callout.y = Math.floor(csi.y - ((callout.height - csi.height) / 2));
		Layout.calloutArrow(callout);
	},
	calloutArrow(callout) {
		const step = store.get.step(callout.parent.id);
		const csi = store.get.csi(step.csiID);
		callout.calloutArrows.forEach(id => {
			const arrow = store.get.calloutArrow(id);
			arrow.points.forEach(id => store.mutations.item.delete({item: {type: 'point', id}}));
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
		} else {

			const step = store.get.step(pli.parent.id);
			const localModel = LDParse.model.get.submodelDescendant(store.model, step.submodel);
			const qtyLabelOffset = 5;
			let maxHeight = 0, left = pliMargin + qtyLabelOffset;

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

			pli.x = pli.y = 0;
			pli.width = left;
			pli.height = pliMargin + maxHeight + pliMargin;
		}
	},
	step: {
		outsideIn(step, box) {  // Starting with a pre-defined box, layout everything in this step inside it

			const localModel = LDParse.model.get.submodelDescendant(store.model, step.submodel);

			step.x = Math.floor(box.x + pageMargin);
			step.y = Math.floor(box.y + pageMargin);
			step.width = box.width - pageMargin - pageMargin;
			step.height = box.height - pageMargin - pageMargin;

			if (step.csiID != null) {
				const csiSize = store.render.csi(localModel, step);
				const csi = store.get.csi(step.csiID);
				csi.x = Math.floor((step.width - csiSize.width) / 2);
				csi.y = Math.floor((step.height - csiSize.height) / 2);
				csi.width = csiSize.width;
				csi.height = csiSize.height;
			}

			(step.callouts || []).forEach(calloutID => {
				Layout.callout(store.get.callout(calloutID));
			});

			if (step.pliID != null && store.state.plisVisible) {
				Layout.pli(store.get.pli(step.pliID));
			}

			if (step.numberLabel != null) {
				const havePLI = step.pliID != null && store.state.plisVisible;
				const pliHeight = havePLI ? store.get.pli(step.pliID).height : 0;
				const lblSize = util.measureLabel('bold 20pt Helvetica', step.number);
				const lbl = store.get.stepNumber(step.numberLabel);
				lbl.x = 0;
				lbl.y = pliHeight ? pliHeight + pageMargin : 0;
				lbl.width = lblSize.width;
				lbl.height = lblSize.height;
			}
		},
		insideOut(step, margin) {
			const localModel = LDParse.model.get.submodelDescendant(store.model, step.submodel);
			const contentSize = {width: 0, height: 0};
			margin = margin || pageMargin;

			let lblSize = {width: 0, height: 0};
			if (step.numberLabel != null) {
				lblSize = util.measureLabel('bold 20pt Helvetica', step.number);
				const lbl = store.get.stepNumber(step.numberLabel);
				lbl.x = lbl.y = 0;
				lbl.width = lblSize.width;
				lbl.height = lblSize.height;
			}

			// TODO: move all Math.floor rounding to the last possible moment: when drawing the CSI / PLI on the page
			if (step.csiID != null) {
				const csiSize = store.render.csi(localModel, step);
				const csi = store.get.csi(step.csiID);
				csi.x = Math.floor(lblSize.width + margin);
				csi.y = Math.floor(lblSize.height + margin);
				csi.width = contentSize.width = csiSize.width;
				csi.height = contentSize.height = csiSize.height;
			}

			// step x & y set outside this call
			step.width = margin + lblSize.width + contentSize.width + margin;
			step.height = margin + lblSize.height + contentSize.height + margin;
		}
	},
	page(page, layout) {

		if (page.type === 'titlePage') {
			store.mutations.layoutTitlePage(page);
			return;
		}

		layout = page.layout = layout || 'horizontal';
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
			store.mutations.step.layout({step: store.get.step(page.steps[i]), box});
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
		store.mutations.step.layout({step, box});
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
