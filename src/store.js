/* global module: false, util: false, saveAs: false, LDParse: false, LDRender: false */

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
	load(content) {
		store.model = content.model;
		LDParse.setPartDictionary(content.partDictionary);
		LDParse.setColorTable(content.colorTable);
		LDRender.setPartDictionary(content.partDictionary);
		store.replaceState(content.state);
	},
	save(mode) {  // mode is either 'file' or 'localStorage'
		store.model.parts.forEach(p => delete p.selected);
		const content = JSON.stringify({
			partDictionary: LDParse.partDictionary,
			colorTable: LDParse.colorTable,
			model: store.model,
			state: store.state
		});
		if (mode === 'file') {
			const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
			saveAs(blob, store.get.modelFilenameBase('.lic'));
		} else if (mode === 'localStorage') {
			console.log('Updating localStorage');
			window.localStorage.setItem('lic_state', content);
		}
	},
	render: (function() {

		function getCanvas(domID) {
			let container = document.getElementById(domID);
			if (!container) {
				container = document.createElement('canvas');
				container.setAttribute('id', domID);
				container.setAttribute('class', 'offscreen');
				document.getElementById('canvasHolder').appendChild(container);
			}
			return container;
		}

		// TODO: need to cache rendering results, and add back a 'forceRedraw' flag, because most renders
		// are identical to the previous renders.
		return {
			csi(localModel, step) {
				const container = getCanvas(`CSI_${step.csiID}`);
				if (step.parts == null) {  // TODO: this only happens for the title page; need better indicator for this 'special' non-step step
					LDRender.renderModel(localModel, container, 1000, {resizeContainer: true});
				} else {
					const partList = store.get.partList(step);
					const config = {partList, resizeContainer: true, displacedParts: step.displacedParts};
					LDRender.renderModel(localModel, container, 1000, config);
				}
				return {width: container.width, height: container.height, dx: 0, dy: 0, container};
			},
			csiWithSelection(localModel, step) {
				const config = {
					partList: store.get.partList(step),
					resizeContainer: true,
					displacedParts: step.displacedParts
				};
				const container = getCanvas(`CSI_${step.csiID}`);
				const offset = LDRender.renderAndDeltaSelectedPart(localModel, container, 1000, config);
				return {width: container.width, height: container.height, dx: offset.dx, dy: offset.dy, container};
			},
			pli(part) {
				const container = getCanvas(`PLI_${part.filename}_${part.colorCode}`);
				LDRender.renderPart(part, container, 1000, {resizeContainer: true});
				return {width: container.width, height: container.height, container};
			}
		};
	})(),
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
			} else if (page.type === 'titlePage') {
				return store.state.pages.length < 1;
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
		prevPage(page, includeTitlePage) {
			if (!page || store.get.isTitlePage(page)) {
				return null;
			} else if (store.get.isFirstPage(page)) {
				return includeTitlePage ? store.get.titlePage() : null;
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
		prevStep(step, limitToSubmodel) {
			step = store.get.lookupToItem(step);
			let prevStep = store.get.prev(step);
			if (limitToSubmodel) {
				while (prevStep && !util.array.eq(step.submodel, prevStep.submodel)) {
					prevStep = store.get.prev(prevStep);
				}
			}
			return prevStep;
		},
		nextStep(step, limitToSubmodel) {
			step = store.get.lookupToItem(step);
			let nextStep = store.get.next(step);
			if (limitToSubmodel) {
				while (nextStep && !util.array.eq(step.submodel, nextStep.submodel)) {
					nextStep = store.get.prev(nextStep);
				}
			}
			return nextStep;
		},
		partList(step) {  // Return a list of part IDs for every part in this (and previous) step.
			step = store.get.lookupToItem(step);
			if (step.parts == null) {
				return null;
			}
			let partList = [];
			while (step) {
				if (step.parts) {
					partList = partList.concat(step.parts);
				}
				step = store.get.prevStep(step, true);
			}
			return partList;
		},
		matchingPLIItem(pli, partID) {  // Given a pli and a part, find a pliItem in the pli that matches the part's filename & color (if any)
			pli = store.get.lookupToItem(pli);
			const step = store.get.parent(pli);
			const part = LDParse.model.get.partFromID(partID, store.model, step.submodel);
			const targets = pli.pliItems.map(id => store.get.pliItem(id))
				.filter(i => i.filename === part.filename && i.colorCode === part.colorCode);
			return targets.length ? targets[0] : null;
		},
		prev(item) {  // Get the previous item in the specified item's list
			item = store.get.lookupToItem(item);
			const itemList = store.state[item.type + 's'];
			const idx = itemList.findIndex(el => el.number === item.number - 1);
			return (idx < 0) ? null : itemList[idx];
		},
		next(item) {  // Get the next item in the specified item's list
			item = store.get.lookupToItem(item);
			const itemList = store.state[item.type + 's'];
			const idx = itemList.findIndex(el => el.number === item.number + 1);
			return (idx < 0) ? null : itemList[idx];
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
				return store.get[item.type + 'Number'](item.numberLabel);
			}
			return null;
		},
		nextItemID(item) {  // Get the next unused ID in this item's list
			const itemList = store.state[item.type + 's'];
			return itemList.length ? Math.max.apply(null, itemList.map(el => el.id)) + 1 : 0;
		},
		lookupToItem(lookup) {  // Convert a {type, id} lookup object into the actual item it refers to
			if (!lookup || !lookup.type) {
				return null;
			} else if (lookup.parent || lookup.number != null) {
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
		itemToLookup(item) {  // Create a {type, id} lookup object from the specified item
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
		addStateItem(item, parent) {
			if (!item || !item.type || !store.state.hasOwnProperty(item.type + 's')) {
				return null;
			}
			item.id = store.get.nextItemID(item);
			store.state[item.type + 's'].push(item);
			if (parent) {
				item.parent = {type: parent.type, id: parent.id};
				if (parent.hasOwnProperty(item.type + 's')) {
					parent[item.type + 's'].push(item.id);
				} else if (parent.hasOwnProperty(item.type + 'ID')) {
					parent[item.type + 'ID'] = item.id;
				} else if (parent.hasOwnProperty('numberLabel') && item.type.endsWith('Number')) {
					parent.numberLabel = item.id;
				}
			}
			return item;
		},
		deleteItem(item) {
			item = store.get.lookupToItem(item);
			util.array.remove(store.state[item.type + 's'], item);
		},
		reparentItem(opts) {  // opts: {item, newParent, insertionIndex = last}
			const item = store.get.lookupToItem(opts.item);
			const oldParent = store.get.parent(item);
			const newParent = store.get.lookupToItem(opts.newParent);
			item.parent.id = newParent.id;
			util.array.remove(oldParent[item.type + 's'], item.id);
			if (opts.insertionIndex == null) {
				newParent[item.type + 's'].push(item.id);
			} else {
				util.array.insert(newParent[item.type + 's'], item.id, opts.insertionIndex);
			}
		},
		repositionItem(opts) {  // opts: {item, x, y}
			if (opts && opts.item) {
				opts.item.x = opts.x;
				opts.item.y = opts.y;
			}
		},
		displacePart(opts) { // opts: {partID, step, direction}.  If direction == null, remove displacement
			const step = store.get.lookupToItem(opts.step);
			step.displacedParts = step.displacedParts || [];
			const idx = step.displacedParts.findIndex(p => p.partID === opts.partID);
			if (opts.direction) {
				if (idx >= 0) {
					step.displacedParts[idx].direction = opts.direction;
				} else {
					step.displacedParts.push({partID: opts.partID, direction: opts.direction});
				}
			} else if (idx >= 0) {
				step.displacedParts.splice(idx, 1);
			}
			store.mutations.layoutPage(store.get.pageForItem(step));
		},
		// TODO: what if a step has zero parts?
		movePartToStep(opts) { // opts: {partID, srcStep, destStep}
			const partID = opts.partID;
			const srcStep = store.get.lookupToItem(opts.srcStep);
			util.array.remove(srcStep.parts, partID);

			const destStep = store.get.lookupToItem(opts.destStep);
			destStep.parts.push(partID);
			destStep.parts.sort(util.sort.numeric.ascending);

			if (srcStep.pliID != null) {
				const destPLI = store.get.pli(destStep.pliID);
				const pli = store.get.pli(srcStep.pliID);
				const pliItems = pli.pliItems.map(i => store.get.pliItem(i));
				const pliItem = pliItems.filter(i => i.partNumbers.includes(partID))[0];

				if (pliItem.quantity === 1) {
					const target = store.get.matchingPLIItem(destPLI, partID);
					if (target) {
						target.quantity++;
						target.partNumbers.push(partID);
						util.array.remove(pli.pliItems, pliItem.id);
						store.mutations.deleteItem(store.get.pliQty(pliItem.pliQtyID));
						store.mutations.deleteItem(pliItem);
					} else {
						store.mutations.reparentItem({item: pliItem, newParent: destPLI});
					}
				} else {
					pliItem.quantity -= 1;
					util.array.remove(pliItem.partNumbers, partID);

					const newPLIItem = util.clone(pliItem);
					newPLIItem.parent.id = destPLI.id;
					newPLIItem.partNumbers = [partID];
					store.mutations.addStateItem(newPLIItem);
					destPLI.pliItems.push(newPLIItem);

					const newPLIQty = util.clone(store.get.pliQty(pliItem.pliQtyID));
					newPLIQty.parent.id = newPLIItem.id;
					store.mutations.addStateItem(newPLIQty);
					newPLIItem.pliQtyID = newPLIQty.id;
				}
			}

			store.mutations.layoutPage(store.get.pageForItem(srcStep));
			if (srcStep.parent.id !== destStep.parent.id) {
				store.mutations.layoutPage(store.get.pageForItem(destStep));
			}
		},
		moveStepToPage(opts) {  // opts: {step, destPage, insertionIndex = 0}
			const step = store.get.lookupToItem(opts.step);
			const currentPage = store.get.parent(step);
			const destPage = store.get.lookupToItem(opts.destPage);
			store.mutations.reparentItem({
				item: step,
				newParent: destPage,
				insertionIndex: opts.insertionIndex || 0
			});
			store.mutations.layoutPage(currentPage);
			store.mutations.layoutPage(destPage);
		},
		moveStepToPreviousPage(step) {
			step = store.get.lookupToItem(step);
			const destPage = store.get.prevPage(step.parent, false);
			if (destPage) {
				const insertionIndex = destPage.steps.length;
				store.mutations.moveStepToPage({step, destPage, insertionIndex});
			}
		},
		moveStepToNextPage(step) {
			step = store.get.lookupToItem(step);
			const destPage = store.get.nextPage(step.parent);
			if (destPage) {
				store.mutations.moveStepToPage({step, destPage, insertionIndex: 0});
			}
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
		deletePage(page) {
			page = store.get.lookupToItem(page);
			if (!page.steps.length) {  // Don't delete pages that still have steps
				if (page.numberLabel != null) {
					store.mutations.deleteItem(store.get.pageNumber(page.numberLabel));
				}
				store.mutations.deleteItem(page);
				store.mutations.renumberPages();
			}
		},
		deleteStep(step) {
			const page = store.get.pageForItem(step);
			page.steps.splice(page.steps.indexOf(step), 1);
			if (step.numberLabel != null) {
				store.mutations.deleteItem(store.get.stepNumber(step.numberLabel));
			}
			if (step.csIID != null) {
				store.mutations.deleteItem(store.get.csi(step.csiID));
			}
			if (step.pliID != null) {
				store.mutations.deletePLI(store.get.pli(step.pliID));
			}
			store.mutations.deleteItem(step);
			store.mutations.renumberSteps();
		},
		deletePLI(pli) {
			pli = store.get.lookupToItem(pli);
			if (!pli.pliItems.length) {
				store.mutations.deleteItem(pli);  // Don't delete plis that still have parts
			}
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
				const csiSize = store.render.csi(localModel, step);
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
				if (util.isEmpty(pli.pliItems)) {
					pli.x = pli.y = pli.width = pli.height = 0;
				} else {

					//pliItems.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
					for (let i = 0; i < pli.pliItems.length; i++) {

						const pliItem = store.get.pliItem(pli.pliItems[i]);
						const pliSize = store.render.pli(localModel.parts[pliItem.partNumbers[0]]);
						pliItem.x = Math.floor(left);
						pliItem.y = Math.floor(pliMargin);
						pliItem.width = pliSize.width;
						pliItem.height = pliSize.height;

						const lblSize = util.measureLabel('bold 10pt Helvetica', 'x' + pliItem.quantity);
						const pliQty = store.get.pliQty(pliItem.pliQtyID);
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
			}

			if (step.numberLabel != null) {
				const lblSize = util.measureLabel('bold 20pt Helvetica', step.number);
				const lbl = store.get.stepNumber(step.numberLabel);
				lbl.x = 0;
				lbl.y = maxHeight ? maxHeight + pageMargin : 0;
				lbl.width = lblSize.width;
				lbl.height = lblSize.height;
			}
		},
		layoutPage(page) {
			page = store.get.lookupToItem(page);
			if (page.type === 'titlePage') {
				store.mutations.layoutTitlePage(page);
				return;
			}
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
			page = store.get.lookupToItem(page);
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
				needsLayout: true,
				labels: []
			};

			const step = addStateItem({
				type: 'step',
				csiID: null, pliID: null,
				x: null, y: null, width: null, height: null
			}, page);

			addStateItem({
				type: 'csi',
				x: null, y: null, width: null, height: null
			}, step);

			addStateItem({
				type: 'label',
				text: store.get.modelName(true),
				font: '20pt Helvetica',
				color: 'black',
				x: null, y: null, width: null, height: null
			}, page);

			const partCount = LDParse.model.get.partCount(store.model);
			const pageCount = store.get.pageCount();
			addStateItem({
				type: 'label',
				text: `${partCount} Parts, ${pageCount} Pages`,
				font: '16pt Helvetica',
				color: 'black',
				x: null, y: null, width: null, height: null
			}, page);
		},
		removeTitlePage() {
			// TODO: handle this via store.mutations.deleteStep
			const page = store.state.titlePage;
			if (page == null) {
				return;
			}
			if (page.labels) {
				page.labels.forEach(id => store.mutations.deleteItem({type: 'label', id}));
			}
			if (page.steps) {
				page.steps.forEach(id => store.mutations.deleteStep({type: 'step', id}));
			}
			store.state.titlePage = null;
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
				subModels.forEach(submodel => {
					store.mutations.addInitialPages(partDictionary, localModelIDList.concat(submodel));
				});

				const page = addStateItem({
					type: 'page',
					number: null,
					steps: [],
					needsLayout: true,
					numberLabel: null
				});

				addStateItem({
					type: 'pageNumber',
					x: null, y: null, width: null, height: null
				}, page);
				page.number = page.id + 1;

				const step = addStateItem({
					type: 'step',
					number: null,
					numberLabel: null,
					parts: parts,
					submodel: util.clone(localModelIDList),
					csiID: null, pliID: null,
					x: null, y: null, width: null, height: null
				}, page);

				addStateItem({
					type: 'stepNumber',
					x: null, y: null, width: null, height: null
				}, step);
				step.number = step.id;

				addStateItem({
					type: 'csi',
					x: null, y: null, width: null, height: null
				}, step);

				const pli = addStateItem({
					type: 'pli',
					pliItems: [],
					x: null, y: null, width: null, height: null
				}, step);

				parts.forEach(partID => {

					const target = store.get.matchingPLIItem(pli, partID);
					if (target) {
						target.quantity++;
						target.partNumbers.push(partID);
					} else {

						const part = localModel.parts[partID];
						const pliItem = addStateItem({
							type: 'pliItem',
							filename: part.filename,
							partNumbers: [partID],
							colorCode: part.colorCode,
							quantity: 1, pliQtyID: null,
							x: null, y: null, width: null, height: null
						}, pli);

						addStateItem({
							type: 'pliQty',
							x: null, y: null, width: null, height: null
						}, pliItem);
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
