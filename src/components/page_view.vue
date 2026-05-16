/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div
		id="rightSubPane"
		:class="{singleEntry: !isScrollingView}"
		@mousedown="mouseDown"
		@mousemove="mouseMove"
		@mouseup="mouseUp"
		@scroll="onScroll"
	>
		<div
			v-if="pageGroups.length"
			class="pageViewContainer"
			:style="{
				width: isFacingView ? (pageSize.width * 2 + 70) + 'px' : pageSize.width + 'px',
				height: isScrollingView ? undefined : pageSize.height + 'px',
			}"
		>
			<div v-if="isScrollingView" :style="{height: scrollPaddingHeight + 'px'}" />
			<div v-for="(group, gi) in pageGroups" :key="gi">
				<div
					v-for="entry in group"
					:key="entry.pageId != null ? entry.pageId : 'null-' + entry.idx"
					:style="{position: 'relative', display: isFacingView ? 'inline' : undefined}"
				>
					<div
						:class="['pageContainer', {oddNumberedPage: isFacingView && entry.idx % 2 !== 0}]"
						:style="{
							marginTop: isScrollingView ? multiPagePadding + 'px' : undefined,
							marginBottom: isScrollingView ? multiPagePadding + 'px' : undefined,
							visibility: entry.pageId == null ? 'hidden' : undefined,
						}"
					>
						<canvas
							:id="entry.pageId != null ? getCanvasID(entry.pageId) : undefined"
							:width="pageSize.width"
							:height="pageSize.height"
							class="pageCanvas"
						/>
						<div
							v-if="entry.pageId != null && !isTemplatePage(entry.pageId) && guides.length"
							class="pageGuideContainer"
						>
							<guide
								v-for="(guideProps, guideId) in guides"
								:id="guideId"
								:ref="guideRef(guideId)"
								:key="guideId"
								:page-size="pageSize"
								:offset="{left: 0, top: 0}"
								v-bind="guideProps"
							/>
						</div>
					</div>
					<div
						v-if="entry.pageId != null && !isTemplatePage(entry.pageId)"
						:class="['pageLockBtn', {locked: pageLockStatus[entry.pageId]}]"
						@click="togglePageLock(entry.pageId)"
					>
						<i :class="['fas', pageLockStatus[entry.pageId] ? 'fa-lock' : 'fa-lock-open']" />
					</div>
				</div>
			</div>
			<div v-if="isScrollingView" :style="{height: scrollPaddingHeight + 'px'}" />
		</div>
	</div>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount,onMounted, ref, watch} from 'vue';

import {Draw} from '../draw';
import EventBus from '../event_bus';
import {
type Box,
type GuideInterface,
	type ItemTypeNames, type ItemTypes, 	type LookupItem, type Page, type Point, type Size, type Step, } from '../item_types';
import * as SelectionOps from '../selection_ops';
import store from '../store';
import {t} from '../translations';
import {currentPageId as currentPageIdRef,selectedItemLookup} from '../ui_reactive_state';
import uiState from '../ui_state';
import undoStack from '../undo_stack';
import _ from '../util';
import Guide from './guide.vue';

type MouseDragItem = {
	type: 'guide';
	guide: InstanceType<typeof Guide>;
	moved: boolean;
	x: number;
	y: number;
} | {
	type: 'item';
	item: ItemTypes;
	moved: boolean;
	x: number;
	y: number;
} | null;

const multiPagePadding = 15;

const pageSize = ref<Size>({
	width: store.state.template.page.width,
	height: store.state.template.page.height,
});
const pageCount = ref(0);
const pageLockStatus = ref<boolean[]>([]);
const facingPage = ref<boolean>(uiState.get('pageView.facingPage') as boolean);
const scroll = ref<boolean>(uiState.get('pageView.scroll') as boolean);
const guides = ref<GuideInterface[]>(uiState.get('guides') as GuideInterface[]);

// Not reactive - only used in mouse event handlers, never read in the template
let mouseDownPt: Point | null = null;
let mouseDragItem: MouseDragItem = null;

// Guide instances collected via function-ref, keyed by 'guide-N' matching data-id
const guideRefs: Record<string, InstanceType<typeof Guide>> = {};
function guideRef(id: number) {
	return (el: any) => {
		const key = 'guide-' + id;
		if (el) {
			guideRefs[key] = el;
		} else {
			delete guideRefs[key];
		}
	};
}

const selectedItem = computed(() => selectedItemLookup.value);
const currentPageId = computed(() => currentPageIdRef.value);

