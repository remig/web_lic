/* Web Lic - Copyright (C) 2018 Remi Gagne */

import {nextTick} from 'vue';

import EventBus from './event_bus';
import {Point} from './item_types';
import * as SelectionOps from './selection_ops';
import store from './store';
import * as ReactiveState from './ui_reactive_state';

export function haveModel(): boolean {
	return store != null && store.model != null;
}

export function clearState() {
	ReactiveState.currentPageId.value = null;
	SelectionOps.clearSelected();
	ReactiveState.contextMenu.value = null;
	ReactiveState.filename.value = null;
	ReactiveState.statusText.value = '';
	ReactiveState.updateProgress({clear: true});
	ReactiveState.dirtyState.undoIndex = 0;
	ReactiveState.dirtyState.lastSaveIndex = 0;
	forceUIUpdate();
}

export function forceUIUpdate() {
	EventBus.emit('force-update');
}

export function redrawUI(clearSelection?: boolean) {
	nextTick(() => {
		if (clearSelection) {
			SelectionOps.clearSelected();
		}
		forceUIUpdate();
		drawCurrentPage();
	});
}

export function drawCurrentPage() {
	if (ReactiveState.currentPageId.value != null) {
		let page = store.get.lookupToItem(ReactiveState.currentPageId.value, 'page');
		if (page == null) {
			page = store.get.firstPage();
			ReactiveState.currentPageId.value = page ? page.id : null;
		}
		EventBus.emit('draw-current-page');
	}
}

export function closeMenus() {
	EventBus.emit('hide-menus');
}

function getCanvasID(pageId: number): string {
	return `pageCanvas_${pageId}`;
}

function getCanvasForPage(pageId: number): HTMLElement | null {
	return document.getElementById(getCanvasID(pageId));
}

export function pageCoordsToCanvasCoords(point: Point): Point {
	if (ReactiveState.currentPageId.value == null) {
		return {x: 0, y: 0};
	}
	const canvas = getCanvasForPage(ReactiveState.currentPageId.value);
	if (canvas == null) {
		return {x: 0, y: 0};
	}
	const box = canvas.getBoundingClientRect();
	return {
		x: Math.floor(point.x - box.x),
		y: Math.floor(point.y - box.y),
	};
}
