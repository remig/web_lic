/* global saveAs: false */
'use strict';

const _ = require('./util');
const LDParse = require('./LDParse');
const LDRender = require('./LDRender');
const defaultTemplate = require('./template.js');

// Load this later, to avoid circular import issues (layout.js is just code that belongs in store moved to a dedicated file)
let Layout;  // eslint-disable-line prefer-const

const emptyState = {
	template: _.clone(defaultTemplate),
	templatePage: null,
	titlePage: null,
	plisVisible: true,
	pages: [],
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

	// The currently loaded LDraw model, as returned from LDParse
	model: null,  // Not in state because it is saved separately, and not affected by undo / redo
	setModel(model) {
		store.model = model;
		LDRender.setPartDictionary(LDParse.partDictionary);
	},
	// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic (except static stuff in model, like part geometries)
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
		store.model = content.model;
		LDParse.setPartDictionary(content.partDictionary);
		LDParse.setColorTable(content.colorTable);
		LDRender.setPartDictionary(content.partDictionary);
		store.replaceState(content.state);
	},
	save(mode, target = 'state', jsonIndent) {  // mode is either 'file' or 'localStorage', target is either 'state' or 'template'
		let content;
		if (target === 'template') {
			content = {template: store.state.template};
		} else {
			content = {
				partDictionary: LDParse.partDictionary,
				colorTable: LDParse.colorTable,
				model: store.model,
				state: store.state
			};
		}
		content = JSON.stringify(content, null, jsonIndent);
		if (mode === 'file') {
			const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
			saveAs(blob, store.get.modelFilenameBase((target === 'template') ? '.lit' : '.lic'));
		} else if (mode === 'localStorage' && target !== 'template') {
			console.log('Updating localStorage');  // eslint-disable-line no-console
			window.localStorage.setItem('lic_state', content);
		}
	},
	render: (function() {

		function getCanvas(domID) {
			const container = document.createElement('canvas');
			container.setAttribute('id', domID);
			container.setAttribute('class', 'offscreen');
			document.getElementById('canvasHolder').appendChild(container);
			return container;
		}

		function getRotation(item) {
			let rot = item.rotation;
			if (rot) {
				return (rot.x === 0 && rot.y === 0 && rot.z === 0) ? null : rot;
			}
			rot = store.get.templateForItem(item).rotation;
			return (rot && rot.x === 0 && rot.y === 0 && rot.z === 0) ? null : rot;
		}

		return {
			csi(localModel, step, csi, selectedPartIDs, scale = 1) {
				const domID = `CSI_${step.csiID}`;
				let container = document.getElementById(domID);
				if (csi.isDirty || container == null) {
					container = container || getCanvas(domID);
					if (step.parts == null) {  // TODO: this only happens for the title page; need better indicator for this 'special' non-step step
						LDRender.renderModel(localModel, container, 1000 * scale, {resizeContainer: true});
					} else {
						const partList = store.get.partList(step);
						if (_.isEmpty(partList)) {
							return null;
						}
						const config = {
							partList,
							selectedPartIDs,
							resizeContainer: true,
							displacedParts: step.displacedParts,
							rotation: getRotation(csi),
							displacementArrowColor: store.state.template.step.csi.displacementArrow.fill.color
						};
						LDRender.renderModel(localModel, container, 1000 * scale, config);
					}
					delete csi.isDirty;
				}
				return {width: container.width, height: container.height, dx: 0, dy: 0, container};
			},
			csiWithSelection(localModel, step, csi, selectedPartIDs, scale = 1) {
				const config = {
					partList: store.get.partList(step),
					selectedPartIDs,
					resizeContainer: true,
					displacedParts: step.displacedParts,
					rotation: getRotation(csi),
					displacementArrowColor: store.state.template.step.csi.displacementArrow.fill.color
				};
				const container = document.getElementById('generateImagesCanvas');
				const offset = LDRender.renderAndDeltaSelectedPart(localModel, container, 1000 * scale, config);
				return {width: container.width, height: container.height, dx: offset.dx, dy: offset.dy, container};
			},
			pli(part, item, scale = 1) {
				const domID = `PLI_${part.filename}_${part.colorCode}`;
				let container = document.getElementById(domID);
				if ((item && item.isDirty) || container == null) {
					container = getCanvas(domID);
					const config = {
						resizeContainer: true,
						rotation: getRotation(item)
					};
					LDRender.renderPart(part, container, 1000 * scale, config);
				}
				return {width: container.width, height: container.height, container};
			}
		};
	})(),
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
	get: {
		pageCount(includeTitlePage) {
			return store.state.pages.length + (includeTitlePage && store.state.titlePage ? 1 : 0);
		},
		modelName(nice) {
			if (!store.model) {
				return '';
			} else if (store.model.name) {
				return store.model.name;
			}
			const name = store.get.modelFilenameBase();
			if (nice) {
				return _.prettyPrint(name.replace(/\//g, '-').replace(/_/g, ' '));
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
			return store.model.filename.split('.')[0] + (ext || '');
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
			if (!page || page.id == null || page.type === 'templatePage') {
				return false;
			} else if (page.type === 'titlePage') {
				return store.state.pages.length < 1;
			}
			return page.id === _.last(store.state.pages).id;
		},
		nextPage(page) {
			if (!page || store.get.isLastPage(page)) {
				return null;
			} else if (store.get.isTemplatePage(page)) {
				return store.get.titlePage() || store.state.pages[0];
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
			if (!page || store.get.isTemplatePage(page)) {
				return null;
			} else if (store.get.isTitlePage(page)) {
				return store.get.templatePage();
			} else if (store.get.isFirstPage(page)) {
				return includeTitlePage ?
					(store.get.titlePage() || store.get.templatePage()) : store.get.templatePage();
			}
			const idx = store.state.pages.findIndex(el => el.id === page.id);
			if (idx < 0) {
				return null;
			}
			return store.state.pages[idx - 1];
		},
		templatePage() {
			return store.state.templatePage;
		},
		templateForItem(item) {
			const template = store.state.template;
			if (template[item.type]) {
				return template[item.type];
			}
			item = store.get.lookupToItem(item);
			const parent = store.get.parent(item);
			switch (item.type) {
				case 'csi':
					return template[parent.type].csi;
				case 'templatePage':
					return template.page;
				case 'divider':
					return template.page.divider;
				case 'quantityLabel':
					return template[parent.type].quantityLabel;
				case 'numberLabel':
					if (parent.parent && parent.parent.type === 'callout') {
						return template.callout.step.numberLabel;
					} else if (parent.type === 'templatePage') {
						return template.page.numberLabel;
					}
					return template[parent.type].numberLabel;
			}
			return null;
		},
		isTemplatePage(page) {
			return (page || {}).type === 'templatePage';
		},
		titlePage() {
			return store.state.titlePage;
		},
		firstPage() {
			return store.state.pages[0];
		},
		lastPage() {
			return _.last(store.state.pages);
		},
		prevStep(step, limitToSubmodel) {
			step = store.get.lookupToItem(step);
			let itemList;
			if (step.parent.type === 'step' || step.parent.type === 'callout') {
				itemList = store.get.parent(step).steps.map(store.get.step);
			}
			let prevStep = store.get.prev(step, itemList);
			if (limitToSubmodel && itemList == null) {
				while (prevStep && step.model.filename !== prevStep.model.filename) {
					prevStep = store.get.prev(prevStep);
				}
			}
			return prevStep;
		},
		nextStep(step, limitToSubmodel) {
			step = store.get.lookupToItem(step);
			let itemList;
			if (step.parent.type === 'step' || step.parent.type === 'callout') {
				itemList = store.get.parent(step).steps.map(store.get.step);
			}
			let nextStep = store.get.next(step, itemList);
			if (limitToSubmodel && itemList == null) {
				while (nextStep && step.model.filename !== nextStep.model.filename) {
					nextStep = store.get.next(nextStep);
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
			const part = LDParse.model.get.partFromID(partID, step.model.filename);
			const targets = pli.pliItems.map(id => store.get.pliItem(id))
				.filter(i => i.filename === part.filename && i.colorCode === part.colorCode);
			return targets.length ? targets[0] : null;
		},
		pliItemIsSubmodel(pliItem) {
			pliItem = store.get.lookupToItem(pliItem);
			const pli = store.get.parent(pliItem);
			const step = store.get.parent(pli);
			const part = LDParse.model.get.partFromID(pliItem.partNumbers[0], step.model.filename);
			return LDParse.model.isSubmodel(part.filename);
		},
		calloutArrowToPoints(arrow) {
			// Return list of points in arrow, all relative to *step*.
			// Last arrow point is the very arrowhead tip, but arrow line should end at at arrowhead base.
			// Last arrow point is also relative to CSI.
			const callout = store.get.parent(arrow);
			const step = store.get.parent(callout);
			const csi = store.get.csi(step.csiID);

			const points = arrow.points.slice(0, -1).map(pointID => {
				const point = store.get.point(pointID);
				return {
					x: point.x + callout.x,
					y: point.y + callout.y
				};
			});

			let tip = _.last(arrow.points);
			tip = store.get.point(tip);
			tip = {x: tip.x + csi.x, y: tip.y + csi.y};

			const base = _.clone(tip);
			const direction = arrow.direction;
			base.x += (direction === 'right') ? -24 : (direction === 'left') ? 24 : 0;  // TODO: abstract callout arrow dimension... somewhere...
			base.y += (direction === 'down') ? -24 : (direction === 'up') ? 24 : 0;

			return [...points, base, tip];
		},
		calloutArrowBoundingBox(arrow) {
			const callout = store.get.parent(arrow);
			const step = store.get.parent(callout);
			const points = store.get.calloutArrowToPoints(arrow);
			let box = _.geom.bbox(points);
			box = _.geom.expandBox(box, 8, 8);
			box.x += step.x;
			box.y += step.y;
			return box;
		},
		prev(item, itemList) {  // Get the previous item in the specified item's list, based on item.number and matching parent types
			item = store.get.lookupToItem(item);
			itemList = itemList || store.state[item.type + 's'];
			const idx = itemList.findIndex(el => {
				return el.number === item.number - 1 && el.parent.type === item.parent.type;
			});
			return (idx < 0) ? null : itemList[idx];
		},
		next(item, itemList) {  // Get the next item in the specified item's list, based on item.number and matching parent types
			item = store.get.lookupToItem(item);
			itemList = itemList || store.state[item.type + 's'];
			const idx = itemList.findIndex(el => {
				return el.number === item.number + 1 && el.parent.type === item.parent.type;
			});
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
			if (item && item.type === 'part') {
				item = store.get.step(item.stepID);
			}
			item = store.get.lookupToItem(item);
			while (item && item.type !== 'page' && item.type !== 'titlePage' && item.type !== 'templatePage') {
				item = store.get.parent(item);
			}
			return item;
		},
		submodels() {  // Return list of submodels used in the main model, the step they are first used on and how many are used in that step
			if (!store.model) {
				return [];
			}
			const submodels = [];
			const mainModelFilename = store.model.filename;
			const addedModelNames = new Set([mainModelFilename]);
			store.state.steps.filter(step => {
				return step.parent.type === 'page' && step.model.filename !== mainModelFilename;
			}).forEach(step => {

				if (!addedModelNames.has(step.model.filename)) {
					const modelHierarchy = [{filename: step.model.filename, quantity: 1}];
					let parentStepID = step.model.parentStepID;
					while (parentStepID != null) {
						const parentStep = store.get.step(parentStepID);
						if (parentStep.parts.length > 1) {
							// Check if parent step contains multiple copies of the current submodel; adjust quantity label accordingly
							const partNames = parentStep.parts.map(partID => {
								return LDParse.model.get.partFromID(partID, parentStep.model.filename).filename;
							});
							const count = _.count(partNames, step.model.filename);
							_.last(modelHierarchy).quantity = count;
						}
						modelHierarchy.push({filename: parentStep.model.filename, quantity: 1});
						parentStepID = parentStep.model.parentStepID;
					}
					modelHierarchy.reverse().forEach(entry => {
						if (!addedModelNames.has(entry.filename)) {
							submodels.push({stepID: step.id, ...entry});
							addedModelNames.add(entry.filename);
						}
					});
				}
			});
			return submodels;
		},
		topLevelTreeNodes() {  // Return list of pages & submodels to be drawn in the nav tree
			const nodes = [];
			for (let i = 0; i < store.state.pages.length; i++) {
				nodes.push(store.state.pages[i]);
			}
			store.get.submodels().forEach(submodel => {
				const page = store.get.pageForItem({id: submodel.stepID, type: 'step'});
				const pageIndex = nodes.indexOf(page);
				submodel.type = 'submodel';
				submodel.id = nodes.length;
				_.insert(nodes, submodel, pageIndex);
			});
			return nodes;
		},
		nextItemID(item) {  // Get the next unused ID in this item's list
			if (item && item.type) {
				item = item.type;
			}
			const itemList = store.state[item + 's'];
			if (_.isEmpty(itemList)) {
				return 0;
			}
			return Math.max.apply(null, itemList.map(el => el.id)) + 1;
		},
		lookupToItem(lookup, type) {  // Convert a {type, id} lookup object into the actual item it refers to
			if (lookup == null || (!lookup.type && type == null)) {
				return null;
			}
			if (typeof lookup === 'number' && type != null) {
				lookup = {type, id: lookup};
			}
			if (lookup.parent || lookup.number != null || lookup.steps != null) {
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
			return {type: item.type, id: item.id};
		},
		targetBox(t) {
			const box = {x: t.x, y: t.y, width: t.width, height: t.height};
			if (t.borderOffset) {
				box.x += t.borderOffset.x;
				box.y += t.borderOffset.y;
			}
			if (t.align === 'right') {
				box.x -= box.width;
			}
			if (t.valign === 'bottom') {
				box.y -= box.height;
			} else if (t.valign === 'top') {
				box.y += 5;
			} else if (t.valign === 'hanging') {
				box.y -= 5;
			}
			while (t) {
				if (t.relativeTo) {
					t = store.get.lookupToItem(t.relativeTo);
				} else {
					t = store.get.parent(t);
				}
				if (t) {
					if (t.innerContentOffset) {
						box.x += t.innerContentOffset.x || 0;
						box.y += t.innerContentOffset.y || 0;
					}
					box.x += t.x || 0;
					box.y += t.y || 0;
				}
			}
			return box;
		}
	},
	// TODO: convert all 'opts' arguments into {opts} for automatic destructuring.  duh.
	mutations: {
		item: {
			add(opts) {  // opts: {itemJSON, parent, insertionIndex = -1, parentInsertionIndex = =1}
				const item = opts.item;
				item.id = store.get.nextItemID(item);
				if (store.state.hasOwnProperty(item.type)) {
					store.state[item.type] = item;
				} else {
					_.insert(store.state[item.type + 's'], item, opts.insertionIndex);
				}
				if (opts.parent) {
					const parent = store.get.lookupToItem(opts.parent);
					item.parent = {type: parent.type, id: parent.id};
					if (parent.hasOwnProperty(item.type + 's')) {
						_.insert(parent[item.type + 's'], item.id, opts.parentInsertionIndex);
					} else if (parent.hasOwnProperty(item.type + 'ID')) {
						parent[item.type + 'ID'] = item.id;
					}
				}
				return item;
			},
			delete(opts) {  // opts: {item}
				const item = store.get.lookupToItem(opts.item);
				_.remove(store.state[item.type + 's'], item);
				if (item.parent) {
					const parent = store.get.lookupToItem(item.parent);
					if (parent.hasOwnProperty(item.type + 's')) {
						_.remove(parent[item.type + 's'], item.id);
					} else if (parent.hasOwnProperty(item.type + 'ID')) {
						parent[item.type + 'ID'] = null;
					}
				}
			},
			deleteChildList(opts) {  // opts: {item, listType}
				const item = store.get.lookupToItem(opts.item);
				const list = _.clone(item[opts.listType + 's'] || []);
				const itemType = store.mutations[opts.listType] ? opts.listType : 'item';
				list.forEach(id => {
					const arg = {};
					arg[itemType] = {type: opts.listType, id};
					store.mutations[itemType].delete(arg);
				});
			},
			reparent(opts) {  // opts: {item, newParent, parentInsertionIndex = -1}
				const item = store.get.lookupToItem(opts.item);
				const oldParent = store.get.parent(item);
				const newParent = store.get.lookupToItem(opts.newParent);
				item.parent.id = newParent.id;
				item.parent.type = newParent.type;
				if (oldParent.hasOwnProperty(item.type + 's')) {
					_.remove(oldParent[item.type + 's'], item.id);
				} else if (oldParent.hasOwnProperty(item.type + 'ID')) {
					oldParent[item.type + 'ID'] = null;
				}
				if (newParent.hasOwnProperty(item.type + 's')) {
					_.insert(newParent[item.type + 's'], item.id, opts.parentInsertionIndex);
				} else if (newParent.hasOwnProperty(item.type + 'ID')) {
					newParent[item.type + 'ID'] = item.id;
				}
			},
			reposition(opts) {  // opts: {item or [items], dx, dy}
				const items = Array.isArray(opts.item) ? opts.item : [opts.item];
				items.forEach(item => {
					item.x += opts.dx;
					item.y += opts.dy;
					if (Layout.adjustBoundingBox[item.type]) {
						Layout.adjustBoundingBox[item.type](item);
					}
				});
			}
		},
		part: {
			displace(opts) { // opts: {partID, step, direction, distance = 60, arrowOffset = 0, arrowLength = 35, arrowRotation = 0}.  If direction == null, remove displacement
				const step = store.get.lookupToItem(opts.step);
				delete opts.step;
				store.mutations.csi.resetSize({csi: step.csiID});
				opts.distance = (opts.distance == null) ? 60 : opts.distance;
				opts.arrowOffset = (opts.arrowOffset == null) ? 0 : opts.arrowOffset;
				opts.arrowLength = (opts.arrowLength == null) ? 35 : opts.arrowLength;
				opts.arrowRotation = (opts.arrowRotation == null) ? 0 : opts.arrowRotation;
				step.displacedParts = step.displacedParts || [];
				const idx = step.displacedParts.findIndex(p => p.partID === opts.partID);
				if (opts.direction) {
					if (idx >= 0) {
						step.displacedParts[idx].direction = opts.direction;
						step.displacedParts[idx].distance = opts.distance;
						step.displacedParts[idx].arrowOffset = opts.arrowOffset;
						step.displacedParts[idx].arrowLength = opts.arrowLength;
						step.displacedParts[idx].arrowRotation = opts.arrowRotation;
					} else {
						step.displacedParts.push(opts);
					}
				} else if (idx >= 0) {
					_.removeIndex(step.displacedParts, idx);
				}
				store.mutations.page.layout({page: store.get.pageForItem(step)});  // TODO: no need to layout entire page; can layout just the step containing the newly displaced part
			},
			// TODO: what if a step has zero parts?
			moveToStep(opts) { // opts: {partID, srcStep, destStep, doLayout = false}
				const partID = opts.partID;
				const srcStep = store.get.lookupToItem(opts.srcStep);
				store.mutations.csi.resetSize({csi: srcStep.csiID});
				_.remove(srcStep.parts, partID);

				const destStep = store.get.lookupToItem(opts.destStep);
				store.mutations.csi.resetSize({csi: destStep.csiID});
				destStep.parts.push(partID);
				destStep.parts.sort(_.sort.numeric.ascending);

				if (srcStep.pliID != null && destStep.pliID != null) {
					const destPLI = store.get.pli(destStep.pliID);
					const pli = store.get.pli(srcStep.pliID);
					const pliItems = pli.pliItems.map(i => store.get.pliItem(i));
					const pliItem = pliItems.filter(i => i.partNumbers.includes(partID))[0];

					const target = store.get.matchingPLIItem(destPLI, partID);
					if (target) {
						target.quantity++;
						target.partNumbers.push(partID);
					} else {
						store.mutations.pliItem.add({
							parent: destPLI,
							filename: pliItem.filename,
							partNumbers: [partID],
							colorCode: pliItem.colorCode
						});
					}

					if (pliItem.quantity === 1) {
						store.mutations.pliItem.delete({pliItem});
					} else {
						pliItem.quantity -= 1;
						_.remove(pliItem.partNumbers, partID);
					}
				}

				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(srcStep)});
					if (srcStep.parent.id !== destStep.parent.id) {
						store.mutations.page.layout({page: store.get.pageForItem(destStep)});
					}
				}
			},
			addToCallout(opts) {  // opts: {partID, step, callout, doLayout = false}
				const partID = opts.partID;
				const step = store.get.lookupToItem(opts.step);
				const callout = store.get.lookupToItem(opts.callout);
				let destCalloutStep;
				if (_.isEmpty(callout.steps)) {
					destCalloutStep = store.mutations.step.add({dest: callout});
				} else {
					destCalloutStep = store.get.step(_.last(callout.steps));
				}
				destCalloutStep.model = _.clone(step.model);
				destCalloutStep.parts.push(partID);
				store.mutations.csi.resetSize({csi: destCalloutStep.csiID});
				if (opts.doLayout) {
					store.mutations.page.layout({page: step.parent});
				}
			},
			removeFromCallout(opts) {  // opts: {partID, step}
				const step = store.get.lookupToItem(opts.step);
				_.remove(step.parts, opts.partID);
				store.mutations.csi.resetSize({csi: step.csiID});
				store.mutations.page.layout({page: store.get.pageForItem(step)});
			}
		},
		submodel: {
			convertToCallout(opts) {  // opts: {modelFilename, destStep, doLayout}

				// Create a new callout in the step that this submodel is added to
				const destStep = store.get.lookupToItem(opts.destStep);
				const callout = store.mutations.callout.add({parent: destStep});

				// Move each step in the submodel into the new callout
				const submodelSteps = store.state.steps.filter(step => step.model.filename === opts.modelFilename);

				const pagesToDelete = new Set();
				submodelSteps.forEach((step, stepIdx) => {
					if (step.pliID) {
						store.mutations.pli.delete({
							pli: {type: 'pli', id: step.pliID},
							deleteItems: true
						});
					}
					step.submodelImages.forEach(submodelImageID => {
						store.mutations.submodelImage.delete({
							submodelImage: {type: 'submodelImage', id: submodelImageID}
						});
					});
					pagesToDelete.add(step.parent.id);
					store.mutations.item.reparent({item: step, newParent: callout});
					step.number = stepIdx + 1;
				});

				for (const pageID of pagesToDelete) {
					const page = store.get.page(pageID);
					if (page && !page.steps.length) {
						store.mutations.page.delete({page});
					}
				}
				store.mutations.step.renumber();
				if (opts.doLayout) {
					store.mutations.page.layout({page: destStep.parent});
				}
			}
		},
		csi: {
			add(opts) { // opts: {parent}
				return store.mutations.item.add({item: {
					type: 'csi',
					rotation: null,
					x: null, y: null, width: null, height: null
				}, parent: opts.parent});
			},
			rotate(opts) {  // opts: {csi, rotation: {x, y, z}, addRotateIcon, doLayout = false}
				const csi = store.get.lookupToItem(opts.csi);
				csi.rotation = opts.rotation;
				csi.isDirty = true;
				store.mutations.step.toggleRotateIcon(
					{step: {type: 'step', id: csi.parent.id}, display: opts.addRotateIcon}
				);
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(csi)});
				}
			},
			resetSize(opts) {  // opts: {csi}
				const csi = store.get.lookupToItem(opts.csi, 'csi');
				if (csi) {
					csi.width = csi.height = null;
					csi.isDirty = true;
				}
			}
		},
		submodelImage: {
			add(opts) {  // opts: {parent, modelFilename, quantity}
				const submodelImage = store.mutations.item.add({item: {
					type: 'submodelImage', csiID: null, quantityLabelID: null,
					modelFilename: opts.modelFilename, quantity: opts.quantity || 1,
					x: null, y: null, width: null, height: null
				}, parent: opts.parent});

				store.mutations.csi.add({parent: submodelImage});

				if (opts.quantity > 1) {
					store.mutations.item.add({item: {
						type: 'quantityLabel',
						align: 'right', valign: 'bottom',
						x: null, y: null, width: null, height: null
					}, parent: submodelImage});
				}
				return submodelImage;
			},
			delete(opts) {  // opts: {submodelImage, doLayout}
				const submodelImage = store.get.lookupToItem(opts.submodelImage);
				if (submodelImage.csiID != null) {
					store.mutations.item.delete({item: store.get.csi(submodelImage.csiID)});
				}
				if (submodelImage.quantityLabelID != null) {
					store.mutations.item.delete({item: {type: 'quantityLabel', id: submodelImage.quantityLabelID}});
				}
				store.mutations.item.delete({item: submodelImage});
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(submodelImage)});
				}
			}
		},
		annotation: {
			add(opts) {  // opts: {annotationType, properties, parent}

				const annotation = store.mutations.item.add({item: {
					type: 'annotation',
					annotationType: opts.annotationType,
					x: null, y: null, width: null, height: null
				}, parent: opts.parent});

				opts.properties = opts.properties || {};
				_.copy(annotation, opts.properties);

				// Guarantee some nice defaults
				if (annotation.annotationType === 'label') {
					annotation.text = annotation.text || 'Label';
					annotation.font = annotation.font || '20pt Helvetica';
					annotation.color = annotation.color || 'black';
					annotation.align = 'left';
					annotation.valign = 'top';
					if (opts.properties.text) {
						Layout.label(annotation);
					}
				}
				return annotation;
			},
			set(opts) {  // opts: {annotation, newProperties, doLayout}
				const annotation = store.get.lookupToItem(opts.annotation);
				const props = opts.newProperties || {};
				if (props.text && annotation.annotationType === 'label') {
					annotation.text = props.text;
					Layout.label(annotation);
				}
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(annotation)});
				}
			},
			delete(opts) {  // opts: {annotation}
				store.mutations.item.delete({item: opts.annotation});
			}
		},
		rotateIcon: {
			add(opts) {  // opts: {parent}
				return store.mutations.item.add({item: {
					type: 'rotateIcon',
					x: null, y: null, scale: 1
				}, parent: opts.parent});
			}
		},
		step: {
			add(opts) {  // opts: {dest, doLayout = false, model = null, stepNumber = null, renumber = false, insertionIndex = -1, parentInsertionIndex = -1}

				const dest = store.get.lookupToItem(opts.dest);
				const step = store.mutations.item.add({
					item: {
						type: 'step',
						number: opts.stepNumber, numberLabelID: null,
						parts: [], callouts: [], steps: [], dividers: [], submodelImages: [],
						csiID: null, pliID: null, rotateIconID: null,
						model: opts.model || {filename: null, parentStepID: null},
						x: null, y: null, width: null, height: null, subStepLayout: 'vertical'
					},
					parent: dest,
					insertionIndex: opts.insertionIndex,
					parentInsertionIndex: opts.parentInsertionIndex
				});

				store.mutations.csi.add({parent: step});

				if (dest.type === 'page' || dest.type === 'templatePage') {
					store.mutations.pli.add({parent: step});
				}

				if (opts.stepNumber != null) {
					store.mutations.item.add({item: {
						type: 'numberLabel',
						align: 'left', valign: 'hanging',
						x: null, y: null, width: null, height: null
					}, parent: step});
				}
				if (opts.renumber) {
					store.mutations.step.renumber(step);
				}
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(dest)});
				}
				return step;
			},
			delete(opts) { // opts: {step, doLayout}
				const step = store.get.lookupToItem(opts.step);
				if (step.parts && step.parts.length) {
					throw 'Cannot delete a step with parts';
				}
				if (step.numberLabelID != null) {
					store.mutations.item.delete({item: store.get.numberLabel(step.numberLabelID)});
				}
				if (step.csiID != null) {
					store.mutations.item.delete({item: store.get.csi(step.csiID)});
				}
				if (step.pliID != null) {
					store.mutations.pli.delete({pli: store.get.pli(step.pliID), deleteItems: true});
				}
				store.mutations.item.deleteChildList({item: step, listType: 'callout'});
				store.mutations.item.delete({item: step});
				store.mutations.step.renumber(step);
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(step)});
				}
			},
			renumber(step) {
				step = store.get.lookupToItem(step);
				let stepList;
				if (step && (step.parent.type === 'step' || step.parent.type === 'callout')) {
					// Renumber steps in target callout / parent step
					const parent = store.get.parent(step);
					stepList = parent.steps.map(store.get.step);
				} else {
					// Renumber all base steps across all pages
					stepList = store.state.steps.filter(el => el.parent.type === 'page');
				}
				store.mutations.renumber(stepList);
			},
			layout(opts) {  // opts: {step, box}
				const step = store.get.lookupToItem(opts.step);
				Layout.step.outsideIn(step, opts.box);
			},
			moveToPage(opts) {  // opts: {step, destPage, parentInsertionIndex = 0}
				const step = store.get.lookupToItem(opts.step);
				const currentPage = store.get.parent(step);
				const destPage = store.get.lookupToItem(opts.destPage);
				store.mutations.item.reparent({
					item: step,
					newParent: destPage,
					parentInsertionIndex: opts.parentInsertionIndex || 0
				});
				store.mutations.page.layout({page: currentPage});
				store.mutations.page.layout({page: destPage});
			},
			moveToPreviousPage(opts) {  // opts: {step}
				const step = store.get.lookupToItem(opts.step);
				const destPage = store.get.prevPage(step.parent, false);
				if (destPage) {
					const parentInsertionIndex = destPage.steps.length;
					store.mutations.step.moveToPage({step, destPage, parentInsertionIndex});
				}
			},
			moveToNextPage(opts) {  // opts: {step}
				const step = store.get.lookupToItem(opts.step);
				const destPage = store.get.nextPage(step.parent);
				if (destPage) {
					store.mutations.step.moveToPage({step, destPage, parentInsertionIndex: 0});
				}
			},
			mergeWithStep(opts) {  // opts: {srcStep, destStep}
				// TODO: This crashes if step includes callouts
				const srcStep = store.get.lookupToItem(opts.srcStep);
				const destStep = store.get.lookupToItem(opts.destStep);
				if (!srcStep || !destStep) {
					return;
				}
				_.clone(srcStep.parts).forEach(partID => {
					store.mutations.part.moveToStep({partID, srcStep, destStep, doLayout: false});
				});
				store.mutations.step.delete({step: srcStep});

				const sourcePage = store.get.pageForItem(srcStep);
				const destPage = store.get.pageForItem(destStep);
				store.mutations.page.layout({page: sourcePage});
				if (sourcePage.id !== destPage.id) {
					store.mutations.page.layout({page: destPage});
				}
			},
			addCallout(opts) {  // opts: {step}
				const step = store.get.lookupToItem(opts.step);
				step.callouts = step.callouts || [];
				store.mutations.callout.add({parent: step});
				store.mutations.page.layout({page: store.get.pageForItem(step)});
			},
			addSubStep(opts) {  // opts: {step, doLayout}
				const step = store.get.lookupToItem(opts.step);
				const newStep = store.mutations.step.add({
					dest: step, stepNumber: 1, doLayout: false, renumber: false
				});
				newStep.pliID = null;
				store.mutations.item.reparent({
					item: store.get.csi(step.csiID),
					newParent: newStep
				});
				newStep.parts = _.clone(step.parts);
				newStep.model = _.clone(step.model);
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(step)});
				}
			},
			setSubStepLayout(opts) {  // opts: {step, layout, doLayout}
				const step = store.get.lookupToItem(opts.step);
				step.subStepLayout = opts.layout;
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(step)});
				}
			},
			toggleRotateIcon(opts) { // opts: {step, display}
				const step = store.get.lookupToItem(opts.step);
				if (opts.display) {
					store.mutations.rotateIcon.add({parent: step});
				} else if (!opts.display && step.rotateIconID != null) {
					store.mutations.item.delete({item: {type: 'rotateIcon', id: step.rotateIconID}});
				}
			},
			copyRotation(opts) {  // {step, nextXSteps, rotation}  Copy step's CSI rotation to next X steps
				const step = store.get.lookupToItem(opts.step);
				let csi, nextStep = step;
				for (let i = 0; i < opts.nextXSteps; i++) {
					if (nextStep) {
						nextStep = store.get.nextStep(nextStep);
					}
					if (nextStep) {
						csi = store.get.csi(nextStep.csiID);
						if (csi) {
							csi.isDirty = true;
							csi.rotation = opts.rotation;
						}
					}
				}
			}
		},
		callout: {
			add(opts) {  // opts: {parent}
				const pageSize = store.state.template.page;
				const callout = store.mutations.item.add({item: {
					type: 'callout',
					steps: [], calloutArrows: [],
					x: null, y: null, width: null, height: null,
					layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical'
				}, parent: opts.parent});

				store.mutations.calloutArrow.add({parent: callout});
				return callout;
			},
			delete(opts) {  // opts: {callout}
				const item = store.get.lookupToItem(opts.callout);
				store.mutations.item.deleteChildList({item, listType: 'calloutArrow'});
				store.mutations.item.deleteChildList({item, listType: 'step'});
				store.mutations.item.delete({item});
			},
			addStep(opts) {  // opts: {callout, doLayout = false}
				const callout = store.get.lookupToItem(opts.callout);
				const stepNumber = callout.steps.length > 0 ? callout.steps.length + 1 : null;
				const newStep = store.mutations.step.add({dest: callout, stepNumber});
				if (callout.steps.length > 1) {
					newStep.model = _.clone(store.get.step(callout.steps[0])).model;
				} else {
					newStep.model = _.clone(store.get.step(callout.parent));
				}
				if (stepNumber === 2) {  // Special case: callouts with one step have no step numbers; turn on step numbers when adding a 2nd step
					const firstStep = store.get.step(callout.steps[0]);
					firstStep.number = 1;
					store.mutations.item.add({item: {
						type: 'numberLabel',
						align: 'left', valign: 'top',
						x: null, y: null, width: null, height: null
					}, parent: firstStep});
				}
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(callout)});
				}
			}
		},
		calloutArrow: {
			add(opts) {  // opts: {parent}
				const arrow = store.mutations.item.add({item: {
					type: 'calloutArrow', points: [], direction: 'right'
				}, parent: opts.parent});

				store.mutations.item.add({item: {
					type: 'point', x: 0, y: 0
				}, parent: arrow});

				store.mutations.item.add({item: {
					type: 'point', x: 0, y: 0
				}, parent: arrow});

				return arrow;
			},
			delete(opts) {  // opts: {calloutArrow}
				const item = opts.calloutArrow;
				store.mutations.item.deleteChildList({item, listType: 'point'});
				store.mutations.item.delete({item});
			},
			addPoint(opts) { // opts: {calloutArrow, doLayout}
				const arrow = store.get.calloutArrow(opts.calloutArrow);
				const callout = store.get.parent(arrow);
				const parentInsertionIndex = Math.ceil(arrow.points.length / 2);
				const arrowPoints = store.get.calloutArrowToPoints(arrow);
				const p1 = arrowPoints[parentInsertionIndex - 1];
				const p2 = arrowPoints[parentInsertionIndex];
				const midpoint = _.geom.midpoint(p1, p2);
				midpoint.x -= callout.x;
				midpoint.y -= callout.y;
				store.mutations.item.add({
					item: {type: 'point', ...midpoint},
					parent: arrow,
					parentInsertionIndex
				});
			},
			rotateTip(opts) {  // opts: {calloutArrow, direction}
				store.get.calloutArrow(opts.calloutArrow).direction = opts.direction;
			}
		},
		page: {
			add(opts = {}) {  // opts: {pageNumber, pageType = 'page', insertionIndex = -1}
				const pageSize = store.state.template.page;
				const pageType = opts.pageType || 'page';
				const page = store.mutations.item.add({item: {
					type: pageType,
					steps: [], dividers: [], annotations: [],
					needsLayout: true, locked: false,
					number: opts.pageNumber,
					numberLabelID: null,
					layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical'
				}, insertionIndex: opts.insertionIndex});

				if (opts.pageNumber === 'id') {  // Special flag to say 'use page ID as page number'
					page.number = page.id + 1;
				}

				if (opts.pageNumber != null) {
					store.mutations.item.add({item: {
						type: 'numberLabel',
						align: 'right', valign: 'bottom',
						x: null, y: null, width: null, height: null
					}, parent: page});
				}

				if (pageType === 'page') {
					store.mutations.page.renumber();
				}
				return page;
			},
			delete(opts) {  // opts: {page}
				const page = store.get.lookupToItem(opts.page);
				if (page.steps && page.steps.length) {
					throw 'Cannot delete a page with steps';
				}
				if (page.numberLabelID != null) {
					store.mutations.item.delete({item: store.get.numberLabel(page.numberLabelID)});
				}
				store.mutations.item.delete({item: page});
				store.mutations.page.renumber();
			},
			setLocked(opts) {  // opts: {page, locked}
				const page = store.get.lookupToItem(opts.page);
				if (page) {
					page.locked = opts.locked;
				}
			},
			renumber() {
				store.mutations.renumber(store.state.pages);
			},
			layout(opts) {  // opts: {page, layout}, layout = 'horizontal' or 'vertical' or {rows, cols}
				const page = store.get.lookupToItem(opts.page);
				Layout.page(page, opts.layout || page.layout);
			},
			setDirty(opts) {  // opts: {includeTitlePage}
				store.state.pages.forEach(p => (p.needsDrawing = true));
				if (opts && opts.includeTitlePage && store.state.titlePage) {
					store.state.titlePage.needsDrawing = true;
				}
			}
		},
		divider: {
			add(opts) {  // opts: {parent, p1, p2}
				return store.mutations.item.add({item: {
					type: 'divider', p1: opts.p1, p2: opts.p2
				}, parent: opts.parent});
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
			add(opts) { // opts: {parent, filename, colorCode, partNumbers}
				const pliItem = store.mutations.item.add({item: {
					type: 'pliItem',
					filename: opts.filename,
					partNumbers: opts.partNumbers,
					colorCode: opts.colorCode,
					quantity: 1, quantityLabelID: null,
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
			}
		},
		templatePage: {
			async add() {
				const modelData = store.state.template.modelData;
				if (!(modelData.model.filename in LDParse.partDictionary)) {
					LDParse.partDictionary[modelData.model.filename] = modelData.model;
				}
				if (!(modelData.part1.filename in LDParse.partDictionary)) {
					await LDParse.loadRemotePart(modelData.part1.filename, true);
				}
				if (!(modelData.part2.filename in LDParse.partDictionary)) {
					await LDParse.loadRemotePart(modelData.part2.filename, true);
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
				[modelData.part1, modelData.part2].forEach((p, idx) => {
					store.mutations.pliItem.add({
						parent: pli, partNumbers: [idx],
						filename: p.filename, colorCode: p.colorCode
					});
				});
				step.displacedParts = [{partID: 1, direction: 'up'}];

				const callout = store.mutations.callout.add({parent: step});
				store.mutations.part.addToCallout({partID: 0, step, callout});
				store.mutations.callout.addStep({callout});
				store.mutations.part.addToCallout({partID: 1, step, callout});
				callout.steps.forEach(s => {
					store.get.step(s).model.filename = modelData.model.filename;
				});
			},
			set(opts) {  // opts: {entry, value}
				const entry = _.get(opts.entry, store.state.template);
				_.copy(entry, opts.value);
			},
			load(opts) {  // opts: {template}
				store.state.template = opts.template;
			},
			reset() {
				store.state.template = _.clone(defaultTemplate);
				store.state.templatePage.needsLayout = true;
			},
			setPageSize(opts) {  // opts: {width, height}
				store.state.template.page.width = opts.width;
				store.state.template.page.height = opts.height;
				store.state.templatePage.needsLayout = true;
				if (store.state.titlePage) {
					store.state.titlePage.needsLayout = true;
				}
				store.state.pages.forEach(p => {
					p = store.get.lookupToItem(p);
					p.needsLayout = true;
				});
			}
		},
		renumber(itemList) {
			let prevNumber;
			itemList.forEach(el => {
				if (el && el.number != null) {
					if (prevNumber == null && el.number > 1) {
						el.number = 1;
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

			const page = store.state.titlePage = store.mutations.page.add({pageType: 'titlePage'});

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
		},
		addInitialPages(opts) {  // opts: {modelFilename,  lastStepNumber}

			opts = opts || {};
			const lastStepNumber = opts.lastStepNumber || {num: opts.lastStepNumber || 1};  // Object so it can be modified recursively
			const modelFilename = opts.modelFilename || store.model.filename;
			const localModel = LDParse.model.get.part(modelFilename);

			if (!localModel.steps) {
				const submodels = LDParse.model.get.submodels(localModel);
				if (submodels.some(p => p.steps && p.steps.length)) {
					// If main model contains no steps but contains submodels that contain steps, add one step per part in main model.
					localModel.steps = localModel.parts.map((p, idx) => ({parts: [idx]}));
				} else {
					return null;  // No steps; can't add any pages.  TODO: big complicated automatic step insertion algorithm goes here.
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
						target.partNumbers.push(partID);
					} else {
						store.mutations.pliItem.add({
							parent: pli,
							filename: part.filename,
							colorCode: part.colorCode,
							partNumbers: [partID]
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
		mergeInitialPages() {
			let stepSet = [], prevModelName;
			store.state.steps.filter(step => {
				return step.parent.type === 'page';
			}).forEach(step => {
				if (!prevModelName || prevModelName === step.model.filename) {
					stepSet.push(step);
				} else {
					Layout.mergeSteps(stepSet);
					stepSet = [step];
				}
				prevModelName = step.model.filename;
			});
			if (stepSet.length > 1) {
				Layout.mergeSteps(stepSet);  // Be sure to merge last set of step in the book
			}
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

module.exports = store;

Layout = require('./Layout');
