/* global Vue: false */
'use strict';

import _ from './util';
import Draw from './draw';
import store from './store';
import undoStack from './undoStack';
import uiState from './uiState';
import Guide from './components/guide.vue';

Vue.component('pageView', {
	props: ['app', 'selectedItem', 'currentPageLookup'],
	data() {
		return {
			pageSize: {
				width: store.state.template.page.width,
				height: store.state.template.page.height
			},
			pageCount: 0,
			pageLockStatus: [],
			facingPage: uiState.get('pageView.facingPage'),
			scroll: uiState.get('pageView.scroll')
		};
	},
	render(createElement) {

		let pageIDsToDraw;
		const pageWidth = this.pageSize.width, pageHeight = this.pageSize.height;
		const scrolling = this.isScrollingView, facing = this.isFacingView;

		function renderOnePage(idx, pageLookup, locked) {

			const canvas = createElement(
				'canvas',
				{
					attrs: {
						id: getCanvasID(pageLookup),
						width: pageWidth,
						height: pageHeight
					},
					class: ['pageCanvas']
				}
			);

			let lockIcon, lockSwitch, guides = [];
			if (pageLookup && pageLookup.type === 'page') {
				lockIcon = createElement(
					'i',
					{class: ['pageLockIcon', 'fas', {'fa-lock': locked, 'fa-lock-open': !locked}]}
				);
				lockSwitch = createElement(
					'el-switch',
					{
						props: {width: 20},
						class: 'pageLockSwitch',
						domProps: {value: locked},
						on: {input: setPageLocked(pageLookup.id)}
					}
				);

			}
			if (pageLookup && pageLookup.type !== 'templatePage') {

				guides = uiState.get('guides').map((props, guideID) => {
					const offset = {left: 0, top: 0};
					return createElement(
						Guide,
						{
							ref: `guide-${guideID}`,
							props: {
								pageSize: {width: pageWidth, height: pageHeight},
								offset,
								id: guideID,
								...props
							}
						}
					);
				});

				if (!_.isEmpty(guides)) {
					guides = createElement(
						'div',
						{class: ['pageGuideContainer']},
						guides
					);
				}
			}

			const canvasHolder = createElement(
				'div',
				{
					class: [
						'pageContainer',
						{
							multipleEntries: scrolling,
							oddNumberedPage: facing && !_.isEven(idx)
						}
					],
					style: {
						visibility: (pageLookup == null) ? 'hidden' : null
					}
				},
				[canvas, guides]
			);

			return createElement(
				'div',
				{style: {position: 'relative', display: facing ? 'inline' : null}},
				[canvasHolder, lockIcon, lockSwitch]
			);
		}

		if (this.currentPageLookup && this.currentPageLookup.type === 'templatePage') {
			pageIDsToDraw = [this.currentPageLookup];
		} else if (scrolling) {
			pageIDsToDraw = store.get.pageList().map(p => ({type: p.type, id: p.id}));
			pageIDsToDraw.shift();  // Don't include template page
			if (facing) {
				pageIDsToDraw.unshift(null);
			}
		} else if (facing) {
			pageIDsToDraw = getPairedPages(this.currentPageLookup)
				.map(p => (p ? {type: p.type, id: p.id} : null));
		} else {
			pageIDsToDraw = [this.currentPageLookup];
		}

		let prevPagePair;
		const containerList = [];
		pageIDsToDraw.forEach((pageLookup, idx) => {
			const locked = pageLookup ? this.pageLockStatus[pageLookup.id] : false;
			const page = renderOnePage(idx, pageLookup, locked);
			if (facing && scrolling) {
				if (prevPagePair) {
					containerList.push(createElement('div', [prevPagePair, page]));
					prevPagePair = null;
				} else if (idx === pageIDsToDraw.length - 1) {
					containerList.push(createElement('div', [page]));
				} else {
					prevPagePair = page;
				}
			} else {
				containerList.push(page);
			}
		});

		if (scrolling) {
			// Pad the first & last pages so they show up in the center of the screen when scrolled all the way
			const style = {style: {height: getPageOffset() - 30 + 'px'}};
			containerList.unshift(createElement('div', style));
			containerList.push(createElement('div', style));
		}

		const subRoot = createElement(
			'div',
			{
				style: {
					width: facing ? pageWidth + pageWidth + 70 + 'px' : pageWidth + 'px',
					height: scrolling ? null : pageHeight + 'px'
				}
			},
			containerList
		);

		return createElement(
			'div',
			{
				class: {singleEntry: !scrolling},
				attrs: {id: 'rightSubPane'},
				on: {
					mousedown: this.mouseDown,
					mousemove: this.mouseMove,
					mouseup: this.mouseUp,
					scroll: this.handleScroll
				}
			},
			[subRoot]
		);
	},
	watch: {
		selectedItem(newItem, prevItem) {
			const prevPage = store.get.pageForItem(prevItem);
			const newPage = store.get.pageForItem(newItem);
			if (prevPage && (!newPage || !_.itemEq(prevPage, newPage))) {
				this.drawPage(prevPage);
			}
			if (newPage) {
				this.drawPage(newPage);
				this.scrollToPage(newPage);
			}
		},
		currentPageLookup(newPage, prevPage) {
			Vue.nextTick(() => {
				if (this.scroll && prevPage && prevPage.type === 'templatePage') {
					// When switching from template's single-page view to scrolling multi-page view, need to reset all pages, as they're blank
					store.mutations.page.setDirty();
				}
				this.drawCurrentPage();
				this.scrollToPage(newPage);
			});
		}
	},
	methods: {
		forceUpdate() {
			const pageSize = store.state.template.page;
			if ((this.pageSize.width !== pageSize.width) || (this.pageSize.height !== pageSize.height)) {
				this.pageSize.width = store.state.template.page.width;
				this.pageSize.height = store.state.template.page.height;
			}
			const latestPageCount = store.get.pageCount(true);
			if (this.pageCount !== latestPageCount) {
				this.pageCount = latestPageCount;
				store.mutations.page.setDirty();
			}

			this.pageLockStatus = [];
			store.state.pages.forEach(page => (this.pageLockStatus[page.id] = page.locked));

			Vue.nextTick(() => {
				this.drawCurrentPage();
			});
		},
		mouseDown(e) {
			if (e.button !== 0 || (e.target.nodeName !== 'CANVAS' && !e.target.className.includes('guide'))) {
				return;
			}

			// Record mouse down pos so we can check if mouse up is close enough to down to trigger a 'click' for selection
			this.mouseDownPt = {x: e.offsetX, y: e.offsetY};
			if (e.target.className.includes('guide')) {
				this.mouseDragItem = {
					guide: this.$refs[e.target.dataset.id],
					x: e.screenX,
					y: e.screenY
				};
			} else if (this.selectedItem) {
				const item = store.get.lookupToItem(this.selectedItem);
				if (item && store.get.isMoveable(item) && inHighlightBox(e.offsetX, e.offsetY, item, this.pageSize)) {
					// If mouse down is inside a selected item, store item & down pos in case mouse move follows, to support dragging items
					this.mouseDragItem = {item, x: e.screenX, y: e.screenY};
				}
			}
		},
		mouseMove(e) {
			if (e.buttons !== 1) {
				return;
			}
			if (!this.mouseDragItem || (e.target.nodeName !== 'CANVAS' && !e.target.className.includes('guide'))) {
				return;
			}
			const dx = Math.floor(e.screenX - this.mouseDragItem.x);
			const dy = Math.floor(e.screenY - this.mouseDragItem.y);
			if (dx === 0 && dy === 0) {
				return;
			}
			if (this.mouseDragItem.guide) {
				// TODO: transient bug: sometimes dragging a guide will put up the 'stop error cursor' and stop all mouse movements...
				this.mouseDragItem.guide.moveBy(dx, dy);
			} else {
				// TODO: Update parent bounding boxes for children like CSI, submodel, etc
				store.mutations.item.reposition({item: this.mouseDragItem.item, dx, dy});
				this.mouseDragItem.moved = true;
				this.drawCurrentPage();
			}
			this.mouseDragItem.x = e.screenX;
			this.mouseDragItem.y = e.screenY;
		},
		mouseUp(e) {
			if (e.button !== 0) {
				return;
			}
			const up = {x: e.offsetX, y: e.offsetY};
			if (this.mouseDownPt && _.geom.distance(this.mouseDownPt, up) < 10 && e.target.nodeName === 'CANVAS') {
				// If simple mouse down + mouse up with very little movement, handle as if 'click' for selection
				const page = getPageForCanvas(e.target);
				const target = findClickTargetInPage(page, e.offsetX, e.offsetY);
				if (target) {
					this.app.setSelected(target);
				} else {
					this.app.clearSelected();
				}
			} else if (this.mouseDragItem && this.mouseDragItem.guide) {
				this.mouseDragItem.guide.savePosition();
			} else if (this.mouseDragItem && this.mouseDragItem.moved) {
				// Mouse drag is complete; add undo event to stack
				undoStack.commit('', null, `Move ${_.prettyPrint(this.mouseDragItem.item.type)}`);
			} else if (e.target.nodeName !== 'CANVAS') {
				this.app.clearSelected();
			}
			this.mouseDownPt = this.mouseDragItem = null;
		},
		pageUp() {
			let prevPage = store.get.prevPage(this.currentPageLookup);
			if (this.isFacingView) {
				const page = store.get.page(this.currentPageLookup);
				if (!_.isEven(page.number)) {
					const prevPrevPage = store.get.prevPage(prevPage);
					if (prevPrevPage) {
						prevPage = prevPrevPage;
					}
				}
			}
			if (prevPage) {
				this.app.clearSelected();
				this.app.setCurrentPage(prevPage);
			}
		},
		pageDown() {
			let nextPage = store.get.nextPage(this.currentPageLookup);
			if (this.isFacingView) {
				const page = store.get.page(this.currentPageLookup);
				if (_.isEven(page.number)) {
					const nextNextPage = store.get.nextPage(nextPage);
					if (nextNextPage) {
						nextPage = nextNextPage;
					}
				}
			}
			if (nextPage) {
				this.app.clearSelected();
				this.app.setCurrentPage(nextPage);
			}
		},
		handleScroll() {
			if (!this.isScrollingView) {
				return;
			}
			const container = document.getElementById('rightSubPane');
			const topOffset = container.querySelector('canvas').offsetTop;
			const pageHeight = store.state.template.page.height + 30;
			let pageIndex = Math.ceil((container.scrollTop - topOffset) / pageHeight) + 1;
			if (this.isFacingView) {
				pageIndex *= 2;
			}
			const pageList = store.get.pageList();
			const page = pageList[pageIndex];
			if (page) {
				this.drawNearbyPages(page, pageList);
			}
		},
		scrollToPage(page) {
			if (!this.isScrollingView) {
				return;
			}
			page = store.get.lookupToItem(page);
			if (page) {
				const pageCanvas = getCanvasForPage(page);
				if (pageCanvas) {
					const container = document.getElementById('rightSubPane');
					const dy = (container.offsetHeight - pageCanvas.offsetHeight) / 2;
					if (this.isFacingView) {
						container.scrollTop = pageCanvas.parentElement.parentElement.parentElement.offsetTop - dy;
					} else {
						container.scrollTop = pageCanvas.parentElement.parentElement.offsetTop - dy;
					}
				}
			}
		},
		clearPageCanvas() {
			const canvasList = document.querySelectorAll('canvas[id^="pageCanvas"]');
			_.toArray(canvasList).forEach(canvas => {
				canvas.width = canvas.width;
			});
		},
		drawCurrentPage() {
			if (this.currentPageLookup) {
				if (this.currentPageLookup.type === 'templatePage') {
					this.drawPage(this.currentPageLookup);
				} else if (this.isScrollingView) {
					this.drawNearbyPages(this.currentPageLookup);
				} else if (this.isFacingView) {
					this.drawAdjacentPages(this.currentPageLookup);
				} else {
					this.drawPage(this.currentPageLookup);
				}
			}
		},
		drawAdjacentPages(page) {
			getPairedPages(page).forEach(page => this.drawPage(page));
		},
		drawNearbyPages(page, pageList) {  // pageList is optional; saves genearting the list again if caller has it
			page = store.get.lookupToItem(page);
			this.drawPage(page);  // Always redraw main page, regardless of needsDrawing state

			pageList = pageList || store.get.pageList();
			const currentPageIdx = pageList.indexOf(page);
			if (currentPageIdx < 0) {
				return;
			}
			const pageCountToDraw = this.isFacingView ? 10 : 5;
			const firstPage = Math.max(0, currentPageIdx - Math.floor(pageCountToDraw / 2));
			for (let i = firstPage; i < firstPage + pageCountToDraw; i++) {
				const nearbyPage = pageList[i];
				if (nearbyPage && nearbyPage.needsDrawing && nearbyPage !== page) {
					this.drawPage(nearbyPage);
				}
			}
		},
		drawPage(page, canvas) {
			page = store.get.lookupToItem(page);
			if (page == null) {
				return;  // This can happen if, say, a page got deleted without updating the current page (like in undo / redo)
			}
			if (canvas == null) {
				canvas = getCanvasForPage(page);
			}
			if (canvas == null) {
				return;  // Can't find a canvas for this page - ignore draw call.  Happens when we're transitioning between view modes
			}
			const selectedPart = (this.selectedItem && this.selectedItem.type === 'part') ? this.selectedItem : null;
			Draw.page(page, canvas, {selectedPart});
			delete page.needsDrawing;
			if (this.currentPageLookup && _.itemEq(page, this.currentPageLookup)) {
				const itemPage = store.get.pageForItem(this.selectedItem);
				if (_.itemEq(itemPage, this.currentPageLookup)) {
					const box = itemHighlightBox(this.selectedItem, this.pageSize);
					Draw.highlight(canvas, box.x, box.y, box.width, box.height);
				}
			}
		},
		pageCoordsToCanvasCoords(point) {
			const canvas = getCanvasForPage(this.currentPageLookup);
			const box = canvas.getBoundingClientRect();
			return {
				x: Math.floor(point.x - box.x),
				y: Math.floor(point.y - box.y)
			};
		}
	},
	computed: {
		isFacingView() {
			return this.facingPage
				&& (this.currentPageLookup == null || this.currentPageLookup.type !== 'templatePage');
		},
		isScrollingView() {
			return this.scroll && this.pageCount > 1
				&& (this.currentPageLookup == null || this.currentPageLookup.type !== 'templatePage');
		}
	}
});

