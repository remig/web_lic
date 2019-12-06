/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import LDParse from '../ld_parse';
import defaultTemplate from '../template';

export interface TemplatePageMutationInterface {
	add(): void;
	set({entry, value}: {entry: any, value: any}): void;
	load({template}: {template: any}): void;
	reset(): void;
	setPageSize({width, height}: {width: number, height: number}): void;
}

export const TemplatePageMutations: TemplatePageMutationInterface = {
	async add() {
		const modelData = store.state.template.modelData;
		if (!(modelData.model.filename in LDParse.partDictionary)) {
			LDParse.partDictionary[modelData.model.filename] = modelData.model;
		}
		if (!(modelData.part1.filename in LDParse.partDictionary)) {
			await LDParse.loadRemotePart(modelData.part1.filename);
		}
		if (!(modelData.part2.filename in LDParse.partDictionary)) {
			await LDParse.loadRemotePart(modelData.part2.filename);
		}
		const page = store.mutations.page.add(
			{subtype: 'templatePage', pageNumber: 0}
		);

		const step = store.mutations.step.add({stepNumber: 1, dest: page});
		step.model = {filename: modelData.model.filename, parentStepID: null};
		step.parts = [0, 1];

		store.mutations.step.toggleRotateIcon({step, display: true});

		store.mutations.submodelImage.add({
			parent: step, modelFilename: modelData.model.filename, quantity: 2,
		});

		if (step.pliID != null) {
			const pli = store.get.pli(step.pliID);
			if (pli) {
				[modelData.part1, modelData.part2].forEach(p => {
					store.mutations.pliItem.add({
						parent: pli,
						filename: p.filename,
						colorCode: p.colorCode,
					});
				});
			}
		}

		step.displacedParts = [{partID: 1, direction: 'up'}];

		const callout = store.mutations.callout.add({parent: step, includeEmptyStep: true});
		store.mutations.part.addToCallout({partID: 0, step, callout});
		store.mutations.callout.addStep({callout});
		store.mutations.part.addToCallout({partID: 1, step, callout});
		callout.steps.forEach(s => {
			const tempStep = store.get.step(s);
			if (tempStep) {
				tempStep.model.filename = modelData.model.filename;
			}
		});
	},
	set({entry, value}) {
		const newEntry = _.get(store.state.template, entry);
		_.assign(newEntry, value);
	},
	load({template}) {
		store.state.template = template;
		store.mutations.sceneRendering.refreshAll();
	},
	reset() {
		store.state.template = _.cloneDeep(defaultTemplate);
		store.mutations.sceneRendering.refreshAll();
	},
	setPageSize({width, height}) {
		store.state.template.page.width = width;
		store.state.template.page.height = height;
		store.mutations.page.markAllDirty();
	},
};
