/* global Vue: false */
'use strict';

const util = require('./util');
const Draw = require('./draw');
const store = require('./store');

Vue.component('pageCanvasView', {
	props: ['app', 'selectedItem', 'currentPageLookup'],
	template: '#pageCanvasView',
	data() {
		return {
			pageSize: {
				width: store.state.template.page.width,
				height: store.state.template.page.height
			},
			pageCount: 0,
			facingPage: false,
			scroll: false
		};
	},
	watch: {
		selectedItem(newItem, prevItem) {
			const prevPage = store.get.pageForItem(prevItem);
			const newPage = store.get.pageForItem(newItem);
			if (prevPage && (!newPage || !util.itemEq(prevPage, newPage))) {
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
					store.mutations.page.setDirty({includeTitlePage: true});
				}
				this.drawCurrentPage();
				this.scrollToPage(newPage);
			});
		}
	},
	methods: {
		forceUpdate() {
			let needsRedraw = false;
			const pageSize = store.state.template.page;
			if ((this.pageSize.width !== pageSize.width) || (this.pageSize.height !== pageSize.height)) {
				this.pageSize.width = store.state.template.page.width;
				this.pageSize.height = store.state.template.page.height;
				needsRedraw = true;
			}
			const latestPageCount = store.get.pageCount(true);
			if (this.pageCount !== latestPageCount) {
				this.pageCount = latestPageCount;
				store.mutations.page.setDirty({includeTitlePage: true});
				needsRedraw = true;
			}
			if (needsRedraw) {
				Vue.nextTick(() => {
					this.drawCurrentPage();
				});
			}
		},
		click(e, page) {
			page = (page == null) ? this.currentPageLookup : page;
			const target = findClickTargetInPage(page, e.offsetX, e.offsetY);
			if (target) {
				this.app.setSelected(target);
			} else {
				this.app.clearSelected();
			}
		},
		handleScroll() {
			const container = document.getElementById('rightSubPane');
			const topOffset = container.querySelector('canvas').offsetTop;
			const pageHeight = store.state.template.page.height + 30;
			let pageIndex = Math.ceil((container.scrollTop - topOffset) / pageHeight);
			pageIndex -= store.get.titlePage() ? 1 : 0;
			const page = (pageIndex < 0) ? store.get.titlePage() : store.state.pages[pageIndex];
			this.drawNearbyPages(page);
		},
		scrollToPage(page) {
			if (!this.isScrollingView) {
				return;
			}
			page = store.get.lookupToItem(page);
			if (page) {
				const pageCanvas = this.getCanvasForPage(page);
				if (pageCanvas) {
					const container = document.getElementById('rightSubPane');
					const dy = (container.offsetHeight - pageCanvas.offsetHeight) / 2;
					container.scrollTop = pageCanvas.offsetTop - dy;
				}
			}
		},
		clearPageCanvas() {
			const canvasList = document.querySelectorAll('canvas[id^="pageCanvas"]');
			util.toArray(canvasList).forEach(canvas => {
				canvas.width = canvas.width;
			});
		},
		drawCurrentPage() {
			if (this.currentPageLookup) {
				this.drawPage(this.currentPageLookup);
				if (this.scroll) {
					this.drawNearbyPages(this.currentPageLookup);
				}
			}
		},
		drawNearbyPages(page) {
			page = store.get.lookupToItem(page);
			let currentPageIdx;
			if (page.type === 'titlePage') {
				currentPageIdx = 0;
			} else {
				currentPageIdx = store.state.pages.findIndex(el => el.id === page.id);
			}
			if (currentPageIdx < 0) {
				return;
			}
			const firstPage = Math.max(0, currentPageIdx - 2);
			for (let i = firstPage; i < firstPage + 5; i++) {
				page = store.state.pages[i];
				if (page && page.needsDrawing) {
					this.drawPage(page);
				}
			}
			if (currentPageIdx < 3 && store.state.titlePage && store.state.titlePage.needsDrawing) {
				this.drawPage({id: 0, type: 'titlePage'});
			}
		},
		drawPage(page, canvas, scale = 1) {
			page = store.get.lookupToItem(page);
			if (canvas == null) {
				canvas = this.getCanvasForPage(page);
			}
			if (canvas == null) {
				return;  // Can't find a canvas for this page - ignore draw call.  Happens when we're transitioning between view modes.
			}
			const selectedPart = (this.selectedItem && this.selectedItem.type === 'part') ? this.selectedItem : null;
			Draw.page(page, canvas, scale, selectedPart);
			delete page.needsDrawing;
			if (this.currentPageLookup && util.itemEq(page, this.currentPageLookup)) {
				const itemPage = store.get.pageForItem(this.selectedItem);
				if (util.itemEq(itemPage, this.currentPageLookup)) {
					const box = itemHighlightBox(this.selectedItem, this.pageSize);
					Draw.highlight(canvas, box.x, box.y, box.width, box.height);
				}
			}
		},
		getCanvasForPage(page) {
			let id = 'pageCanvas';
			if (this.isScrollingView) {
				id += (page.type === 'titlePage') ? 'titlePage' : page.id;
			}
			return document.getElementById(id);
		}
	},
	computed: {
		pageList() {
			const pageList = store.state.pages.map(page => ({id: page.id, type: 'page'}));
			if (store.get.titlePage()) {
				pageList.unshift({id: 'titlePage', type: 'titlePage'});
			}
			pageList.pageCount = this.pageCount;
			return pageList;
		},
		isScrollingView() {
			if (this.currentPageLookup && this.currentPageLookup.type === 'templatePage') {
				return false;
			}
			return this.scroll && this.pageCount > 1;
		},
		pageCenterOffset() {
			const pageHeight = store.state.template.page.height;
			const container = document.getElementById('rightSubPane');
			return ((container.offsetHeight - pageHeight) / 2) + 'px';
		}
	}
});

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
	if (type === 'page' || type === 'titlePage' || type === 'templatePage') {
		box = {x: 6, y: 6, width: pageSize.width - 10, height: pageSize.height - 10};
	} else if (type === 'calloutArrow') {
		// TODO: store arrow / divider / stuff with points bounding box in item itself at layout time, then use it like any other target
		const points = store.get.calloutArrowToPoints(selItem);
		let pointBox = util.geom.bbox(points);
		pointBox = util.geom.expandBox(pointBox, 8, 8);
		box = store.get.targetBox({...selItem, ...pointBox});
	} else if (type === 'divider') {
		let pointBox = util.geom.bbox([selItem.p1, selItem.p2]);
		pointBox = util.geom.expandBox(pointBox, 8, 8);
		box = store.get.targetBox({...selItem, ...pointBox});
	} else {
		box = store.get.targetBox(selItem);
		if (type === 'point') {
			box = {x: box.x - 2, y: box.y - 2, width: 4, height: 4};
		}
	}
	// TODO: Handle wide borders better: x & y should be outside the border, then layout inside minus entire border width
	let borderWidth = 0;
	var template = store.get.templateForItem(selItem);
	if (template && template.border && template.border.width && !selItem.type.includes('Page')) {
		borderWidth = Math.ceil(template.border.width / 2);
	}
	return {
		x: box.x - 4 - borderWidth,
		y: box.y - 4 - borderWidth,
		width: box.width + ((4 + borderWidth) * 2),
		height: box.height + ((4 + borderWidth) * 2)
	};
}

