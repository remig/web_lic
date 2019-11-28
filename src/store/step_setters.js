/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import Layout from '../layout';
import LDParse from '../ld_parse';

export default {
	add(
		{dest, doLayout = false, model = null, stepNumber = null, renumber = false,
			insertionIndex = -1, parentInsertionIndex = -1}
	) {

		const parent = store.get.lookupToItem(dest);
		const step = store.mutations.item.add({
			item: {
				type: 'step',
				number: stepNumber, numberLabelID: null,
				parts: [], callouts: [], steps: [], dividers: [],
				submodelImages: [], annotations: [], stretchedPages: [],
				csiID: null, pliID: null, rotateIconID: null,
				model: model || {filename: null, parentStepID: null},
				x: null, y: null, width: null, height: null, subStepLayout: 'vertical',
			},
			parent,
			insertionIndex,
			parentInsertionIndex,
		});

		store.mutations.csi.add({parent: step});

		if (parent.type === 'page' || parent.type === 'templatePage') {
			store.mutations.pli.add({parent: step});
		}

		if (stepNumber != null) {
			store.mutations.item.add({item: {
				type: 'numberLabel',
				align: 'left', valign: 'top',
				x: null, y: null, width: null, height: null,
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
			store.mutations.pli.delete({pli: store.get.pli(item.pliID), deleteItems: true});
		}
		store.mutations.item.deleteChildList({item, listType: 'callout'});
		store.mutations.item.delete({item});
		if (!doNotRenumber) {
			store.mutations.step.renumber(item);
		}
		if (item.parent.type === 'callout') {
			// If we delete the 2nd last step from a callout, remove step number from last remaining step
			const callout = store.get.parent(item);
			if (callout.steps.length === 1) {
				const calloutStep = store.get.step(callout.steps[0]);
				if (calloutStep.numberLabelID != null) {
					store.mutations.item.delete(
						{item: store.get.numberLabel(calloutStep.numberLabelID)}
					);
				}
			}
		}
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(step)});
		}
	},
	renumber(step) {
		const stepItem = store.get.step(step);
		let stepList;
		if (stepItem && (stepItem.parent.type === 'step' || stepItem.parent.type === 'callout')) {
			// Renumber steps in target callout / parent step
			const parent = store.get.parent(stepItem);
			stepList = parent.steps.map(store.get.step);
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
	layout({step, box}) {
		const stepItem = store.get.step(step);
		Layout.step(stepItem, box);
	},
	moveToPage({step, destPage, parentInsertionIndex = 0}) {
		const item = store.get.lookupToItem(step);
		const currentPage = store.get.parent(item);
		const destPageItem = store.get.lookupToItem(destPage);
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
		if (!srcStepItem || !destStepItem) {
			return;
		}
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
		let position = 'left';
		if (stepItem.callouts.length) {
			const availablePositions = _.difference(
				['left', 'bottom', 'right', 'top'],
				stepItem.callouts.map(calloutID => store.get.callout(calloutID).position)
			);
			position = availablePositions[0] || 'left';
		}
		store.mutations.callout.add({parent: stepItem, position, includeEmptyStep: true});
		store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
	},
	addSubStep({step, doLayout}) {
		const stepItem = store.get.lookupToItem(step);
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
		const stepItem = store.get.lookupToItem(step);
		if (display && stepItem.rotateIconID == null) {
			store.mutations.rotateIcon.add({parent: stepItem});
		} else if (!display && stepItem.rotateIconID != null) {
			const rotateIcon = store.get.rotateIcon(stepItem.rotateIconID);
			store.mutations.rotateIcon.delete({rotateIcon});
		}
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
		}
	},
	copyRotation({step, nextXSteps, rotation}) {  // Copy step's CSI rotation to next X steps
		const stepItem = store.get.step(step);
		let csi, nextStep = stepItem;
		for (let i = 0; i < nextXSteps; i++) {
			if (nextStep) {
				nextStep = store.get.nextStep(nextStep);
			}
			if (nextStep) {
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
			const pli = {type: 'pli', id: stepItem.pliID};
			store.mutations.pli.addPart({pli, part});
		}
	},
	removePart({step, partID, doLayout = false}) {
		const stepItem = store.get.step(step);
		_.deleteItem(stepItem.parts, partID);
		if (stepItem.pliID != null) {
			const part = LDParse.model.get.partFromID(partID, stepItem.model.filename);
			const pli = {type: 'pli', id: stepItem.pliID};
			store.mutations.pli.removePart({pli, part});
		}
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
		}
	},
};
