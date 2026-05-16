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
								:ref="'guide-' + guideId"
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

<script lang="ts">
import {nextTick, defineComponent} from 'vue';
import _ from '../util';
import * as SelectionOps from '../selection_ops';
import {Draw} from '../draw';
import store from '../store';
import undoStack from '../undo_stack';
import uiState from '../ui_state';
import Guide from './guide.vue';
import EventBus from '../event_bus';
import {t} from '../translations';
import {selectedItemLookup, currentPageId as currentPageIdRef} from '../ui_reactive_state';
import {
	type LookupItem, type Size, type Step, type ItemTypes, type Page, type Point, type GuideInterface,
	type ItemTypeNames, type Box,
} from '../item_types';

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

export default defineComponent({
	name: 'PageView',
	components: {Guide},
	props: [],
	data() {
		return {
			pageSize: {
				width: store.state.template.page.width,
				height: store.state.template.page.height,
			} as Size,
			pageCount: 0,
			pageLockStatus: [] as boolean[],
			facingPage: uiState.get('pageView.facingPage') as boolean,
			scroll: uiState.get('pageView.scroll') as boolean,
			mouseDownPt: null as Point | null,
			mouseDragItem: null as MouseDragItem,
			guides: uiState.get('guides') as GuideInterface[],
			multiPagePadding,
		};
	},
	watch: {
		selectedItem(newItem: LookupItem | null) {
			if (newItem == null || this.currentPageId == null) {
				return;
			}
			const currentPage = store.get.page(this.currentPageId);
			if (currentPage?.stretchedStep != null) {
				const stretchedStep = {
					type: 'step' as ItemTypeNames,
					id: currentPage.stretchedStep.stepID,
				};
				if (store.get.isDescendent(newItem, stretchedStep)) {
					this.scrollToPage(currentPage.id);
					return;
				}
			}
			const newPage = store.get.pageForItem(newItem);
			if (newPage) {
				this.scrollToPage(newPage.id);
			} else {
				this.drawVisiblePages();
			}
		},
	},
	methods: {
		isTemplatePage(pageId: number): boolean {
			return store.get.page(pageId).subtype === 'templatePage';
		},
		getCanvasID(pageId: number): string {
			return getCanvasID(pageId);
		},
		togglePageLock(pageId: number) {
			const locked = this.pageLockStatus[pageId];
			setPageLocked(pageId)(!locked);
		},
		onScroll() {
			if (this.isScrollingView) {
				this.drawVisiblePages();
			}
		},
		forceUpdate() {
			const pageSize = store.state.template.page;
			if (
				(this.pageSize.width !== pageSize.width)
				|| (this.pageSize.height !== pageSize.height)
			) {
				this.pageSize.width = pageSize.width;
				this.pageSize.height = pageSize.height;
			}
			const latestPageCount = store.get.pageCount();
			if (this.pageCount !== latestPageCount) {
				this.pageCount = latestPageCount;
			}
			this.pageLockStatus = [];
			this.guides = uiState.get('guides');
			if (latestPageCount > 0) {
				store.state.pages.forEach((page: Page) => (this.pageLockStatus[page.id] = page.locked));
				nextTick(() => {
					this.drawVisiblePages();
				});
			}
		},
		mouseDown(e: MouseEvent) {
			if (e.button !== 0 || e.target == null) {
				return;
			}
			const target: HTMLElement = e.target as HTMLElement;
			if (target.nodeName !== 'CANVAS' && !target.className.includes('guide')) {
				return;
			}
			this.mouseDownPt = {x: e.offsetX, y: e.offsetY};
			if (target.className.includes('guide') && target.dataset.id != null) {
				this.mouseDragItem = {
					type: 'guide',
					guide: (this.$refs[target.dataset.id] as InstanceType<typeof Guide>[])[0],
					moved: false,
					x: e.screenX,
					y: e.screenY,
				};
			} else if (this.selectedItem) {
				const item = store.get.lookupToItem(this.selectedItem);
				const page = getPageForCanvas(target);
				if (item && store.get.isMoveable(item)
					&& inHighlightBox(e.offsetX, e.offsetY, item, this.pageSize, page)
				) {
					this.mouseDragItem = {
						type: 'item',
						item,
						moved: false,
						x: e.screenX,
						y: e.screenY,
					};
				}
			}
		},
		mouseMove(e: MouseEvent) {
			if (e.buttons !== 1 || e.target == null) {
				return;
			}
			const target: HTMLElement = e.target as HTMLElement;
			if (this.mouseDragItem == null
				|| (target.nodeName !== 'CANVAS' && !target.className.includes('guide'))
			) {
				return;
			}
			const dx = Math.floor(e.screenX - this.mouseDragItem.x);
			const dy = Math.floor(e.screenY - this.mouseDragItem.y);
			if (dx === 0 && dy === 0) {
				return;
			}
			const up = {x: e.offsetX, y: e.offsetY};
			if (this.mouseDragItem.type === 'guide') {
				this.mouseDragItem.guide.moveBy(dx, dy);
			} else if (this.mouseDownPt
				&& _.geom.distance(this.mouseDownPt, up) > 5
				&& this.mouseDragItem.type === 'item'
			) {
				// TODO: Update parent bounding boxes for children like CSI, submodel, etc
				store.mutations.item.reposition({item: this.mouseDragItem.item, dx, dy});
				this.mouseDragItem.moved = true;
				this.drawVisiblePages();
			}
			this.mouseDragItem.x = e.screenX;
			this.mouseDragItem.y = e.screenY;
		},
		mouseUp(e: MouseEvent) {
			if (e.button !== 0 || e.target == null) {
				return;
			}
			const target: HTMLElement = e.target as HTMLElement;
			if (this.mouseDownPt
				&& (this.mouseDragItem == null || !this.mouseDragItem.moved)
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
			} else if (this.mouseDragItem?.type === 'guide') {
				this.mouseDragItem.guide.savePosition();
			} else if (this.mouseDragItem?.type === 'item' && this.mouseDragItem.moved) {
				const item = t('glossary.' + this.mouseDragItem.item.type.toLowerCase());
				const undoText = t('action.edit.item.move.undo_@mf', {item});
				undoStack.commit('', null, undoText);
			} else if (target.nodeName !== 'CANVAS') {
				SelectionOps.clearSelected();
			}
			this.mouseDownPt = this.mouseDragItem = null;
		},
		pageUp() {
			if (this.currentPageId == null) {
				return;
			}
			let prevPage = store.get.prevPage({type: 'page', id: this.currentPageId});
			if (this.isFacingView) {
				const page = store.get.page(this.currentPageId);
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
		},
		pageDown() {
			if (this.currentPageId == null) {
				return;
			}
			let nextPage = store.get.nextPage({type: 'page', id: this.currentPageId});
			if (this.isFacingView) {
				const page = store.get.page(this.currentPageId);
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
		},
		handleKeyPress({key}: {key: string}) {
			if (key === 'PageDown') {
				this.pageDown();
			} else if (key === 'PageUp') {
				this.pageUp();
			}
		},
		// This will trigger a full visible page redraw
		scrollToPage(pageId: number) {
			nextTick(() => {
				if (!this.isScrollingView) {
					this.drawVisiblePages();
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
				if (this.isFacingView) {
					newScroll = (canvas.parentElement?.parentElement?.parentElement?.offsetTop ?? 0) - dy;
				} else {
					newScroll = (canvas.parentElement?.parentElement?.offsetTop ?? 0) - dy;
				}
				newScroll = Math.max(0, Math.floor(newScroll));
				if (container.scrollTop === newScroll) {
					// If scrollTop doesn't change, it doesn't trigger a scroll event
					this.drawVisiblePages();
				} else {
					// This triggers a scroll event, which will redraw visible pages
					container.scrollTop = newScroll;
				}
			});
		},
		scrollToPageHandler({pageId}: {pageId: number}) {
			this.scrollToPage(pageId);
		},
		drawVisiblePages() {
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
						this.drawPage(canvas);
					}
				});
		},
		drawPage(canvas: HTMLCanvasElement) {
			const page = getPageForCanvas(canvas);
			if (page != null) {
				Draw.page(page, canvas, {selectedItem: this.selectedItem});
			}
		},
		setPageView({facingPage = false, scroll = false}) {
			SelectionOps.clearSelected();
			this.facingPage = facingPage;
			this.scroll = scroll;
			uiState.set('pageView', {facingPage, scroll});

			if (scroll && this.currentPageId) {
				this.scrollToPage(this.currentPageId);
			} else {
				nextTick(() => {
					this.drawVisiblePages();
				});
			}
		},
	},
	computed: {
		selectedItem(): LookupItem | null {
			return selectedItemLookup.value;
		},
		currentPageId(): number | null {
			return currentPageIdRef.value;
		},
		isFacingView(): boolean {
			return this.facingPage
				&& (this.currentPageId == null
					|| !store.get.isTemplatePage(this.currentPageId));
		},
		isScrollingView(): boolean {
			return this.scroll && this.pageCount > 1
				&& (this.currentPageId == null
					|| !store.get.isTemplatePage(this.currentPageId));
		},
		pageIDsToDraw(): (number | null)[] {
			const currentPageId = this.currentPageId;
			if (currentPageId != null && store.get.isTemplatePage(currentPageId)) {
				return [currentPageId];
			} else if (this.isScrollingView) {
				const ids: (number | null)[] = store.get.pageList().map((p: Page) => p.id as number | null);
				ids.shift();
				if (this.isFacingView) {
					ids.unshift(null);
				}
				return ids;
			} else if (this.isFacingView) {
				return getPairedPages(currentPageId);
			} else if (currentPageId != null) {
				return [currentPageId];
			}
			return [];
		},
		pageGroups(): {pageId: number | null; idx: number}[][] {
			const ids = this.pageIDsToDraw;
			if (this.isFacingView && this.isScrollingView) {
				const result: {pageId: number | null; idx: number}[][] = [];
				for (let i = 0; i < ids.length; i += 2) {
					result.push(ids.slice(i, i + 2).map((pageId, j) => ({pageId, idx: i + j})));
				}
				return result;
			}
			return ids.map((pageId, idx) => [{pageId, idx}]);
		},
		scrollPaddingHeight(): number {
			return getPageOffset() - multiPagePadding;
		},
	},
	mounted() {
		EventBus.on('key-press', this.handleKeyPress);
		EventBus.on('page-resize', this.forceUpdate);
		EventBus.on('scroll-to-page', this.scrollToPageHandler);
		EventBus.on('set-page-view', this.setPageView);
		EventBus.on('draw-current-page', this.drawVisiblePages);
		EventBus.on('force-update', this.forceUpdate);
	},
	beforeUnmount() {
		EventBus.off('page-resize', this.forceUpdate);
		EventBus.off('scroll-to-page', this.scrollToPageHandler);
		EventBus.off('set-page-view', this.setPageView);
		EventBus.off('draw-current-page', this.drawVisiblePages);
		EventBus.off('force-update', this.forceUpdate);
	},
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

function getCanvasID(pageId: number): string {
	return `pageCanvas_${pageId}`;
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
	pageSize: Size,
	page?: Page | null,
): boolean {
	const box = store.get.highlightBox(item, pageSize, page);
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
