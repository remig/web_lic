/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';

export default {
	add(opts) {  // opts: {parent, position = 'left', includeEmptyStep = false}
		const pageSize = store.state.template.page;
		const callout = store.mutations.item.add({item: {
			type: 'callout',
			steps: [], calloutArrows: [],
			x: null, y: null, width: null, height: null,
			innerContentOffset: {x: 0, y: 0},
			borderOffset: {x: 0, y: 0},
			layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical',
			position: opts.position || 'left'
		}, parent: opts.parent});

		if (opts.includeEmptyStep) {
			store.mutations.callout.addFirstStep({callout, doLayout: false});
		}

		store.mutations.calloutArrow.add({parent: callout});
		return callout;
	},
	delete(opts) {  // opts: {callout, doLayout}
		const item = store.get.lookupToItem(opts.callout);
		store.mutations.item.deleteChildList({item, listType: 'calloutArrow'});
		store.mutations.item.deleteChildList({item, listType: 'step'});
		store.mutations.item.delete({item});
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(item)});
		}
	},
	addFirstStep(opts) {  // opts: {callout, doLayout = false}
		const callout = store.get.lookupToItem(opts.callout);
		const newStep = store.mutations.step.add({dest: callout});
		newStep.model = _.cloneDeep(store.get.step(callout.parent)).model;
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(callout)});
		}
	},
	addStep(opts) {  // opts: {callout, insertionIndex, doLayout = false}
		const callout = store.get.lookupToItem(opts.callout);
		if (callout.steps.length < 1) {
			store.mutations.callout.addFirstStep(opts);
			return;
		}

		const model = _.cloneDeep(store.get.step(callout.steps[0]).model);
		const destStep = store.get.step(callout.steps[opts.insertionIndex]);
		const stepNumber = destStep
			? destStep.number || 1
			: store.get.step(_.last(callout.steps)).number + 1;

		const newStep = store.mutations.step.add({
			dest: callout,
			stepNumber,
			parentInsertionIndex: opts.insertionIndex
		});
		newStep.model = model;

		callout.steps.map(store.get.step)
			.forEach((step, idx) => {
				step.number = idx + 1;
				if (step.numberLabelID == null) {
					store.mutations.item.add({item: {
						type: 'numberLabel',
						align: 'left', valign: 'top',
						x: null, y: null, width: null, height: null
					}, parent: step});
				}
			});
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(callout)});
		}
	},
	layout(opts) { // opts: {callout, layout, position, doLayout}
		const callout = store.get.lookupToItem(opts.callout);
		callout.layout = opts.layout || callout.layout;
		callout.position = opts.position || callout.position;
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(callout)});
		}
	}
};