function getPairedPages(page) {
	page = store.get.lookupToItem(page);
	if (!page) {
		return [];
	} else if (page.type === 'titlePage') {
		return [null, page];
	} else if (_.isEven(page.number)) {
		return [page, store.get.nextPage(page)];
	}
	return [store.get.prevPage(page), page];
}

function setPageLocked(pageID) {
	if (pageID == null) {
		return function() {};
	}
	return function(locked) {
		const opts = {page: {type: 'page', id: pageID}, locked};
		undoStack.commit('page.setLocked', opts, locked ? 'Lock Page' : 'Unlock Page');
	};
}

function getPageOffset() {
	const pageHeight = store.state.template.page.height;
	const container = document.getElementById('rightSubPane');
	return container ? (container.offsetHeight - pageHeight) / 2 : 0;
}

function getCanvasID(page) {
	return page ? `pageCanvas_${page.type}_${page.id}` : '';
}

function getPageForCanvas(canvas) {
	const [, type, id] = canvas.id.split('_');
	return store.get.lookupToItem({type, id: parseInt(id, 10)});
}

function getCanvasForPage(page) {
	return document.getElementById(getCanvasID(page));
}

function itemHighlightBox(selItem, pageSize) {
	selItem = store.get.lookupToItem(selItem);
	if (!selItem || selItem.type === 'part') {
		return {display: 'none'};
	}
	const type = selItem.type;
	const page = store.get.pageForItem(selItem);
	if (page.needsLayout) {
		store.mutations.page.layout({page});
	}
	let box;
	if (type && type.toLowerCase().endsWith('page')) {
		box = {x: 6, y: 6, width: pageSize.width - 10, height: pageSize.height - 10};
	} else if (type === 'divider') {
		let pointBox = _.geom.bbox([selItem.p1, selItem.p2]);
		pointBox = _.geom.expandBox(pointBox, 8, 8);
		box = store.get.targetBox({...selItem, ...pointBox});
	} else {
		box = store.get.targetBox(selItem);
		if (type === 'point') {
			box = {x: box.x - 2, y: box.y - 2, width: 4, height: 4};
		}
	}
	const pad = 2;
	return {
		x: box.x - pad,
		y: box.y - pad,
		width: pad + box.width + pad - 1,
		height: pad + box.height + pad - 1
	};
}

