/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div id="container" @click="closeMenus()">
		<div v-cloak id="busyOverlay" :class="{hidden: busyText === ''}">
			<!--<div id="busyText">{{busyText}}<div id="spinner"></div></div>-->
			<div id="busyContainer">
				<div class="busyText">
					{{busyText}}
				</div>
				<div class="progress">
					<div id="progressbar" class="progress-bar" role="progressbar" style="width: 0%">
						0%
					</div>
				</div>
			</div>
		</div>

		<nav-bar
			id="navMenu"
			:menu-entry-list="navBarContent"
			:filename="{name: filename, isDirty}"
			@close-menus="closeMenus"
		/>

		<div class="mainBody" @contextmenu.stop.prevent="rightClick($event)">
			<div id="leftPane" class="split split-horizontal">
				<nav-tree-container />
			</div>

			<div id="rightPane" class="split split-horizontal">
				<page-view />
				<getting-started-panel v-if="!haveModel()" />
				<template-panel
					v-if="isTemplatePageCurrent"
					id="templatePanelContainer"
					:selected-item="selectedItemLookup"
				/>
			</div>
		</div>

		<popup-menu
			id="contextMenu"
			class="dropdown"
			tabindex="-1"
			:menu-entries="contextMenu"
			:selected-item="selectedItemLookup"
		/>

		<dialog-manager />

		<div v-cloak id="statusBar">
			{{statusText}}
		</div>
	</div>
</template>

<script>

// TODO:
// - Make all dialogs that affect page rendering moveable, so they can be moved to unobscure stuff
// - add 'culled' versions of popular parts, with their inside bits removed
// - auto add a 'rotate back' CSI rotation icon on the step after the currently rotated one
// - Undo / redo stack bakes action text into itself, which breaks translations
// - Add ability to upload a custom ldconfig file, to customize all colors in one shot
// - Put submodels inline then move submodel merge step to previous page
//     as the only step on row 2; arrow is wrong
// - Shrunken submodel images need to be centered (move lots of steps onto alligator head step to see)
// - Change page numbers to 'even left odd right' (or 'odd left even right') then append a page:
//     pages after new page have badly positioned page numbers
// - Fix import progress bar for models with one base model like basic x-wing
// - Check localStorage.set to ensure it doesn't go over browser limit. If it does, use lzstring to compress
// - Need submodel + bag breakdown page and final 'no step' complete model page
// - Add double click on annotation support: pop up the 'edit annotation' dialog
// - When edit annotation dialogs open, set focus somewhere useful
// - Grid config dialog is atrociously ugly
// - Title page CSI includes rotate context menu but it doesn't work
// - Remove all default rotation from X-Wing and get nutso horizontal lines
// - Balance part list columns better, so instead of 9-7-5 we get 7-7-7 kinda thing
// - first add support for multiple selection, then add support for merging two parts in a PLI,
//     like for antenna base and stick, or left / right hinge parts or 2x2 turntables
// - When displacing a part, check if it has exactly one stud; if so, stick arrow in stud
// - Convert alligator tail to callout, merge step 4 & 5; callout grid layout busted, steps 2 & 3 collide
// - Title Page CSI rotation is broken
// - Insert a new first page then add a step to it they try moving a part to step: crash
// - No way to unstretch a stretched step
// - Merging the first step of a submodel with the second step loses the submodel image

import Split from 'split.js';

import _ from './util';
import {t} from './translations';
import * as ReactiveState from './ui_reactive_state';
import * as FileOps from './file_ops';
import * as SelectionOps from './selection_ops';
import * as UiOps from './ui_ops';
import uiState from './ui_state';
import store from './store';
import undoStack from './undo_stack';
import LDParse from './ld_parse';
import Menu from './menu';
import Storage from './storage';
import LocaleManager from './components/translate.vue';
import packageInfo from '../package.json';
import DialogManager from './dialog';
import NavBar from './components/nav_bar.vue';
import NavTreeContainer from './components/nav_tree_container.vue';
import PopupMenu from './components/popup_menu.vue';
import TemplatePanel from './components/template_panel.vue';
import GettingStartedPanel from './components/getting_started.vue';
import PageView from './components/page_view.vue';
import EventBus from './event_bus';

