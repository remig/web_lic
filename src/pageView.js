/* global Vue: false */
'use strict';

const util = require('./util');
const Draw = require('./draw');
const store = require('./store');

Vue.component('pageCanvasView', {
	props: ['menuEntries', 'selectedItem', 'currentPageLookup'],
	template: '#pageCanvasView',
	data() {
		return {
			pageSize: {
				width: store.state.template.page.width,
				height: store.state.template.page.height
			},
			pageView: {
				pageCount: 0,
				facingPage: false,
				scroll: false
			}
		};
	},
	methods: {
		update() {
			const pageSize = store.state.template.page;
			if ((this.pageSize.width !== pageSize.width) || (this.pageSize.height !== pageSize.height)) {
				this.pageSize.width = store.state.template.page.width;
				this.pageSize.height = store.state.template.page.height;
				Vue.nextTick(() => {
					this.drawCurrentPage();
				});
			}
		},
		clearPageCanvas() {
			const canvas = document.getElementById('pageCanvas');
			canvas.width = canvas.width;
		},
		drawCurrentPage() {
			if (this.currentPageLookup != null) {
				this.clearPageCanvas();
				const page = store.get.lookupToItem(this.currentPageLookup);
				this.drawPage(page, document.getElementById('pageCanvas'));
			}
		},
		drawPage(page, canvas, scale = 1) {
			const selectedPart = (this.selectedItem && this.selectedItem.type === 'part') ? this.selectedItem : null;
			Draw.page(page, canvas, scale, selectedPart);
		}
	},
	computed: {
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
			return {
				display: 'block',
				left: `${box.x - 4 - borderWidth}px`,
				top: `${box.y - 4 - borderWidth}px`,
				width: `${box.width + ((4 + borderWidth) * 2)}px`,
				height: `${box.height + ((4 + borderWidth) * 2)}px`
			};
		}
	}
});
