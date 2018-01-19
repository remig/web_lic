/* global Vue: false, $: false, Split: false, UndoStack: false, LDParse: false, LDRender: false, util: false, store: false, Menu: false, ContextMenu: false */

(function() {
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

var app = new Vue({
	el: '#container',
	data: {  // Store any transient UI state data here.  Do *not* store state items here; Vue turns these into observers
		currentPageLookup: null,
		statusText: '',
		busyText: '',
		selectedItemLookup: null,
		contextMenu: null,
		treeUpdateState: false  // Not used by tree directly, only used to force the tree to redraw
	},
	methods: {
		openRemoteLDrawModel(modelName) {
			if (store.model) {
				app.closeModel();
			}
			app.busyText = 'Loading Model';
			window.setTimeout(function() {
				const start = Date.now();
				store.model = LDParse.loadRemotePart(modelName);
				app.importLDrawModel(modelName, start);
			}, 0);
		},
		importLDrawModelFromContent(content) {
			if (store.model) {
				app.closeModel();
			}
			const start = Date.now();
			store.model = LDParse.loadPartContent(content);
			app.importLDrawModel(store.model.filename, start);
		},
		importLDrawModel(modelName, start) {

			start = start || Date.now();

			LDRender.setPartDictionary(LDParse.partDictionary);

			store.mutations.setModelName(modelName);
			store.mutations.addTitlePage();
			store.mutations.addInitialPages(LDParse.partDictionary);
			store.get.label(1).text = `${LDParse.model.get.partCount(store.model)} Parts, ${store.state.pages.length - 1} Pages`;
			store.mutations.layoutTitlePage(store.get.titlePage());

			app.currentPageLookup = store.get.itemToLookup(store.state.pages[0]);
			undoStack.saveBaseState();
			app.forceTreeUpdate();

			var end = Date.now();
			app.busyText = '';
			app.statusText = `"${store.state.modelName}" loaded successfully (${util.formatTime(start, end)})`;
			Vue.nextTick(() => app.drawCurrentPage());
		},
		triggerModelImport(e) {
			const reader = new FileReader();
			reader.onload = function(e) {
				app.importLDrawModelFromContent(e.target.result);
			};
			reader.readAsText(e.target.files[0]);
			e.target.value = '';
		},
		triggerOpenFile(e) {
			const reader = new FileReader();
			reader.onload = function(e) {
				const fileJSON = JSON.parse(e.target.result);
				store.model = fileJSON.model;
				LDParse.setPartDictionary(fileJSON.partDictionary);
				LDParse.setColorTable(fileJSON.colorTable);
				LDRender.setPartDictionary(fileJSON.partDictionary);
				store.replaceState(fileJSON.state);
				app.currentPageLookup = store.get.itemToLookup(store.state.pages[0]);
				undoStack.saveBaseState();
				app.clearSelected();
				app.drawCurrentPage();
				app.forceTreeUpdate();
			};
			reader.readAsText(e.target.files[0]);
			e.target.value = '';
		},
		closeModel() {
			store.model = null;
			store.resetState();
			undoStack.clear();
			app.clearState();
			util.emptyNode(document.getElementById('canvasHolder'));
			Vue.nextTick(() => {
				app.clearSelected();
				app.clearPageCanvas();
			});
		},
		setCurrentPage(page) {
			if (page.id !== app.currentPageLookup.id) {
				app.clearSelected();
				app.currentPageLookup = store.get.itemToLookup(page);
			}
			Vue.nextTick(() => app.drawCurrentPage());
		},
		setSelected(target) {
			if (!app.selectedItemLookup || target.id !== app.selectedItemLookup.id || target.type !== app.selectedItemLookup.type) {
				var targetPage = store.get.pageForItem(target);
				if (targetPage && targetPage.id !== app.currentPageLookup.id) {
					app.setCurrentPage(targetPage);
				}
				app.selectedItemLookup = store.get.itemToLookup(target);
			}
		},
		forceTreeUpdate() {
			app.treeUpdateState = !app.treeUpdateState;
		},
		clearState() {
			app.currentPageLookup = null;
			app.statusText = '';
			app.selectedItemLookup = null;
			app.contextMenu = null;
			app.forceTreeUpdate();
		},
		clearSelected() {
			app.selectedItemLookup = null;
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
			const box = app.targetBox(t);
			return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
		},
		findClickTarget(mx, my) {
			const page = store.get.lookupToItem(app.currentPageLookup);
			if (!page) {
				return null;
			}
			if (page.numberLabel != null) {
				const lbl = store.get.pageNumber(page.numberLabel);
				if (app.inBox(mx, my, lbl)) {
					return lbl;
				}
			}
			if (page.labels != null) {
				for (let i = 0; i < page.labels.length; i++) {
					const lbl = store.get.label(page.labels[i]);
					if (app.inBox(mx, my, lbl)) {
						return lbl;
					}
				}
			}
			for (let i = 0; i < page.steps.length; i++) {
				const step = store.get.step(page.steps[i]);
				const csi = store.get.csi(step.csiID);
				if (step.csiID != null && app.inBox(mx, my, csi)) {
					return csi;
				}
				if (step.numberLabel != null) {
					const lbl = store.get.stepNumber(step.numberLabel);
					if (app.inBox(mx, my, lbl)) {
						return lbl;
					}
				}
				if (step.pliID != null) {
					const pli = store.get.pli(step.pliID);
					for (let j = 0; j < pli.pliItems.length; j++) {
						const idx = pli.pliItems[j];
						const pliItem = store.get.pliItem(idx);
						if (app.inBox(mx, my, pliItem)) {
							return pliItem;
						}
						const pliQty = store.get.pliQty(pliItem.quantityLabel);
						if (app.inBox(mx, my, pliQty)) {
							return pliQty;
						}
					}
					if (app.inBox(mx, my, pli)) {
						return pli;
					}
				}
				if (app.inBox(mx, my, step)) {
					return step;
				}
			}
			return page;
		},
		isMoveable(nodeType) {
			return ['step', 'csi', 'pli', 'pliItem', 'pliQty', 'pageNumber', 'stepNumber', 'label'].includes(nodeType);
		},
		globalClick(e) {
			app.closeMenu();
			let target;
			if (e.target.id === 'pageCanvas') {
				target = app.findClickTarget(e.offsetX, e.offsetY);
			}
			if (target) {
				app.setSelected(target);
			} else {
				app.clearSelected();
			}
		},
		rightClick(e) {
			if (app.selectedItemLookup != null) {
				const menu = ContextMenu(app.selectedItemLookup.type, app, store, undoStack);
				if (menu && menu.length) {
					app.contextMenu = menu;
					$('#contextMenu')
						.css({
							'outline-style': 'none',
							display: 'block',
							left: e.pageX,
							top: e.pageY
						}).focus();
				}
			}
		},
		closeMenu() {
			$('#contextMenu').css('display', 'none');
		},
		toggleSubMenu(e) {
			e.preventDefault();
			e.stopPropagation();
			$(e.target.parentElement).toggleClass('open');
		},
		globalKeyPress(e) {
			app.closeMenu();
			const selItem = app.selectedItemLookup;
			if (e.key === 'PageDown' && !store.get.isLastPage(app.currentPageLookup)) {
				app.setCurrentPage(store.get.nextPage(app.currentPageLookup));
			} else if (e.key === 'PageUp' && !store.get.isTitlePage(app.currentPageLookup)) {
				app.setCurrentPage(store.get.prevPage(app.currentPageLookup));
			} else if (selItem && e.key.startsWith('Arrow') && app.isMoveable(selItem.type)) {
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
				undoStack.commit('moveItem', {
					item: item,
					x: item.x + dx,
					y: item.y + dy
				}, `Move ${util.titleCase(selItem.type)}`);
				Vue.nextTick(() => {
					app.drawCurrentPage();
					app.selectedItemLookup.id++;  // TODO: UGH. This forces Vue to update selectedItem, which triggers highlight recalculation.  Need a cleaner way to do this.
					app.selectedItemLookup.id--;
				});
			} else {
				// Check if key is a menu shortcut
				const menu = app.menuEntries;
				const key = (e.ctrlKey ? 'ctrl+' : '') + e.key;
				for (let i = 0; i < menu.length; i++) {
					for (let j = 0; j < menu[i].children.length; j++) {
						var entry = menu[i].children[j];
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
			if (app.currentPageLookup != null) {
				const canvas = document.getElementById('pageCanvas');
				canvas.width = canvas.width;
				app.drawPage(store.get.lookupToItem(app.currentPageLookup), canvas);
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
				const localModel = util.getSubmodel(store.model, step.submodel);

				ctx.save();
				ctx.translate(step.x, step.y);

				if (step.csiID != null) {
					const csi = store.get.csi(step.csiID);
					const csiCanvas = util.renderCSI(localModel, step).container;
					ctx.drawImage(csiCanvas, csi.x, csi.y);  // TODO: profile performance if every x, y, w, h argument is passed in
				}

				if (step.pliID != null) {
					const pli = store.get.pli(step.pliID);
					ctx.strokeStyle = 'black';
					ctx.lineWidth = 2;
					util.roundedRect(ctx, pli.x, pli.y, pli.width, pli.height, 10);
					ctx.stroke();

					pli.pliItems.forEach(idx => {
						const pliItem = store.get.pliItem(idx);
						const part = localModel.parts[pliItem.partNumber];
						const pliCanvas = util.renderPLI(part).container;
						ctx.drawImage(pliCanvas, pli.x + pliItem.x, pli.y + pliItem.y);

						const pliQty = store.get.pliQty(pliItem.quantityLabel);
						ctx.fillStyle = 'black';
						ctx.font = 'bold 10pt Helvetica';
						ctx.fillText(
							'x' + pliItem.quantity,
							pli.x + pliItem.x + pliQty.x,
							pli.y + pliItem.y + pliQty.y + pliQty.height
						);
					});
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
				store: store,
				treeUpdateState: this.treeUpdateState
			};
		},
		menuEntries() {
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
			if (selItem) {
				let box;
				if (selItem.type === 'page') {
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
			return {display: 'none'};
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
	if (e.key === 'PageDown' || e.key === 'PageUp' || e.key.startsWith('Arrow')) {
		e.preventDefault();
	}
});

//app.openRemoteLDrawModel('Creator/20015 - Alligator.mpd');
//app.openRemoteLDrawModel('Star Wars/7140 - X-Wing Fighter.mpd');
//app.openRemoteLDrawModel('Star Wars/4491 - MTT.mpd');
//app.openRemoteLDrawModel('Star Wars/4489 - AT-AT.mpd');
//app.openRemoteLDrawModel('Architecture/21010 - Robie House.mpd');
//app.openRemoteLDrawModel('Adventurers/5935 - Island Hopper.mpd');
//app.openRemoteLDrawModel('Space/894 - Mobile Ground Tracking Station.mpd');

window.app = app;
window.store = store;

})();