const isFacingView = computed(() =>
	facingPage.value
	&& (currentPageId.value == null || !store.get.isTemplatePage(currentPageId.value)),
);

const isScrollingView = computed(() =>
	scroll.value && pageCount.value > 1
	&& (currentPageId.value == null || !store.get.isTemplatePage(currentPageId.value)),
);

const pageIDsToDraw = computed((): (number | null)[] => {
	const curId = currentPageId.value;
	if (curId != null && store.get.isTemplatePage(curId)) {
		return [curId];
	} else if (isScrollingView.value) {
		const ids: (number | null)[] = store.get.pageList().map((p: Page) => p.id as number | null);
		ids.shift();
		if (isFacingView.value) {
			ids.unshift(null);
		}
		return ids;
	} else if (isFacingView.value) {
		return getPairedPages(curId);
	} else if (curId != null) {
		return [curId];
	}
	return [];
});

const pageGroups = computed((): {pageId: number | null; idx: number}[][] => {
	const ids = pageIDsToDraw.value;
	if (isFacingView.value && isScrollingView.value) {
		const result: {pageId: number | null; idx: number}[][] = [];
		for (let i = 0; i < ids.length; i += 2) {
			result.push(ids.slice(i, i + 2).map((pageId, j) => ({pageId, idx: i + j})));
		}
		return result;
	}
	return ids.map((pageId, idx) => [{pageId, idx}]);
});

const scrollPaddingHeight = computed(() => getPageOffset() - multiPagePadding);

watch(selectedItem, (newItem: LookupItem | null) => {
	if (newItem == null || currentPageId.value == null) {
		return;
	}
	const currentPage = store.get.page(currentPageId.value);
	if (currentPage?.stretchedStep != null) {
		const stretchedStep = {
			type: 'step' as ItemTypeNames,
			id: currentPage.stretchedStep.stepID,
		};
		if (store.get.isDescendent(newItem, stretchedStep)) {
			scrollToPage(currentPage.id);
			return;
		}
	}
	const newPage = store.get.pageForItem(newItem);
	if (newPage) {
		scrollToPage(newPage.id);
	} else {
		drawVisiblePages();
	}
});

function isTemplatePage(pageId: number): boolean {
	return store.get.isTemplatePage(pageId);
}

function getCanvasID(pageId: number): string {
	return `pageCanvas_${pageId}`;
}

function togglePageLock(pageId: number) {
	const locked = pageLockStatus.value[pageId];
	setPageLocked(pageId)(!locked);
}

function onScroll() {
	if (isScrollingView.value) {
		drawVisiblePages();
	}
}

function forceUpdate() {
	const ps = store.state.template.page;
	if (pageSize.value.width !== ps.width || pageSize.value.height !== ps.height) {
		pageSize.value.width = ps.width;
		pageSize.value.height = ps.height;
	}
	const latestPageCount = store.get.pageCount();
	if (pageCount.value !== latestPageCount) {
		pageCount.value = latestPageCount;
	}
	pageLockStatus.value = [];
	guides.value = uiState.get('guides');
	if (latestPageCount > 0) {
		store.state.pages.forEach((page: Page) => (pageLockStatus.value[page.id] = page.locked));
		nextTick(() => {
			drawVisiblePages();
		});
	}
}

function mouseDown(e: MouseEvent) {
	if (e.button !== 0 || e.target == null) {
		return;
	}
	const target: HTMLElement = e.target as HTMLElement;
	if (target.nodeName !== 'CANVAS' && !target.className.includes('guide')) {
		return;
	}
	mouseDownPt = {x: e.offsetX, y: e.offsetY};
	if (target.className.includes('guide') && target.dataset.id != null) {
		mouseDragItem = {
			type: 'guide',
			guide: guideRefs[target.dataset.id],
			moved: false,
			x: e.screenX,
			y: e.screenY,
		};
	} else if (selectedItem.value) {
		const item = store.get.lookupToItem(selectedItem.value);
		const page = getPageForCanvas(target);
		if (item && store.get.isMoveable(item)
			&& inHighlightBox(e.offsetX, e.offsetY, item, pageSize.value, page)
		) {
			mouseDragItem = {
				type: 'item',
				item,
				moved: false,
				x: e.screenX,
				y: e.screenY,
			};
		}
	}
}

