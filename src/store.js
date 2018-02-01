/* global module: false, util: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
store = (function() {
'use strict';

// These will end up in the template page, when we have one
const pageMargin = 20;
const pliMargin = pageMargin / 1.2;

const emptyState = {
	pageSize: {width: 900, height: 700},
	titlePage: null,
	pages: [],
	pageNumbers: [],
	steps: [],
	stepNumbers: [],
	csis: [],
	plis: [],
	pliItems: [],
	pliQtys: [],
	labels: []
};

const store = {

	// The currently loaded LDraw model, as returned from LDParse
	model: null,  // Not in state because it is saved separately, and not affected by undo / redo
	setModel(model) {
		store.model = model;
	},
	// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic (except static stuff in model, like part geometries)
	state: util.clone(emptyState),
	replaceState(state) {
		store.state = state;
	},
	resetState() {
		store.state = util.clone(emptyState);
	},
	get: {
		pageCount() {
			return store.state.pages.length;
		},
		modelName(nice) {
			if (!store.model) {
				return '';
			} else if (store.model.name) {
				return store.model.name;
			}
			const name = store.get.modelFilenameBase();
			if (nice) {
				return util.prettyPrint(name.replace(/\//g, '-').replace(/_/g, ' '));
			}
			return name;
		},
		modelFilename() {
			if (!store.model || !store.model.filename) {
				return '';
			}
			return store.model.filename;
		},
		modelFilenameBase(ext) {
			if (!store.model || !store.model.filename) {
				return '';
			}
			return store.model.filename.replace(/\..+$/, '') + (ext || '');
		},
		isTitlePage(page) {
			return (page || {}).type === 'titlePage';
		},
		isFirstPage(page) {
			if (!page || page.id == null) {
				return false;
			}
			return page.id === store.state.pages[0].id;
		},
		isLastPage(page) {
			if (!page || page.id == null) {
				return false;
			}
			return page.id === store.state.pages[store.state.pages.length - 1].id;
		},
		nextPage(page) {
			if (!page || store.get.isLastPage(page)) {
				return null;
			} else if (store.get.isTitlePage(page)) {
				return store.state.pages[0];
			}
			const idx = store.state.pages.findIndex(el => el.id === page.id);
			if (idx < 0) {
				return null;
			}
			return store.state.pages[idx + 1];
		},
		prevPage(page) {
			if (!page || store.get.isTitlePage(page)) {
				return null;
			} else if (store.get.isFirstPage(page)) {
				return store.get.titlePage();
			}
			const idx = store.state.pages.findIndex(el => el.id === page.id);
			if (idx < 0) {
				return null;
			}
			return store.state.pages[idx - 1];
		},
		titlePage() {
			return store.state.titlePage;
		},
		firstPage() {
			return store.state.pages[0];
		},
		lastPage() {
			return store.state.pages[store.state.pages.length - 1];
		},
		parent(item) {
			item = store.get.lookupToItem(item);
			if (item && item.parent) {
				return store.get.lookupToItem(item.parent);
			}
			return null;
		},
		pageForItem(item) {
			item = store.get.lookupToItem(item);
			while (item && item.type !== 'page' && item.type !== 'titlePage') {
				item = store.get.parent(item);
			}
			return item;
		},
		numberLabel(item) {
			item = store.get.lookupToItem(item);
			if (item && item.numberLabel != null) {
				return store.state[item.type + 'Numbers'][item.numberLabel];
			}
			return null;
		},
		lookupToItem(lookup) {
			if (!lookup || !lookup.type) {
				return null;
			} else if (lookup.parent) {
				return lookup;  // lookup is already an item
			} else if (store.state.hasOwnProperty(lookup.type)) {
				return store.state[lookup.type];
			}
			const itemList = store.state[lookup.type + 's'];
			if (itemList) {
				return itemList.find(el => el.id === lookup.id) || null;
			}
			return null;
		},
		itemToLookup(item) {
			if (!item || item.type == null) {
				return null;
			} else if (store.state.hasOwnProperty(item.type)) {
				return {type: item.type, id: item.id || 0};
			} else if (!store.state.hasOwnProperty(item.type + 's')) {
				return null;
			}
			return {id: item.id, type: item.type};
		}
	},
	mutations: {
		addStateItem(item) {
			if (!item || !item.type || !store.state.hasOwnProperty(item.type + 's')) {
				return null;
			}
			const stateList = store.state[item.type + 's'];
			item.id = stateList.length ? Math.max.apply(null, stateList.map(el => el.id)) + 1 : 0;
			stateList.push(item);
			return item;
		},
		moveItem(opts) {  // opts: {item, x, y}
			if (opts && opts.item) {
				opts.item.x = opts.x;
				opts.item.y = opts.y;
			}
		},
		moveStepToPage(opts) {  // opts: {step, destPage, insertionIndex = 0}
			const step = store.get.lookupToItem(opts.step);
			const currentPage = store.get.parent(step);
			const destPage = store.get.lookupToItem(opts.destPage);
			const insertionIndex = opts.insertionIndex || 0;
			const stepIdx = currentPage.steps.indexOf(step.id);
			currentPage.steps.splice(stepIdx, 1);
			destPage.steps.splice(insertionIndex, 0, step.id);
			step.parent.id = destPage.id;
			store.mutations.layoutPage(currentPage);
			store.mutations.layoutPage(destPage);
		},
		moveStepToPreviousPage(step) {
			step = store.get.lookupToItem(step);
			const destPage = store.get.prevPage(step.parent);
			const insertionIndex = destPage.steps.length;
			store.mutations.moveStepToPage({step, destPage, insertionIndex});
		},
		moveStepToNextPage(step) {
			step = store.get.lookupToItem(step);
			const destPage = store.get.nextPage(step.parent);
			store.mutations.moveStepToPage({step, destPage, insertionIndex: 0});
		},
		mergeSteps(opts) {  // opts: {sourceStepID, destStepID}
			const sourceStep = store.get.step(opts.sourceStepID);
			const destStep = store.get.step(opts.destStepID);
			if (!sourceStep || !destStep) {
				return;
			}
			destStep.parts = destStep.parts.concat(sourceStep.parts);
			destStep.parts.sort(util.sort.numeric.ascending);
			const sourcePLI = store.get.pli(sourceStep.pliID);
			const destPLI = store.get.pli(destStep.pliID);
			if (sourcePLI && destPLI) {
				sourcePLI.pliItems.forEach(id => {
					store.get.pliItem(id).parent.id = destPLI.id;
				});
				destPLI.pliItems = destPLI.pliItems.concat(sourcePLI.pliItems);
			}
			const sourcePage = store.get.pageForItem(sourceStep);
			const destPage = store.get.pageForItem(destStep);
			store.mutations.deleteStep(sourceStep);
			store.mutations.layoutPage(sourcePage);
			store.mutations.layoutPage(destPage);
		},
		deletePage(pageID) {
			store.state.pages.splice(pageID, 1);
			store.mutations.renumberPages();
		},
		deleteStep(step) {
			const page = store.get.pageForItem(step);
			page.steps.splice(page.steps.indexOf(step), 1);
			const csi = store.get.csi(step.csiID);
			store.state.csis.splice(store.state.csis.indexOf(csi), 1);
			store.state.steps.splice(store.state.steps.indexOf(step), 1);
			store.mutations.renumberSteps();
		},
		renumber(type) {
			let prevNumber;
			store.state[type + 's'].forEach(el => {
				if (el && el.number != null) {
					if (prevNumber == null && el.number > 1) {
						el.number = 1;
					} else if (prevNumber != null && prevNumber < el.number - 1) {
						el.number = prevNumber + 1;
					}
					prevNumber = el.number;
				}
			});
		},
		renumberSteps() {
			store.mutations.renumber('step');
		},
		renumberPages() {
			store.mutations.renumber('page');
		},
		setNumber(opts) {  // opts: {target, number}
		},
		layoutStep(opts) {  // opts: {step, box}

			const {step, box} = opts;
			const localModel = LDParse.model.get.submodelDescendant(store.model, step.submodel);

			step.x = box.x + pageMargin;
			step.y = box.y + pageMargin;
			step.width = box.width - pageMargin - pageMargin;
			step.height = box.height - pageMargin - pageMargin;

			if (step.csiID != null) {
				const csiSize = util.renderCSI(localModel, step, true);
				const csi = store.get.csi(step.csiID);
				csi.x = Math.floor((step.width - csiSize.width) / 2);
				csi.y = Math.floor((step.height - csiSize.height) / 2);
				csi.width = csiSize.width;
				csi.height = csiSize.height;
			}

			const qtyLabelOffset = 5;
			let maxHeight = 0;
			let left = pliMargin + qtyLabelOffset;

			if (step.pliID != null) {

				const pli = store.get.pli(step.pliID);

				//pliItems.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
				for (let i = 0; i < pli.pliItems.length; i++) {

					const pliItem = store.get.pliItem(pli.pliItems[i]);
					const part = localModel.parts[pliItem.partNumber];

					const pliSize = util.renderPLI(part, true);
					pliItem.x = Math.floor(left);
					pliItem.y = Math.floor(pliMargin);
					pliItem.width = pliSize.width;
					pliItem.height = pliSize.height;

					const lblSize = util.measureLabel('bold 10pt Helvetica', 'x' + pliItem.quantity);
					const pliQty = store.get.pliQty(pliItem.quantityLabel);
					pliQty.x = -qtyLabelOffset;
					pliQty.y = pliSize.height - qtyLabelOffset;
					pliQty.width = lblSize.width;
					pliQty.height = lblSize.height;

					left += Math.floor(pliSize.width + pliMargin);
					maxHeight = Math.max(maxHeight, pliSize.height - qtyLabelOffset + pliQty.height);
				}

				maxHeight = pliMargin + maxHeight + pliMargin;
				pli.x = pli.y = 0;
				pli.width = left;
				pli.height = maxHeight;
			}

			if (step.numberLabel != null) {
				const lblSize = util.measureLabel('bold 20pt Helvetica', step.number);
				const lbl = store.get.stepNumber(step.numberLabel);
				lbl.x = 0;
				lbl.y = maxHeight + pageMargin;
				lbl.width = lblSize.width;
				lbl.height = lblSize.height;
			}
		},
		layoutPage(page) {
			const pageSize = store.state.pageSize;
			const stepCount = page.steps.length;
			const cols = Math.ceil(Math.sqrt(stepCount));
			const rows = Math.ceil(stepCount / cols);
			const colSize = Math.floor(pageSize.width / cols);
			const rowSize = Math.floor(pageSize.height / rows);

			const box = {x: 0, y: 0, width: colSize, height: rowSize};

			for (let i = 0; i < stepCount; i++) {
				box.x = colSize * (i % cols);
				box.y = rowSize * Math.floor(i / cols);
				store.mutations.layoutStep({step: store.get.step(page.steps[i]), box});
			}

			if (page.numberLabel != null) {
				const lblSize = util.measureLabel('bold 20pt Helvetica', page.number);
				const lbl = store.get.pageNumber(page.numberLabel);
				lbl.x = pageSize.width - pageMargin - lblSize.width;
				lbl.y = pageSize.height - pageMargin - lblSize.height;
				lbl.width = lblSize.width;
				lbl.height = lblSize.height;
			}
			delete page.needsLayout;
		},
		layoutTitlePage(page) {
			const pageSize = store.state.pageSize;
			const step = store.get.step(page.steps[0]);
			const csi = store.get.csi(step.csiID);
			const box = {x: 0, y: 0, width: pageSize.width, height: pageSize.height};
			store.mutations.layoutStep({step, box});
			step.width = csi.width + 40;
			step.height = csi.height + 40;
			step.x = Math.floor((pageSize.width - step.width) / 2);
			step.y = Math.floor((pageSize.height - step.height) / 2);
			csi.x = csi.y = 20;

			const title = store.get.label(page.labels[0]);
			const titleSize = util.measureLabel(title.font, title.text);
			title.x = (pageSize.width - titleSize.width) / 2;
			title.y = (step.y - titleSize.height) / 2;
			title.width = titleSize.width;
			title.height = titleSize.height;

			const modelInfo = store.get.label(page.labels[1]);
			const modelInfoSize = util.measureLabel(modelInfo.font, modelInfo.text);
			modelInfo.x = (pageSize.width - modelInfoSize.width) / 2;
			modelInfo.y = ((step.y - modelInfoSize.height) / 2) + step.y + step.height;
			modelInfo.width = modelInfoSize.width;
			modelInfo.height = modelInfoSize.height;
			delete page.needsLayout;
		},
		addTitlePage() {

			const addStateItem = store.mutations.addStateItem;
			const page = store.state.titlePage = {
				id: 0,
				type: 'titlePage',
				steps: [],
				labels: []
			};

			const step = addStateItem({
				type: 'step',
				parent: {type: 'titlePage'},
				x: null, y: null,
				width: null, height: null,
				csiID: null
			});

			const csi = addStateItem({
				type: 'csi',
				parent: {type: 'step', id: step.id},
				x: null, y: null,
				width: null, height: null
			});
			step.csiID = csi.id;
			page.steps.push(step.id);

			const title = addStateItem({
				type: 'label',
				parent: {type: 'titlePage'},
				x: null, y: null,
				width: null, height: null,
				text: store.get.modelName(true),
				font: '20pt Helvetica',
				color: 'black'
			});
			page.labels.push(title.id);

			const modelInfo = addStateItem({
				type: 'label',
				parent: {type: 'titlePage'},
				x: null, y: null,
				width: null, height: null,
				text: '',
				font: '16pt Helvetica',
				color: 'black'
			});
			page.labels.push(modelInfo.id);
		},
		addInitialPages(partDictionary, localModelIDList = []) {  // localModelIDList is an array of submodel IDs used to traverse the submodel tree

			const localModel = LDParse.model.get.submodelDescendant(store.model, localModelIDList);

			if (!localModel) {
				return;
			}

			if (!localModel.steps) {
				const submodels = LDParse.model.get.submodels(localModel);
				if (submodels.some(p => p.steps && p.steps.length)) {
					// If main model contains no steps but contains submodels that contain steps, add one step per part in main model.
					localModel.steps = localModel.parts.map((p, idx) => ({parts: [idx]}));
				} else {
					return;  // No steps; can't add any pages.  TODO: big complicated automatic step insertion algorithm goes here.
				}
			}

			const addStateItem = store.mutations.addStateItem;

			localModel.steps.forEach(modelStep => {

				const parts = util.clone(modelStep.parts || []);
				const subModels = parts.filter(p => partDictionary[localModel.parts[p].filename].isSubModel);
				subModels.forEach(submodel => store.mutations.addInitialPages(partDictionary, localModelIDList.concat(submodel)));

				const page = addStateItem({
					type: 'page',
					number: null,
					steps: [],
					needsLayout: true,
					numberLabel: null
				});

				const pageNumber = addStateItem({
					type: 'pageNumber',
					parent: {type: 'page', id: page.id},
					x: null, y: null,
					width: null, height: null
				});
				page.number = page.id + 1;
				page.numberLabel = pageNumber.id;

				const step = addStateItem({
					type: 'step',
					parent: {type: 'page', id: page.id},
					number: null,
					parts: parts,
					submodel: util.clone(localModelIDList),
					x: null, y: null,
					width: null, height: null,
					numberLabel: null
				});

				const stepNumber = addStateItem({
					type: 'stepNumber',
					parent: {type: 'step', id: step.id},
					x: null, y: null,
					width: null, height: null
				});
				step.number = step.id;
				step.numberLabel = stepNumber.id;

				page.steps.push(step.id);

				const csi = addStateItem({
					type: 'csi',
					parent: {type: 'step', id: step.id},
					x: null, y: null,
					width: null, height: null
				});

				const pli = addStateItem({
					type: 'pli',
					parent: {type: 'step', id: step.id},
					pliItems: [],
					x: null, y: null,
					width: null, height: null
				});

				step.csiID = csi.id;
				step.pliID = pli.id;

				parts.forEach(partNumber => {

					const part = localModel.parts[partNumber];
					const target = pli.pliItems
						.map(id => store.get.pliItem(id))
						.filter(pliItem => pliItem.filename === part.filename && pliItem.colorCode === part.colorCode)[0];

					if (target) {
						target.quantity++;
					} else {
						const pliQty = addStateItem({
							type: 'pliQty',
							parent: {type: 'pliItem', id: null},
							x: null, y: null, width: null, height: null
						});

						const pliItem = addStateItem({
							type: 'pliItem',
							parent: {type: 'pli', id: pli.id},
							filename: part.filename,
							partNumber: partNumber,
							colorCode: part.colorCode,
							x: null, y: null,
							width: null, height: null,
							quantity: 1,
							quantityLabel: pliQty.id
						});
						pli.pliItems.push(pliItem.id);
						pliQty.parent.id = pliItem.id;
					}
				});
			});
		}
	}
};

function getter(s) {
	return (item) => {
		item = (typeof item === 'number') ? {type: s, id: item} : item;
		return store.get.lookupToItem(item);
	};
}

// Add store.get.page, store.get.step, etc; one getter for each state list
for (let el in store.state) {
	if (store.state.hasOwnProperty(el) && Array.isArray(store.state[el])) {
		el = el.slice(0, -1);  // trim trailing 's' (steps -> step)
		store.get[el] = getter(el);
	}
}

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = store;
}

return store;

})();
