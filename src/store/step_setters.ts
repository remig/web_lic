/* Web Lic - Copyright (C) 2018 Remi Gagne */

import {hasProperty, isItemSpecificType} from '../type_helpers';
import _ from '../util';
import store from '../store';
import Layout from '../layout';
import LDParse from '../ld_parse';

export interface StepMutationInterface {
	add(
		{dest, doLayout, model, stepNumber,
			renumber, insertionIndex, parentInsertionIndex}
		: {dest: LookupItem, doLayout?: boolean, model?: StepModel, stepNumber?: number,
			renumber?: boolean, insertionIndex?: number, parentInsertionIndex?: number}
	): Step;
	delete(
		{step, doNotRenumber, deleteParts, doLayout}
		: {step: LookupItem, doNotRenumber?: boolean, deleteParts?: boolean, doLayout?: boolean}
	): void;
	renumber(step: LookupItem): void;
	renumberAll(): void;
	layout({step, box}: {step: LookupItem, box: Box}): void;
	moveToPage(
		{step, destPage, parentInsertionIndex}
		: {step: LookupItem, destPage: LookupItem, parentInsertionIndex?: number}
	): void;
	moveToPreviousPage({step}: {step: LookupItem}): void;
	moveToNextPage({step}: {step: LookupItem}): void;
	mergeWithStep({srcStep, destStep}:{srcStep: LookupItem, destStep: LookupItem}): void;
	stretchToPage(
		{step, stretchToPage, doLayout}
		: {step: LookupItem, stretchToPage: LookupItem, doLayout?: boolean}
	): void;
	addCallout({step}: {step: LookupItem}): void;
	addSubStep({step, doLayout}: {step: LookupItem, doLayout?: boolean}): void;
	setSubStepLayout(
		{step, layout, doLayout}
		: {step: LookupItem, layout: Orientations, doLayout?: boolean}
	): void;
	toggleRotateIcon(
		{step, display, doLayout}
		: {step: LookupItem, display: boolean, doLayout?: boolean}
	): void;
	copyRotation(
		{step, nextXSteps, rotation}
		: {step: LookupItem, nextXSteps: number, rotation: Rotation[]}
	): void;
	addPart({step, partID}: {step: LookupItem, partID: number}): void;
	removePart({step, partID, doLayout}: {step: LookupItem, partID: number, doLayout?: boolean}): void;
}

