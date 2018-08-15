/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global Vue: false, Split: false, ELEMENT: false */
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

Vue.use({
	// Add a 'tr' method to every component, which makes translating strings in template HTML easier
	install(Vue) {
		Vue.prototype.tr = function(str, args) {
			try {
				return LocaleManager.translate(str, args);
			} catch (e) {  // eslint-disable-line no-empty
				// TODO: Intentionally empty; once all strings are out of the HTML / components
				// and into the translation files, remove this try catch
			}
			return str;
		};
	}
});

const app = new Vue({
	el: '#container',
	components: {NavTree},
	data: {
		// Store transient UI state data here.  Do *not* store state items here; Vue turns these
		// into observers, which destroys performance for big stores like we have here
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
		navUpdateState: 0    // Not used directly, only used to force the nav bar to redraw
	},
	methods: {
		importBuiltInModel(url) {
			this.importModel(() => LDParse.loadRemotePart(url));
		},
		importCustomModel(content, filename) {
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
				this.filename = store.state.licFilename;

				DialogManager('importModelDialog', dialog => {
					dialog.visible = true;
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
							// Add title page after regular pages so title page labels comes out correct
							store.mutations.addTitlePage();
						}
						if (layoutChoices.include.partListPage) {
							store.mutations.inventoryPage.add();
						}
						store.save({mode: 'local'});

						const firstPage = store.get.titlePage() || store.get.firstPage();
						this.currentPageLookup = store.get.itemToLookup(firstPage);
						undoStack.saveBaseState();
						this.forceUIUpdate();

						this.updateProgress({clear: true});
						const time = _.formatTime(start, Date.now());
						const filename = store.get.modelFilename();
						this.statusText = this.tr('status_bar.file_loaded_@mf', {filename, time});
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
			this.filename = store.state.licFilename;
			const firstPage = store.get.titlePage() || store.get.firstPage();
			this.currentPageLookup = store.get.itemToLookup(firstPage);
			store.save({mode: 'local'});
			undoStack.saveBaseState();
			this.clearSelected();
			const time = _.formatTime(start, Date.now());
			const filename = store.model.filename;
			this.statusText = this.tr('status_bar.file_opened_@mf', {filename, time});
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
			store.save({mode: 'file'});
			this.dirtyState.lastSaveIndex = undoStack.getIndex();
		},
		saveAs() {
			DialogManager('stringChooserDialog', dialog => {
				dialog.$on('ok', newString => {
					const fn = newString.replace(/[^a-zA-Z0-9 _]/ig, '').replace(/li[ct]$/ig, '');
					this.filename = store.state.licFilename = fn;
					this.save();
				});
				dialog.title = this.tr('dialog.save_as.title');
				dialog.label = this.tr('dialog.save_as.fn');
				dialog.labelWidth = '80px';
				dialog.newString = this.filename;
				dialog.visible = true;
			});
		},
		saveTemplate(filename) {
			store.save({mode: 'file', target: 'template', filename, jsonIndent: '\t'});
		},
		saveTemplateAs() {
			DialogManager('stringChooserDialog', dialog => {
				dialog.$on('ok', newString => {
					const fn = newString.replace(/[^a-zA-Z0-9 _]/ig, '').replace(/li[ct]$/ig, '');
					this.saveTemplate(fn);
				});
				dialog.title = this.tr('dialog.save_template_as.title');
				dialog.label = this.tr('dialog.save_template_as.fn');
				dialog.labelWidth = '80px';
				dialog.newString = this.filename;
				dialog.visible = true;
			});
		},
		importTemplate(result, filename) {
			undoStack.commit('templatePage.load', JSON.parse(result), 'Load Template');
			this.statusText = this.tr('status_bar.template_opened_@mf', {filename});
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
			});
		},
		setCurrentPage(page) {
			if (!_.itemEq(page, this.currentPageLookup)) {
				this.currentPageLookup = store.get.itemToLookup(page);
				this.$refs.pageView.scrollToPage(page);
			}
		},
		setSelected(target, page) {
			if (_.itemEq(target, this.selectedItemLookup)
				&& (!page || _.itemEq(page, this.currentPageLookup))
			) {
				return;
			}
			let targetPage;
			if (page) {
				targetPage = page;
			} else if (target.type === 'submodel') {
				targetPage = store.get.pageForItem({type: 'step', id: target.stepID});
			} else {
				targetPage = store.get.pageForItem(target);
			}
			if (targetPage && !_.itemEq(targetPage, this.currentPageLookup)) {
				this.currentPageLookup = store.get.itemToLookup(targetPage);
			}
			this.selectedItemLookup = store.get.itemToLookup(target);
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
				// This gets called several times a second, as long-lived processes progress.
				// Vue's reactivity is too slow and resource intensive to use here.
				const bar = document.getElementById('progressbar');
				const pct = Math.floor(progress / count * 100) || 0;
				bar.style.width = `${pct}%`;
				bar.innerText = text || bar.style.width;
			};
		})(),
		forceUIUpdate() {
			this.$refs.pageView.forceUpdate();
			this.$refs.navTree.forceUpdate();
			// TODO: add ref for the menu, then call $ref.forceUpdate()
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
				// Template page doesn't have any right click menus
				&& this.currentPageLookup.type !== 'templatePage'
			) {
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
			} else if (e.key === 'Delete' && selItem
				&& store.mutations[selItem.type] && store.mutations[selItem.type].delete
			) {
				const opts = {doLayout: true};
				opts[selItem.type] = selItem;
				const undoText = `Delete ${_.prettyPrint(selItem.type)}`;
				try {
					this.clearSelected();
					undoStack.commit(`${selItem.type}.delete`, opts, undoText);
				} catch (e) {  // eslint-disable-line no-empty
					// TODO: Intentionally empty; need to change each store.mutation.foo.delete that
					// throws an error if delete can't happen to just returning instead.
				}
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
				if (item.type === 'point') {
					const arrow = store.get.lookupToItem(item.parent);
					if (arrow.points.indexOf(item.id) === 0) {
						const newPos = {x: item.x + dx, y: item.y + dy};
						const dt = _.geom.distance;
						if (arrow.type === 'calloutArrow') {
							// Special case: first point in callout arrow can't move away from callout
							// TODO: this doesn't prevent arrow base from coming off rounded callout corners
							const callout = store.get.callout(arrow.parent.id);
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
				this.$refs.pageView.scrollToPage(this.currentPageLookup);
			} else {
				Vue.nextTick(() => {
					this.$refs.pageView.drawVisiblePages();
				});
			}
		},
		drawCurrentPage() {
			if (this.currentPageLookup != null) {
				let page = store.get.lookupToItem(this.currentPageLookup);
				if (page == null) {
					// This happens if, say, the current page is deleted without
					// updating the current page first, like during undo / redo
					page = store.get.firstPage();
					this.currentPageLookup = store.get.itemToLookup(page);
				}
				Vue.nextTick(() => {
					this.$refs.pageView.drawVisiblePages();
				});
			}
		}
	},
	computed: {
		isDirty() {
			return this.dirtyState.undoIndex !== this.dirtyState.lastSaveIndex;
		},
		navBarContent() {
			return Menu(this);
		},
		version() {
			return _.version.nice(packageInfo.version);  // major.minor is enough for public consumption
		}
	},
	mounted() {

		// TODO: grey out progress bar when 'Model Import' dialog is visible; otherwise it's confusing
		//		 if progress bar isn't at 100 but its done loading and waiting for user to click
		// TODO: progress bar should never stop at less than 100; clear it when model is imported
		// TODO: show some kind of 'getting started' content when model not yet loaded.
		// TODO: show template page always, even when no model loaded.
		// 		This lets you import a model with the desired template already in place.
		document.body.addEventListener('keyup', e => {
			this.globalKeyPress(e);
		});

		document.body.addEventListener('keydown', e => {
			if ((e.key === 'PageDown' || e.key === 'PageUp'
				|| e.key.startsWith('Arrow') || (e.key === 's' && e.ctrlKey))
				&& e.target.nodeName !== 'INPUT'
			) {
				e.preventDefault();
			}
		});

		window.addEventListener('beforeunload', e => {

			const splitStyle = document.getElementById('leftPane').style;
			uiState.set('splitter', parseFloat(splitStyle.width.match(/calc\(([0-9.]*)%/)[1]));

			uiState.set('lastUsedVersion', packageInfo.version);

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
		LDParse.loadLDConfig();
		LDParse.setCustomColorTable(Storage.get.customBrickColors());

		undoStack.onChange(() => {
			this.dirtyState.undoIndex = undoStack.getIndex();
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

		if (_.version.isOldVersion(uiState.get('lastUsedVersion'), packageInfo.version)) {
			DialogManager('whatsNewDialog', dialog => {
				dialog.show();
			});
		}

		// TODO: Find better way of calling 'redrawUI' from arbitrary places
		LocaleManager.pickLanguage(this.openLocalLicFile, this.redrawUI);
	}
});

window.__lic = {  // store a global reference to these for easier testing
	// TODO: only generate this in the debug build.
	_, app, store, undoStack, LDParse, Storage, uiState
};