function mouseMove(e: MouseEvent) {
	if (e.buttons !== 1 || e.target == null) {
		return;
	}
	const target: HTMLElement = e.target as HTMLElement;
	if (mouseDragItem == null
		|| (target.nodeName !== 'CANVAS' && !target.className.includes('guide'))
	) {
		return;
	}
	const dx = Math.floor(e.screenX - mouseDragItem.x);
	const dy = Math.floor(e.screenY - mouseDragItem.y);
	if (dx === 0 && dy === 0) {
		return;
	}
	const up = {x: e.offsetX, y: e.offsetY};
	if (mouseDragItem.type === 'guide') {
		mouseDragItem.guide.moveBy(dx, dy);
	} else if (mouseDownPt
		&& _.geom.distance(mouseDownPt, up) > 5
		&& mouseDragItem.type === 'item'
	) {
		// TODO: Update parent bounding boxes for children like CSI, submodel, etc
		store.mutations.item.reposition({item: mouseDragItem.item, dx, dy});
		mouseDragItem.moved = true;
		drawVisiblePages();
	}
	mouseDragItem.x = e.screenX;
	mouseDragItem.y = e.screenY;
}

function mouseUp(e: MouseEvent) {
	if (e.button !== 0 || e.target == null) {
		return;
	}
	const target: HTMLElement = e.target as HTMLElement;
	if (mouseDownPt
		&& (mouseDragItem == null || !mouseDragItem.moved)
		&& target.nodeName === 'CANVAS'
	) {
		const page = getPageForCanvas(target);
		if (page == null) {
			return;
		}
		const clickTarget = findClickTargetInPage(page, e.offsetX, e.offsetY);
		if (clickTarget) {
			SelectionOps.setSelected(clickTarget, page);
		} else {
			SelectionOps.clearSelected();
		}
	} else if (mouseDragItem?.type === 'guide') {
		mouseDragItem.guide.savePosition();
	} else if (mouseDragItem?.type === 'item' && mouseDragItem.moved) {
		const item = t('glossary.' + mouseDragItem.item.type.toLowerCase());
		const undoText = t('action.edit.item.move.undo_@mf', {item});
		undoStack.commit('', null, undoText);
	} else if (target.nodeName !== 'CANVAS') {
		SelectionOps.clearSelected();
	}
	mouseDownPt = null;
	mouseDragItem = null;
}

function pageUp() {
	if (currentPageId.value == null) {
		return;
	}
	let prevPage = store.get.prevPage({type: 'page', id: currentPageId.value});
	if (isFacingView.value) {
		const page = store.get.page(currentPageId.value);
		if (!_.isEven(page.number) && prevPage != null) {
			const prevPrevPage = store.get.prevPage(prevPage);
			if (prevPrevPage) {
				prevPage = prevPrevPage;
			}
		}
	}
	if (prevPage) {
		SelectionOps.clearSelected();
		SelectionOps.setCurrentPage(prevPage);
	}
}

function pageDown() {
	if (currentPageId.value == null) {
		return;
	}
	let nextPage = store.get.nextPage({type: 'page', id: currentPageId.value});
	if (isFacingView.value) {
		const page = store.get.page(currentPageId.value);
		if (nextPage != null && page.number > 0 && _.isEven(page.number)) {
			const nextNextPage = store.get.nextPage(nextPage);
			if (nextNextPage) {
				nextPage = nextNextPage;
			}
		}
	}
	if (nextPage) {
		SelectionOps.clearSelected();
		SelectionOps.setCurrentPage(nextPage);
	}
}

function handleKeyPress({key}: {key: string}) {
	if (key === 'PageDown') {
		pageDown();
	} else if (key === 'PageUp') {
		pageUp();
	}
}

// This will trigger a full visible page redraw
function scrollToPage(pageId: number) {
	nextTick(() => {
		if (!isScrollingView.value) {
			drawVisiblePages();
			return;
		}
		const canvas = getCanvasForPage(pageId);
		if (!canvas) {
			return;
		}
		const container = document.getElementById('rightSubPane');
		if (!container) {
			return;
		}
		const dy = ((container.offsetHeight - canvas.offsetHeight) / 2) - multiPagePadding;
		// TODO: this parent element lookup is hideously fragile and hideous
		let newScroll: number;
		if (isFacingView.value) {
			newScroll = (canvas.parentElement?.parentElement?.parentElement?.offsetTop ?? 0) - dy;
		} else {
			newScroll = (canvas.parentElement?.parentElement?.offsetTop ?? 0) - dy;
		}
		newScroll = Math.max(0, Math.floor(newScroll));
		if (container.scrollTop === newScroll) {
			// If scrollTop doesn't change, it doesn't trigger a scroll event
			drawVisiblePages();
		} else {
			// This triggers a scroll event, which will redraw visible pages
			container.scrollTop = newScroll;
		}
	});
}

