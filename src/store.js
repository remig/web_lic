/* global saveAs: false */
'use strict';

import _ from './util';
import Layout from './layout';
import Renderer from './store/render.js';
import Getters from './store/getters.js';

import ItemSetters from './store/item_setters.js';
import PartSetters from './store/part_setters.js';
import SubmodelSetters from './store/submodel_setters.js';
import TemplatePageSetters from './store/template_page_setters.js';
import PageSetters from './store/page_setters.js';
import InventoryPageSetters from './store/inventory_page_setters.js';
import StepSetters from './store/step_setters.js';
import CSISetters from './store/csi_setters.js';
import SubmodelImageSetters from './store/submodel_image_setters.js';
import AnnotationSetters from './store/annotation_setters.js';
import CalloutSetters from './store/callout_setters.js';
import CalloutArrowSetters from './store/callout_arrow_setters.js';

import LDParse from './LDParse';
import LDRender from './LDRender';
import defaultTemplate from './template';
import Storage from './storage';
import packageInfo from '../package.json';

const emptyState = {
	template: _.clone(defaultTemplate),
	templatePage: null,
	titlePage: null,
	plisVisible: true,
	pages: [],
	inventoryPages: [],
	dividers: [],
	steps: [],
	csis: [],
	plis: [],
	pliItems: [],
	quantityLabels: [],
	numberLabels: [],
	submodelImages: [],
	annotations: [],
	callouts: [],
	calloutArrows: [],
	points: [],
	rotateIcons: []
};