export const StepMutations: StepMutationInterface = {
	add(
		{dest, doLayout = false, model = null, stepNumber = null,
			renumber = false, insertionIndex = -1, parentInsertionIndex = -1}
	) {

		// TODO: parent should never be null here
		const parent = store.get.lookupToItem(dest) || {type: 'page', id: -1};
		const step = store.mutations.item.add<Step>({
			item: {
				type: 'step', id: -1, parent,
				number: -1, numberLabelID: null,
				parts: [], callouts: [], steps: [], dividers: [],
				submodelImages: [], annotations: [], stretchedPages: [],
				csiID: null, pliID: null, rotateIconID: null,
				model: model || {filename: '', parentStepID: null},
				prevBookParts: null, displacedParts: null,
				x: 0, y: 0, width: 0, height: 0, subStepLayout: 'vertical',
			},
			parent,
			insertionIndex,
			parentInsertionIndex,
		});

		store.mutations.csi.add({parent: step});

		if (parent != null && parent.type === 'page') {
			store.mutations.pli.add({parent: step});
		}

		if (stepNumber != null) {
			step.number = stepNumber;
			store.mutations.item.add<NumberLabel>({item: {
				type: 'numberLabel', id: -1, parent: step,
				align: 'left', valign: 'top',
				x: 0, y: 0, width: 0, height: 0,
			}, parent: step});
		}
		if (renumber) {
			store.mutations.step.renumber(step);
		}
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(parent)});
		}
		return step;
	},
	delete(
		{step, doNotRenumber = false, deleteParts = false, doLayout = false}
	) {
		const item = store.get.step(step);
		let page;
		if (doLayout) {
			page = store.get.pageForItem(item);
		}

		if (item.parts && item.parts.length) {
			if (deleteParts) {
				while (item.parts.length) {
					store.mutations.step.removePart({step: item, partID: item.parts[0]});
				}
			} else {
				throw 'Cannot delete a step with parts';
			}
		}
		if (item.numberLabelID != null) {
			store.mutations.item.delete({item: store.get.numberLabel(item.numberLabelID)});
		}
		if (item.csiID != null) {
			store.render.removeCanvas(item);
			store.mutations.item.delete({item: store.get.csi(item.csiID)});
		}
		if (item.pliID != null) {
			store.mutations.pli.delete({pli: {type: 'pli', id: item.pliID}, deleteItems: true});
		}
		store.mutations.item.deleteChildList({item, listType: 'callout'});
		store.mutations.item.delete({item});
		if (!doNotRenumber) {
			store.mutations.step.renumber(item);
		}
		if (item.parent.type === 'callout') {
			// If we delete the 2nd last step from a callout, remove step number from last remaining step
			const callout = store.get.parent(item);
			if (callout == null || !isItemSpecificType(callout, 'callout')) {
				return;
			}
			if (callout.steps.length === 1) {
				const calloutStep = store.get.step(callout.steps[0]);
				if (calloutStep != null && calloutStep.numberLabelID != null) {
					store.mutations.item.delete(
						{item: store.get.numberLabel(calloutStep.numberLabelID)}
					);
				}
			}
		}
		if (doLayout && page != null) {
			store.mutations.page.layout({page});
		}
	},
	renumber(step) {
		const stepItem = store.get.step(step || -1);
		let stepList: (Step | null)[] = [];
		if (stepItem.parent.type === 'step' || stepItem.parent.type === 'callout') {
			// Renumber steps in target callout / parent step
			const parent = store.get.parent(stepItem);
			if (hasProperty<StepParent>(parent, 'steps')) {
				stepList = parent.steps.map(store.get.step);
			}
		} else {
			// Renumber all base steps across all pages
			stepList = store.state.steps.filter(el => {
				if (el.parent.type === 'page') {
					return store.get.page(el.parent).subtype === 'page';
				}
				return false;
			});
		}
		store.mutations.renumber(stepList);
	},
	renumberAll() {
		// Renumber all base steps across all pages
		const stepList = store.state.steps.filter(el => {
			if (el.parent && el.parent.type === 'page') {
				const newPage = store.get.page(el.parent);
				return newPage ? newPage.subtype === 'page' : false;
			}
			return false;
		});
		store.mutations.renumber(stepList);
	},
	layout({step, box}) {
		const stepItem = store.get.step(step);
		Layout.step(stepItem, box);
	},
	moveToPage({step, destPage, parentInsertionIndex = 0}) {
		const item = store.get.step(step);
		const currentPage = store.get.parent(item);
		const destPageItem = store.get.page(destPage);
		if (currentPage == null || destPageItem == null) {
			return;
		}
		store.mutations.item.reparent({
			item,
			newParent: destPageItem,
			parentInsertionIndex: parentInsertionIndex || 0,
		});
		store.mutations.page.layout({page: currentPage});
		store.mutations.page.layout({page: destPageItem});
	},
	moveToPreviousPage({step}) {
		const destPage = store.get.prevBasicPage(step);
		if (destPage) {
			const parentInsertionIndex = destPage.steps.length;
			store.mutations.step.moveToPage({step, destPage, parentInsertionIndex});
		}
	},
	moveToNextPage({step}) {
		const destPage = store.get.nextBasicPage(step);
		if (destPage) {
			store.mutations.step.moveToPage({step, destPage, parentInsertionIndex: 0});
		}
	},
	mergeWithStep({srcStep, destStep}) {
		const srcStepItem = store.get.step(srcStep);
		const destStepItem = store.get.step(destStep);
		_.cloneDeep(srcStepItem.parts).forEach(partID => {
			store.mutations.part.moveToStep({
				partID,
				srcStep: srcStepItem,
				destStep: destStepItem,
				doLayout: false,
			});
		});
		store.mutations.step.delete({step: srcStepItem});

		const sourcePage = store.get.pageForItem(srcStepItem);
		const destPage = store.get.pageForItem(destStepItem);
		store.mutations.page.layout({page: sourcePage});
		if (sourcePage.id !== destPage.id) {
			store.mutations.page.layout({page: destPage});
		}
	},
	stretchToPage({step, stretchToPage, doLayout}) {
		const stepItem = store.get.step(step);
		const destPage = store.get.page(stretchToPage);
		destPage.stretchedStep = {stepID: stepItem.id, leftOffset: 0};
		stepItem.stretchedPages.push(stretchToPage.id);
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
			store.mutations.page.layout({page: destPage});
		}
	},
	addCallout({step}) {
		const stepItem = store.get.step(step);
		stepItem.callouts = stepItem.callouts || [];
		let position: Positions = 'left';
		if (stepItem.callouts.length) {
			const availablePositions = _.difference<Positions>(
				['left', 'bottom', 'right', 'top'],
				stepItem.callouts.map(calloutID => {
					const callout = store.get.callout(calloutID);
					return callout ? callout.position : 'left';
				})
			);
			position = availablePositions[0] || 'left';
		}
		store.mutations.callout.add({parent: stepItem, position, includeEmptyStep: true});
		store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
	},
	addSubStep({step, doLayout}) {
		const stepItem = store.get.step(step);
		if (stepItem.csiID == null) {
			return;
		}
		const newStep = store.mutations.step.add({
			dest: stepItem, stepNumber: 1, doLayout: false, renumber: false,
		});
		newStep.pliID = null;
		store.mutations.item.reparent({
			item: store.get.csi(stepItem.csiID),
			newParent: newStep,
		});
		newStep.parts = _.cloneDeep(stepItem.parts);
		newStep.model = _.cloneDeep(stepItem.model);
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
		}
	},
	setSubStepLayout({step, layout, doLayout}) {
		const stepItem = store.get.step(step);
		stepItem.subStepLayout = layout;
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
		}
	},
	toggleRotateIcon({step, display, doLayout}) {
		const stepItem = store.get.step(step);
		if (display && stepItem.rotateIconID == null) {
			store.mutations.rotateIcon.add({parent: stepItem});
		} else if (!display && stepItem.rotateIconID != null) {
			const rotateIcon = store.get.rotateIcon(stepItem.rotateIconID);
			if (rotateIcon) {
				store.mutations.rotateIcon.delete({rotateIcon});
			}
		}
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
		}
	},
	copyRotation({step, nextXSteps, rotation}) {  // Copy step's CSI rotation to next X steps
		const stepItem = store.get.step(step);
		let csi, nextStep: Step | null = stepItem;
		for (let i = 0; i < nextXSteps; i++) {
			if (nextStep) {
				nextStep = store.get.nextStep(nextStep);
			}
			if (nextStep && nextStep.csiID) {
				csi = store.get.csi(nextStep.csiID);
				if (csi) {
					csi.isDirty = true;
					csi.rotation = rotation;
				}
			}
		}
	},
	addPart({step, partID}) {
		const stepItem = store.get.step(step);
		stepItem.parts.push(partID);
		stepItem.parts.sort(_.sort.numeric.ascending);
		if (stepItem.pliID != null) {
			const part = LDParse.model.get.partFromID(partID, stepItem.model.filename);
			const pli: LookupItem = {type: 'pli', id: stepItem.pliID};
			store.mutations.pli.addPart({pli, part});
		}
	},
	removePart({step, partID, doLayout = false}) {
		const stepItem = store.get.step(step);
		_.deleteItem(stepItem.parts, partID);
		if (stepItem.pliID != null) {
			const part = LDParse.model.get.partFromID(partID, stepItem.model.filename);
			const pli: LookupItem = {type: 'pli', id: stepItem.pliID};
			store.mutations.pli.removePart({pli, part});
		}
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
		}
	},
};