function scrollToPageHandler({pageId}: {pageId: number}) {
	scrollToPage(pageId);
}

function drawVisiblePages() {
	// TODO: this gets called a lot; try caching some of this in the component or somewhere
	const container = document.getElementById('rightSubPane');
	if (container == null) {
		return;
	}
	const containerHeight = container.offsetHeight;
	const containerTop = container.parentElement?.offsetTop ?? 0;
	document.querySelectorAll<HTMLCanvasElement>('canvas[id^="pageCanvas"]')
		.forEach(canvas => {
			const box = canvas.getBoundingClientRect();
			const y = box.y - containerTop;
			if (y < containerHeight && (y + box.height) > 0) {
				drawPage(canvas);
			}
		});
}

function drawPage(canvas: HTMLCanvasElement) {
	const page = getPageForCanvas(canvas);
	if (page != null) {
		Draw.page(page, canvas, {selectedItem: selectedItem.value});
	}
}

function setPageView({facingPage: fp = false, scroll: sc = false}) {
	SelectionOps.clearSelected();
	facingPage.value = fp;
	scroll.value = sc;
	uiState.set('pageView', {facingPage: fp, scroll: sc});
	if (sc && currentPageId.value) {
		scrollToPage(currentPageId.value);
	} else {
		nextTick(() => {
			drawVisiblePages();
		});
	}
}

onMounted(() => {
	EventBus.on('key-press', handleKeyPress);
	EventBus.on('page-resize', forceUpdate);
	EventBus.on('scroll-to-page', scrollToPageHandler);
	EventBus.on('set-page-view', setPageView);
	EventBus.on('draw-current-page', drawVisiblePages);
	EventBus.on('force-update', forceUpdate);
});

onBeforeUnmount(() => {
	EventBus.off('page-resize', forceUpdate);
	EventBus.off('scroll-to-page', scrollToPageHandler);
	EventBus.off('set-page-view', setPageView);
	EventBus.off('draw-current-page', drawVisiblePages);
	EventBus.off('force-update', forceUpdate);
});

function getPairedPages(pageId: number | null): (number | null)[] {
	if (pageId == null) {
		return [];
	}
	const page = store.get.page(pageId);
	if (store.get.isTitlePage(page)) {
		return [null, page.id];
	} else if (_.isEven(page.number)) {
		const nextPage = store.get.nextPage(page);
		return [page.id, nextPage?.id ?? null];
	}
	const prevPage = store.get.prevPage(page);
	if (prevPage == null || store.get.isTemplatePage(prevPage)) {
		return [null, page.id];
	}
	return [prevPage.id, page.id];
}

function setPageLocked(pageId: number): (locked?: boolean) => void {
	if (pageId == null) {
		return function() {};
	}
	return function(locked) {
		const opts = {page: {type: 'page', id: pageId}, locked};
		undoStack.commit('page.setLocked', opts, locked ? 'Lock Page' : 'Unlock Page');
	};
}

function getPageOffset(): number {
	const pageHeight = store.state.template.page.height;
	const container = document.getElementById('rightSubPane');
	return container ? (container.offsetHeight - pageHeight) / 2 : 0;
}

function getPageForCanvas(canvas: HTMLElement): Page | null {
	const [, id] = canvas.id.split('_');
	return store.get.lookupToItem(parseInt(id, 10), 'page') as Page | null;
}

function getCanvasForPage(pageId: number): HTMLElement | null {
	return document.getElementById(getCanvasID(pageId));
}

function inBox(x: number, y: number, box: Box | null): boolean {
	if (box == null) {
		return false;
	}
	return (x > box.x)
		&& (x < (box.x + box.width))
		&& (y > box.y)
		&& (y < (box.y + box.height));
}

function inHighlightBox(
	x: number,
	y: number,
	item: LookupItem,
	size: Size,
	page?: Page | null,
): boolean {
	const box = store.get.highlightBox(item, size, page);
	return inBox(x, y, box);
}

function inTargetBox(x: number, y: number, item: LookupItem): boolean {
	const box = store.get.targetBox(item);
	return inBox(x, y, box);
}

