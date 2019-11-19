/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import LDParse from '../ld_parse';

export default {
	// opts: {partID, step, direction, partDistance=60, arrowOffset=0, arrowLength=60, arrowRotation=0}
	// If direction == null, remove displacement
	displace(opts) {
		const step = store.get.lookupToItem(opts.step);
		delete opts.step;
		const displacementDistance = 60;
		store.mutations.csi.resetSize({csi: step.csiID});
		opts.partDistance = (opts.partDistance == null) ? displacementDistance : opts.partDistance;
		opts.arrowOffset = (opts.arrowOffset == null) ? 0 : opts.arrowOffset;
		opts.arrowLength = (opts.arrowLength == null) ? displacementDistance : opts.arrowLength;
		opts.arrowRotation = (opts.arrowRotation == null) ? 0 : opts.arrowRotation;
		step.displacedParts = step.displacedParts || [];
		const idx = step.displacedParts.findIndex(p => p.partID === opts.partID);
		if (opts.direction) {
			if (idx >= 0) {
				step.displacedParts[idx].direction = opts.direction;
				step.displacedParts[idx].partDistance = opts.partDistance;
				step.displacedParts[idx].arrowOffset = opts.arrowOffset;
				step.displacedParts[idx].arrowLength = opts.arrowLength;
				step.displacedParts[idx].arrowRotation = opts.arrowRotation;
			} else {
				step.displacedParts.push(opts);
			}
		} else if (idx >= 0) {
			_.pullAt(step.displacedParts, idx);
		}
		// TODO: no need to layout entire page; can layout just the step containing the newly displaced part
		store.mutations.page.layout({page: store.get.pageForItem(step)});
	},
	moveToStep({partID, srcStep, destStep, doLayout = false}) {
		const srcStepItem = store.get.step(srcStep);
		store.mutations.step.removePart({step: srcStepItem, partID});
		store.mutations.csi.resetSize({csi: srcStepItem.csiID});

		const destStepItem = store.get.step(destStep);
		store.mutations.step.addPart({step: destStepItem, partID});
		store.mutations.csi.resetSize({csi: destStepItem.csiID});

		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(srcStepItem)});
			if (srcStepItem.parent.id !== destStepItem.parent.id) {
				store.mutations.page.layout({page: store.get.pageForItem(destStepItem)});
			}
		}
	},
	addToCallout({partID, step, callout, doLayout = false}) {
		const stepItem = store.get.step(step);
		const calloutItem = store.get.callout(callout);
		let destCalloutStep;
		if (_.isEmpty(calloutItem.steps)) {
			destCalloutStep = store.mutations.step.add({dest: calloutItem});
		} else {
			destCalloutStep = store.get.step(_.last(calloutItem.steps));
		}
		destCalloutStep.model = _.cloneDeep(stepItem.model);
		destCalloutStep.parts.push(partID);
		store.mutations.csi.resetSize({csi: destCalloutStep.csiID});
		if (doLayout) {
			store.mutations.page.layout({page: step.parent});
		}
	},
	removeFromCallout({partID, step}) {
		const stepItem = store.get.step(step);
		_.deleteItem(stepItem.parts, partID);
		store.mutations.csi.resetSize({csi: stepItem.csiID});
		store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
	},
	delete(opts) { // opts: {partID, step, doLayout}
		// Remove part from the step its in and from the model entirely
		const partStep = store.get.lookupToItem(opts.step);
		const model = LDParse.model.get.abstractPart(partStep.model.filename);
		const part = LDParse.model.get.partFromID(opts.partID, model.filename);
		store.mutations.step.removePart(opts);
		store.mutations.inventoryPage.removePart({part, doLayout: opts.doLayout});
		store.state.steps.filter(step => {
			return step.model.filename === model.filename
				&& !_.isEmpty(step.parts);
		}).forEach(step => {
			step.parts.forEach((partID, idx) => {
				if (partID > opts.partID) {
					step.parts[idx] -= 1;
				}
			});
		});
	},
};
