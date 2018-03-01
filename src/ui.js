/* global Vue: false, $: false, Split: false, UndoStack: false, LDParse: false, LDRender: false, util: false, store: false, Menu: false, ContextMenu: false */

// eslint-disable-next-line no-implicit-globals, no-undef
app = (function() {
'use strict';

const undoStack = new UndoStack(store);

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

var app = new Vue({
	el: '#container',
	data: {  // Store any transient UI state data here.  Do *not* store state items here; Vue turns these into observers
		currentPageLookup: null,
		selectedItemLookup: null,
		statusText: '',
		busyText: '',
		contextMenu: null,
		filename: null,
		dirtyState: {
			undoIndex: 0,
			lastSaveIndex: 0
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
				app.filename = store.model.filename;
				LDRender.setPartDictionary(LDParse.partDictionary);

				store.mutations.addInitialPages(LDParse.partDictionary);  // Add pages before title page so title page summary label comes out correct
				store.mutations.addTitlePage();
				store.save('localStorage');

				app.currentPageLookup = store.get.itemToLookup(store.get.titlePage());
				undoStack.saveBaseState();
				app.forceUIUpdate();

				const time = util.formatTime(start, Date.now());
				app.updateProgress({clear: true});
				app.statusText = `"${store.get.modelFilename()}" loaded successfully (${time})`;
				Vue.nextTick(app.drawCurrentPage);
			});
		},
		openLicFile(content) {
			store.load(content);
			this.filename = store.model.filename;
			const firstPage = store.get.titlePage() || store.get.firstPage();
			this.currentPageLookup = store.get.itemToLookup(firstPage);
			store.save('localStorage');
			undoStack.saveBaseState();
			this.clearSelected();
			this.drawCurrentPage();
			this.forceUIUpdate();
		},
		save() {
			store.save('file');
			app.dirtyState.lastSaveIndex = undoStack.index;
		},
		triggerModelImport(e) {
			const reader = new FileReader();
			reader.onload = (function(filename) {
				return function(e) {
					app.importLocalModel(e.target.result, filename);
				};
			})(e.target.files[0].name);
			reader.readAsText(e.target.files[0]);
			e.target.value = '';
		},
		triggerOpenFile(e) {
			const reader = new FileReader();
			reader.onload = function(e) {
				app.openLicFile(JSON.parse(e.target.result));
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
				const step = store.get.step(target.stepID);
				const part = LDParse.model.get.partFromID(target.id, store.model, step.submodel);
				part.selected = true;
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
			if (this.selectedItemLookup && this.selectedItemLookup.type === 'part') {
				const step = store.get.step(this.selectedItemLookup.stepID);
				const part = LDParse.model.get.partFromID(this.selectedItemLookup.id, store.model, step.submodel);
				delete part.selected;
				this.drawCurrentPage();
			}
			this.selectedItemLookup = null;
		},
		updateProgress: (() => {
			let progress = 0, count = 0, text = '';
			return (opts) => {
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
						app.busyText = text = '';
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
				if (step.pliID != null) {
					const pli = store.get.pli(step.pliID);
					for (let j = 0; j < pli.pliItems.length; j++) {
						const idx = pli.pliItems[j];
						const pliItem = store.get.pliItem(idx);
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
				if (this.inBox(mx, my, step)) {
					return step;
				}
			}
			return page;
		},
		isMoveable(nodeType) {
			return ['step', 'csi', 'pli', 'pliItem', 'pliQty', 'pageNumber', 'stepNumber', 'label'].includes(nodeType);
		},
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
			if (this.selectedItemLookup != null) {
				const menu = ContextMenu(this.selectedItemLookup.type, this, store, undoStack);
				if (menu && menu.length) {
					this.contextMenu = menu;
					$('#contextMenu')  // TODO: Move this into a menu component method
						.css({
							'outline-style': 'none',
							display: 'block',
							left: e.pageX,
							top: e.pageY
						}).focus();
				}
			}
		},
		closeContextMenu() {
			$('.dropdown-submenu.open').removeClass('open');
			$('#contextMenu').css('display', 'none');
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
				let dx = 0, dy = 0;
				const dv = 30;
				if (e.key === 'ArrowUp') {
					dy = -dv;
				} else if (e.key === 'ArrowDown') {
					dy = dv;
				} else if (e.key === 'ArrowLeft') {
					dx = -dv;
				} else if (e.key === 'ArrowRight') {
					dx = dv;
				}
				const item = store.get.lookupToItem(selItem);
				// TODO: If you move a CSI, the Step's bounding box needs to be updated
				undoStack.commit('repositionItem', {
					item: item,
					x: item.x + dx,
					y: item.y + dy
				}, `Move ${util.prettyPrint(selItem.type)}`);
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
		drawPage(page, canvas) {

			if (page.needsLayout) {
				store.mutations.layoutPage(page);
			}

			const pageSize = store.state.pageSize;
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, pageSize.width, pageSize.height);

			page.steps.forEach(stepID => {

				const step = store.get.step(stepID);
				const localModel = LDParse.model.get.submodelDescendant(store.model, step.submodel);

				ctx.save();
				ctx.translate(step.x, step.y);

				if (step.csiID != null) {
					const csi = store.get.csi(step.csiID);
					const partIsSelected = step.parts ? step.parts.some(i => localModel.parts[i].selected) : false;
					const res = store.render[partIsSelected ? 'csiWithSelection' : 'csi'](localModel, step);
					ctx.drawImage(res.container, csi.x - res.dx, csi.y - res.dy);  // TODO: profile performance if every x, y, w, h argument is passed in
				}

				if (step.pliID != null) {
					const pli = store.get.pli(step.pliID);
					if (!util.isEmpty(pli.pliItems)) {
						ctx.strokeStyle = 'black';
						ctx.lineWidth = 2;
						util.roundedRect(ctx, pli.x, pli.y, pli.width, pli.height, 10);
						ctx.stroke();

						pli.pliItems.forEach(idx => {
							const pliItem = store.get.pliItem(idx);
							const part = localModel.parts[pliItem.partNumbers[0]];
							const pliCanvas = store.render.pli(part).container;
							ctx.drawImage(pliCanvas, pli.x + pliItem.x, pli.y + pliItem.y);

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
			});

			if (page.numberLabel != null) {
				const lbl = store.get.pageNumber(page.numberLabel);
				ctx.fillStyle = 'black';
				ctx.font = 'bold 20pt Helvetica';
				ctx.fillText(page.number, lbl.x, lbl.y + lbl.height);
			}

			if (page.labels != null) {
				page.labels.forEach(labelID => {
					const lbl = store.get.label(labelID);
					ctx.fillStyle = lbl.color || 'black';
					ctx.font = lbl.font || 'bold 20pt Helvetica';
					ctx.fillText(lbl.text, lbl.x, lbl.y + lbl.height);
				});
			}
		},
		pages() {
			return store.state.pages.filter(p => p != null);
		}
	},
	computed: {
		treeData() {
			return {
				store,
				treeUpdateState: this.treeUpdateState  // Reactive property used to trigger tree update
			};
		},
		isDirty() {
			return this.dirtyState.undoIndex !== this.dirtyState.lastSaveIndex;
		},
		navBarContent() {
			return Menu(this, store, undoStack);
		},
		pageWidth() {
			return store.state.pageSize.width;
		},
		pageHeight() {
			return store.state.pageSize.height;
		},
		highlightStyle() {
			const selItem = this.selectedItemLookup;
			if (!selItem || selItem.type === 'part') {
				return {display: 'none'};
			}
			let box;
			if (selItem.type === 'page' || selItem.type === 'titlePage') {
				box = {x: 0, y: 0, width: store.state.pageSize.width, height: store.state.pageSize.height};
			} else {
				box = this.targetBox(store.get.lookupToItem(selItem));
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
	mounted: function() {
		undoStack.onChange(() => {
			this.dirtyState.undoIndex = undoStack.index;
		});
		LDParse.setProgressCallback(this.updateProgress);
		var localState = localStorage.getItem('lic_state');
		if (localState) {
			this.openLicFile(JSON.parse(localState));
		}
	}
});

// Enable splitter between tree and page view
Split(['#leftPane', '#rightPane'], {
	sizes: [20, 80], minSize: [100, store.state.pageSize.width + 10], direction: 'horizontal',
	gutterSize: 5, snapOffset: 0
});

document.body.addEventListener('keyup', e => app.globalKeyPress(e));
document.body.addEventListener('keydown', e => {
	if (e.key === 'PageDown' || e.key === 'PageUp' || e.key.startsWith('Arrow') || (e.key === 's' && e.ctrlKey)) {
		e.preventDefault();
	}
});

window.addEventListener('beforeunload', e => {
	if (app && app.isDirty) {
		const msg = 'You have unsaved changes. Leave anyway?';
		e.returnValue = msg;
		return msg;
	}
	return null;
});

//app.importRemoteModel('Creator/20015 - Alligator.mpd');
//app.importRemoteModel('Star Wars/7140 - X-Wing Fighter.mpd');
//app.importRemoteModel('Star Wars/4491 - MTT.mpd');
//app.importRemoteModel('Star Wars/4489 - AT-AT.mpd');
//app.importRemoteModel('Architecture/21010 - Robie House.mpd');
//app.importRemoteModel('Adventurers/5935 - Island Hopper.mpd');
//app.importRemoteModel('Space/894 - Mobile Ground Tracking Station.mpd');
//app.importRemoteModel('Star Wars/4487 - Jedi Starfighter & Slave I.mpd');
//app.importRemoteModel('trivial_model.ldr');

return app;

})();
