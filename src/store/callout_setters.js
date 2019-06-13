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
			store.mutations.callout.addStep({callout, doLayout: false});
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
	addStep(opts) {  // opts: {callout, doLayout = false}
		const callout = store.get.lookupToItem(opts.callout);
		const stepNumber = callout.steps.length > 0 ? callout.steps.length + 1 : null;
		const newStep = store.mutations.step.add({dest: callout, stepNumber});
		if (callout.steps.length > 1) {
			newStep.model = _.cloneDeep(store.get.step(callout.steps[0])).model;
		} else {
			newStep.model = _.cloneDeep(store.get.step(callout.parent)).model;
		}
		if (stepNumber === 2) {
			// Special case: callouts with one step have no step numbers;
			// turn on step numbers when adding a 2nd step
			const firstStep = store.get.step(callout.steps[0]);
			firstStep.number = 1;
			store.mutations.item.add({item: {
				type: 'numberLabel',
				align: 'left', valign: 'top',
				x: null, y: null, width: null, height: null
			}, parent: firstStep});
		}
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