const store = {

	version: null,  // The version of Lic that created this state

	// The currently loaded LDraw model, as returned from LDParse
	model: null,  // Not in state because it is saved separately, and not affected by undo / redo
	setModel(model) {
		store.model = model;
		LDRender.setPartDictionary(LDParse.partDictionary);
	},
	// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic,
	//  except static stuff in model, like part geometries
	state: _.clone(emptyState),
	replaceState(state) {
		store.state = state;
		store.cache.reset();
	},
	resetState() {
		store.state = _.clone(emptyState);
		store.cache.reset();
	},
	load(content) {
		LDParse.setPartDictionary(content.partDictionary);
		LDParse.setColorTable(content.colorTable);
		LDRender.setPartDictionary(content.partDictionary);
		store.model = LDParse.partDictionary[content.modelFilename];
		store.replaceState(content.state);
	},
	// mode is either 'file' or 'local', target is either 'state' or 'template'
	save(mode, target = 'state', jsonIndent) {
		let content;
		if (target === 'template') {
			content = {template: store.state.template};
		} else {
			content = {
				partDictionary: LDParse.partDictionary,
				colorTable: LDParse.colorTable,
				modelFilename: store.model.filename,
				state: store.state
			};
		}
		content.version = packageInfo.version;
		if (mode === 'file') {
			content = JSON.stringify(content, null, jsonIndent);
			const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
			saveAs(blob, store.get.modelFilenameBase((target === 'template') ? '.lit' : '.lic'));
		} else if (mode === 'local' && target !== 'template') {
			console.log('Updating local storage');  // eslint-disable-line no-console
			Storage.replace.model(content);
		}
	},
	render: Renderer,
	cache: {
		// For temporary state-based data that's transient yet expensive to recompute.
		// Keys are either [item type][item ID][cache key] for info specific to exactly one item, or
		// [item type][cache key] for info specific to all items of one type.
		stateCache: {},
		get(item, key, defaultValue) {
			const cache = store.cache.stateCache;
			if (item && item.type && item.id != null && cache[item.type] && cache[item.type][item.id]) {
				return cache[item.type][item.id][key];
			} else if (typeof item === 'string' && cache[item] && cache[item][key]) {
				return cache[item][key];
			}
			return defaultValue;
		},
		set(item, key, newValue) {
			const cache = store.cache.stateCache;
			if (item && item.type && item.id != null) {
				cache[item.type] = cache[item.type] || {};
				cache[item.type][item.id] = cache[item.type][item.id] || {};
				cache[item.type][item.id][key] = newValue;
			} else if (typeof item === 'string') {
				cache[item] = cache[item] || {};
				cache[item][key] = newValue;
			}
		},
		reset() {
			store.cache.stateCache = {};
		}
	},
	get: Getters,
	// TODO: convert all 'opts' arguments into {opts} for automatic destructuring.  duh.
	mutations: {
		item: ItemSetters,
		part: PartSetters,
		submodel: SubmodelSetters,
		templatePage: TemplatePageSetters,
		page: PageSetters,
		inventoryPage: InventoryPageSetters,
		step: StepSetters,
		csi: CSISetters,
		submodelImage: SubmodelImageSetters,
		annotation: AnnotationSetters,
		callout: CalloutSetters,
		calloutArrow: CalloutArrowSetters,
		rotateIcon: {
			add(opts) {  // opts: {parent}
				return store.mutations.item.add({item: {
					type: 'rotateIcon',
					x: null, y: null, scale: 1
				}, parent: opts.parent});
			}
		},
		divider: {
			add(opts) {  // opts: {parent, p1, p2}
				return store.mutations.item.add({item: {
					type: 'divider', p1: opts.p1, p2: opts.p2
				}, parent: opts.parent});
			},
			reposition(opts) { // opts: {item, dx, dy}
				const divider = store.get.divider(opts.item);
				divider.p1.x += opts.dx;
				divider.p2.x += opts.dx;
				divider.p1.y += opts.dy;
				divider.p2.y += opts.dy;
			},
			setLength(opts) { // opts: {divider, newLength}
				const divider = store.get.divider(opts.divider);
				const bbox = _.geom.bbox([divider.p1, divider.p2]);
				const isHorizontal = (bbox.height === 0);
				if (isHorizontal) {
					divider.p2.x = divider.p1.x + opts.newLength;
				} else {
					divider.p2.y = divider.p1.y + opts.newLength;
				}
			},
			delete(opts) {  // opts: {divider}
				store.mutations.item.delete({item: opts.divider});
			}
		},
		pli: {
			add(opts) {  // opts: {parent}
				return store.mutations.item.add({item: {
					type: 'pli',
					pliItems: [],
					x: null, y: null, width: null, height: null,
					innerContentOffset: {x: 0, y: 0},
					borderOffset: {x: 0, y: 0}
				}, parent: opts.parent});
			},
			delete(opts) {  // opts: {pli, deleteItem: false}
				const pli = store.get.lookupToItem(opts.pli);
				if (!opts.deleteItems && pli.pliItems && pli.pliItems.length) {
					throw 'Cannot delete a PLI with items';
				}
				store.mutations.item.deleteChildList({item: pli, listType: 'pliItem'});
				store.mutations.item.delete({item: pli});
			},
			toggleVisibility(opts) {  // opts: {visible}
				store.state.plisVisible = opts.visible;
				store.state.pages.forEach(p => {
					p.needsLayout = true;
				});
			}
		},
		pliItem: {
			add(opts) { // opts: {parent, filename, colorCode, quantity = 1}
				const pliItem = store.mutations.item.add({item: {
					type: 'pliItem', domID: null,
					filename: opts.filename,
					colorCode: opts.colorCode,
					quantity: (opts.quantity == null) ? 1 : opts.quantity,
					quantityLabelID: null,
					x: null, y: null, width: null, height: null
				}, parent: opts.parent});

				store.mutations.item.add({item: {
					type: 'quantityLabel',
					align: 'left', valign: 'top',
					x: null, y: null, width: null, height: null
				}, parent: pliItem});

				return pliItem;
			},
			delete(opts) {  // opts: {pliItem}
				const pliItem = store.get.lookupToItem(opts.pliItem);
				store.mutations.item.delete({item: {type: 'quantityLabel', id: pliItem.quantityLabelID}});
				store.mutations.item.delete({item: pliItem});
			},
			markAllDirty(filename) {
				let list = store.state.pliItems;
				list = filename ? list.filter(item => item.filename === filename) : list;
				list.forEach(item => (item.isDirty = true));
			}
		},
		renumber(itemList, start = 1) {
			let prevNumber;
			itemList.forEach(el => {
				if (el && el.number != null) {
					if (prevNumber == null) {
						el.number = start;
					} else if (prevNumber != null && prevNumber !== el.number - 1) {
						el.number = prevNumber + 1;
					}
					prevNumber = el.number;
				}
			});
		},
		setNumber() {  // opts: {target, number} NYI
		},
		layoutTitlePage(page) {
			Layout.titlePage(page);
		},
		addTitlePage() {

			// TODO: need submodel + bag breakdown page and final 'no step' complete model page
			const page = store.state.titlePage = store.mutations.page.add({pageType: 'titlePage'});
			page.number = 1;
			store.mutations.page.renumber();  // TODO: this doesn't update the page numbers in the tree

			const step = store.mutations.step.add({dest: page});
			step.model.filename = store.model.filename;
			step.parts = null;

			store.mutations.annotation.add({
				annotationType: 'label',
				properties: {
					text: store.get.modelName(true),
					font: '20pt Helvetica'
				},
				parent: page
			});

			// TODO: This part & page count gets out of sync with the doc as pages are added / removed
			const partCount = LDParse.model.get.partCount(store.model);
			const pageCount = store.get.pageCount();
			store.mutations.annotation.add({
				annotationType: 'label',
				properties: {
					text: `${partCount} Parts, ${pageCount} Pages`,
					font: '16pt Helvetica'
				},
				parent: page
			});
		},
		removeTitlePage() {
			const item = store.get.titlePage();
			if (item == null) {
				return;
			}
			store.mutations.item.deleteChildList({item, listType: 'annotation'});
			store.mutations.item.deleteChildList({item, listType: 'step'});
			store.state.titlePage = null;
			store.mutations.page.renumber();
		},
		addInitialPages(opts) {  // opts: {modelFilename,  lastStepNumber}

			opts = opts || {};
			const lastStepNumber = opts.lastStepNumber || {num: opts.lastStepNumber || 1};
			const modelFilename = opts.modelFilename || store.model.filename;
			const localModel = LDParse.model.get.abstractPart(modelFilename);

			if (!localModel.steps) {
				const submodels = LDParse.model.get.submodels(localModel);
				if (submodels.some(p => p.steps && p.steps.length)) {
					// If main model contains no steps but contains submodels that contain steps,
					// add one step per part in main model.
					localModel.steps = localModel.parts.map((p, idx) => ({parts: [idx]}));
				} else {
					return null;  // No steps; can't add any pages.  TODO: automatic step insertion algorithm
				}
			}

			const pagesAdded = [];

			localModel.steps.forEach(modelStep => {

				const parts = _.clone(modelStep.parts || []);
				const submodelIDs = parts.filter(pID => {
					return LDParse.model.isSubmodel(localModel.parts[pID].filename);
				});
				const submodelFilenames = new Set(submodelIDs.map(pID => localModel.parts[pID].filename));

				const submodelPagesAdded = [];
				for (const filename of submodelFilenames) {
					const newPages = store.mutations.addInitialPages({
						modelFilename: filename,
						lastStepNumber
					});
					if (newPages) {
						submodelPagesAdded.push(newPages);
					}
				}

				const page = store.mutations.page.add({pageNumber: 'id'});
				pagesAdded.push(page.id);

				const step = store.mutations.step.add({
					dest: page, doLayout: false, stepNumber: lastStepNumber.num
				});
				lastStepNumber.num += 1;
				step.parts = parts;
				step.model.filename = modelFilename;

				submodelPagesAdded.forEach(submodelPageGroup => {
					submodelPageGroup.forEach(pageID => {
						const submodelPage = store.get.page(pageID);
						const submodelStep = store.get.step(submodelPage.steps[0]);
						submodelStep.model.parentStepID = step.id;
					});
				});

				const pli = store.get.pli(step.pliID);

				parts.forEach(partID => {
					const part = localModel.parts[partID];
					const target = store.get.matchingPLIItem(pli, partID);
					if (target) {
						target.quantity++;
					} else {
						store.mutations.pliItem.add({
							parent: pli,
							filename: part.filename,
							colorCode: part.colorCode
						});
					}
				});
			});

			return pagesAdded;
		},
		addInitialSubmodelImages() {
			store.get.submodels().forEach(submodel => {
				store.mutations.submodelImage.add({
					parent: {id: submodel.stepID, type: 'step'},
					modelFilename: submodel.filename,
					quantity: submodel.quantity
				});
			});
		},
		async mergeInitialPages(progressCallback) {
			return new Promise(async function(resolve) {
				window.setTimeout(async function() {
					let stepSet = [], prevModelName;
					const steps = store.state.steps.filter(step => {
						return step.parent.type === 'page';
					});
					progressCallback({stepCount: steps.length, text: 'Step 0'});
					for (let i = 0; i < steps.length; i++) {
						const step = steps[i];
						if (!prevModelName || prevModelName === step.model.filename) {
							stepSet.push(step);
						} else {
							await Layout.mergeSteps(stepSet, progressCallback);
							stepSet = [step];
						}
						prevModelName = step.model.filename;
					}
					if (stepSet.length > 1) {
						// Be sure to merge last set of step in the book
						await Layout.mergeSteps(stepSet, progressCallback);
					}
					progressCallback({clear: true});
					resolve();
				}, 100);
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

export default store;
