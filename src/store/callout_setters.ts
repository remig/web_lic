/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';

export interface CalloutMutationInterface {
	add(
		{parent, position, includeEmptyStep}
		: {parent: LookupItem, position: Direction, includeEmptyStep: boolean}
	): Callout;
	delete({callout, doLayout}: {callout: LookupItem, doLayout: boolean}): void;
	addFirstStep({callout, doLayout}: {callout: LookupItem, doLayout: boolean}): void;
	addStep(
		{callout, insertionIndex, doLayout}
		: {callout: LookupItem, insertionIndex: number, doLayout: boolean}
	): void;
	layout(
		{callout, layout, position, doLayout}
		: {callout: LookupItem, layout: Orientation, position: Direction, doLayout: boolean}
	): void;
}

export const CalloutMutations: CalloutMutationInterface = {
	add({parent, position = 'left', includeEmptyStep = false}) {
		const pageSize = store.state.template.page;
		const callout = store.mutations.item.add({item: {
			type: 'callout',
			steps: [], calloutArrows: [],
			x: null, y: null, width: null, height: null,
			innerContentOffset: {x: 0, y: 0},
			borderOffset: {x: 0, y: 0},
			layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical',
			position,
		}, parent});

		if (includeEmptyStep) {
			store.mutations.callout.addFirstStep({callout, doLayout: false});
		}

		store.mutations.calloutArrow.add({parent: callout});
		return callout;
	},
	delete({callout, doLayout = false}) {
		const item = store.get.callout(callout);
		store.mutations.item.deleteChildList({item, listType: 'calloutArrow'});
		store.mutations.item.deleteChildList({item, listType: 'step'});
		store.mutations.item.delete({item});
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(item)});
		}
	},
	addFirstStep({callout, doLayout = false}) {
		const item = store.get.callout(callout);
		const newStep = store.mutations.step.add({dest: item});
		newStep.model = _.cloneDeep(store.get.step(item.parent)).model;
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(item)});
		}
	},
	addStep({callout, insertionIndex, doLayout = false}) {
		const item = store.get.callout(callout);
		if (item.steps.length < 1) {
			store.mutations.callout.addFirstStep({callout, doLayout});
			return;
		}

		const model = _.cloneDeep(store.get.step(item.steps[0]).model);
		const destStep = store.get.step(item.steps[insertionIndex]);
		const lastStepID = _.last(item.steps);
		const stepNumber = destStep
			? destStep.number || 1
			: store.get.step((lastStepID == null) ? -1 : lastStepID).number + 1;

		const newStep = store.mutations.step.add({
			dest: item,
			stepNumber,
			parentInsertionIndex: insertionIndex,
		});
		newStep.model = model;

		item.steps.map(store.get.step)
			.forEach((step, idx) => {
				step.number = idx + 1;
				if (step.numberLabelID == null) {
					store.mutations.item.add({item: {
						type: 'numberLabel',
						align: 'left', valign: 'top',
						x: null, y: null, width: null, height: null,
					}, parent: step});
				}
			});
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(callout)});
		}
	},
	layout({callout, layout, position, doLayout}) {
		const item = store.get.callout(callout);
		item.layout = layout || item.layout;
		item.position = position || item.position;
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(callout)});
		}
	},
};
