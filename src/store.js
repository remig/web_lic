/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global saveAs: false */

import _ from './util';
import Layout from './layout';
import Renderer from './store/render';
import Getters from './store/getters';

import ItemSetters from './store/item_setters';
import PartSetters from './store/part_setters';
import SubmodelSetters from './store/submodel_setters';
import TemplatePageSetters from './store/template_page_setters';
import BookSetters from './store/book_setters';
import PageSetters from './store/page_setters';
import InventoryPageSetters from './store/inventory_page_setters';
import StepSetters from './store/step_setters';
import CSISetters from './store/csi_setters';
import PLISetters from './store/pli_setters';
import PLIItemSetters from './store/pli_item_setters';
import SubmodelImageSetters from './store/submodel_image_setters';
import AnnotationSetters from './store/annotation_setters';
import CalloutSetters from './store/callout_setters';
import CalloutArrowSetters from './store/callout_arrow_setters';
import StepInsertion from './store/step_insertion';
import LocaleManager from './components/translate.vue';

import LDParse from './ld_parse';
import LDRender from './ld_render';
import defaultTemplate from './template';
import Storage from './storage';
import packageInfo from '../package.json';

const emptyState = {
	template: _.cloneDeep(defaultTemplate),
	licFilename: null,  // user-visible filename (without extension) used to load / save lic file
	templatePage: null,
	titlePage: null,
	plisVisible: true,
	pliTransforms: {},
	books: [],
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
		LDRender.setModel(model);
		store.state.licFilename = store.get.modelFilenameBase();
	},
	// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic,
	//  except static stuff in model, like part geometries
	state: _.cloneDeep(emptyState),
	replaceState(state) {
		store.state = state;
		store.cache.reset();
	},
	resetState() {
		if (store.model) {
			delete LDParse.partDictionary[store.model.filename];
		}
		store.model = null;
		store.state = _.cloneDeep(emptyState);
		store.cache.reset();
	},
	load(content) {
		LDParse.setPartDictionary(content.partDictionary);
		LDParse.setColorTable(content.colorTable);
		store.model = LDParse.partDictionary[content.modelFilename];
		LDRender.setModel(LDParse.partDictionary[content.modelFilename]);
		LDRender.setRenderState(content.state.template.sceneRendering);
		store.replaceState(content.state);
	},
	// mode is either 'file' or 'local', target is either 'state' or 'template'
	// filename is optional; if set, will use that instead of store.state.licFilename
	save({mode, target = 'state', filename, jsonIndent}) {
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
			filename = filename || store.state.licFilename;
			filename = (target === 'template') ? filename + '.lit' : filename + '.lic';
			saveAs(blob, filename);
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
		clear(item) {
			const cache = store.cache.stateCache;
			if (item && item.type && item.id != null && cache[item.type]) {
				delete cache[item.type][item.id];
			} else if (typeof item === 'string') {
				delete cache[item];
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
		book: BookSetters,
		templatePage: TemplatePageSetters,
		page: PageSetters,
		inventoryPage: InventoryPageSetters,
		step: StepSetters,
		csi: CSISetters,
		pli: PLISetters,
		pliItem: PLIItemSetters,
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
			},
			delete(opts) {  // opts: {rotateIcon}
				store.mutations.item.delete({item: opts.rotateIcon});
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
		sceneRendering: {
			set(opts) {  // opts: {zoom, edgeWidth, refresh: false}
				store.state.template.sceneRendering.zoom = opts.zoom;
				store.state.template.sceneRendering.edgeWidth = opts.edgeWidth;
				store.state.template.sceneRendering.rotation = _.cloneDeep(opts.rotation);
				if (opts.refresh) {
					store.mutations.sceneRendering.refreshAll();
				}
			},
			refreshAll() {
				LDRender.setRenderState(store.state.template.sceneRendering);
				store.mutations.csi.markAllDirty();
				store.mutations.pliItem.markAllDirty();
				store.mutations.page.markAllDirty();
			}
		},
		pliTransform: {
			set(opts) {  // opts: {filename, rotation, scale}
				// If rotation or scale is null, delete those entries.  If they're missing, ignore them.
				let transform = store.state.pliTransforms[opts.filename];
				if (!transform) {
					transform = store.state.pliTransforms[opts.filename] = {};
				}
				if (opts.hasOwnProperty('rotation')) {
					if (Array.isArray(opts.rotation)) {
						transform.rotation = opts.rotation.filter(el => el.angle !== 0);
					}
					if (opts.rotation == null || _.isEmpty(transform.rotation)) {
						delete transform.rotation;
					}
				}
				if (opts.hasOwnProperty('scale')) {
					transform.scale = opts.scale;
					if (!transform.scale || transform.scale === 1) {
						delete transform.scale;
					}
				}
				if (_.isEmpty(transform)) {
					delete store.state.pliTransforms[opts.filename];
				}
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
		addInitialPages(opts) {  // opts: {modelFilename,  lastStepNumber, partsPerStep}

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
				} else if (localModel === store.model || store.model.hasAutoSteps) {
					// Only auto-add steps to the main model, or to sub models if the main model itself
					// needed auto-steps.
					localModel.steps = StepInsertion(localModel, {partsPerStep: opts.partsPerStep});
					if (localModel === store.model) {
						store.model.hasAutoSteps = true;
					}
				} else {
					localModel.steps = [];
				}
			}

			const pagesAdded = [];

			localModel.steps.forEach(modelStep => {

				const parts = _.cloneDeep(modelStep.parts || []);
				const submodelIDs = parts.filter(pID => {
					return LDParse.model.isSubmodel(localModel.parts[pID].filename);
				});
				const submodelFilenames = new Set(submodelIDs.map(pID => localModel.parts[pID].filename));

				const submodelPagesAdded = [];
				for (const filename of submodelFilenames) {
					const newPages = store.mutations.addInitialPages({
						modelFilename: filename,
						partsPerStep: opts.partsPerStep,
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
					store.mutations.pli.addPart({pli, part});
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
					progressCallback({
						stepCount: steps.length,
						text: LocaleManager.translate('glossary.step_count_@c', 0)
					});
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
