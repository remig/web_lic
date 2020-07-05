/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import LDParse from '../ld_parse';

export interface PartMutationInterface {
	displace({
		partID, step, direction,
		partDistance, arrowOffset, arrowLength, arrowRotation,
	}: {
		partID: number, step: LookupItem, direction?: Directions,
		partDistance?: number, arrowOffset?: number, arrowLength?: number, arrowRotation?: number,
	}): void;
	moveToStep(
		{partID, srcStep, destStep, doLayout}
		: {partID: number, srcStep: LookupItem, destStep: LookupItem, doLayout?: boolean}
	): void;
	addToCallout(
		{partID, step, callout, doLayout}
		: {partID: number, step: LookupItem, callout: LookupItem, doLayout?: boolean}
	): void;
	removeFromCallout({partID, step}: {partID: number, step: LookupItem}): void;
	delete(
		{partID, step, doLayout}
		: {partID: number, step: LookupItem, doLayout?: boolean}
	): void;
}

export const PartMutations: PartMutationInterface = {
	// If direction == null, remove displacement
	displace({
		partID, step, direction,
		partDistance = 60, arrowOffset = 0, arrowLength = 60, arrowRotation = 0,
	}) {
		const stepItem = store.get.step(step);
		if (stepItem == null || stepItem.csiID == null) {
			return;
		}
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
		if (srcStepItem == null || srcStepItem.csiID == null) {
			return;
		}
		store.mutations.step.removePart({step: srcStepItem, partID});
		store.mutations.csi.resetSize({csi: srcStepItem.csiID});

		const destStepItem = store.get.step(destStep);
		if (destStepItem == null || destStepItem.csiID == null) {
			return;
		}
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
		if (stepItem == null || calloutItem == null) {
			return;
		}
		let destCalloutStep;
		if (_.isEmpty(calloutItem.steps)) {
			destCalloutStep = store.mutations.step.add({dest: calloutItem});
		} else {
			const lastStepId = _.last(calloutItem.steps) || -1;
			destCalloutStep = store.get.step(lastStepId);
		}
		if (destCalloutStep == null || destCalloutStep.csiID == null) {
			return;
		}
		destCalloutStep.model = _.cloneDeep(stepItem.model);
		destCalloutStep.parts.push(partID);
		store.mutations.csi.resetSize({csi: destCalloutStep.csiID});
		if (doLayout) {
			store.mutations.page.layout({page: stepItem.parent});
		}
	},
	removeFromCallout({partID, step}) {
		const stepItem = store.get.step(step);
		if (stepItem == null || stepItem.csiID == null) {
			return;
		}
		_.deleteItem(stepItem.parts, partID);
		store.mutations.csi.resetSize({csi: stepItem.csiID});
		store.mutations.page.layout({page: store.get.pageForItem(stepItem)});
	},
	delete({partID, step, doLayout}) {
		// Remove part from the step its in and from the model entirely
		const partStep = store.get.step(step);
		if (partStep == null) {
			return;
		}
		const model = LDParse.model.get.abstractPart(partStep.model.filename);
		if (model == null) {
			return;
		}
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
