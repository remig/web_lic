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
			pageCount: store.get.pageCount(),
			facingPage: false,
			scroll: false
		};
	},
	watch: {
		selectedItem(newItem) {
			this.scrollToPage(store.get.pageForItem(newItem));
		},
		currentPageLookup(newPage) {
			this.scrollToPage(newPage);
		}
	},
	methods: {
		update() {
			let needsRedraw = false;
			const pageSize = store.state.template.page;
			if ((this.pageSize.width !== pageSize.width) || (this.pageSize.height !== pageSize.height)) {
				this.pageSize.width = store.state.template.page.width;
				this.pageSize.height = store.state.template.page.height;
				needsRedraw = true;
			}
			if (this.pageCount !== store.get.pageCount()) {
				this.pageCount = store.get.pageCount();
				needsRedraw = true;
			}
			if (needsRedraw) {
				Vue.nextTick(() => {
					this.drawCurrentPage();
				});
			}
		},
		inBox(x, y, t) {
			const box = store.get.targetBox(t);
			return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
		},
		// TODO: abstract the details in here better.  Shouldn't have to add more code here for each simple box container
		findClickTargetInStep(step, mx, my) {
			const csi = store.get.csi(step.csiID);
			if (step.csiID != null && this.inBox(mx, my, csi)) {
				return csi;
			}
			if (step.numberLabelID != null) {
				const lbl = store.get.numberLabel(step.numberLabelID);
				if (this.inBox(mx, my, lbl)) {
					return lbl;
				}
			}
			if (step.submodelImageID != null) {
				const submodelImage = store.get.submodelImage(step.submodelImageID);
				if (this.inBox(mx, my, submodelImage)) {
					if (submodelImage.quantityLabelID != null) {
						const quantityLabel = store.get.quantityLabel(submodelImage.quantityLabelID);
						if (this.inBox(mx, my, quantityLabel)) {
							return quantityLabel;
						}
					}
					return submodelImage;
				}
			}
			if (step.pliID != null && store.state.plisVisible) {
				const pli = store.get.pli(step.pliID);
				for (let i = 0; i < pli.pliItems.length; i++) {
					const pliItem = store.get.pliItem(pli.pliItems[i]);
					if (this.inBox(mx, my, pliItem)) {
						return pliItem;
					}
					const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
					if (this.inBox(mx, my, quantityLabel)) {
						return quantityLabel;
					}
				}
				if (this.inBox(mx, my, pli)) {
					return pli;
				}
			}
			if (step.callouts) {
				for (let i = 0; i < step.callouts.length; i++) {
					const callout = store.get.callout(step.callouts[i]);
					for (let j = 0; j < callout.steps.length; j++) {
						const step = store.get.step(callout.steps[j]);
						const innerTarget = this.findClickTargetInStep(step, mx, my);
						if (innerTarget) {
							return innerTarget;
						}
					}
					if (this.inBox(mx, my, callout)) {
						return callout;
					}
					for (let k = 0; k < callout.calloutArrows.length; k++) {
						const arrow = store.get.calloutArrow(callout.calloutArrows[k]);
						const arrowPoints = store.get.calloutArrowToPoints(arrow);
						let arrowBox = util.geom.bbox(arrowPoints);
						arrowBox = util.geom.expandBox(arrowBox, 8, 8);
						if (this.inBox(mx, my, {...arrow, ...arrowBox})) {
							return arrow;
						}
					}
				}
			}
			if (step.rotateIconID != null) {
				const icon = store.get.rotateIcon(step.rotateIconID);
				if (this.inBox(mx, my, icon)) {
					return icon;
				}
			}
			if (this.inBox(mx, my, step)) {
				return step;
			}
			return null;
		},
		findClickTargetInPage(page, mx, my) {
			page = store.get.lookupToItem(page);
			if (!page) {
				return null;
			}
			if (page.numberLabelID != null) {
				const lbl = store.get.numberLabel(page.numberLabelID);
				if (this.inBox(mx, my, lbl)) {
					return lbl;
				}
			}
			if (page.annotations != null) {
				for (let i = 0; i < page.annotations.length; i++) {
					const a = store.get.annotation(page.annotations[i]);
					if (this.inBox(mx, my, a)) {
						return a;
					}
				}
			}
			for (let i = 0; i < page.dividers.length; i++) {
				const divider = store.get.divider(page.dividers[i]);

				let box = util.geom.bbox([divider.p1, divider.p2]);
				box = util.geom.expandBox(box, 8, 8);
				if (this.inBox(mx, my, {...divider, ...box})) {
					return divider;
				}
			}
			for (let i = 0; i < page.steps.length; i++) {
				const step = store.get.step(page.steps[i]);
				const innerTarget = this.findClickTargetInStep(step, mx, my);
				if (innerTarget) {
					return innerTarget;
				}
			}
			return page;
		},
		click(e, pageID) {
			const page = (pageID == null) ? this.currentPageLookup : store.get.page(pageID);
			const target = this.findClickTargetInPage(page, e.offsetX, e.offsetY);
			if (target) {
				this.app.setSelected(target);
			} else {
				this.app.clearSelected();
			}
		},
		clearPageCanvas() {
			const canvasList = document.querySelectorAll('canvas[id^="pageCanvas"]');
			util.toArray(canvasList).forEach(canvas => {
				canvas.width = canvas.width;
			});
		},
		drawCurrentPage() {
			if (this.isScrollingView) {
				const pageCount = this.pageCount;
				for (let i = 0; i < pageCount; i++) {
					const page = store.state.pages[i];
					this.drawPage(page, document.getElementById('pageCanvas' + page.id));
				}
			} else {
				if (this.currentPageLookup != null) {
					this.clearPageCanvas();
					const page = store.get.lookupToItem(this.currentPageLookup);
					this.drawPage(page, document.getElementById('pageCanvas'));
				}
			}
		},
		drawPage(page, canvas, scale = 1) {
			const selectedPart = (this.selectedItem && this.selectedItem.type === 'part') ? this.selectedItem : null;
			Draw.page(page, canvas, scale, selectedPart);
		},
		scrollToPage(page) {
			if (!this.isScrollingView) {
				return;
			}
			page = store.get.lookupToItem(page);
			if (page) {
				const pageCanvas = document.getElementById('pageCanvas' + page.id);
				if (pageCanvas) {
					const container = document.getElementById('rightSubPane');
					const dy = (container.offsetHeight - pageCanvas.offsetHeight) / 2;
					container.scrollTop = pageCanvas.offsetTop - dy;
				}
			}
		},
		pageIndexToID(pageIndex) {
			return store.state.pages[pageIndex].id;
		}
	},
	computed: {
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
		},
		highlightStyle() {
			const selItem = store.get.lookupToItem(this.selectedItem);
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
				box = {x: 0, y: 0, width: this.pageSize.width, height: this.pageSize.height};
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
			if (template && template.border && template.border.width) {
				borderWidth = Math.ceil(template.border.width / 2);
			}
			const canvas = document.getElementById('pageCanvas' + (this.isScrollingView ? page.id : ''));
			return {
				display: 'block',
				left: `${canvas.offsetLeft + box.x - 4 - borderWidth}px`,
				top: `${canvas.offsetTop + box.y - 4 - borderWidth}px`,
				width: `${box.width + ((4 + borderWidth) * 2)}px`,
				height: `${box.height + ((4 + borderWidth) * 2)}px`
			};
		}
	}
});
