/* global Vue: false, Split: false, ELEMENT: false*/
'use strict';

import _ from './util';
import uiState from './uiState';
import store from './store';
import undoStack from './undoStack';
import LDParse from './LDParse';
import Menu from './menu';
import ContextMenu from './contextMenu';
import Storage from './storage';
import LocaleManager from './translate';
import packageInfo from '../package.json';
import backwardCompat from './backwardCompat';
import DialogManager from './dialog';
import NavTree from './components/nav_tree/base.vue';
import './pageView';
import './templatePanel';

ELEMENT.locale(ELEMENT.lang.en);

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

Vue.filter('prettyPrint', _.prettyPrint);

Vue.use({  // This adds a 'tr' method to every component, which makes translating strings in template HTML easier
	install(Vue) {
		Vue.prototype.tr = function(str, args) {
			try {
				return LocaleManager.translate(str, args);
			} catch (e) {  // eslint-disable-line no-empty
				// TODO: Intentionally empty; once all strings are out of the HTML / components and into the translation files, remove this try catch
			}
			return str;
		};
	}
});

const app = new Vue({
	el: '#container',
	components: {NavTree},
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
		lastRightClickPos: {
			x: null,
			y: null
		},
		treeUpdateState: 0,  // Not used directly, only used to force the tree to redraw
		navUpdateState: 0    // Not used directly, only used to force the nav bar to redraw
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

				DialogManager.setDialog('importModelDialog');

				Vue.nextTick(() => {
					const dialogDefaults = uiState.get('dialog.importModel');
					const dialog = DialogManager.getDialog();
					_.copy(dialog, dialogDefaults);
					dialog.show({x: 400, y: 150});
					dialog.$off();
					dialog.$on('ok', async layoutChoices => {

						// TODO: Add option to start new page for each submodel
						store.mutations.pli.toggleVisibility({visible: layoutChoices.include.pli});
						store.mutations.addInitialPages();
						store.mutations.addInitialSubmodelImages();
						if (layoutChoices.useMaxSteps) {
							this.busyText = 'Merging Steps';
							await store.mutations.mergeInitialPages(this.updateProgress);
						}
						if (layoutChoices.include.titlePage) {
							store.mutations.addTitlePage();  // Add title page after adding regular pages so title page summary label comes out correct
						}
						store.save('local');

						const firstPage = store.get.titlePage() || store.get.firstPage();
						this.currentPageLookup = store.get.itemToLookup(firstPage);
						undoStack.saveBaseState();
						this.forceUIUpdate();

						const time = _.formatTime(start, Date.now());
						this.updateProgress({clear: true});
						this.statusText = `"${store.get.modelFilename()}" loaded successfully (${time})`;
						Vue.nextTick(this.drawCurrentPage);
					});
				});
			});
		},
		openLicFile(content) {
			const start = Date.now();
			if (typeof content === 'string') {
				content = JSON.parse(content);
			}

			backwardCompat.fixLicSaveFile(content);

			if (store.model) {
				this.closeModel();
			}
			store.load(content);
			this.filename = store.model.filename;
			const firstPage = store.get.titlePage() || store.get.firstPage();
			this.currentPageLookup = store.get.itemToLookup(firstPage);
			store.save('local');
			undoStack.saveBaseState();
			this.clearSelected();
			const time = _.formatTime(start, Date.now());
			this.statusText = `"${this.filename}" openend successfully (${time})`;
			Vue.nextTick(() => {
				this.forceUIUpdate();
				this.drawCurrentPage();
			});
		},
		openLocalLicFile() {
			const localModel = Storage.get.model();
			if (!_.isEmpty(localModel)) {
				this.openLicFile(localModel);
			}
		},
		save() {
			store.save('file');
			this.dirtyState.lastSaveIndex = undoStack.getIndex();
		},
		importTemplate(result, filename) {
			undoStack.commit('templatePage.load', JSON.parse(result), 'Load Template');
			this.statusText = `"${filename}" template openend successfully`;
			Vue.nextTick(() => {
				this.drawCurrentPage();
				this.forceUIUpdate();
			});
		},
		closeModel() {
			store.model = null;
			store.resetState();
			undoStack.clear();
			this.clearState();
			_.emptyNode(document.getElementById('canvasHolder'));
			Vue.nextTick(() => {
				this.clearSelected();
				this.$refs.pageView.clearPageCanvas();
			});
		},
		setCurrentPage(page, redraw = true) {
			if (!_.itemEq(page, this.currentPageLookup.type)) {
				this.currentPageLookup = store.get.itemToLookup(page);
			}
			if (redraw) {
				Vue.nextTick(this.drawCurrentPage);
			}
		},
		setSelected(target) {
			if (_.itemEq(target, this.selectedItemLookup)) {
				return;
			}
			if (target.type === 'part') {
				this.selectedItemLookup = target;
				this.drawCurrentPage();
			} else if (target.type === 'submodel') {
				const targetPage = store.get.pageForItem({type: 'step', id: target.stepID});
				if (targetPage && !_.itemEq(targetPage, this.currentPageLookup)) {
					this.setCurrentPage(targetPage);
				}
				this.selectedItemLookup = target;
			} else {

				if (this.selectedItemLookup) {
					const currentPage = store.get.pageForItem(this.selectedItemLookup);
					this.$refs.pageView.drawPage(currentPage);  // TODO: What is this call for?  Is it still necessary?
				}
				const targetPage = store.get.pageForItem(target);
				if (targetPage && !_.itemEq(targetPage, this.currentPageLookup)) {
					this.setCurrentPage(targetPage, false);
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
						progress = 0;
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
			this.treeUpdateState = (this.treeUpdateState + 1) % 10;  // TODO: considering add refs for the nav tree & menu, then calling $ref.forceUpdate(), like pageView
			this.navUpdateState = (this.navUpdateState + 1) % 10;
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
			return this.$refs.pageView.pageCoordsToCanvasCoords(point);
		},
		closeContextMenu() {
			this.$refs.contextMenuComponent.hide();
		},
		globalKeyPress(e) {
			this.closeContextMenu();
			const selItem = this.selectedItemLookup;
			if (e.key === 'PageDown') {
				this.$refs.pageView.pageDown();
			} else if (e.key === 'PageUp') {
				this.$refs.pageView.pageUp();
			} else if (selItem && e.key.startsWith('Arrow') && store.get.isMoveable(selItem)) {
				let dx = 0, dy = 0, dv = 1;
				dv *= e.shiftKey ? 5 : 1;
				dv *= e.ctrlKey ? 20 : 1;
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
				// Special case: the first point in a callout arrow can't move away from the callout itself
				// TODO: this doesn't prevent arrow base from coming off the rounded corner of a callout
				if (item.type === 'point') {
					const arrow = store.get.calloutArrow(item.parent.id);
					if (arrow.points.indexOf(item.id) === 0) {
						const callout = store.get.callout(arrow.parent.id);
						const newPos = {x: item.x + dx, y: item.y + dy};
						const dt = _.geom.distance;
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
				}

				if (dx !== 0 || dy !== 0) {
					const undoText = `Move ${_.prettyPrint(selItem.type)}`;
					undoStack.commit('item.reposition', {item: item, dx, dy}, undoText);
				}
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
			this.clearSelected();
			this.$refs.pageView.facingPage = facingPage;
			this.$refs.pageView.scroll = scroll;
			uiState.set('pageView', {facingPage, scroll});

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
			return packageInfo.version.slice(0, packageInfo.version.lastIndexOf('.'));  // major.minor is enough for public consumption
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

			const splitStyle = document.getElementById('leftPane').style;
			uiState.set('splitter', parseFloat(splitStyle.width.match(/calc\(([0-9.]*)%/)[1]));

			this.$refs.navTree.saveState();

			Storage.replace.ui(uiState.getCurrentState());

			if (this && this.isDirty) {
				const msg = 'You have unsaved changes. Leave anyway?';
				e.returnValue = msg;
				return msg;
			}
			return null;
		});

		LDParse.setProgressCallback(this.updateProgress);
		undoStack.onChange(() => {
			this.dirtyState.undoIndex = undoStack.getIndex();
			store.mutations.page.setDirty({includeTitlePage: true});
			this.redrawUI();
		});

		// Enable splitter between tree and page view
		const split = Storage.get.ui().splitter;
		Split(['#leftPane', '#rightPane'], {
			sizes: [split, 100 - split],
			minSize: [100, store.state.template.page.width + 10],
			direction: 'horizontal',
			gutterSize: 5,
			snapOffset: 0
		});

		LocaleManager.pickLanguage(this.openLocalLicFile, this.redrawUI);  // TODO: Find better way of calling 'redrawUI' from arbitrary places
	}
});

window.__lic = {  // store a global reference to these for easier testing
	// TODO: only generate this in the debug build.  Need different production / debug configs for that first...
	_, app, store, undoStack, LDParse, Storage, uiState
};
