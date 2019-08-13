/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import LDParse from '../ld_parse';
import defaultTemplate from '../template';

export default {
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
		const page = store.state.templatePage = store.mutations.page.add(
			{pageType: 'templatePage', pageNumber: 0}
		);

		const step = store.mutations.step.add({stepNumber: 1, dest: page});
		step.model = {filename: modelData.model.filename};
		step.parts = [0, 1];

		store.mutations.step.toggleRotateIcon({step, display: true});

		store.mutations.submodelImage.add({
			parent: step, modelFilename: modelData.model.filename, quantity: 2
		});

		const pli = store.get.pli(step.pliID);
		[modelData.part1, modelData.part2].forEach(p => {
			store.mutations.pliItem.add({
				parent: pli,
				filename: p.filename,
				colorCode: p.colorCode
			});
		});
		step.displacedParts = [{partID: 1, direction: 'up'}];

		const callout = store.mutations.callout.add({parent: step, includeEmptyStep: true});
		store.mutations.part.addToCallout({partID: 0, step, callout});
		store.mutations.callout.addStep({callout});
		store.mutations.part.addToCallout({partID: 1, step, callout});
		callout.steps.forEach(s => {
			store.get.step(s).model.filename = modelData.model.filename;
		});
	},
	set(opts) {  // opts: {entry, value}
		const entry = _.get(store.state.template, opts.entry);
		_.assign(entry, opts.value);
	},
	load(opts) {  // opts: {template}
		store.state.template = opts.template;
	},
	reset() {
		store.state.template = _.cloneDeep(defaultTemplate);
		store.mutations.page.markAllDirty();
		store.mutations.csi.markAllDirty();
		store.mutations.pliItem.markAllDirty();
	},
	setPageSize(opts) {  // opts: {width, height}
		store.state.template.page.width = opts.width;
		store.state.template.page.height = opts.height;
		store.mutations.page.markAllDirty();
	}
};
