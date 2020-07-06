/* Web Lic - Copyright (C) 2018 Remi Gagne */

import Vue, {VNode} from 'vue';
import _ from './util';
import {Draw} from './draw';
import store from './store';
import undoStack from './undo_stack';
import uiState from './ui_state';
import Guide from './components/guide.vue';
import EventBus from './event_bus';

const multiPagePadding = 15;

interface PageViewComponent {

	// globals
	$refs: {[key: string]: any};
	tr(text: string, ...args: any): string;

	// props
	app: any;
	selectedItem: LookupItem | null;
	currentPageId: number | null;

	// data
	pageSize: Size;
	pageCount: number;
	pageLockStatus: boolean[];
	facingPage: boolean;
	scroll: boolean;

	// methods
	forceUpdate(): void;
	mouseDown(e: MouseEvent): void;
	mouseMove(e: MouseEvent): void;
	mouseUp(e: MouseEvent): void;
	pageUp(): void;
	pageDown(): void;
	scrollToPage(pageId: number): void;
	drawVisiblePages(): void;
	drawPage(canvas: HTMLCanvasElement): void;
	pageCoordsToCanvasCoords(point: Point): Point;

	// computed (so they're not typed as functions but the computed function's return values)
	isFacingView: boolean;
	isScrollingView: boolean;