// TODO: abstract details in here better.  Shouldn't have to add more code here for each simple box container
// TODO: stepChildren is a good start; need to make stepChildren recursively return all ancestors,
// and check them all automatically here
function findClickTargetInStep(step: Step, mx: number, my: number): ItemTypes | null {

	if (step.csiID != null) {
		const csi = store.get.csi(step.csiID);
		for (let i = 0; i < csi.annotations.length; i++) {
			const a = store.get.annotation(csi.annotations[i]);
			if (inTargetBox(mx, my, a)) {
				return a;
			}
		}
		if (step.csiID != null && inTargetBox(mx, my, csi)) {
			return csi;
		}
	}
	if (step.steps.length) {
		for (let i = 0; i < step.steps.length; i++) {
			const innerStep = store.get.step(step.steps[i]);
			const innerTarget = findClickTargetInStep(innerStep, mx, my);
			if (innerTarget) {
				return innerTarget;
			}
		}
	}
	if (step.submodelImages.length) {
		for (let i = 0; i < step.submodelImages.length; i++) {
			const submodelImage = store.get.submodelImage(step.submodelImages[i]);
			if (inTargetBox(mx, my, submodelImage)) {
				if (submodelImage.quantityLabelID != null) {
					const quantityLabel = store.get.quantityLabel(submodelImage.quantityLabelID);
					if (inTargetBox(mx, my, quantityLabel)) {
						return quantityLabel;
					}
				}
				if (submodelImage.csiID != null) {
					const submodelCSI = store.get.csi(submodelImage.csiID);
					if (inTargetBox(mx, my, submodelCSI)) {
						return submodelCSI;
					}
				}
				return submodelImage;
			}
		}
	}
	if (step.pliID != null && store.state.plisVisible) {
		const pli = store.get.pli(step.pliID);
		if (inTargetBox(mx, my, pli)) {
			for (let i = 0; i < pli.pliItems.length; i++) {
				const pliItem = store.get.pliItem(pli.pliItems[i]);
				if (inTargetBox(mx, my, pliItem)) {
					return pliItem;
				}
				if (pliItem.quantityLabelID != null) {
					const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
					if (inTargetBox(mx, my, quantityLabel)) {
						return quantityLabel;
					}
				}
			}
			return pli;
		}
	}
	if (step.callouts.length) {
		for (let i = 0; i < step.callouts.length; i++) {
			const callout = store.get.callout(step.callouts[i]);
			if (inTargetBox(mx, my, callout)) {
				for (let j = 0; j < callout.steps.length; j++) {
					const calloutStep = store.get.step(callout.steps[j]);
					const innerTarget = findClickTargetInStep(calloutStep, mx, my);
					if (innerTarget) {
						return innerTarget;
					}
				}
				return callout;
			}
			for (let k = 0; k < callout.calloutArrows.length; k++) {
				const arrow = store.get.calloutArrow(callout.calloutArrows[k]);
				if (inTargetBox(mx, my, arrow)) {
					return arrow;
				}
			}
		}
	}
	const children = store.get.stepChildren(step);
	for (let i = 0; i < children.length; i++) {
		if (inTargetBox(mx, my, children[i])) {
			return children[i];
		}
	}
	if (inTargetBox(mx, my, step)) {
		return step;
	}
	return null;
}

function findClickTargetInPage(page: Page, mx: number, my: number): ItemTypes | null {
	if (!page) {
		return null;
	}
	if (page.numberLabelID != null) {
		const lbl = store.get.numberLabel(page.numberLabelID);
		if (inTargetBox(mx, my, lbl)) {
			return lbl;
		}
	}
	for (let i = 0; i < page.pliItems.length; i++) {
		const pliItem = store.get.pliItem(page.pliItems[i]);
		if (inTargetBox(mx, my, pliItem)) {
			return pliItem;
		}
		if (pliItem.quantityLabelID != null) {
			const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
			if (inTargetBox(mx, my, quantityLabel)) {
				return quantityLabel;
			}
		}
	}
	for (let i = 0; i < page.annotations.length; i++) {
		const a = store.get.annotation(page.annotations[i]);
		if (inTargetBox(mx, my, a)) {
			return a;
		}
	}
	for (let i = 0; i < page.dividers.length; i++) {
		const divider = store.get.divider(page.dividers[i]);

		let box = _.geom.bbox([divider.p1, divider.p2]);
		box = _.geom.expandBox(box, 8, 8);
		if (inTargetBox(mx, my, {...divider, ...box})) {
			return divider;
		}
	}
	for (let i = 0; i < page.steps.length; i++) {
		const step = store.get.step(page.steps[i]);
		const innerTarget = findClickTargetInStep(step, mx, my);
		if (innerTarget) {
			return innerTarget;
		}
	}
	if (page.stretchedStep != null) {
		const step = store.get.step(page.stretchedStep.stepID);
		const dx = page.stretchedStep.leftOffset;
		const innerTarget = findClickTargetInStep(step, mx - dx, my);
		if (innerTarget) {
			return innerTarget;
		}
	}
	return page;
}
</script>
