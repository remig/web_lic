/* global Vue: false, $: false, Split: false, UndoStack: false, LDParse: false, LDRender: false, util: false, store: false, Menu: false, ContextMenu: false */

(function() {
'use strict';

const start = Date.now();

const undoStack = new UndoStack(store);

Vue.filter('sanitizeMenuID', id => {
	if (!id || id === 'separator' || typeof id !== 'string') {
		return null;
	}
	return id.toLowerCase()
		.replace('(nyi)', '')
		.trim()
		.replace(/\s/g, '_')
		.replace(/[^a-z_]/g, '') + '_menu';
});

var app = new Vue({
	el: '#container',
	data: {  // Store any transient UI state data here
		currentPageID: null,
		statusText: '',
		selectedItem: null,
		contextMenu: null
	},
	methods: {
		openRemoteLDrawModel(modelName) {
			store.model = LDParse.loadRemotePart(modelName);
			this.importLDrawModel(modelName);
		},
		importLDrawModelFromContent(content) {
			store.model = LDParse.loadPartContent(content);
			this.importLDrawModel(store.model.name);
		},
		importLDrawModel(modelName) {

			LDRender.setPartDictionary(LDParse.partDictionary);

			store.mutations.setModelName(modelName);
			store.mutations.addTitlePage();
			store.mutations.addInitialPages();

			this.currentPageID = store.state.pages[0].id;
			undoStack.saveBaseState();

			Vue.nextTick(() => this.drawCurrentPage());

			var end = Date.now();
			this.statusText = `"${store.state.modelName}" loaded successfully (${util.formatTime(start, end)})`;
		},
		getSteps(page) {
			return page.steps.map(s => store.state.steps[s]);
		},
		goToPrevPage() {
		},
		goToNextPage() {
		},
		setCurrentPage(pageID) {
			if (pageID !== app.currentPageID) {
				this.clearSelected();
				app.currentPageID = pageID;
			}
			Vue.nextTick(() => this.drawCurrentPage());
		},
		setSelected(target) {
			this.selectedItem = target;
		},
		clearState() {
			this.currentPageID = null;
			this.statusText = '';
			this.selectedItem = null;
			this.contextMenu = null;
		},
		clearSelected() {
			this.selectedItem = null;
		},
		targetBox(t) {
			const box = {x: t.x, y: t.y, width: t.width, height: t.height};
			let parent = t.parent;
			while (parent) {
				const parentList = store.state[parent.type + 's'];
				if (parentList) {
					parent = parentList[parent.id];
					box.x += parent.x || 0;
					box.y += parent.y || 0;
					parent = parent.parent;
				} else {
					parent = null;
				}
			}
			return box;
		},
		inBox(x, y, t) {
			const box = app.targetBox(t);
			return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
		},
		findClickTarget(mx, my) {
			const page = store.state.pages[this.currentPageID];
			if (!page) {
				return null;
			}
			if (page.numberLabel && app.inBox(mx, my, page.numberLabel)) {
				return page.numberLabel;
			}
			for (let i = 0; i < page.steps.length; i++) {
				const step = store.state.steps[page.steps[i]];
				if (step.csiID != null && app.inBox(mx, my, store.state.csis[step.csiID])) {
					return store.state.csis[step.csiID];
				}
				if (step.numberLabel && app.inBox(mx, my, step.numberLabel)) {
					return step.numberLabel;
				}
				if (step.pliID != null) {
					const pli = store.state.plis[step.pliID];
					for (let j = 0; j < pli.pliItems.length; j++) {
						const idx = pli.pliItems[j];
						const pliItem = store.state.pliItems[idx];
						if (app.inBox(mx, my, pliItem)) {
							return pliItem;
						}
						const pliQty = store.state.pliQtys[pliItem.quantityLabel];
						if (app.inBox(mx, my, pliQty)) {
							return pliQty;
						}
					}
					if (app.inBox(mx, my, pli)) {
						return pli;
					}
				}
				if (app.inBox(mx, my, step)) {
					return step;
				}
			}
			return page;
		},
		isMoveable(nodeType) {
			return ['step', 'csi', 'pli', 'pliItem', 'pliQty', 'pageNumber', 'stepNumber'].includes(nodeType);
		},
		globalClick(e) {
			this.closeMenu();
			let target;
			if (e.target.id === 'pageCanvas') {
				target = this.findClickTarget(e.offsetX, e.offsetY);
			}
			if (target) {
				this.setSelected(target);
			} else {
				this.clearSelected();
			}
		},
		rightClick(e) {
			if (this.selectedItem != null) {
				const menu = ContextMenu(this.selectedItem.type, app, store, undoStack);
				if (menu && menu.length) {
					this.contextMenu = menu;
					$('#contextMenu')
						.css({
							'outline-style': 'none',
							display: 'block',
							left: e.pageX,
							top: e.pageY
						}).focus();
				}
			}
		},
		closeMenu() {
			$('#contextMenu').css('display', 'none');
		},
		globalKeyPress(e) {
			this.closeMenu();
			const selectedItem = this.selectedItem;
			if (e.key === 'PageDown' && this.currentPageID + 1 < store.get.pageCount()) {
				this.setCurrentPage(store.get.nextPage(this.currentPageID).id);
			} else if (e.key === 'PageUp' && this.currentPageID > 0) {
				this.setCurrentPage(store.get.prevPage(this.currentPageID).id);
			} else if (selectedItem && e.key.startsWith('Arrow') && this.isMoveable(selectedItem.type)) {
				let dx = 0, dy = 0;
				const dv = 30;
				if (e.key === 'ArrowUp') {
					dy = -dv;
				} else if (e.key === 'ArrowDown') {
					dy = dv;
				} else if (e.key === 'ArrowLeft') {
					dx = -dv;
				} else if (e.key === 'ArrowRight') {
					dx = dv;
				}
				undoStack.commit('moveItem', {
					item: selectedItem,
					x: selectedItem.x + dx,
					y: selectedItem.y + dy
				}, `Move ${util.titleCase(selectedItem.type)}`);
				Vue.nextTick(() => this.drawCurrentPage());
			} else {
				// Check if key is a menu shortcut
				const menu = this.menuEntries;
				const key = (e.ctrlKey ? 'ctrl+' : '') + e.key;
				for (let i = 0; i < menu.length; i++) {
					for (let j = 0; j < menu[i].children.length; j++) {
						var entry = menu[i].children[j];
						if (entry.shortcut === key) {
							entry.cb();
						}
					}
				}
			}
		},
		clearPage() {
			const pageSize = store.state.pageSize;
			const canvas = document.getElementById('pageCanvas');
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, pageSize.width, pageSize.height);
		},
		drawCurrentPage() {
			if (this.currentPageID != null) {
				const page = store.state.pages[this.currentPageID];
				const canvas = document.getElementById('pageCanvas');
				canvas.width = canvas.width;
				app.drawPage(page, canvas);
			}
		},
		drawPage(page, canvas) {

			if (page.needsLayout) {
				store.mutations.layoutPage(page);
			}

			const pageSize = store.state.pageSize;
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, pageSize.width, pageSize.height);

			if (page.numberLabel) {
				ctx.fillStyle = 'black';
				ctx.font = 'bold 20pt Helvetica';
				ctx.fillText(page.number, page.numberLabel.x, page.numberLabel.y + page.numberLabel.height);
			}

			page.steps.forEach(stepID => {

				const step = store.state.steps[stepID];
				const localModel = util.getSubmodel(store.model, step.submodel);

				ctx.save();
				ctx.translate(step.x, step.y);

				if (step.csiID != null) {
					const csi = store.state.csis[step.csiID];
					const csiCanvas = util.renderCSI(localModel, step).container;
					ctx.drawImage(csiCanvas, csi.x, csi.y);  // TODO: profile performance if every x, y, w, h argument is passed in
				}

				if (step.pliID != null) {
					const pli = store.state.plis[step.pliID];
					ctx.strokeStyle = 'black';
					ctx.lineWidth = 2;
					util.roundedRect(ctx, pli.x, pli.y, pli.width, pli.height, 10);
					ctx.stroke();

					pli.pliItems.forEach(idx => {
						const pliItem = store.state.pliItems[idx];
						const part = localModel.parts[pliItem.partNumber];
						const pliCanvas = util.renderPLI(part).container;
						ctx.drawImage(pliCanvas, pli.x + pliItem.x, pli.y + pliItem.y);

						const pliQty = store.state.pliQtys[pliItem.quantityLabel];
						ctx.font = 'bold 10pt Helvetica';
						ctx.fillText(
							'x' + pliItem.quantity,
							pli.x + pliItem.x + pliQty.x,
							pli.y + pliItem.y + pliQty.y + pliQty.height
						);
					});
				}

				if (step.numberLabel) {
					ctx.font = 'bold 20pt Helvetica';
					ctx.fillText(
						step.number + '',
						step.numberLabel.x,
						step.numberLabel.y + step.numberLabel.height
					);
				}

				ctx.restore();
			});
		},
		pages() {
			return store.state.pages.filter(p => p != null);
		}
	},
	computed: {
		menuEntries() {
			return Menu(this, store, undoStack);
		},
		pageWidth() {
			return store.state.pageSize.width;
		},
		pageHeight() {
			return store.state.pageSize.height;
		},
		highlightStyle() {
			const selectedItem = this.selectedItem;
			if (selectedItem) {
				let box;
				if (selectedItem.type === 'page') {
					box = {x: 0, y: 0, width: store.state.pageSize.width, height: store.state.pageSize.height};
				} else {
					box = this.targetBox(selectedItem);
				}
				return {
					display: 'block',
					left: `${box.x - 3}px`,
					top: `${box.y - 3}px`,
					width: `${box.width + 6}px`,
					height: `${box.height + 6}px`
				};
			} else {
				return {display: 'none'};
			}
		}
	}
});

