/* global Vue: false, Split: false, */
'use strict';

const util = require('./util');
const store = require('./store');
const undoStack = require('./undoStack');
const LDParse = require('./LDParse');
const LDRender = require('./LDRender');
const Menu = require('./menu');
const ContextMenu = require('./contextMenu');
require('./tree');
require('./dialog');

const version = require('../package.json').version;

Vue.config.performance = false;

Vue.filter('sanitizeMenuID', id => {
	if (!id || id === 'separator' || typeof id !== 'string') {
		return null;
	}
	return id.toLowerCase()
		.replace('(nyi)', '')
		.trim()
		.replace(/\s/g, '_')
		.replace(/[^a-z_]/g, '') + '_menu';
});

Vue.filter('prettyPrint', util.prettyPrint);

const app = new Vue({
	el: '#container',
	data: {  // Store any transient UI state data here.  Do *not* store state items here; Vue turns these into observers
		currentPageLookup: null,
		selectedItemLookup: null,
		statusText: '',
		busyText: '',
		contextMenu: null,
		filename: null,
		currentDialog: null,
		dirtyState: {
			undoIndex: 0,
			lastSaveIndex: 0
		},
		pageSize: {
			width: store.state.pageSize.width,
			height: store.state.pageSize.height
		},
		treeUpdateState: false,  // Not used directly, only used to force the tree to redraw
		menuUpdateState: false   // Not used directly, only used to force the tree to redraw
	},
	methods: {
		importRemoteModel(url) {
			this.importModel(() => LDParse.loadRemotePart(url));
		},
		importLocalModel(content, filename) {
			this.importModel(() => LDParse.loadPartContent(content, filename));
		},
		importModel(modelGenerator) {

			const start = Date.now();
			if (store.model) {
				this.closeModel();
			}
			this.busyText = 'Loading Model';
			modelGenerator().then(model => {
				store.setModel(model);
				this.filename = store.model.filename;
				LDRender.setPartDictionary(LDParse.partDictionary);

				this.currentDialog = 'importModelDialog';

				Vue.nextTick(() => {
					const dialog = app.$refs.currentDialog;
					dialog.hasSteps = true;
					dialog.stepsPerPage = 1;
					dialog.useMaxSteps = true;
					dialog.includeTitlePage = false;
					dialog.includePartListPage = false;
					dialog.includePLIs = true;
					dialog.show({x: 400, y: 150});
					dialog.$off();
					dialog.$on('ok', layoutChoices => {

						// TODO: laying out multiple steps per page can be slow.  Show a progress bar for this.
						store.mutations.pli.toggleVisibility({visible: layoutChoices.includePLIs});
						store.mutations.addInitialPages({layoutChoices});  // Add pages before title page so title page summary label comes out correct
						if (layoutChoices.includeTitlePage) {
							store.mutations.addTitlePage();
						}
						store.save('localStorage');

						this.currentPageLookup = store.get.itemToLookup(store.get.titlePage() || store.get.firstPage());
						undoStack.saveBaseState();
						this.forceUIUpdate();

						const time = util.formatTime(start, Date.now());
						this.updateProgress({clear: true});
						this.statusText = `"${store.get.modelFilename()}" loaded successfully (${time})`;
						Vue.nextTick(this.drawCurrentPage);
					});
				});

			});
		},
		openLicFile(content) {
			const start = Date.now();
			store.load(content);
			this.filename = store.model.filename;
			this.pageSize.width = store.state.pageSize.width;
			this.pageSize.height = store.state.pageSize.height;
			const firstPage = store.get.titlePage() || store.get.firstPage();
			this.currentPageLookup = store.get.itemToLookup(firstPage);
			store.save('localStorage');
			undoStack.saveBaseState();
			this.clearSelected();
			const time = util.formatTime(start, Date.now());
			this.statusText = `"${this.filename}" openend successfully (${time})`;
			Vue.nextTick(() => {
				this.drawCurrentPage();
				this.forceUIUpdate();
			});
		},
		save() {
			store.save('file');
			this.dirtyState.lastSaveIndex = undoStack.getIndex();
		},
		triggerModelImport(e) {
			const reader = new FileReader();
			reader.onload = (filename => {
				return e => {
					this.importLocalModel(e.target.result, filename);
				};
			})(e.target.files[0].name);
			reader.readAsText(e.target.files[0]);
			e.target.value = '';
		},
		triggerOpenFile(e) {
			const reader = new FileReader();
			reader.onload = e => {
				this.openLicFile(JSON.parse(e.target.result));
			};
			reader.readAsText(e.target.files[0]);
			e.target.value = '';
		},
		closeModel() {
			store.model = null;
			store.resetState();
			undoStack.clear();
			this.clearState();
			util.emptyNode(document.getElementById('canvasHolder'));
			Vue.nextTick(() => {
				this.clearSelected();
				this.clearPageCanvas();
			});
		},
		setCurrentPage(page) {
			if (!util.itemEq(page, this.currentPageLookup.type)) {
				this.clearSelected();
				this.currentPageLookup = store.get.itemToLookup(page);
			}
			Vue.nextTick(this.drawCurrentPage);
		},
		setSelected(target) {
			if (util.itemEq(target, this.selectedItemLookup)) {
				return;
			}
			if (target.type === 'part') {
				this.selectedItemLookup = target;
				this.drawCurrentPage();
			} else {
				this.clearSelected();
				const targetPage = store.get.pageForItem(target);
				if (targetPage && !util.itemEq(targetPage, this.currentPageLookup)) {
					this.setCurrentPage(targetPage);
				}
				this.selectedItemLookup = store.get.itemToLookup(target);
			}
		},
		clearSelected() {
			const selItem = this.selectedItemLookup;
			this.selectedItemLookup = null;
			if (selItem && selItem.type === 'part') {
				this.drawCurrentPage();
			}
		},
		updateProgress: (() => {
			let progress = 0, count = 0, text = '';
			return function(opts) {
				if (opts == null) {
					progress++;
				} else if (typeof opts === 'string') {
					progress++;
					text = opts;
				} else {
					if (opts.stepCount) {
						count = opts.stepCount;
					}
					if (opts.clear) {
						this.busyText = text = '';
						progress = count = 0;
					}
					if (opts.text) {
						text = opts.text;
					}
				}
				// This gets called several times a second, as long-lived processes progress.  Vue's reactivity is too slow and resource intensive to use here.
				const bar = document.getElementById('progressbar');
				const pct = Math.floor(progress / count * 100) || 0;
				bar.style.width = `${pct}%`;
				bar.innerText = text || bar.style.width;
			};
		})(),
		forceUIUpdate() {
			// If I understood Vue better, I'd create components that damn well updated themselves properly.
			this.treeUpdateState = !this.treeUpdateState;
			this.menuUpdateState = !this.menuUpdateState;
			if (this.selectedItemLookup && this.selectedItemLookup.id != null) {
				this.selectedItemLookup.id++;
				this.selectedItemLookup.id--;
			}
		},
		redrawUI(clearSelection) {
			Vue.nextTick(() => {
				if (clearSelection) {
					this.clearSelected();
				}
				this.forceUIUpdate();
				this.drawCurrentPage();
			});
		},
		clearState() {
			this.clearSelected();
			this.currentPageLookup = null;
			this.statusText = '';
			this.updateProgress({clear: true});
			this.contextMenu = null;
			this.filename = null;
			this.dirtyState.undoIndex = 0;
			this.dirtyState.lastSaveIndex = 0;
			this.forceUIUpdate();
		},
		targetBox(t) {
			const box = {x: t.x, y: t.y, width: t.width, height: t.height};
			while (t) {
				t = store.get.parent(t);
				if (t) {
					box.x += t.x || 0;
					box.y += t.y || 0;
				}
			}
			return box;
		},
		inBox(x, y, t) {
			const box = this.targetBox(t);
			return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
		},
		findClickTargetInStep(mx, my, step) {
			const csi = store.get.csi(step.csiID);
			if (step.csiID != null && this.inBox(mx, my, csi)) {
				return csi;
			}
			if (step.numberLabel != null) {
				const lbl = store.get.stepNumber(step.numberLabel);
				if (this.inBox(mx, my, lbl)) {
					return lbl;
				}
			}
			if (step.pliID != null && store.state.plisVisible) {
				const pli = store.get.pli(step.pliID);
				for (let i = 0; i < pli.pliItems.length; i++) {
					const pliItem = store.get.pliItem(pli.pliItems[i]);
					if (this.inBox(mx, my, pliItem)) {
						return pliItem;
					}
					const pliQty = store.get.pliQty(pliItem.pliQtyID);
					if (this.inBox(mx, my, pliQty)) {
						return pliQty;
					}
				}
				if (this.inBox(mx, my, pli)) {
					return pli;
				}
			}
			if (step.callouts) {
				for (let i = 0; i < step.callouts.length; i++) {
					const callout = store.get.callout(step.callouts[i]);
					for (let j = 0; j < callout.steps.length; j++) {
						const step = store.get.step(callout.steps[j]);
						const innerTarget = this.findClickTargetInStep(mx, my, step);
						if (innerTarget) {
							return innerTarget;
						}
					}
					if (this.inBox(mx, my, callout)) {
						return callout;
					}
					for (let k = 0; k < callout.calloutArrows.length; k++) {
						const arrow = store.get.calloutArrow(callout.calloutArrows[k]);
						const arrowPoints = store.get.calloutArrowToPoints(arrow);
						let arrowBox = util.geom.bbox(arrowPoints);
						arrowBox = util.geom.expandBox(arrowBox, 8, 8);
						if (this.inBox(mx, my, {...arrow, ...arrowBox})) {
							return arrow;
						}
					}
				}
			}
			if (this.inBox(mx, my, step)) {
				return step;
			}
			return null;
		},
		findClickTarget(mx, my) {
			const page = store.get.lookupToItem(this.currentPageLookup);
			if (!page) {
				return null;
			}
			if (page.numberLabel != null) {
				const lbl = store.get.pageNumber(page.numberLabel);
				if (this.inBox(mx, my, lbl)) {
					return lbl;
				}
			}
			if (page.labels != null) {
				for (let i = 0; i < page.labels.length; i++) {
					const lbl = store.get.label(page.labels[i]);
					if (this.inBox(mx, my, lbl)) {
						return lbl;
					}
				}
			}
			for (let i = 0; i < page.steps.length; i++) {
				const step = store.get.step(page.steps[i]);
				const innerTarget = this.findClickTargetInStep(mx, my, step);
				if (innerTarget) {
					return innerTarget;
				}
			}
			return page;
		},
		isMoveable: (() => {
			const moveableItems = [
				'step', 'csi', 'pli', 'pliItem', 'pliQty', 'pageNumber', 'stepNumber', 'label',
				'callout', 'point'
			];
			return nodeType => moveableItems.includes(nodeType);
		})(),
		globalClick(e) {
			this.closeContextMenu();
			let target;
			if (e.target.id === 'pageCanvas') {
				target = this.findClickTarget(e.offsetX, e.offsetY);
			}
			if (target) {
				this.setSelected(target);
			} else {
				this.clearSelected();
			}
		},
		rightClick(e) {
			this.contextMenu = null;
			if (this.selectedItemLookup != null) {
				Vue.nextTick(() => {
					// Delay menu creation so that earlier menu clear has time to take effect
					// This is necessary as menu content may change without selected item changing
					const menu = ContextMenu(this.selectedItemLookup.type, this);
					if (menu && menu.length) {
						this.contextMenu = menu;
						this.$refs.contextMenuComponent.show(e);
					}
				});
			}
		},
		closeContextMenu() {
			this.$refs.contextMenuComponent.hide();
		},
		globalKeyPress(e) {
			this.closeContextMenu();
			const selItem = this.selectedItemLookup;
			if (e.key === 'PageDown') {
				const nextPage = store.get.nextPage(this.currentPageLookup);
				if (nextPage) {
					this.setCurrentPage(nextPage);
				}
			} else if (e.key === 'PageUp') {
				const prevPage = store.get.prevPage(this.currentPageLookup, true);
				if (prevPage) {
					this.setCurrentPage(prevPage);
				}
			} else if (selItem && e.key.startsWith('Arrow') && this.isMoveable(selItem.type)) {
				let dx = 0, dy = 0, dv = 5;
				if (e.shiftKey) {
					dv *= 2;
				}
				if (e.ctrlKey) {
					dv *= 10;
				}
				if (e.key === 'ArrowUp') {
					dy = -dv;
				} else if (e.key === 'ArrowDown') {
					dy = dv;
				} else if (e.key === 'ArrowLeft') {
					dx = -dv;
				} else if (e.key === 'ArrowRight') {
					dx = dv;
				}
				let item = store.get.lookupToItem(selItem);
				// Special case: the first point in a callout arrow can't move away from the callout itself
				// TODO: this doesn't prevent arrow base from coming off the rounded corner of a callout
				// TOOD: consider a similar case of moving a CSI with callout arrows pointing to it: move the arrow tips with the callout?
				if (item.type === 'point') {
					const arrow = store.get.calloutArrow(item.parent.id);
					if (arrow.points.indexOf(item.id) === 0) {
						const callout = store.get.callout(arrow.parent.id);
						const newPos = {x: item.x + dx, y: item.y + dy};
						const dt = util.geom.distance;
						if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
							if (dt(newPos.y, 0) < 2 || dt(newPos.y, callout.height) < 2) {
								dx = Math.min(callout.width - item.x, Math.max(dx, -item.x));
							} else {
								dx = 0;  // Prevent movement from pulling arrow base off callout
							}
						} else {
							if (dt(newPos.x, 0) < 2 || dt(newPos.x, callout.width) < 2) {
								dy = Math.min(callout.height - item.y, Math.max(dy, -item.y));
							} else {
								dx = 0;  // Prevent movement from pulling arrow base off callout
							}
						}
					}
				} else if (item.type === 'csi') {
					// TODO: If you move a CSI, the Step's bounding box needs to be updated
					// If we're moving a CSI on a step with callouts, move each callout arrow tip too so it stays anchored to the CSI
					const step = store.get.parent(item);
					if (!util.isEmpty(step.callouts)) {
						item = [item];
						step.callouts.forEach(calloutID => {
							const callout = store.get.callout(calloutID);
							callout.calloutArrows.forEach(arrowID => {
								const arrow = store.get.calloutArrow(arrowID);
								item.push(store.get.point(arrow.points[arrow.points.length - 1]));
							});
						});
					}
				} else if (item.type === 'callout') {
					// If we're moving a callout, move each callout arrow tip in the opposite direction so it stays in place anchored to the CSI
					item.calloutArrows.forEach(arrowID => {
						const arrow = store.get.calloutArrow(arrowID);
						const tip = store.get.point(arrow.points[arrow.points.length - 1]);
						tip.x -= dx;
						tip.y -= dy;
					});
				}

				const undoText = `Move ${util.prettyPrint(selItem.type)}`;
				undoStack.commit('item.reposition', {item: item, dx, dy}, undoText);
				this.redrawUI();
			} else {
				// Check if key is a menu shortcut
				const menu = this.navBarContent;
				const key = (e.ctrlKey ? 'ctrl+' : '') + e.key;
				for (let i = 0; i < menu.length; i++) {
					for (let j = 0; j < menu[i].children.length; j++) {
						const entry = menu[i].children[j];
						if (entry.shortcut === key) {
							entry.cb();
						}
					}
				}
			}
		},
		clearPageCanvas() {
			const pageSize = store.state.pageSize;
			const canvas = document.getElementById('pageCanvas');
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, pageSize.width, pageSize.height);
		},
		drawCurrentPage() {
			if (this.currentPageLookup != null) {
				const canvas = document.getElementById('pageCanvas');
				canvas.width = canvas.width;
				let page = store.get.lookupToItem(this.currentPageLookup);
				if (page == null) {  // This can happen if, say, a page got deleted without updating the cucrrent page (like in undo / redo)
					page = store.get.firstPage();
					this.currentPageLookup = store.get.itemToLookup(page);
				}
				this.drawPage(page, canvas);
			}
		},
		drawStep(step, canvas, scale = 1) {
			step = store.get.step(step);
			const localModel = LDParse.model.get.submodelDescendant(store.model, step.submodel);

			const ctx = canvas.getContext('2d');
			ctx.save();
			ctx.translate(step.x, step.y);

			if (step.csiID != null) {
				ctx.save();
				ctx.scale(1 / scale, 1 / scale);
				const selItem = this.selectedItemLookup;
				const csi = store.get.csi(step.csiID);
				const haveSelectedParts = selItem && selItem.type === 'part' && selItem.stepID === step.id;
				const selectedPartIDs = haveSelectedParts ? [selItem.id] : null;
				const renderer = selectedPartIDs == null ? 'csi' : 'csiWithSelection';
				const res = store.render[renderer](localModel, step, csi, selectedPartIDs, scale);
				if (res) {
					ctx.drawImage(res.container, (csi.x - res.dx) * scale, (csi.y - res.dy) * scale);  // TODO: profile performance if every x, y, w, h argument is passed in
				}
				ctx.restore();
			}

			(step.callouts || []).forEach(calloutID => {
				const callout = store.get.callout(calloutID);
				ctx.save();
				ctx.translate(callout.x, callout.y);

				callout.steps.forEach(id => this.drawStep({type: 'step', id}, canvas, scale));

				ctx.strokeStyle = 'black';
				ctx.lineWidth = 2;
				util.draw.roundedRect(ctx, 0, 0, callout.width, callout.height, 10);
				ctx.stroke();
				(callout.calloutArrows || []).forEach(arrowID => {
					const arrow = store.get.calloutArrow(arrowID);
					const arrowPoints = store.get.calloutArrowToPoints(arrow);
					ctx.beginPath();
					ctx.moveTo(arrowPoints[0].x, arrowPoints[0].y);
					arrowPoints.slice(1, -1).forEach(pt => {
						ctx.lineTo(pt.x, pt.y);
					});
					ctx.stroke();
					ctx.fillStyle = 'black';
					const tip = arrowPoints[arrowPoints.length - 1];
					util.draw.arrow(ctx, tip.x, tip.y, arrow.direction);
					ctx.fill();
				});
				ctx.restore();
			});

			if (step.pliID != null && store.state.plisVisible) {
				const pli = store.get.pli(step.pliID);
				if (!util.isEmpty(pli.pliItems)) {
					ctx.strokeStyle = 'black';
					ctx.lineWidth = 2;
					util.draw.roundedRect(ctx, pli.x, pli.y, pli.width, pli.height, 10);
					ctx.stroke();

					ctx.save();
					ctx.scale(1 / scale, 1 / scale);
					pli.pliItems.forEach(idx => {
						const pliItem = store.get.pliItem(idx);
						const part = localModel.parts[pliItem.partNumbers[0]];
						const pliCanvas = store.render.pli(part, scale).container;
						ctx.drawImage(pliCanvas, (pli.x + pliItem.x) * scale, (pli.y + pliItem.y) * scale);
					});
					ctx.restore();

					pli.pliItems.forEach(idx => {
						const pliItem = store.get.pliItem(idx);
						const pliQty = store.get.pliQty(pliItem.pliQtyID);
						ctx.fillStyle = 'black';
						ctx.font = 'bold 10pt Helvetica';
						ctx.fillText(
							'x' + pliItem.quantity,
							pli.x + pliItem.x + pliQty.x,
							pli.y + pliItem.y + pliQty.y + pliQty.height
						);
					});
				}
			}

			if (step.numberLabel != null) {
				const lbl = store.get.stepNumber(step.numberLabel);
				ctx.fillStyle = 'black';
				ctx.font = 'bold 20pt Helvetica';
				ctx.fillText(step.number + '', lbl.x, lbl.y + lbl.height);
			}

			ctx.restore();
		},
		drawPage(page, canvas, scale = 1) {

			if (page.needsLayout) {
				store.mutations.page.layout({page});
			}

			const pageSize = store.state.pageSize;
			const ctx = canvas.getContext('2d');
			ctx.save();
			if (scale > 1) {
				ctx.scale(scale, scale);
			}
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, pageSize.width, pageSize.height);

			page.steps.forEach(id => this.drawStep({type: 'step', id}, canvas, scale));

			(page.dividers || []).forEach(id => {
				const divider = store.get.divider(id);
				ctx.strokeStyle = 'black';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(divider.p1.x, divider.p1.y);
				ctx.lineTo(divider.p2.x, divider.p2.y);
				ctx.stroke();
			});

			if (page.numberLabel != null) {
				ctx.save();
				const lbl = store.get.pageNumber(page.numberLabel);
				ctx.fillStyle = 'black';
				ctx.font = 'bold 20pt Helvetica';
				ctx.textAlign = lbl.align || 'start';
				ctx.textBaseline = lbl.valign || 'alphabetic';
				ctx.fillText(page.number, lbl.x, lbl.y);
				ctx.restore();
			}

			if (page.labels != null) {
				page.labels.forEach(labelID => {
					const lbl = store.get.label(labelID);
					ctx.fillStyle = lbl.color || 'black';
					ctx.font = lbl.font || 'bold 20pt Helvetica';
					ctx.fillText(lbl.text, lbl.x, lbl.y + lbl.height);
				});
			}
			ctx.restore();
		},
		pages() {
			return store.state.pages.filter(p => p != null);
		}
	},
	computed: {
		treeData() {
			return {
				store,
				selectionCallback: this.setSelected.bind(this),
				treeUpdateState: this.treeUpdateState  // Reactive property used to trigger tree update
			};
		},
		isDirty() {
			return this.dirtyState.undoIndex !== this.dirtyState.lastSaveIndex;
		},
		navBarContent() {
			return Menu(this);
		},
		version() {
			return version.slice(0, version.lastIndexOf('.'));  // major.minor is enough for public consumption
		},
		highlightStyle() {
			const selItem = this.selectedItemLookup;
			if (!selItem || selItem.type === 'part') {
				return {display: 'none'};
			}
			const page = store.get.pageForItem(selItem);
			if (page.needsLayout) {
				store.mutations.page.layout({page});
			}
			let box;
			if (selItem.type === 'page' || selItem.type === 'titlePage') {
				box = {x: 0, y: 0, width: store.state.pageSize.width, height: store.state.pageSize.height};
			} else if (selItem.type === 'calloutArrow') {
				const arrow = store.get.lookupToItem(selItem);
				const points = store.get.calloutArrowToPoints(arrow);
				let pointBox = util.geom.bbox(points);
				pointBox = util.geom.expandBox(pointBox, 8, 8);
				box = this.targetBox({...arrow, ...pointBox});
			} else {
				box = this.targetBox(store.get.lookupToItem(selItem));
				if (selItem.type === 'point') {
					box = {x: box.x - 2, y: box.y - 2, width: 4, height: 4};
				}
			}
			if (selItem.type === 'pageNumber' || selItem.type === 'stepNumber' || selItem.type === 'label') {
				box.y += 5;  // Text is aligned to the bottom of the box; offset highlight to center nicely
			} else if (selItem.type === 'pliQty') {
				box.y += 3;
			}
			return {
				display: 'block',
				left: `${box.x - 3}px`,
				top: `${box.y - 3}px`,
				width: `${box.width + 6}px`,
				height: `${box.height + 6}px`
			};
		}
	},
	mounted() {

		document.body.addEventListener('keyup', e => {
			this.globalKeyPress(e);
		});

		document.body.addEventListener('keydown', e => {
			if ((e.key === 'PageDown' || e.key === 'PageUp'
				|| e.key.startsWith('Arrow') || (e.key === 's' && e.ctrlKey))
				&& e.target.nodeName !== 'INPUT') {
				e.preventDefault();
			}
		});

		window.addEventListener('beforeunload', e => {
			if (this && this.isDirty) {
				const msg = 'You have unsaved changes. Leave anyway?';
				e.returnValue = msg;
				return msg;
			}
			return null;
		});

		// Enable splitter between tree and page view
		Split(['#leftPane', '#rightPane'], {
			sizes: [20, 80], minSize: [100, store.state.pageSize.width + 10], direction: 'horizontal',
			gutterSize: 5, snapOffset: 0
		});

		undoStack.onChange(() => {
			this.dirtyState.undoIndex = undoStack.getIndex();
		});

		LDParse.setProgressCallback(this.updateProgress);
		var localState = localStorage.getItem('lic_state');
		if (localState) {
			this.openLicFile(JSON.parse(localState));
		}
	}
});

window.__Web_lic_testScope = {  // store a global reference to these for easier testing
	// TODO: only generate this in the debug build.  Need different production / debug configs for that first...
	util, app, store, undoStack, LDParse
};

//app.importRemoteModel('Creator/20015 - Alligator.mpd');
//app.importRemoteModel('Star Wars/7140 - X-Wing Fighter.mpd');
//app.importRemoteModel('Star Wars/4491 - MTT.mpd');
//app.importRemoteModel('Star Wars/4489 - AT-AT.mpd');
//app.importRemoteModel('Architecture/21010 - Robie House.mpd');
//app.importRemoteModel('Adventurers/5935 - Island Hopper.mpd');
//app.importRemoteModel('Space/894 - Mobile Ground Tracking Station.mpd');
//app.importRemoteModel('Star Wars/4487 - Jedi Starfighter & Slave I.mpd');
//app.importRemoteModel('trivial_model.ldr');
