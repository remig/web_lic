/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import LDParse from '../ld_parse';

export default {
	// opts: {partID, step, direction, partDistance=60, arrowOffset=0, arrowLength=60, arrowRotation=0}
	// If direction == null, remove displacement
	displace({
		partID, step, direction,
		partDistance = 60, arrowOffset = 0, arrowLength = 60, arrowRotation = 0,
	}) {
		const stepItem = store.get.step(step);
		const displacementDistance = 60;
		store.mutations.csi.resetSize({csi: stepItem.csiID});
		partDistance = (partDistance == null) ? displacementDistance : partDistance;
		arrowOffset = (arrowOffset == null) ? 0 : arrowOffset;
		arrowLength = (arrowLength == null) ? displacementDistance : arrowLength;
		arrowRotation = (arrowRotation == null) ? 0 : arrowRotation;
		stepItem.displacedParts = stepItem.displacedParts || [];
		const idx = stepItem.displacedParts.findIndex(p => p.partID === partID);
		if (direction) {
			if (idx >= 0) {
				stepItem.displacedParts[idx].direction = direction;
				stepItem.displacedParts[idx].partDistance = partDistance;
				stepItem.displacedParts[idx].arrowOffset = arrowOffset;
				stepItem.displacedParts[idx].arrowLength = arrowLength;
				stepItem.displacedParts[idx].arrowRotation = arrowRotation;
			} else {
				stepItem.displacedParts.push({
					partID,
					direction,
					partDistance,
					arrowOffset,
					arrowLength,
					arrowRotation,
				});
			}
		} else if (idx >= 0) {
			_.pullAt(stepItem.displacedParts, idx);
		}
		// TODO: no need to layout entire page; can layout just the step containing the newly displaced part
		store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
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
	delete({partID, step, doLayout}) {
		// Remove part from the step its in and from the model entirely
		const partStep = store.get.step(step);
		const model = LDParse.model.get.abstractPart(partStep.model.filename);
		const part = LDParse.model.get.partFromID(partID, model.filename);
		store.mutations.step.removePart({step, partID, doLayout});
		store.mutations.inventoryPage.removePart({part, doLayout: doLayout});
		store.state.steps.filter(stepItem => {
			return stepItem.model.filename === model.filename
				&& !_.isEmpty(stepItem.parts);
		}).forEach(stepItem => {
			stepItem.parts.forEach((localPartId, idx) => {
				if (localPartId > partID) {
					stepItem.parts[idx] -= 1;
				}
			});
		});
	},
};
