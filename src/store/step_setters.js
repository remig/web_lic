/* Web Lic - Copyright (C) 2018 Remi Gagne */

'use strict';

import _ from '../util';
import store from '../store';
import Layout from '../layout';

export default {
	// opts: {dest, doLayout=false, model=null, stepNumber=null, renumber=false,
	// insertionIndex=-1, parentInsertionIndex=-1}
	add(opts) {

		const dest = store.get.lookupToItem(opts.dest);
		const step = store.mutations.item.add({
			item: {
				type: 'step',
				number: opts.stepNumber, numberLabelID: null,
				parts: [], callouts: [], steps: [], dividers: [],
				submodelImages: [], annotations: [], stretchedPages: [],
				csiID: null, pliID: null, rotateIconID: null,
				model: opts.model || {filename: null, parentStepID: null},
				x: null, y: null, width: null, height: null, subStepLayout: 'vertical'
			},
			parent: dest,
			insertionIndex: opts.insertionIndex,
			parentInsertionIndex: opts.parentInsertionIndex
		});

		store.mutations.csi.add({parent: step});

		if (dest.type === 'page' || dest.type === 'templatePage') {
			store.mutations.pli.add({parent: step});
		}

		if (opts.stepNumber != null) {
			store.mutations.item.add({item: {
				type: 'numberLabel',
				align: 'left', valign: 'top',
				x: null, y: null, width: null, height: null
			}, parent: step});
		}
		if (opts.renumber) {
			store.mutations.step.renumber(step);
		}
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(dest)});
		}
		return step;
	},
	delete(opts) { // opts: {step, doLayout}
		const step = store.get.lookupToItem(opts.step);
		if (step.parts && step.parts.length) {
			throw 'Cannot delete a step with parts';
		}
		if (step.numberLabelID != null) {
			store.mutations.item.delete({item: store.get.numberLabel(step.numberLabelID)});
		}
		if (step.csiID != null) {
			store.render.removeCanvas(step);
			store.mutations.item.delete({item: store.get.csi(step.csiID)});
		}
		if (step.pliID != null) {
			store.mutations.pli.delete({pli: store.get.pli(step.pliID), deleteItems: true});
		}
		store.mutations.item.deleteChildList({item: step, listType: 'callout'});
		store.mutations.item.delete({item: step});
		store.mutations.step.renumber(step);
		if (step.parent.type === 'callout') {
			// If we delete the 2nd last step from a callout, remove step number from last remaining step
			const callout = store.get.parent(step);
			if (callout.steps.length === 1) {
				const calloutStep = store.get.step(callout.steps[0]);
				if (calloutStep.numberLabelID != null) {
					store.mutations.item.delete({item: store.get.numberLabel(calloutStep.numberLabelID)});
				}
			}
		}
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(step)});
		}
	},
	renumber(step) {
		step = store.get.lookupToItem(step);
		let stepList;
		if (step && (step.parent.type === 'step' || step.parent.type === 'callout')) {
			// Renumber steps in target callout / parent step
			const parent = store.get.parent(step);
			stepList = parent.steps.map(store.get.step);
		} else {
			// Renumber all base steps across all pages
			stepList = store.state.steps.filter(el => el.parent.type === 'page');
		}
		store.mutations.renumber(stepList);
	},
	layout(opts) {  // opts: {step, box}
		const step = store.get.lookupToItem(opts.step);
		Layout.step(step, opts.box);
	},
	moveToPage(opts) {  // opts: {step, destPage, parentInsertionIndex = 0}
		const step = store.get.lookupToItem(opts.step);
		const currentPage = store.get.parent(step);
		const destPage = store.get.lookupToItem(opts.destPage);
		store.mutations.item.reparent({
			item: step,
			newParent: destPage,
			parentInsertionIndex: opts.parentInsertionIndex || 0
		});
		store.mutations.page.layout({page: currentPage});
		store.mutations.page.layout({page: destPage});
	},
	moveToPreviousPage(opts) {  // opts: {step}
		const destPage = store.get.prevBasicPage(opts.step);
		if (destPage) {
			const parentInsertionIndex = destPage.steps.length;
			store.mutations.step.moveToPage({step: opts.step, destPage, parentInsertionIndex});
		}
	},
	moveToNextPage(opts) {  // opts: {step}
		const destPage = store.get.nextBasicPage(opts.step);
		if (destPage) {
			store.mutations.step.moveToPage({step: opts.step, destPage, parentInsertionIndex: 0});
		}
	},
	mergeWithStep(opts) {  // opts: {srcStep, destStep}
		const srcStep = store.get.lookupToItem(opts.srcStep);
		const destStep = store.get.lookupToItem(opts.destStep);
		if (!srcStep || !destStep) {
			return;
		}
		_.cloneDeep(srcStep.parts).forEach(partID => {
			store.mutations.part.moveToStep({partID, srcStep, destStep, doLayout: false});
		});
		store.mutations.step.delete({step: srcStep});

		const sourcePage = store.get.pageForItem(srcStep);
		const destPage = store.get.pageForItem(destStep);
		store.mutations.page.layout({page: sourcePage});
		if (sourcePage.id !== destPage.id) {
			store.mutations.page.layout({page: destPage});
		}
	},
	stretchToPage(opts) {  // opts: {step, stretchToPage, doLayout}
		const step = store.get.lookupToItem(opts.step);
		const destPage = store.get.lookupToItem(opts.stretchToPage);
		destPage.stretchedStep = {stepID: step.id, leftOffset: 0};
		step.stretchedPages.push(opts.stretchToPage.id);
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(step)});
			store.mutations.page.layout({page: destPage});
		}
	},
	addCallout(opts) {  // opts: {step}
		const step = store.get.lookupToItem(opts.step);
		step.callouts = step.callouts || [];
		store.mutations.callout.add({parent: step});
		store.mutations.page.layout({page: store.get.pageForItem(step)});
	},
	addSubStep(opts) {  // opts: {step, doLayout}
		const step = store.get.lookupToItem(opts.step);
		const newStep = store.mutations.step.add({
			dest: step, stepNumber: 1, doLayout: false, renumber: false
		});
		newStep.pliID = null;
		store.mutations.item.reparent({
			item: store.get.csi(step.csiID),
			newParent: newStep
		});
		newStep.parts = _.cloneDeep(step.parts);
		newStep.model = _.cloneDeep(step.model);
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(step)});
		}
	},
	setSubStepLayout(opts) {  // opts: {step, layout, doLayout}
		const step = store.get.lookupToItem(opts.step);
		step.subStepLayout = opts.layout;
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(step)});
		}
	},
	toggleRotateIcon(opts) { // opts: {step, display}
		const step = store.get.lookupToItem(opts.step);
		if (opts.display) {
			store.mutations.rotateIcon.add({parent: step});
		} else if (!opts.display && step.rotateIconID != null) {
			store.mutations.item.delete({item: {type: 'rotateIcon', id: step.rotateIconID}});
		}
	},
	copyRotation(opts) {  // {step, nextXSteps, rotation}  Copy step's CSI rotation to next X steps
		const step = store.get.lookupToItem(opts.step);
		let csi, nextStep = step;
		for (let i = 0; i < opts.nextXSteps; i++) {
			if (nextStep) {
				nextStep = store.get.nextStep(nextStep);
			}
			if (nextStep) {
				csi = store.get.csi(nextStep.csiID);
				if (csi) {
					csi.isDirty = true;
					csi.rotation = opts.rotation;
				}
			}
		}
	}
};
