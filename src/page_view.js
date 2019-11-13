/* Web Lic - Copyright (C) 2018 Remi Gagne */

import Vue from 'vue';
import _ from './util';
import Draw from './draw';
import store from './store';
import undoStack from './undo_stack';
import uiState from './ui_state';
import Guide from './components/guide.vue';
import EventBus from './event_bus';

const multiPagePadding = 15;
Vue.component('pageView', {
	props: ['app', 'selectedItem', 'currentPageLookup'],
	data() {

		EventBus.$on('page-resize', () => {
			this.forceUpdate();
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

		let pageIDsToDraw;
		const pageWidth = this.pageSize.width;
		const pageHeight = this.pageSize.height;
		const scrolling = this.isScrollingView;
		const facing = this.isFacingView;
		const currentPageLookup = this.currentPageLookup;

		if (!store || !store.model) {
			return null;
		}

		function renderOnePage(idx, pageLookup, locked) {

			const canvas = createElement(
				'canvas',
				{
					attrs: {
						id: getCanvasID(pageLookup),
						width: pageWidth,
						height: pageHeight,
					},
					'class': ['pageCanvas'],
				}
			);

			let lockIcon, lockSwitch, guides = [];
			if (pageLookup && pageLookup.subtype !== 'templatePage') {
				lockIcon = createElement(
					'i',
					{'class': ['pageLockIcon', 'fas', {'fa-lock': locked, 'fa-lock-open': !locked}]}
				);
				lockSwitch = createElement(
					'el-switch',
					{
						props: {width: 20, value: locked},
						'class': 'pageLockSwitch',
						on: {input: setPageLocked(pageLookup.id)},
					}
				);

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
								...props,
							},
						}
					);
				});

				if (!_.isEmpty(guides)) {
					guides = createElement(
						'div',
						{'class': ['pageGuideContainer']},
						guides
					);
				}
			}

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
						visibility: (pageLookup == null) ? 'hidden' : null,
					},
				},
				[canvas, guides]
			);

			return createElement(
				'div',
				{style: {position: 'relative', display: facing ? 'inline' : null}},
				[canvasHolder, lockIcon, lockSwitch]
			);
		}

		if (currentPageLookup && store.get.isTemplatePage(currentPageLookup)) {
			pageIDsToDraw = [_.clone(currentPageLookup)];
		} else if (scrolling) {
			pageIDsToDraw = store.get.pageList().map(p => ({type: p.type, id: p.id}));
			pageIDsToDraw.shift();  // Don't include template page
			if (facing) {
				pageIDsToDraw.unshift(null);  // Add empty placeholder to the left of title page
			}
		} else if (facing) {
			pageIDsToDraw = getPairedPages(currentPageLookup)
				.map(p => (p ? {type: p.type, id: p.id} : null));
		} else if (currentPageLookup) {
			pageIDsToDraw = [_.clone(currentPageLookup)];
		} else {
			return null;  // No pages, nothing to render
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

		const handlers = {
			mousedown: this.mouseDown,
			mousemove: this.mouseMove,
			mouseup: this.mouseUp,
		};
		if (scrolling) {
			handlers.scroll = this.drawVisiblePages;
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
		selectedItem(newItem) {
			// TODO: consider drawing a second transparent canvas over the main canvas, that includes
			// just the highlight box.  Saves redrawing the entire page on simple highlight change.
			const currentPage = store.get.lookupToItem(this.currentPageLookup);
			if (currentPage && currentPage.stretchedStep) {
				// If selected item is in a stretched step on current page, scroll to current page
				const stretchedStep = {type: 'step', id: currentPage.stretchedStep.stepID};
				if (store.get.isDescendent(newItem, stretchedStep)) {
					this.scrollToPage(currentPage);
					return;
				}
			}
			const newPage = store.get.pageForItem(newItem);
			if (newPage) {
				this.scrollToPage(newPage);
			} else {
				this.drawVisiblePages();
			}
		},
	},
	methods: {
		forceUpdate() {
			const pageSize = store.state.template.page;
			if ((this.pageSize.width !== pageSize.width) || (this.pageSize.height !== pageSize.height)) {
				this.pageSize.width = store.state.template.page.width;
				this.pageSize.height = store.state.template.page.height;
			}
			const latestPageCount = store.get.pageCount();
			if (this.pageCount !== latestPageCount) {
				this.pageCount = latestPageCount;
			}

			this.pageLockStatus = [];
			if (latestPageCount > 0) {
				store.state.pages.forEach(page => (this.pageLockStatus[page.id] = page.locked));

				Vue.nextTick(() => {
					this.drawVisiblePages();
				});
			}
		},
		mouseDown(e) {
			if (e.button !== 0 || (e.target.nodeName !== 'CANVAS' && !e.target.className.includes('guide'))) {
				return;
			}

			// Record mouse down pos so we can check if mouse up is close enough to
			// down to trigger a 'click' for selection
			this.mouseDownPt = {x: e.offsetX, y: e.offsetY};
			if (e.target.className.includes('guide')) {
				this.mouseDragItem = {
					guide: this.$refs[e.target.dataset.id],
					x: e.screenX,
					y: e.screenY,
				};
			} else if (this.selectedItem) {
				const item = store.get.lookupToItem(this.selectedItem);
				const page = getPageForCanvas(e.target);
				if (item && store.get.isMoveable(item)
					&& inHighlightBox(e.offsetX, e.offsetY, item, this.pageSize, page)
				) {
					// If mouse down is inside a selected item, store item & down pos in case mouse
					// move follows, to support dragging items
					this.mouseDragItem = {item, x: e.screenX, y: e.screenY};
				}
			}
		},
		mouseMove(e) {
			if (e.buttons !== 1) {
				return;
			}
			if (!this.mouseDragItem
				|| (e.target.nodeName !== 'CANVAS' && !e.target.className.includes('guide'))
			) {
				return;
			}
			const dx = Math.floor(e.screenX - this.mouseDragItem.x);
			const dy = Math.floor(e.screenY - this.mouseDragItem.y);
			if (dx === 0 && dy === 0) {
				return;
			}
			if (this.mouseDragItem.guide) {
				// TODO: transient bug: sometimes dragging a guide will put up the 'stop error cursor'
				// and stop all mouse movements...
				this.mouseDragItem.guide.moveBy(dx, dy);
			} else {
				// TODO: Update parent bounding boxes for children like CSI, submodel, etc
				store.mutations.item.reposition({item: this.mouseDragItem.item, dx, dy});
				this.mouseDragItem.moved = true;
				this.drawVisiblePages();
			}
			this.mouseDragItem.x = e.screenX;
			this.mouseDragItem.y = e.screenY;
		},
		mouseUp(e) {
			if (e.button !== 0) {
				return;
			}
			const up = {x: e.offsetX, y: e.offsetY};
			if (this.mouseDownPt && _.geom.distance(this.mouseDownPt, up) < 10
				&& e.target.nodeName === 'CANVAS'
			) {
				// If mouse down + mouse up with very little movement, handle as if 'click' for selection
				const page = getPageForCanvas(e.target);
				const target = findClickTargetInPage(page, e.offsetX, e.offsetY);
				if (target) {
					this.app.setSelected(target, page);
				} else {
					this.app.clearSelected();
				}
			} else if (this.mouseDragItem && this.mouseDragItem.guide) {
				this.mouseDragItem.guide.savePosition();
			} else if (this.mouseDragItem && this.mouseDragItem.moved) {
				// Mouse drag is complete; add undo event to stack
				const item = this.tr('glossary.' + this.mouseDragItem.item.type.toLowerCase());
				const undoText = this.tr('action.edit.item.move.undo_@mf', {item});
				undoStack.commit('', null, undoText);
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
				if (page.number > 0 && _.isEven(page.number)) {
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
		// This will trigger a full visible page redraw
		scrollToPage(page) {
			Vue.nextTick(() => {
				if (!this.isScrollingView) {
					this.drawVisiblePages();
					return;
				}
				page = store.get.lookupToItem(page);
				if (!page) {
					return;
				}
				const canvas = getCanvasForPage(page);
				if (!canvas) {
					return;
				}
				const container = document.getElementById('rightSubPane');
				if (!container) {
					return;
				}
				const dy = ((container.offsetHeight - canvas.offsetHeight) / 2) - multiPagePadding;
				// TODO: this parent element lookup is hideously fragile and hideous
				let newScroll;
				if (this.isFacingView) {
					newScroll = canvas.parentElement.parentElement.parentElement.offsetTop - dy;
				} else {
					newScroll = canvas.parentElement.parentElement.offsetTop - dy;
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
		drawVisiblePages() {
			// TODO: this gets called a lot; try caching some of this in the component or somewhere
			const container = document.getElementById('rightSubPane');
			if (container == null) {
				return;
			}
			const containerHeight = container.offsetHeight;
			const containerTop = container.parentElement.offsetTop;
			document.querySelectorAll('canvas[id^="pageCanvas"]').forEach(canvas => {
				const box = canvas.getBoundingClientRect();
				const y = box.y - containerTop;
				if (y < containerHeight && (y + box.height) > 0) {
					const page = getPageForCanvas(canvas);
					this.drawPage(page, canvas);
				}
			});
		},
		drawPage(page, canvas) {
			page = store.get.lookupToItem(page);
			if (page == null) {
				// This happens if, say, a page is deleted without updating current page (like in undo / redo)
				return;
			}
			if (canvas == null) {
				canvas = getCanvasForPage(page);
			}
			if (canvas == null) {
				// Can't find canvas for this page; ignore draw.  Happens when changing between view modes
				return;
			}
			Draw.page(page, canvas, {selectedItem: this.selectedItem});
		},
		pageCoordsToCanvasCoords(point) {
			const canvas = getCanvasForPage(this.currentPageLookup);
			const box = canvas.getBoundingClientRect();
			return {
				x: Math.floor(point.x - box.x),
				y: Math.floor(point.y - box.y),
			};
		},
	},
	computed: {
		isFacingView() {
			return this.facingPage
				&& (this.currentPageLookup == null
					|| !store.get.isTemplatePage(this.currentPageLookup));
		},
		isScrollingView() {
			return this.scroll && this.pageCount > 1
				&& (this.currentPageLookup == null
					|| !store.get.isTemplatePage(this.currentPageLookup));
		},
	},
});

function getPairedPages(page) {
	page = store.get.lookupToItem(page);
	if (!page) {
		return [];
	} else if (store.get.isTitlePage(page)) {
		return [null, page];
	} else if (_.isEven(page.number)) {
		return [page, store.get.nextPage(page)];
	}
	const prevPage = store.get.prevPage(page);
	return [store.get.isTemplatePage(prevPage) ? null : prevPage, page];
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

function inHighlightBox(x, y, t, pageSize, page) {
	const box = store.get.highlightBox(t, pageSize, page);
	return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
}

function inBox(x, y, t) {
	const box = store.get.targetBox(t);
	return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
}

// TODO: abstract details in here better.  Shouldn't have to add more code here for each simple box container
// TODO: stepChildren is a good start; need to make stepChildren recursively return all ancestors,
// and check them all automatically here
function findClickTargetInStep(step, mx, my) {

	if (step.csiID != null) {
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
