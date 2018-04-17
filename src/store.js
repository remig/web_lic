/* global saveAs: false */
'use strict';

const util = require('./util');
const LDParse = require('./LDParse');
const LDRender = require('./LDRender');
const template = require('./template.js');

// Load this later, to avoid circular import issues (layout.js is just code that belongs in store moved to a dedicated file)
let Layout;  // eslint-disable-line prefer-const

const emptyState = {
	template: template,
	titlePage: null,
	plisVisible: true,
	pages: [],
	pageNumbers: [],
	dividers: [],
	steps: [],
	stepNumbers: [],
	csis: [],
	plis: [],
	pliItems: [],
	pliQtys: [],  // TODO: rename this to more generic 'quantityLabel', useful in multiple spots (pliItem, submodelImage, steps, etc)
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
			const container = document.createElement('canvas');
			container.setAttribute('id', domID);
			container.setAttribute('class', 'offscreen');
			document.getElementById('canvasHolder').appendChild(container);
			return container;
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
						if (util.isEmpty(partList)) {
							return null;
						}
						const config = {
							partList,
							selectedPartIDs,
							resizeContainer: true,
							displacedParts: step.displacedParts,
							rotation: csi.rotation
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
					rotation: csi.rotation
				};
				const container = document.getElementById('generateImagesCanvas');
				const offset = LDRender.renderAndDeltaSelectedPart(localModel, container, 1000 * scale, config);
				return {width: container.width, height: container.height, dx: offset.dx, dy: offset.dy, container};
			},
			pli(part, scale = 1) {
				const domID = `PLI_${part.filename}_${part.colorCode}`;
				let container = document.getElementById(domID);
				if (!container) {
					container = getCanvas(domID);
					LDRender.renderPart(part, container, 1000 * scale, {resizeContainer: true});
				}
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
			let itemList;
			if (step.parent.type === 'callout') {
				itemList = store.get.callout(step.parent.id).steps.map(store.get.step);
			}
			let prevStep = store.get.prev(step, itemList);
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
		calloutArrowToPoints(arrow) {
			const points = arrow.points.map(store.get.point);
			const tip = points[points.length - 1];

			const base = {x: tip.x, y: tip.y};
			const direction = arrow.direction;
			base.x += (direction === 'right') ? -24 : (direction === 'left') ? 24 : 0;  // TODO: abstract callout arrow dimension... somewhere...
			base.y += (direction === 'down') ? -24 : (direction === 'up') ? 24 : 0;

			return [...points.slice(0, -1), base, tip];
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
			if (item && item.type) {
				item = item.type;
			}
			const itemList = store.state[item + 's'];
			return itemList.length ? Math.max.apply(null, itemList.map(el => el.id)) + 1 : 0;
		},
		lookupToItem(lookup, type) {  // Convert a {type, id} lookup object into the actual item it refers to
			if (lookup == null || (!lookup.type && type == null)) {
				return null;
			}
			if (typeof lookup === 'number' && type != null) {
				lookup = {type, id: lookup};
			}
			if (lookup.parent || lookup.number != null) {
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
	// TODO: convert all 'opts' arguments into {opts} for automatic destructuring.  duh.
	mutations: {
		item: {
			add(opts) {  // opts: {itemJSON, parent, insertionIndex = -1, parentInsertionIndex = =1}
				const item = opts.item;
				item.id = store.get.nextItemID(item);
				util.array.insert(store.state[item.type + 's'], item, opts.insertionIndex);
				if (opts.parent) {
					const parent = store.get.lookupToItem(opts.parent);
					item.parent = {type: parent.type, id: parent.id};
					if (parent.hasOwnProperty(item.type + 's')) {
						util.array.insert(parent[item.type + 's'], item.id, opts.parentInsertionIndex);
					} else if (parent.hasOwnProperty(item.type + 'ID')) {
						parent[item.type + 'ID'] = item.id;
					} else if (parent.hasOwnProperty('numberLabel') && item.type.endsWith('Number')) {
						parent.numberLabel = item.id;
					}
				}
				return item;
			},
			delete(opts) {  // opts: {item}
				const item = store.get.lookupToItem(opts.item);
				util.array.remove(store.state[item.type + 's'], item);
				if (item.parent) {
					const parent = store.get.lookupToItem(item.parent);
					if (parent.hasOwnProperty(item.type + 's')) {
						util.array.remove(parent[item.type + 's'], item.id);
					} else if (parent.hasOwnProperty(item.type + 'ID')) {
						parent[item.type + 'ID'] = null;
					} else if (parent.hasOwnProperty('numberLabel') && item.type.endsWith('Number')) {
						parent.numberLabel = null;
					}
				}
			},
			deleteChildList(opts) {  // opts: {item, listType}
				const item = store.get.lookupToItem(opts.item);
				const list = util.clone(item[opts.listType + 's'] || []);
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
				util.array.remove(oldParent[item.type + 's'], item.id);
				util.array.insert(newParent[item.type + 's'], item.id, opts.parentInsertionIndex);
			},
			reposition(opts) {  // opts: {item or [items], dx, dy}
				const items = Array.isArray(opts.item) ? opts.item : [opts.item];
				items.forEach(item => {
					item.x += opts.dx;
					item.y += opts.dy;
				});
			}
		},
		part: {
			displace(opts) { // opts: {partID, step, direction, distance = 60, arrowOffset = 0}.  If direction == null, remove displacement
				const step = store.get.lookupToItem(opts.step);
				delete opts.step;
				store.mutations.csi.resetSize({csi: step.csiID});
				opts.distance = (opts.distance == null) ? 60 : opts.distance;
				opts.arrowOffset = (opts.arrowOffset == null) ? 0 : opts.arrowOffset;
				step.displacedParts = step.displacedParts || [];
				const idx = step.displacedParts.findIndex(p => p.partID === opts.partID);
				if (opts.direction) {
					if (idx >= 0) {
						step.displacedParts[idx].direction = opts.direction;
						step.displacedParts[idx].distance = opts.distance;
						step.displacedParts[idx].arrowOffset = opts.arrowOffset;
					} else {
						step.displacedParts.push(opts);
					}
				} else if (idx >= 0) {
					util.array.removeIndex(step.displacedParts, idx);
				}
				store.mutations.page.layout({page: store.get.pageForItem(step)});  // TODO: no need to layout entire page; can layout just the step containing the newly displaced part
			},
			// TODO: what if a step has zero parts?
			moveToStep(opts) { // opts: {partID, srcStep, destStep, doLayout = false}
				const partID = opts.partID;
				const srcStep = store.get.lookupToItem(opts.srcStep);
				store.mutations.csi.resetSize({csi: srcStep.csiID});
				util.array.remove(srcStep.parts, partID);

				const destStep = store.get.lookupToItem(opts.destStep);
				store.mutations.csi.resetSize({csi: destStep.csiID});
				destStep.parts.push(partID);
				destStep.parts.sort(util.sort.numeric.ascending);

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
						const newItem = store.mutations.item.add({item: {
							type: 'pliItem',
							filename: pliItem.filename,
							partNumbers: [partID],
							colorCode: pliItem.colorCode,
							quantity: 1, pliQtyID: null,
							x: null, y: null, width: null, height: null
						}, parent: destPLI});

						store.mutations.item.add({item: {
							type: 'pliQty',
							x: null, y: null, width: null, height: null
						}, parent: newItem});
					}

					if (pliItem.quantity === 1) {
						store.mutations.pliItem.delete({pliItem});
					} else {
						pliItem.quantity -= 1;
						util.array.remove(pliItem.partNumbers, partID);
					}
				}

				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(srcStep)});
					if (srcStep.parent.id !== destStep.parent.id) {
						store.mutations.page.layout({page: store.get.pageForItem(destStep)});
					}
				}
			},
			addToCallout(opts) {  // opts: {partID, step, callout}
				const partID = opts.partID;
				const step = store.get.lookupToItem(opts.step);
				const callout = store.get.lookupToItem(opts.callout);
				let destCalloutStep;
				if (util.isEmpty(callout.steps)) {
					destCalloutStep = store.mutations.step.add({dest: callout});
				} else {
					destCalloutStep = store.get.step(callout.steps[callout.steps.length - 1]);
				}
				destCalloutStep.submodel = util.clone(step.submodel);
				destCalloutStep.parts.push(partID);
				store.mutations.csi.resetSize({csi: destCalloutStep.csiID});
				store.mutations.page.layout({page: step.parent});
			},
			removeFromCallout(opts) {  // opts: {partID, step}
				const step = store.get.lookupToItem(opts.step);
				util.array.remove(step.parts, opts.partID);
				store.mutations.csi.resetSize({csi: step.csiID});
				store.mutations.page.layout({page: store.get.pageForItem(step)});
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
			rotate(opts) {  // opts: {csi, rotation: {x, y, z}, addRotateIcon, copyToNextXSteps}
				const csi = store.get.lookupToItem(opts.csi);
				csi.rotation = opts.rotation;
				csi.isDirty = true;
				store.mutations.step.toggleRotateIcon(
					{step: {type: 'step', id: csi.parent.id}, display: opts.addRotateIcon}
				);
				store.mutations.page.layout({page: store.get.pageForItem(csi)});
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
			add(opts) {  // opts: {parent, submodel, quantity}
				const item = store.mutations.item.add({item: {
					type: 'submodelImage', pliQtyID: null,
					submodel: opts.submodel, quantity: opts.quantity || 1,
					x: null, y: null, width: null, height: null, contentX: null, contentY: null
				}, parent: opts.parent});

				if (opts.quantity > 1) {
					store.mutations.item.add({item: {
						type: 'pliQty',
						align: 'right', valign: 'bottom',
						x: null, y: null, width: null, height: null
					}, parent: item});
				}
				return item;
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
				Object.entries(opts.properties).forEach(([k, v]) => (annotation[k] = v));  // Copy passed in props to annotation

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
			add(opts) {  // opts: {dest, doLayout = false, stepNumber = null, renumber = false, insertionIndex = -1, parentInsertionIndex = -1}

				const dest = store.get.lookupToItem(opts.dest);
				const step = store.mutations.item.add({
					item: {
						type: 'step',
						number: opts.stepNumber, numberLabel: null,
						parts: [], callouts: [], submodel: [],
						csiID: null, pliID: null, rotateIconID: null, submodelImageID: null,
						x: null, y: null, width: null, height: null
					},
					parent: dest,
					insertionIndex: opts.insertionIndex,
					parentInsertionIndex: opts.parentInsertionIndex
				});

				store.mutations.csi.add({parent: step});

				store.mutations.pli.add({parent: step});

				if (opts.stepNumber != null) {
					store.mutations.item.add({item: {
						type: 'stepNumber',
						align: 'left', valign: 'top',
						x: null, y: null, width: null, height: null
					}, parent: step});
				}
				if (opts.renumber) {
					store.mutations.step.renumber();
				}
				if (opts.doLayout) {
					store.mutations.page.layout({page: store.get.pageForItem(dest)});
				}
				return step;
			},
			delete(opts) { // opts: {step}
				const step = store.get.lookupToItem(opts.step);
				if (step.parts && step.parts.length) {
					throw 'Cannot delete a step with parts';
				}
				if (step.numberLabel != null) {
					store.mutations.item.delete({item: store.get.stepNumber(step.numberLabel)});
				}
				if (step.csiID != null) {
					store.mutations.item.delete({item: store.get.csi(step.csiID)});
				}
				if (step.pliID != null) {
					store.mutations.pli.delete({pli: store.get.pli(step.pliID), deleteItems: true});
				}
				store.mutations.item.deleteChildList({item: step, listType: 'callout'});
				store.mutations.item.delete({item: step});
				store.mutations.step.renumber();
			},
			renumber() {
				store.mutations.renumber('step');
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
				const srcStep = store.get.lookupToItem(opts.srcStep);
				const destStep = store.get.lookupToItem(opts.destStep);
				if (!srcStep || !destStep) {
					return;
				}
				util.clone(srcStep.parts).forEach(partID => {
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
				const pageSize = store.state.template.page;
				step.callouts = step.callouts || [];
				store.mutations.item.add({item: {
					type: 'callout',
					x: null, y: null, width: null, height: null,
					steps: [], calloutArrows: [],
					layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical',
					id: store.get.nextItemID('callout')
				}, parent: step});
				store.mutations.page.layout({page: store.get.pageForItem(step)});
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
			delete(opts) {  // opts: {callout}
				const item = store.get.lookupToItem(opts.callout);
				store.mutations.item.deleteChildList({item, listType: 'calloutArrow'});
				store.mutations.item.deleteChildList({item, listType: 'step'});
				store.mutations.item.delete({item});
			},
			addStep(opts) {  // opts: {callout, doLayout = false}
				const callout = store.get.lookupToItem(opts.callout);
				const stepNumber = callout.steps.length > 0 ? callout.steps.length + 1 : null;
				store.mutations.step.add({dest: callout, stepNumber});
				if (stepNumber === 2) {  // Special case: callouts with one step have no step numbers; turn on step numbers when adding a 2nd step
					const firstStep = store.get.step(callout.steps[0]);
					firstStep.number = 1;
					store.mutations.item.add({item: {
						type: 'stepNumber',
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
			delete(opts) {  // opts: {calloutArrow}
				const item = opts.calloutArrow;
				store.mutations.item.deleteChildList({item, listType: 'point'});
				store.mutations.item.delete({item});
			},
			addPoint(opts) { // opts: {calloutArrow, doLayout}
				const arrow = store.get.calloutArrow(opts.calloutArrow);
				const parentInsertionIndex = Math.ceil(arrow.points.length / 2);
				const p1 = store.get.point(arrow.points[parentInsertionIndex - 1]);
				const p2 = store.get.point(arrow.points[parentInsertionIndex]);
				const midpoint = util.geom.midpoint(p1, p2);
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
			add(opts = {}) {  // opts: {pageNumber, insertionIndex = -1}
				const pageSize = store.state.template.page;
				const page = {
					type: 'page',
					number: opts.pageNumber,
					steps: [],
					dividers: [],
					annotations: [],
					needsLayout: true,
					numberLabel: null,
					layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical',
					id: store.get.nextItemID('page')
				};
				util.array.insert(store.state.pages, page, opts.insertionIndex);

				store.mutations.item.add({item: {
					type: 'pageNumber',
					align: 'right', valign: 'bottom',
					x: null, y: null, width: null, height: null
				}, parent: page});

				store.mutations.page.renumber();
				return page;
			},
			delete(opts) {  // opts: {page}
				const page = store.get.lookupToItem(opts.page);
				if (page.steps && page.steps.length) {
					throw 'Cannot delete a page with steps';
				}
				if (page.numberLabel != null) {
					store.mutations.item.delete({item: store.get.pageNumber(page.numberLabel)});
				}
				store.mutations.item.delete({item: page});
				store.mutations.page.renumber();
			},
			renumber() {
				store.mutations.renumber('page');
			},
			layout(opts) {  // opts: {page, layout}, layout = 'horizontal' or 'vertical' or {rows, cols}
				const page = store.get.lookupToItem(opts.page);
				Layout.page(page, opts.layout || page.layout);
			}
		},
		pli: {
			add(opts) {  // opts: {parent}
				return store.mutations.item.add({item: {
					type: 'pli',
					pliItems: [],
					x: null, y: null, width: null, height: null
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
			delete(opts) {  // opts: {pliItem}
				const pliItem = store.get.lookupToItem(opts.pliItem);
				store.mutations.item.delete({item: {type: 'pliQty', id: pliItem.pliQtyID}});
				store.mutations.item.delete({item: pliItem});
			}
		},
		renumber(type) {
			let prevNumber;
			store.state[type + 's'].forEach(el => {
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

			const addItem = store.mutations.item.add;
			const page = store.state.titlePage = {
				id: 0,
				type: 'titlePage',
				steps: [],
				needsLayout: true,
				annotations: []
			};

			const step = addItem({item: {
				type: 'step',
				csiID: null, pliID: null,
				x: null, y: null, width: null, height: null
			}, parent: page});

			store.mutations.csi.add({parent: step});

			store.mutations.annotation.add({
				annotationType: 'label',
				properties: {
					text: store.get.modelName(true),
					font: '20pt Helvetica',
					color: 'black'
				},
				parent: page
			});

			const partCount = LDParse.model.get.partCount(store.model);
			const pageCount = store.get.pageCount();
			store.mutations.annotation.add({
				annotationType: 'label',
				properties: {
					text: `${partCount} Parts, ${pageCount} Pages`,
					font: '16pt Helvetica',
					color: 'black'
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
		addInitialPages(opts) {  // opts: {layoutChoices, localModelIDList = [], submodelQuantity}

			opts = opts || {};
			const localModelIDList = opts.localModelIDList || [];  // Array of submodel IDs used to traverse the submodel tree
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

			const addItem = store.mutations.item.add;
			const pagesAdded = [];

			localModel.steps.forEach(modelStep => {

				const parts = util.clone(modelStep.parts || []);
				const submodels = parts.filter(p => LDParse.partDictionary[localModel.parts[p].filename].isSubModel);
				const submodelsByQuantity = {};
				submodels.forEach(submodel => {
					const filename = localModel.parts[submodel].filename;
					submodelsByQuantity[filename] = submodelsByQuantity[filename] || {id: submodel, quantity: 0};
					submodelsByQuantity[filename].quantity++;
				});

				Object.values(submodelsByQuantity).forEach(entry => {
					store.mutations.addInitialPages({
						layoutChoices: opts.layoutChoices,
						localModelIDList: localModelIDList.concat(entry.id),
						submodelQuantity: entry.quantity
					});
				});

				const page = store.mutations.page.add();
				pagesAdded.push(page.id);
				page.number = page.id + 1;

				const step = store.mutations.step.add({
					dest: page, doLayout: false, stepNumber: 0
				});
				step.parts = parts;
				step.submodel = util.clone(localModelIDList);
				step.number = step.id + (store.state.titlePage ? 0 : 1);

				if (opts.submodelQuantity != null) {
					store.mutations.submodelImage.add({
						parent: step,
						submodel: util.clone(localModelIDList),
						quantity: opts.submodelQuantity
					});
					opts.submodelQuantity = null;
				}

				const pli = store.get.pli(step.pliID);

				parts.forEach(partID => {

					const part = localModel.parts[partID];
					if (LDParse.partDictionary[localModel.parts[partID].filename].isSubModel) {  // TODO: checking if a part is a submodel is horrendously ugly
						return;  // Don't create PLI items for submodels
					}

					const target = store.get.matchingPLIItem(pli, partID);
					if (target) {
						target.quantity++;
						target.partNumbers.push(partID);
					} else {
						// TODO: rewrite this using store.mutation.foo.add instead of creating item objects directly
						const pliItem = addItem({item: {
							type: 'pliItem',
							filename: part.filename,
							partNumbers: [partID],
							colorCode: part.colorCode,
							quantity: 1, pliQtyID: null,
							x: null, y: null, width: null, height: null
						}, parent: pli});

						addItem({item: {
							type: 'pliQty',
							align: 'left', valign: 'top',
							x: null, y: null, width: null, height: null
						}, parent: pliItem});
					}
				});
			});

			if (opts.layoutChoices && opts.layoutChoices.useMaxSteps) {
				Layout.mergePages(pagesAdded);
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