function inHighlightBox(x, y, t, pageSize) {
	const box = itemHighlightBox(t, pageSize);
	return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
}

function inBox(x, y, t) {
	const box = store.get.targetBox(t);
	return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
}

// TODO: abstract the details in here better.  Shouldn't have to add more code here for each simple box container
// TODO: stepChildren is a good start; need to make stepChildren recursively return all ancestors, and check them all automatically here
function findClickTargetInStep(step, mx, my) {

	const csi = store.get.csi(step.csiID);
	for (let i = 0; i < csi.annotations.length; i++) {
		const a = store.get.annotation(csi.annotations[i]);
		if (inBox(mx, my, a)) {
			return a;
		}
	}
	if (step.csiID != null && inBox(mx, my, csi)) {
		return csi;
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
			if (inBox(mx, my, submodelImage)) {
				if (submodelImage.quantityLabelID != null) {
					const quantityLabel = store.get.quantityLabel(submodelImage.quantityLabelID);
					if (inBox(mx, my, quantityLabel)) {
						return quantityLabel;
					}
				}
				const submodelCSI = store.get.csi(submodelImage.csiID);
				if (inBox(mx, my, submodelCSI)) {
					return submodelCSI;
				}
				return submodelImage;
			}
		}
	}
	if (step.pliID != null && store.state.plisVisible) {
		const pli = store.get.pli(step.pliID);
		if (inBox(mx, my, pli)) {
			for (let i = 0; i < pli.pliItems.length; i++) {
				const pliItem = store.get.pliItem(pli.pliItems[i]);
				if (inBox(mx, my, pliItem)) {
					return pliItem;
				}
				const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
				if (inBox(mx, my, quantityLabel)) {
					return quantityLabel;
				}
			}
			return pli;
		}
	}
	if (step.callouts.length) {
		for (let i = 0; i < step.callouts.length; i++) {
			const callout = store.get.callout(step.callouts[i]);
			if (inBox(mx, my, callout)) {
				for (let j = 0; j < callout.steps.length; j++) {
					const step = store.get.step(callout.steps[j]);
					const innerTarget = findClickTargetInStep(step, mx, my);
					if (innerTarget) {
						return innerTarget;
					}
				}
				return callout;
			}
			for (let k = 0; k < callout.calloutArrows.length; k++) {
				const arrow = store.get.calloutArrow(callout.calloutArrows[k]);
				if (inBox(mx, my, arrow)) {
					return arrow;
				}
			}
		}
	}
	const children = store.get.stepChildren(step);
	for (let i = 0; i < children.length; i++) {
		if (inBox(mx, my, children[i])) {
			return children[i];
		}
	}
	if (inBox(mx, my, step)) {
		return step;
	}
	return null;
}

function findClickTargetInPage(page, mx, my) {
	page = store.get.lookupToItem(page);
	if (!page) {
		return null;
	}
	if (page.numberLabelID != null) {
		const lbl = store.get.numberLabel(page.numberLabelID);
		if (inBox(mx, my, lbl)) {
			return lbl;
		}
	}
	for (let i = 0; i < page.pliItems.length; i++) {
		const pliItem = store.get.pliItem(page.pliItems[i]);
		if (inBox(mx, my, pliItem)) {
			return pliItem;
		}
		const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
		if (inBox(mx, my, quantityLabel)) {
			return quantityLabel;
		}
	}
	for (let i = 0; i < page.annotations.length; i++) {
		const a = store.get.annotation(page.annotations[i]);
		if (inBox(mx, my, a)) {
			return a;
		}
	}
	for (let i = 0; i < page.dividers.length; i++) {
		const divider = store.get.divider(page.dividers[i]);

		let box = _.geom.bbox([divider.p1, divider.p2]);
		box = _.geom.expandBox(box, 8, 8);
		if (inBox(mx, my, {...divider, ...box})) {
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
	return page;
}