function onSplitterDrag() {
	const rightPaneBox = document.getElementById('rightPane').getBoundingClientRect();
	$('.pageContainer').css({
		left: ((rightPaneBox.width - store.state.pageSize.width) / 2) + 'px',
		top: ((rightPaneBox.height - store.state.pageSize.height) / 2) + 'px'
	});
}

// Enable splitter between tree and page view
Split(['#leftPane', '#rightPane'], {
	sizes: [10, 90], minSize: [100, store.state.pageSize.width + 10], direction: 'horizontal',
	gutterSize: 5, snapOffset: 0, onDrag: onSplitterDrag
});

// Size and position page in the middle of page view
$('.pageContainer').css({
	width: store.state.pageSize.width,
	height: store.state.pageSize.height
});
$('#svgContainer').attr(store.state.pageSize);

document.body.addEventListener('keyup', e => app.globalKeyPress(e));
document.body.addEventListener('keydown', e => {
	if (e.key === 'PageDown' || e.key === 'PageUp' || e.key.startsWith('Arrow')) {
		e.preventDefault();
	}
});

onSplitterDrag();
window.onresize = onSplitterDrag;

//app.openRemoteLDrawModel('Creator/20015 - Alligator.mpd');
//app.openRemoteLDrawModel('Star Wars/7140 - X-Wing Fighter.mpd');
//app.openRemoteLDrawModel('Architecture/21010 - Robie House.mpd');
//app.openRemoteLDrawModel('Adventurers/5935 - Island Hopper.mpd');

window.app = app;
window.store = store;

})();
