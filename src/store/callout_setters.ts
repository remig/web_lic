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
		if (item == null) {
			throw 'Trying to add a first step to a non-existent callout';
		}
		const newStep = store.mutations.step.add({dest: item});
		const modelStep = store.get.step(item.parent);
		if (modelStep == null) {
			throw 'Trying to add a first step to a callout without a valid parent';
		}
		newStep.model = _.cloneDeep(modelStep).model; // TODO: clone in right spot?  Or clone entire model?
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(item)});
		}
	},
	addStep({callout, insertionIndex, doLayout = false}) {
		const item = store.get.callout(callout);
		if (item == null) {
			throw 'Trying to add a step to a non-existent callout';
		}
		if (item.steps.length < 1) {
			store.mutations.callout.addFirstStep({callout, doLayout});
			return;
		}

		const modelStep = store.get.step(item.steps[0]);
		if (modelStep == null) {
			throw 'Can\'t find a Model in the first step in callout';
		}
		const model = _.cloneDeep(modelStep.model);
		const destStep = store.get.step(item.steps[insertionIndex]);
		const lastStepID = _.last(item.steps);
		const lastStep = store.get.step((lastStepID == null) ? -1 : lastStepID);
		if (lastStep == null) {
			throw 'Can\'t find a Last Step in callout';
		}
		const stepNumber = destStep
			? destStep.number || 1
			: lastStep.number + 1;

		const newStep = store.mutations.step.add({
			dest: item,
			stepNumber,
			parentInsertionIndex: insertionIndex,
		});
		newStep.model = model;

		item.steps.map(store.get.step)
			.forEach((step, idx) => {
				if (step == null) {
					return;
				}
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
		if (item) {
			item.layout = layout || item.layout;
			item.position = position || item.position;
			if (doLayout) {
				store.mutations.page.layout({page: store.get.pageForItem(callout)});
			}
		}
	},
};