const UI = {
	components: {NavBar, NavTreeContainer, PopupMenu, TemplatePanel, GettingStartedPanel, PageView},
	data() {
		return {
			disableLocalStorage: false, // allow tests to turn local storage off
		};
	},
	methods: {
		rightClick: SelectionOps.rightClick,
		closeMenus: UiOps.closeMenus,
		globalKeyPress(e, metaKeyDown) {
			// console.log(this.metaKeyDown, e.key);
			UiOps.closeMenus();

			// Some components handle their own key presses via event bus
			EventBus.emit('key-press', {key: e.key});

			const selItem = this.selectedItemLookup;
			if (e.key === 'Enter') {
				DialogManager.ok();
			} else if (e.key === 'Escape') {
				DialogManager.cancel();
			} else if (e.key === 'Delete' || e.key === 'Backspace') {
				if (selItem
					&& !store.get.isTemplatePage(store.get.pageForItem(selItem))
					&& store.mutations[selItem.type]
					&& store.mutations[selItem.type].delete
				) {
					const opts = {doLayout: true};
					opts[selItem.type] = selItem;
					const undoText = t('action.edit.item.delete.undo_@mf',
						{item: t('glossary.' + selItem.type.toLowerCase())});
					try {
						SelectionOps.clearSelected();
						undoStack.commit(`${selItem.type}.delete`, opts, undoText);
					} catch {
						// TODO: Intentionally empty; need to change each store.mutation.foo.delete that
						// throws an error if delete can't happen to just returning instead.
					}
				}
			} else if (e.key.startsWith('Arrow')) {
				if (selItem && store.get.isMoveable(selItem)) {
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
								// TODO: doesn't prevent arrow base from coming off rounded callout corners
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
						const undoText = t('action.edit.item.move.undo_@mf',
							{item: t('glossary.' + selItem.type.toLowerCase())},
						);
						undoStack.commit('item.reposition', {item, dx, dy}, undoText);
					}
				}
			} else {
				// Check if key is a menu shortcut
				const menu = this.navBarContent;
				const key = ((e.ctrlKey || metaKeyDown) ? 'ctrl+' : '') + e.key;
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
		haveModel: UiOps.haveModel,
	},
	computed: {
		currentPageId: {
			get() {
				return ReactiveState.currentPageId.value;
			},
			set(v) {
				ReactiveState.currentPageId.value = v;
			},
		},
		selectedItemLookup: {
			get() {
				return ReactiveState.selectedItemLookup.value;
			},
			set(v) {
				ReactiveState.selectedItemLookup.value = v;
			},
		},
		contextMenu: {
			get() {
				return ReactiveState.contextMenu.value;
			},
			set(v) {
				ReactiveState.contextMenu.value = v;
			},
		},
		filename: {
			get() {
				return ReactiveState.filename.value;
			},
			set(v) {
				ReactiveState.filename.value = v;
			},
		},
		statusText() {
			return ReactiveState.statusText.value;
		},
		busyText() {
			return ReactiveState.busyText.value;
		},
		isDirty() {
			return ReactiveState.dirtyState.undoIndex !== ReactiveState.dirtyState.lastSaveIndex;
		},
		navBarContent() {
			return Menu();
		},
		isTemplatePageCurrent() {
			return (this.currentPageId == null)
				? false
				: store.get.isTemplatePage(this.currentPageId);
		},
	},
	async mounted() {

		// TODO: grey out progress bar when 'Model Import' dialog is visible; otherwise it's confusing
		//		 if progress bar isn't at 100 but its done loading and waiting for user to click
		// TODO: progress bar should never stop at less than 100; clear it when model is imported
		// TODO: show template page always, even when no model loaded.
		// 		This lets you import a model with the desired template already in place.
		document.body.addEventListener('keyup', e => {
			this.globalKeyPress(e, false);
		});
		document.body.addEventListener('keydown', e => {
			if (e.metaKey && e.key !== 'Meta') {
				this.globalKeyPress(e, true);
			}
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

			if (!this.disableLocalStorage) {
				const splitStyle = document.getElementById('leftPane').style;
				uiState.set('splitter', parseFloat(splitStyle.width.match(/calc\(([0-9.]*)%/)[1]));

				uiState.set('lastUsedVersion', packageInfo.version);

				Storage.replace.ui(uiState.getCurrentState());

				if (this && this.isDirty) {
					const msg = 'You have unsaved changes. Leave anyway?';
					e.returnValue = msg;
					return msg;
				}
			}

			return null;
		});

		EventBus.on('set-selected', item => {
			SelectionOps.setSelected(item);
		});

		EventBus.on('redraw-ui', props => {
			UiOps.redrawUI(props.clearSelection);
		});

		undoStack.onChange(() => {
			ReactiveState.dirtyState.undoIndex = undoStack.getIndex();
			UiOps.redrawUI();
		});

		// Enable splitter between tree and page view
		const split = Storage.get.ui().splitter;
		Split(['#leftPane', '#rightPane'], {
			sizes: [split, 100 - split],
			minSize: [100, store.state.template.page.width + 10],
			direction: 'horizontal',
			gutterSize: 5,
			snapOffset: 0,
		});

		if (_.version.isOldVersion(uiState.get('lastUsedVersion'), packageInfo.version)) {
			await DialogManager('whatsNewDialog');
		}

		await LocaleManager.pickLanguage();

		LDParse.setCustomColorTable(Storage.get.customBrickColors());

		const localModel = Storage.get.model();
		if (!_.isEmpty(localModel)) {
			FileOps.openLicFileFromContent(localModel);
		}
	},
};

window.__lic = {  // store a global reference to these for easier testing
	// TODO: only generate this in the debug build and in Cypress
	_, store, undoStack, LDParse, Storage, uiState,
};

export default UI;

</script>
