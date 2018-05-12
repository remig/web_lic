/* global Vue: false, Split: false, */
'use strict';

const util = require('./util');
const store = require('./store');
const undoStack = require('./undoStack');
const LDParse = require('./LDParse');
const Menu = require('./menu');
const ContextMenu = require('./contextMenu');
require('./tree');
require('./pageView');
require('./dialog');
require('./templatePanel');

Vue.component('color-picker', require('vue-color/dist/vue-color').Chrome);

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
		lastRightClickPos: {
			x: null,
			y: null
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
				store.mutations.templatePage.add();
				store.setModel(model);
				this.filename = store.model.filename;

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

						const firstPage = store.get.titlePage() || store.get.firstPage();
						this.currentPageLookup = store.get.itemToLookup(firstPage);
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
			if (store.model) {
				this.closeModel();
			}
			store.load(content);
			this.filename = store.model.filename;
			const firstPage = store.get.titlePage() || store.get.firstPage();
			this.currentPageLookup = store.get.itemToLookup(firstPage);
			store.save('localStorage');
			undoStack.saveBaseState();
			this.clearSelected();
			const time = util.formatTime(start, Date.now());
			this.statusText = `"${this.filename}" openend successfully (${time})`;
			Vue.nextTick(() => {
				this.forceUIUpdate();
				this.drawCurrentPage();
			});
		},
		save() {
			store.save('file');
			this.dirtyState.lastSaveIndex = undoStack.getIndex();
		},
		triggerModelImport(e) {
			this.openFile(e, (result, filename) => {
				this.importLocalModel(result, filename);
			});
		},
		triggerTemplateImport(e) {
			this.openFile(e, (result, filename) => {
				undoStack.commit('templatePage.load', JSON.parse(result), 'Load Template');
				this.statusText = `"${filename}" template openend successfully`;
				Vue.nextTick(() => {
					this.drawCurrentPage();
					this.forceUIUpdate();
				});
			});
		},
		triggerOpenLicFile(e) {
			this.openFile(e, result => {
				this.openLicFile(JSON.parse(result));
			});
		},
		openFileChooser(accept, callback) {
			var input = document.getElementById('openFileChooser');
			input.onchange = callback;
			input.setAttribute('accept', accept);
			input.click();
		},
		openFile(e, cb) {
			const reader = new FileReader();
			reader.onload = (filename => {
				return e => {
					cb(e.target.result, filename);
				};
			})(e.target.files[0].name);
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
				this.$refs.pageView.clearPageCanvas();
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
			this.$refs.pageView.forceUpdate();
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
		isMoveable: (() => {
			const moveableItems = [
				'step', 'csi', 'pli', 'pliItem', 'quantityLabel', 'numberLabel', 'annotation',
				'submodelImage', 'callout', 'point', 'rotateIcon'
			];
			return item => {
				if (store.get.isTemplatePage(store.get.pageForItem(item))) {
					return false;
				}
				return moveableItems.includes(item.type);
			};
		})(),
		globalClick() {
			this.clearSelected();
		},
		rightClick(e) {
			this.lastRightClickPos.x = e.clientX;
			this.lastRightClickPos.y = e.clientY;
			this.contextMenu = null;
			if (this.selectedItemLookup != null && this.currentPageLookup != null
					&& this.currentPageLookup.type !== 'templatePage') {  // Template page doesn't have any right click menus
				Vue.nextTick(() => {
					// Delay menu creation so that earlier menu clear has time to take effect
					// This is necessary as menu content may change without selected item changing
					const menu = ContextMenu(this.selectedItemLookup, this);
					if (menu && menu.length) {
						this.contextMenu = menu;
						this.$refs.contextMenuComponent.show(e);
					}
				});
			}
		},
		pageCoordsToCanvasCoords(point) {
			const canvas = document.getElementById('pageCanvas');
			const box = canvas.getBoundingClientRect();
			return {
				x: Math.floor(point.x - box.x),
				y: Math.floor(point.y - box.y)
			};
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
			} else if (selItem && e.key.startsWith('Arrow') && this.isMoveable(selItem)) {
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
		setPageView({facingPage = false, scroll = false}) {
			// TODO: Store this in something new like localCache.UISettings
			this.clearSelected();
			this.$refs.pageView.facingPage = facingPage;
			this.$refs.pageView.scroll = scroll;
			if (scroll) {
				store.mutations.page.setDirty({includeTitlePage: true});
				Vue.nextTick(() => {
					this.$refs.pageView.drawCurrentPage();
					this.$refs.pageView.scrollToPage(this.currentPageLookup);
				});
			} else {
				Vue.nextTick(() => {
					this.$refs.pageView.drawCurrentPage();
				});
			}
		},
		drawCurrentPage() {
			if (this.currentPageLookup != null) {
				let page = store.get.lookupToItem(this.currentPageLookup);
				if (page == null) {  // This can happen if, say, a page got deleted without updating the current page (like in undo / redo)
					page = store.get.firstPage();
					this.currentPageLookup = store.get.itemToLookup(page);
				}
				Vue.nextTick(() => {
					this.$refs.pageView.drawCurrentPage();
				});
			}
		},
		drawPage(page, canvas, scale = 1) {
			// TODO: this is only called from PDF export.  Find a cleaner way.
			this.$refs.pageView.drawPage(page, canvas, scale);
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
			sizes: [20, 80], minSize: [100, store.state.template.page.width + 10], direction: 'horizontal',
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
