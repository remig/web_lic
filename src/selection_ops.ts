/* Web Lic - Copyright (C) 2019 Remi Gagne */

import {nextTick} from 'vue';

import ContextMenu from './context_menu';
import EventBus from './event_bus';
import NavTree from './navtree';
import store from './store';
import * as UiOps from './ui_ops';
import * as ReactiveState from './ui_reactive_state';
import _ from './util';

export function setCurrentPage(page: any) {
	if (page.id !== ReactiveState.currentPageId.value) {
		ReactiveState.currentPageId.value = page.id;
		EventBus.emit('scroll-to-page', {pageId: page.id});
	}
}

export function setSelected(target: any, page?: any) {
	UiOps.closeMenus();
	if (_.itemEq(target, ReactiveState.selectedItemLookup.value)
		&& (page == null || page.id === ReactiveState.currentPageId.value)
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
	if (targetPage != null && targetPage.id !== ReactiveState.currentPageId.value) {
		ReactiveState.currentPageId.value = targetPage.id;
	}
	ReactiveState.selectedItemLookup.value = store.get.itemToLookup(target);
	NavTree.selectItem(target);
}

export function clearSelected() {
	ReactiveState.contextMenu.value = null;
	ReactiveState.selectedItemLookup.value = null;
	UiOps.drawCurrentPage();
	NavTree.clearSelected();
}

export function rightClick(e: MouseEvent) {
	UiOps.closeMenus();
	ReactiveState.lastRightClickPos.x = e.clientX;
	ReactiveState.lastRightClickPos.y = e.clientY;
	ReactiveState.contextMenu.value = null;
	if (ReactiveState.selectedItemLookup.value != null
		&& ReactiveState.currentPageId.value != null
		&& !store.get.isTemplatePage(ReactiveState.currentPageId.value)
	) {
		nextTick(() => {
			// Delay menu creation so that earlier menu clear has time to take effect
			// This is necessary as menu content may change without selected item changing
			const menu = ContextMenu(ReactiveState.selectedItemLookup.value);
			if (menu && menu.length) {
				ReactiveState.contextMenu.value = menu;
				EventBus.emit('show-menu', {e});
			}
		});
	}
}