	// transient data
	mouseDownPt: Point | null;
	mouseDragItem: {
		type: 'guide';
		guide: any;
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
}

Vue.component('pageView', {
	props: ['app', 'selectedItem', 'currentPageId'],
	data() {

		EventBus.$on('page-resize', () => {
			const component: PageViewComponent = this as any;
			component.forceUpdate();
		});

		return {
			pageSize: {
				width: store.state.template.page.width,
				height: store.state.template.page.height,
			},
			pageCount: 0,
			pageLockStatus: [],
			facingPage: uiState.get('pageView.facingPage'),
			scroll: uiState.get('pageView.scroll'),
		};
	},
	render(createElement) {

		const component: PageViewComponent = this as any;

		let pageIDsToDraw: (number | null)[];
		const pageWidth = component.pageSize.width;
		const pageHeight = component.pageSize.height;
		const scrolling = component.isScrollingView;
		const facing = component.isFacingView;
		const currentPageId = component.currentPageId;

		if (!store || !store.model) {
			return createElement();
		}

		function renderOnePage(
			idx: number, pageId: number | null, locked: boolean
		): VNode {

			let lockIcon: VNode | undefined;
			let lockSwitch: VNode | undefined;
			let guideVNode: VNode | undefined;
			if (pageId != null && store.get.page(pageId).subtype !== 'templatePage') {
				lockIcon = createElement(
					'i',
					{
						'class': [
							'pageLockIcon',
							'fas',
							{'fa-lock': locked, 'fa-lock-open': !locked},
						],
					}
				);
				lockSwitch = createElement(
					'el-switch',
					{
						props: {width: 20, value: locked},
						'class': 'pageLockSwitch',
						on: {input: setPageLocked(pageId)},
					}
				);

				const guides: GuideInterface[] = uiState.get('guides');
				const guideVNodeList = guides.map((props, guideId) => {
					const offset = {left: 0, top: 0};
					return createElement(
						Guide,
						{
							ref: `guide-${guideId}`,
							props: {
								pageSize: {width: pageWidth, height: pageHeight},
								offset,
								id: guideId,
								...props,
							},
						}
					);
				});

				if (!_.isEmpty(guideVNodeList)) {
					guideVNode = createElement(
						'div',
						{'class': ['pageGuideContainer']},
						guideVNodeList
					);
				}
			}

			const canvas = createElement(
				'canvas',
				{
					attrs: {
						id: (pageId == null) ? null : getCanvasID(pageId),
						width: pageWidth,
						height: pageHeight,
					},
					'class': ['pageCanvas'],
				}
			);

			const canvasHolder = createElement(
				'div',
				{
					'class': [
						'pageContainer',
						{oddNumberedPage: facing && !_.isEven(idx)},
					],
					style: {
						marginTop: scrolling ? multiPagePadding + 'px' : null,
						marginBottom: scrolling ? multiPagePadding + 'px' : null,
						visibility: (pageId == null) ? 'hidden' : null,
					},
				},
				[canvas as any, guideVNode as any]
			);

			return createElement(
				'div',
				{style: {position: 'relative', display: facing ? 'inline' : null}},
				[canvasHolder as any, lockIcon as any, lockSwitch as any]
			);
		}

		if (currentPageId != null && store.get.isTemplatePage(currentPageId)) {
			pageIDsToDraw = [currentPageId];
		} else if (scrolling) {
			pageIDsToDraw = store.get.pageList().map(p => p.id);
			pageIDsToDraw.shift();  // Don't include template page
			if (facing) {
				pageIDsToDraw.unshift(null);  // Add empty placeholder to the left of title page
			}
		} else if (facing) {
			pageIDsToDraw = getPairedPages(currentPageId);
		} else if (currentPageId != null) {
			pageIDsToDraw = [currentPageId];
		} else {
			return createElement();  // No pages, nothing to render
		}

		let prevPagePair: VNode | null;
		const containerList: VNode[] = [];
		pageIDsToDraw.forEach((pageId, idx) => {
			const locked = (pageId == null) ? false : component.pageLockStatus[pageId];
			const pageVNode = renderOnePage(idx, pageId, locked);
			if (facing && scrolling) {
				if (prevPagePair) {
					containerList.push(createElement('div', [prevPagePair, pageVNode]));
					prevPagePair = null;
				} else if (idx === pageIDsToDraw.length - 1) {
					containerList.push(createElement('div', [pageVNode]));
				} else {
					prevPagePair = pageVNode;
				}
			} else {
				containerList.push(pageVNode);
			}
		});

		if (scrolling) {
			// Pad first & last pages so they're centered in the screen when scrolled all the way
			const style = {style: {height: getPageOffset() - multiPagePadding + 'px'}};
			containerList.unshift(createElement('div', style));
			containerList.push(createElement('div', style));
		}

		const subRoot = createElement(
			'div',
			{
				'class': 'pageViewContainer',
				style: {
					width: facing ? pageWidth + pageWidth + 70 + 'px' : pageWidth + 'px',
					height: scrolling ? null : pageHeight + 'px',
				},
			},
			containerList
		);

		const handlers: any = {
			mousedown: component.mouseDown,
			mousemove: component.mouseMove,
			mouseup: component.mouseUp,
		};
		if (scrolling) {
			handlers.scroll = component.drawVisiblePages;
		}

		return createElement(
			'div',
			{
				'class': {singleEntry: !scrolling},
				attrs: {id: 'rightSubPane'},
				on: handlers,
			},
			[subRoot]
		);
	},
	watch: {
		selectedItem(newItem: LookupItem | null) {

			const component: PageViewComponent = this as any;
			if (newItem == null || component.currentPageId == null) {
				return;
			}

			// TODO: consider drawing a second transparent canvas over the main canvas, that includes
			// just the highlight box.  Saves redrawing the entire page on simple highlight change.
			const currentPage = store.get.page(component.currentPageId);
			if (currentPage?.stretchedStep) {
				// If selected item is in a stretched step on current page, scroll to current page
				const stretchedStep = {
					type: 'step' as ItemTypeNames,
					id: currentPage.stretchedStep.stepID,
				};
				if (store.get.isDescendent(newItem, stretchedStep)) {
					component.scrollToPage(currentPage.id);
					return;
				}
			}
			const newPage = store.get.pageForItem(newItem);
			if (newPage) {
				component.scrollToPage(newPage.id);
			} else {
				component.drawVisiblePages();
			}
		},
	},
	methods: {
		forceUpdate() {
			const component: PageViewComponent = this as any;
			const pageSize = store.state.template.page;
			if (
				(component.pageSize.width !== pageSize.width)
				|| (component.pageSize.height !== pageSize.height)
			) {
				component.pageSize.width = store.state.template.page.width;
				component.pageSize.height = store.state.template.page.height;
			}
			const latestPageCount = store.get.pageCount();
			if (component.pageCount !== latestPageCount) {
				component.pageCount = latestPageCount;
			}

			component.pageLockStatus = [];
			if (latestPageCount > 0) {
				store.state.pages.forEach(page => (component.pageLockStatus[page.id] = page.locked));

				Vue.nextTick(() => {
					component.drawVisiblePages();
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

			// Record mouse down pos so we can check if mouse up is close enough to
			// down to trigger a 'click' for selection
			const component: PageViewComponent = this as any;
			component.mouseDownPt = {x: e.offsetX, y: e.offsetY};
			if (target.className.includes('guide') && target.dataset.id != null) {
				component.mouseDragItem = {
					type: 'guide',
					guide: component.$refs[target.dataset.id],
					moved: false,
					x: e.screenX,
					y: e.screenY,
				};
			} else if (component.selectedItem) {
				const item = store.get.lookupToItem(component.selectedItem);
				const page = getPageForCanvas(target);
				if (item && store.get.isMoveable(item)
					&& inHighlightBox(e.offsetX, e.offsetY, item, component.pageSize, page)
				) {
					// If mouse down is inside a selected item, store item & down pos in case mouse
					// move follows, to support dragging items
					component.mouseDragItem = {
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
			const component: PageViewComponent = this as any;
			if (component.mouseDragItem == null
				|| (target.nodeName !== 'CANVAS' && !target.className.includes('guide'))
			) {
				return;
			}
			const dx = Math.floor(e.screenX - component.mouseDragItem.x);
			const dy = Math.floor(e.screenY - component.mouseDragItem.y);
			if (dx === 0 && dy === 0) {
				return;
			}

			const up = {x: e.offsetX, y: e.offsetY};
			if (component.mouseDragItem.type === 'guide') {
				// TODO: transient bug: sometimes dragging a guide will put up the 'stop error cursor'
				// and stop all mouse movements...
				component.mouseDragItem.guide.moveBy(dx, dy);
			} else if (component.mouseDownPt
				&& _.geom.distance(component.mouseDownPt, up) > 5
				&& component.mouseDragItem.type === 'item'
			) {
				// TODO: Update parent bounding boxes for children like CSI, submodel, etc
				store.mutations.item.reposition({item: component.mouseDragItem.item, dx, dy});
				component.mouseDragItem.moved = true;
				component.drawVisiblePages();
			}
			component.mouseDragItem.x = e.screenX;
			component.mouseDragItem.y = e.screenY;
		},
		mouseUp(e: MouseEvent) {
			if (e.button !== 0 || e.target == null) {
				return;
			}
			const target: HTMLElement = e.target as HTMLElement;
			const component: PageViewComponent = this as any;
			if (component.mouseDownPt
				&& (component.mouseDragItem == null || !component.mouseDragItem.moved)
				&& target.nodeName === 'CANVAS'
			) {
				// If mouse down + mouse up with nothing moved, handle as if 'click' for selection
				const page = getPageForCanvas(target);
				const clickTarget = findClickTargetInPage(page, e.offsetX, e.offsetY);
				if (clickTarget) {
					component.app.setSelected(clickTarget, page);
				} else {
					component.app.clearSelected();
				}
			} else if (component.mouseDragItem?.type === 'guide') {
				component.mouseDragItem.guide.savePosition();
			} else if (component.mouseDragItem?.type === 'item' && component.mouseDragItem.moved) {
				// Mouse drag is complete; add undo event to stack
				const item = component.tr('glossary.' + component.mouseDragItem.item.type.toLowerCase());
				const undoText = component.tr('action.edit.item.move.undo_@mf', {item});
				undoStack.commit('', null, undoText);
			} else if (target.nodeName !== 'CANVAS') {
				component.app.clearSelected();
			}
			component.mouseDownPt = component.mouseDragItem = null;
		},
		pageUp() {
			const component: PageViewComponent = this as any;
			if (component.currentPageId == null) {
				return;
			}
			let prevPage = store.get.prevPage({type: 'page', id: component.currentPageId});
			if (component.isFacingView) {
				const page = store.get.page(component.currentPageId);
				if (!_.isEven(page.number) && prevPage != null) {
					const prevPrevPage = store.get.prevPage(prevPage);
					if (prevPrevPage) {
						prevPage = prevPrevPage;
					}
				}
			}
			if (prevPage) {
				component.app.clearSelected();
				component.app.setCurrentPage(prevPage);
			}
		},
		pageDown() {
			const component: PageViewComponent = this as any;
			if (component.currentPageId == null) {
				return;
			}
			let nextPage = store.get.nextPage({type: 'page', id: component.currentPageId});
			if (component.isFacingView) {
				const page = store.get.page(component.currentPageId);
				if (nextPage != null && page.number > 0 && _.isEven(page.number)) {
					const nextNextPage = store.get.nextPage(nextPage);
					if (nextNextPage) {
						nextPage = nextNextPage;
					}
				}
			}
			if (nextPage) {
				component.app.clearSelected();
				component.app.setCurrentPage(nextPage);
			}
		},
		// This will trigger a full visible page redraw
		scrollToPage(pageId: number) {
			Vue.nextTick(() => {
				const component: PageViewComponent = this as any;
				if (!component.isScrollingView) {
					component.drawVisiblePages();
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
				if (component.isFacingView) {
					newScroll = (canvas.parentElement?.parentElement?.parentElement?.offsetTop ?? 0) - dy;
				} else {
					newScroll = (canvas.parentElement?.parentElement?.offsetTop ?? 0) - dy;
				}
				newScroll = Math.max(0, Math.floor(newScroll));
				if (container.scrollTop === newScroll) {
					// If scrollTop doesn't change, it doesn't trigger a scroll event
					component.drawVisiblePages();
				} else {
					// This triggers a scroll event, which will redraw visible pages
					container.scrollTop = newScroll;
				}
			});
		},
		drawVisiblePages() {
			// TODO: this gets called a lot; try caching some of this in the component or somewhere
			const component: PageViewComponent = this as any;
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
						component.drawPage(canvas);
					}
				});
		},
		drawPage(canvas: HTMLCanvasElement) {
			const component: PageViewComponent = this as any;
			const page = getPageForCanvas(canvas);
			if (page != null) {
				Draw.page(page, canvas, {selectedItem: component.selectedItem});
			}
		},
		pageCoordsToCanvasCoords(point: Point) {
			const component: PageViewComponent = this as any;
			if (component.currentPageId == null) {
				return {x: 0, y: 0};
			}
			const canvas = getCanvasForPage(component.currentPageId);
			if (canvas == null) {
				return {x: 0, y: 0};
			}
			const box = canvas.getBoundingClientRect();
			return {
				x: Math.floor(point.x - box.x),
				y: Math.floor(point.y - box.y),
			};
		},
	},
	computed: {
		isFacingView() {
			const component: PageViewComponent = this as any;
			return component.facingPage
				&& (component.currentPageId == null
					|| !store.get.isTemplatePage(component.currentPageId));
		},
		isScrollingView() {
			const component: PageViewComponent = this as any;
			return component.scroll && component.pageCount > 1
				&& (component.currentPageId == null
					|| !store.get.isTemplatePage(component.currentPageId));
		},
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
	if (prevPage == null) {
		return [null, page.id];
	}
	return [store.get.isTemplatePage(prevPage) ? null : (prevPage.id ?? null, page.id)];
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

function getPageForCanvas(canvas: HTMLElement): Page {
	const [, id] = canvas.id.split('_');
	return store.get.page(parseInt(id, 10));
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
	t: LookupItem,
	pageSize: Size,
	page?: Page | null
): boolean {
	const box = store.get.highlightBox(t, pageSize, page);
	return inBox(x, y, box);
}

function inTargetBox(x: number, y: number, t: LookupItem): boolean {
	const box = store.get.targetBox(t);
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
				const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
				if (inTargetBox(mx, my, quantityLabel)) {
					return quantityLabel;
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
		const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
		if (inTargetBox(mx, my, quantityLabel)) {
			return quantityLabel;
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
	if (page.stretchedStep) {
		const step = store.get.step(page.stretchedStep.stepID);
		const dx = page.stretchedStep.leftOffset;
		const innerTarget = findClickTargetInStep(step, mx - dx, my);
		if (innerTarget) {
			return innerTarget;
		}
	}
	return page;
}