function inBox(x, y, t) {
	const box = store.get.targetBox(t);
	return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
}

// TODO: abstract the details in here better.  Shouldn't have to add more code here for each simple box container
function findClickTargetInStep(step, mx, my) {

	if (step.numberLabelID != null) {
		const lbl = store.get.numberLabel(step.numberLabelID);
		if (inBox(mx, my, lbl)) {
			return lbl;
		}
	}
	if (step.rotateIconID != null) {
		const icon = store.get.rotateIcon(step.rotateIconID);
		if (inBox(mx, my, icon)) {
			return icon;
		}
	}
	const csi = store.get.csi(step.csiID);
	if (step.csiID != null && inBox(mx, my, csi)) {
		return csi;
	}
	if (step.submodelImageID != null) {
		const submodelImage = store.get.submodelImage(step.submodelImageID);
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
	if (step.callouts) {
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
				const arrowPoints = store.get.calloutArrowToPoints(arrow);
				let arrowBox = util.geom.bbox(arrowPoints);
				arrowBox = util.geom.expandBox(arrowBox, 8, 8);
				if (inBox(mx, my, {...arrow, ...arrowBox})) {
					return arrow;
				}
			}
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
	if (page.annotations != null) {
		for (let i = 0; i < page.annotations.length; i++) {
			const a = store.get.annotation(page.annotations[i]);
			if (inBox(mx, my, a)) {
				return a;
			}
		}
	}
	for (let i = 0; i < page.dividers.length; i++) {
		const divider = store.get.divider(page.dividers[i]);

		let box = util.geom.bbox([divider.p1, divider.p2]);
		box = util.geom.expandBox(box, 8, 8);
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
