/* global module: false, util: false */

// eslint-disable-next-line no-implicit-globals, no-undef
store = (function() {
'use strict';

// These will end up in the template page, when we have one
const pageMargin = 20;
const pliMargin = pageMargin / 2;

const store = {

	// The currently loaded LDraw model, as returned from LDParse
	model: null,  // Not in state because it is saved separately, and not affected by undo / redo

	// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic (except static stuff in model, like part geometries)
	state: {
		modelName: '',
		pages: [],
		steps: [],
		csis: [],
		plis: [],
		pliItems: [],
		pliQtys: [],
		pageSize: {width: 800, height: 600}
	},
	replaceState(state) {
		store.state = state;
	},
	get: {
		pageCount() {
			return Object.keys(store.state.pages).length;
		},
		nextPage(currentPageID) {
			for (let i = currentPageID + 1; i < store.state.pages.length; i++) {
				if (store.state.pages[i] != null) {
					return store.state.pages[i];
				}
			}
			return null;
		},
		prevPage(currentPageID) {
			for (let i = currentPageID - 1; i >= 0; i--) {
				if (store.state.pages[i] != null) {
					return store.state.pages[i];
				}
			}
			return null;
		},
		parent(item) {
			if (item && item.parent) {
				var itemList = store.state[item.parent.type + 's'];
				if (itemList) {
					return itemList[item.parent.id];
				}
			}
			return null;
		},
		pageForItem(item) {
			while (item && item.type !== 'page') {
				item = store.get.parent(item);
			}
			return item;
		}
	},
	mutations: {
		setModelName(name) {
			store.state.modelName = name;
		},
		moveStepToPreviousPage(step) {
			const currentPage = store.state.pages[step.parent.id];
			const prevPage = store.state.pages[step.parent.id - 1];
			const stepIdx = currentPage.steps.indexOf(step.id);
			currentPage.steps.splice(stepIdx, 1);
			prevPage.steps.push(step.id);
			step.parent.id = prevPage.id;
			store.mutations.layoutPage(prevPage);
			store.mutations.layoutPage(currentPage);
		},
		deletePage(pageID) {
			delete store.state.pages[pageID];
			store.mutations.renumberPages();
		},
		renumberPages() {
			let prevPageNumber;
			store.state.pages.forEach(page => {
				if (page && page.number != null) {
					if (prevPageNumber != null && prevPageNumber < page.number - 1) {
						page.number = prevPageNumber + 1;
					}
					prevPageNumber = page.number;
				}
			});
		},
		moveItem(opts) {
			opts.item.x = opts.x;
			opts.item.y = opts.y;
		},
		layoutStep(opts) {

			const {step, box} = opts;
			const localModel = util.getSubmodel(store.model, step.submodel);

			step.x = box.x + pageMargin;
			step.y = box.y + pageMargin;
			step.width = box.width - pageMargin - pageMargin;
			step.height = box.height - pageMargin - pageMargin;

			if (step.csiID != null) {
				const csiSize = util.renderCSI(localModel, step, true);
				const csi = store.state.csis[step.csiID];
				csi.x = Math.floor((step.width - csiSize.width) / 2);
				csi.y = Math.floor((step.height - csiSize.height) / 2);
				csi.width = csiSize.width;
				csi.height = csiSize.height;
			}

			const qtyLabelOffset = 5;
			let maxHeight = 0;
			let left = pliMargin + qtyLabelOffset;

			if (step.pliID != null) {

				const pli = store.state.plis[step.pliID];

				//pliItems.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
				for (var i = 0; i < pli.pliItems.length; i++) {

					const idx = pli.pliItems[i];
					const pliItem = store.state.pliItems[idx];
					const part = localModel.parts[pliItem.partNumber];

					const pliSize = util.renderPLI(part, true);
					pliItem.x = Math.floor(left);
					pliItem.y = Math.floor(pliMargin);
					pliItem.width = pliSize.width;
					pliItem.height = pliSize.height;

					const lblSize = util.measureLabel('bold 10pt Helvetica', 'x' + pliItem.quantity);
					const pliQty = store.state.pliQtys[pliItem.quantityLabel];
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

			if (step.numberLabel) {
				const lblSize = util.measureLabel('bold 20pt Helvetica', step.number);
				step.numberLabel.x = 0;
				step.numberLabel.y = maxHeight + pageMargin;
				step.numberLabel.width = lblSize.width;
				step.numberLabel.height = lblSize.height;
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

			for (var i = 0; i < stepCount; i++) {
				box.x = colSize * (i % cols);
				box.y = rowSize * Math.floor(i / cols);
				store.mutations.layoutStep({step: store.state.steps[page.steps[i]], box});
			}

			if (page.numberLabel) {
				const lblSize = util.measureLabel('bold 20pt Helvetica', page.number);
				page.numberLabel.x = pageSize.width - pageMargin - lblSize.width;
				page.numberLabel.y = pageSize.height - pageMargin - lblSize.height;
				page.numberLabel.width = lblSize.width;
				page.numberLabel.height = lblSize.height;
			}
			delete page.needsLayout;
		},
		addStateItem(item) {
			const stateList = store.state[item.type + 's'];
			item.id = stateList.length;
			stateList.push(item);
			return item;
		},
		addTitlePage() {

			const addStateItem = store.mutations.addStateItem;
			const page = addStateItem({
				type: 'page',
				steps: []
			});

			const step = addStateItem({
				type: 'step',
				parent: {type: 'page', id: page.id},
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
			store.mutations.layoutPage(page);
		},
		addInitialPages(partDictionary, localModelIDList) {  // localModelIDList is an array of submodel IDs used to traverse the submodel tree

			localModelIDList = localModelIDList || [];
			const localModel = util.getSubmodel(store.model, localModelIDList);

			if (!localModel || !localModel.steps) {
				return;
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
					numberLabel: {
						type: 'pageNumber',
						parent: {type: 'page', id: null},
						x: null, y: null,
						width: null, height: null
					}
				});
				page.number = page.numberLabel.parent.id = page.id;

				const step = addStateItem({
					type: 'step',
					parent: {type: 'page', id: page.id},
					number: null,
					parts: parts,
					submodel: util.clone(localModelIDList),
					x: null, y: null,
					width: null, height: null,
					numberLabel: {
						type: 'stepNumber',
						parent: {type: 'step', id: null},
						x: null, y: null,
						width: null, height: null
					}
				});
				step.number = step.numberLabel.parent.id = step.id;

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
						.map(idx => store.state.pliItems[idx])
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

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = store;
}

return store;

})();
