/* global Vue: false, Vuex: false, $: false, Split: false, jsPDF: false, LDParse: false, LDRender: false */

(function() {
'use strict';

const start = Date.now();

var app;    // Global vue app
var model;  // Global LDraw model - contains full part data

const pageMargin = 20;  // This will end up in the template page, when we have one
const undoStack = [];  // Can't store this in app because then it becomes observed, which is slow and a massive memory hit

// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic (except static stuff in model, like part geometries)
const store = new Vuex.Store({
	strict: true,
	state: {
		modelName: '',
		pages: [],
		steps: [],
		csis: [],
		plis: [],
		pliItems: [],
		pliQtys: [],
		pageSize: {width: 800, height: 600}
	},
	getters: {
		step: (state) => (stepNumber) => {
			return state.steps[stepNumber];
		}
	},
	mutations: {
		setModelName(state, name) {
			state.modelName = name;
		},
		moveStepToPreviousPage(state, step) {
			const currentPage = state.pages[step.parent.index];
			const prevPage = state.pages[step.parent.index - 1];
			var stepIdx = currentPage.steps.indexOf(step.number);
			currentPage.steps.splice(stepIdx, 1);
			prevPage.steps.push(step.number);
			store._mutations.layoutPage[0](prevPage);
			store._mutations.layoutPage[0](currentPage);
		},
		setItemXY(state, opts) {
			opts.item.x = opts.x;
			opts.item.y = opts.y;
		},
		setItemXYWH(state, opts) {
			opts.item.x = opts.x;
			opts.item.y = opts.y;
			opts.item.width = opts.width;
			opts.item.height = opts.height;
		},
		layoutStep(state, opts) {

			const {step, box} = opts;

			step.x = box.x + pageMargin;
			step.y = box.y + pageMargin;
			step.width = box.width - pageMargin - pageMargin;
			step.height = box.height - pageMargin - pageMargin;

			if (step.csi != null) {

				const csi_ID = `CSI_${step.number}`;
				let csiContainer = document.getElementById(csi_ID);
				if (!csiContainer) {
					csiContainer = document.createElement('canvas');
					csiContainer.setAttribute('id', csi_ID);
					document.getElementById('canvasHolder').appendChild(csiContainer);
				}
				const lastPart = step.parts ? step.parts[step.parts.length - 1] : null;
				const csiSize = LDRender.renderModel(model, csiContainer, 1000, {endPart: lastPart, resizeContainer: true});

				const csi = state.csis[step.csi];
				csi.x = Math.floor((step.width - csiSize.width) / 2);
				csi.y = Math.floor((step.height - csiSize.height) / 2);
				csi.width = csiSize.width;
				csi.height = csiSize.height;
			}

			const pliMargin = 10;
			let maxHeight = 0;
			let left = pliMargin + 5;  // 5 for qty label

			if (step.pli != null) {

				const pli = state.plis[step.pli];

				//pliItems.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
				for (var i = 0; i < pli.pliItems.length; i++) {

					const idx = pli.pliItems[i];
					const pliItem = state.pliItems[idx];
					const part = model.parts[pliItem.partNumber];

					const pli_ID = `PLI_${part.name}_${part.color}`;
					let pliContainer = document.getElementById(pli_ID);
					if (!pliContainer) {
						pliContainer = document.createElement('canvas');
						pliContainer.setAttribute('id', pli_ID);
						document.getElementById('canvasHolder').appendChild(pliContainer);
					}
					const pliSize = LDRender.renderPart(part, pliContainer, 1000, {resizeContainer: true});

					pliItem.x = Math.floor(left);
					pliItem.y = Math.floor(pliMargin);
					pliItem.width = pliSize.width;
					pliItem.height = pliSize.height;

					const lblSize = measureLabel('bold 10pt Helvetica', 'x' + pliItem.quantity);
					const pliQty = state.pliQtys[pliItem.quantityLabel];
					pliQty.x = -5;
					pliQty.y = pliSize.height - 5;
					pliQty.width = lblSize.width;
					pliQty.height = lblSize.height;

					left += Math.floor(pliSize.width + pliMargin);
					maxHeight = Math.max(maxHeight, pliSize.height - 5 + pliQty.height);
				}

				pli.x = pli.y = 0;
				pli.width = left;
				pli.height = maxHeight + pageMargin;
			}

			if (step.numberLabel) {
				const lblSize = measureLabel('bold 20pt Helvetica', step.number);
				step.numberLabel.x = 0;
				step.numberLabel.y = maxHeight + pageMargin;
				step.numberLabel.width = lblSize.width;
				step.numberLabel.height = lblSize.height;
			}
		},
		layoutPage(state, page) {
			const pageSize = state.pageSize;
			const stepCount = page.steps.length;
			const cols = Math.ceil(Math.sqrt(stepCount));
			const rows = Math.ceil(stepCount / cols);
			const colSize = Math.floor(pageSize.width / cols);
			const rowSize = Math.floor(pageSize.height / rows);

			const box = {x: 0, y: 0, width: colSize, height: rowSize};

			for (var i = 0; i < stepCount; i++) {
				box.x = colSize * (i % cols);
				box.y = rowSize * Math.floor(i / cols);
				store._mutations.layoutStep[0]({step: state.steps[page.steps[i]], box});
			}

			if (page.numberLabel) {
				const lblSize = measureLabel('bold 20pt Helvetica', page.number);
				page.numberLabel.x = pageSize.width - pageMargin - lblSize.width;
				page.numberLabel.y = pageSize.height - pageMargin - lblSize.height;
				page.numberLabel.width = lblSize.width;
				page.numberLabel.height = lblSize.height;
			}
		},
		addInitialPages(state, model) {

			if (!model.steps) {
				return;
			}

			model.steps.unshift(null);  // Add one empty step to the begining of the model's step list as a placeholder for the title page (until we have a proper title page, anyway)

			state.csis.push({
				type: 'csi',
				parent: {type: 'step', index: 0},
				x: null, y: null,
				width: null, height: null
			});

			state.steps.push({
				type: 'step',
				parent: {type: 'page', index: 0},
				number: 0,
				parts: [],
				x: null, y: null,
				width: null, height: null,
				csi: 0,
				pli: null
			});

			const titlePage = {
				type: 'page',
				number: 0,
				steps: [0]
			};
			store._mutations.layoutPage[0](titlePage);
			state.pages.push(titlePage);

			for (let i = 1; i < model.steps.length; i++) {

				const csi = {
					type: 'csi',
					parent: {type: 'step', index: i},
					x: null, y: null,
					width: null, height: null
				};
				state.csis.push(csi);

				const pli = {
					type: 'pli',
					parent: {type: 'step', index: i},
					pliItems: [],
					x: null, y: null,
					width: null, height: null
				};
				state.plis.push(pli);

				const step = {
					type: 'step',
					parent: {type: 'page', index: null},
					number: i,
					parts: clone(model.steps[i].parts),
					x: null, y: null,
					width: null, height: null,
					numberLabel: {
						type: 'stepNumber',
						parent: {type: 'step', index: i},
						x: null, y: null,
						width: null, height: null
					},
					csi: state.csis.length - 1,
					pli: state.plis.length - 1
				};
				state.steps.push(step);

				model.steps[i].parts.forEach(partNumber => {

					const part = model.parts[partNumber];
					const target = pli.pliItems.map(idx => state.pliItems[idx])
						.filter(pliItem => pliItem.name === part.name && pliItem.color === part.color)[0];

					if (target) {
						target.quantity++;
					} else {
						const pliQty = {
							type: 'pliQty',
							parent: {type: 'pliItem', index: null},
							x: null, y: null, width: null, height: null
						};
						state.pliQtys.push(pliQty);

						const pliItem = {
							type: 'pliItem',
							parent: {type: 'pli', index: step.pli},
							name: part.name,
							partNumber: partNumber,
							color: part.color,
							x: null, y: null,
							width: null, height: null,
							quantity: 1,
							quantityLabel: state.pliQtys.length - 1
						};
						state.pliItems.push(pliItem);
						pli.pliItems.push(state.pliItems.length - 1);
						pliQty.parent.index = state.pliItems.length - 1;
					}
				});

				let stepsToAdd;
				if (i % 3 === 0) {
					stepsToAdd = [i - 2, i - 1, i];
				}
				if (stepsToAdd) {
					const pageNumber = Math.ceil(i / 3);
					const page = {
						type: 'page',
						number: pageNumber,
						numberLabel: {
							type: 'pageNumber',
							parent: {type: 'page', index: pageNumber},
							x: null, y: null,
							width: null, height: null
						},
						steps: stepsToAdd
					};
					stepsToAdd.forEach(stepNumber => {
						state.steps[stepNumber].parent.index = pageNumber;
					});
					store._mutations.layoutPage[0](page);
					state.pages.push(page);
				}
			}
		}
	}
});

const menu = [
	{name: 'File (NYI)', children: [
		{text: 'Open...', cb: () => {}},
		{text: 'Open Recent', cb: () => {}},
		{text: 'separator'},
		{text: 'Close', cb: () => {}},
		{text: 'Save', cb: () => {}},
		{text: 'Save As...', cb: () => {}},
		{text: 'Import Model...', cb: () => {}},
		{text: 'separator'},
		{text: 'Save Template', cb: () => {}},
		{text: 'Save Template As...', cb: () => {}},
		{text: 'Load Template', cb: () => {}},
		{text: 'Reset Template', cb: () => {}}
	]},
	{name: 'Edit', children: [
		{
			text: 'Undo',
			shortcut: 'ctrl+z',
			disabled: true,
			cb: () => {
				if (app.undoIndex > 0) {
					app.undoIndex--;
					store.replaceState(clone(undoStack[app.undoIndex]));
					Vue.nextTick(() => {
						app.clearSelected();
						app.drawCurrentPage();
					});
				}
			}
		},
		{
			text: 'Redo',
			shortcut: 'ctrl+y',
			disabled: true,
			cb: () => {
				if (app.undoIndex < undoStack.length - 1) {
					app.undoIndex++;
					store.replaceState(clone(undoStack[app.undoIndex]));
					Vue.nextTick(() => {
						app.clearSelected();
						app.drawCurrentPage();
					});
				}
			}
		},
		{text: 'separator'},
		{text: 'Snap To (NYI)', cb: () => {}},
		{text: 'Brick Colors... (NYI)', cb: () => {}}
	]},
	{name: 'View (NYI)', children: [
		{text: 'Add Horizontal Guide', cb: () => {}},
		{text: 'Add Vertical Guide', cb: () => {}},
		{text: 'Remove Guides', cb: () => {}},
		{text: 'separator'},
		{text: 'Zoom 100%', cb: () => {}},
		{text: 'Zoom To Fit', cb: () => {}},
		{text: 'Zoom In', cb: () => {}},
		{text: 'Zoom Out', cb: () => {}},
		{text: 'separator'},
		{text: 'Show One Page', cb: () => {}},
		{text: 'Show Two Pages', cb: () => {}}
	]},
	{name: 'Export', children: [
		{
			text: 'Generate PDF',
			cb: () => {

				const r = 0.75;  // = 72 / 96
				const pageSize = {width: store.state.pageSize.width * r, height: store.state.pageSize.height * r};

				const doc = new jsPDF(
					pageSize.width > pageSize.height ? 'landscape' : 'portrait',
					'pt',
					[pageSize.width, pageSize.height]
				);

				doc.setTextColor(0);
				doc.setFont('Helvetica');
				doc.setFontType('bold');
				doc.setLineWidth(1.5);
				doc.setDrawColor(0);

				store.state.pages.forEach((page, pageIdx) => {
					if (pageIdx > 0) {
						doc.addPage(pageSize.width, pageSize.height);
					}
					page.steps.forEach(stepNumber => {

						const step = store.state.steps[stepNumber];

						if (step.csi != null) {
							const csi = store.state.csis[step.csi];
							let renderResult;
							if (stepNumber === 0) {
								renderResult = LDRender.renderModelData(model, 1000);
							} else {
								const parts = store.state.steps[stepNumber].parts;
								renderResult = LDRender.renderModelData(model, 1000, parts[parts.length - 1]);
							}
							doc.addImage(
								renderResult.image, 'PNG',
								(step.x + csi.x) * r,
								(step.y + csi.y) * r,
								renderResult.width * r,
								renderResult.height * r
							);
						}

						if (step.pli != null) {
							const pli = store.state.plis[step.pli];
							doc.roundedRect(
								(step.x + pli.x) * r,
								(step.y + pli.y) * r,
								(pli.width) * r,
								(pli.height) * r,
								10 * r, 10 * r, 'S'
							);

							pli.pliItems.forEach(idx => {

								const pliItem = store.state.pliItems[idx];
								const part = model.parts[pliItem.partNumber];
								const renderResult = LDRender.renderPartData(part, 1000);
								doc.addImage(
									renderResult.image, 'PNG',
									(step.x + pli.x + pliItem.x) * r,
									(step.y + pli.y + pliItem.y) * r,
									renderResult.width * r,
									renderResult.height * r
								);

								const pliQty = store.state.pliQtys[pliItem.quantityLabel];
								doc.setFontSize(10);
								doc.text(
									(step.x + pli.x + pliItem.x + pliQty.x) * r,
									(step.y + pli.y + pliItem.y + pliQty.y + pliQty.height) * r,
									'x' + pliItem.quantity
								);
							});
						}

						if (step.numberLabel) {
							doc.setFontSize(20);
							doc.text(
								(step.x + step.numberLabel.x) * r,
								(step.y + step.numberLabel.y + step.numberLabel.height) * r,
								step.number + ''
							);
						}
					});

					if (page.numberLabel) {
						doc.setFontSize(20);
						doc.text(
							(page.numberLabel.x) * r,
							(page.numberLabel.y + page.numberLabel.height) * r,
							page.number + ''
						);
					}
				});

				doc.save(store.state.modelName.replace(/\..+$/, '.pdf'));
			}
		}
	]}
];

app = new Vue({
	el: '#container',
	store,
	data: {  // Store any transient UI state data here
		currentPageNumber: 0,
		statusText: '',
		undoIndex: -1,
		selectedItem: null,
		contextMenu: null,
		contextMenuEntries: {
			page: [
				{text: 'Auto Layout', cb: () => {}},
				{text: 'Use Vertical Layout', cb: () => {}},
				{text: 'Layout By Row and Column', cb: () => {}},
				{text: 'separator'},
				{text: 'Prepend Blank Page', cb: () => {}},
				{text: 'Append Blank Page', cb: () => {}},
				{text: 'separator'},
				{text: 'Hide Step Separators', cb: () => {}},
				{text: 'Add Blank Step', cb: () => {}},
				{text: 'Add Annotation', cb: () => {}}
			],
			pageNumber: [
				{text: 'Change Page Number', cb: () => {}}
			],
			step: [
				{text: 'Move Step to Previous Page', cb: () => {
					store.commit('moveStepToPreviousPage', app.selectedItem);
					Vue.nextTick(() => {
						app.clearSelected();
						app.drawCurrentPage();
					});
				}},
				{text: 'Move Step to Next Page', cb: () => {}},
				{text: 'separator'},
				{text: 'Merge Step with Previous Step', cb: () => {}},
				{text: 'Merge Step with Next Step', cb: () => {}}
			],
			stepNumber: [
				{text: 'Change Step Number', cb: () => {}}
			],
			csi: [
				{text: 'Rotate CSI', cb: () => {}},
				{text: 'Scale CSI', cb: () => {}},
				{text: 'separator'},
				{text: 'Select Part', cb: () => {}},
				{text: 'Add New Part', cb: () => {}}
			],
			pli: [],
			pliItem: [
				{text: 'Rotate PLI Part', cb: () => {}},
				{text: 'Scale PLI Part', cb: () => {}}
			]
		}
	},
	methods: {
		importLDrawModel(modelName) {

			model = LDParse.loadPart(modelName);

			store.commit('setModelName', modelName);
			store.commit('addInitialPages', model);

			this.currentPageNumber = store.state.pages[0].number;
			undoStack.splice(0, undoStack.length - 1);
			app.undoIndex = 0;

			Vue.nextTick(() => this.drawCurrentPage());

			var end = Date.now();
			this.statusText = `"${store.state.modelName}" loaded successfully (${formatTime(start, end)})`;
		},
		menuDisabled(menuName) {
			if (menuName === 'Undo') {
				return this.undoDisabled;
			} else if (menuName === 'Redo') {
				return this.redoDisabled;
			}
			return null;
		},
		getSteps(page) {
			return page.steps.map(s => this.$store.state.steps[s]);
		},
		setCurrentPage(pageNumber) {
			if (pageNumber !== app.currentPageNumber) {
				this.clearSelected();
				app.currentPageNumber = pageNumber;
			}
			Vue.nextTick(() => this.drawCurrentPage());
		},
		setSelected(target) {
			this.selectedItem = target;
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
					parent = parentList[parent.index];
					box.x += parent.x || 0;
					box.y += parent.y || 0;
					parent = parent.parent;
				} else {
					parent = null;
				}
			}
			return box;
		},
		findClickTarget(mx, my) {
			function inBox(x, y, t) {
				const box = app.targetBox(t);
				return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
			}
			const page = store.state.pages[this.currentPageNumber];
			if (page.numberLabel && inBox(mx, my, page.numberLabel)) {
				return page.numberLabel;
			}
			for (let i = 0; i < page.steps.length; i++) {
				const step = store.state.steps[page.steps[i]];
				if (step.csi != null && inBox(mx, my, store.state.csis[step.csi])) {
					return store.state.csis[step.csi];
				}
				if (step.numberLabel && inBox(mx, my, step.numberLabel)) {
					return step.numberLabel;
				}
				if (step.pli != null) {
					const pli = store.state.plis[step.pli];
					for (let j = 0; j < pli.pliItems.length; j++) {
						const idx = pli.pliItems[j];
						const pliItem = store.state.pliItems[idx];
						if (inBox(mx, my, pliItem)) {
							return pliItem;
						}
						const pliQty = store.state.pliQtys[pliItem.quantityLabel];
						if (inBox(mx, my, pliQty)) {
							return pliQty;
						}
					}
					if (inBox(mx, my, pli)) {
						return pli;
					}
				}
				if (inBox(mx, my, step)) {
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
				const menu = this.contextMenuEntries[this.selectedItem.type];
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
			if (e.key === 'PageDown' && this.currentPageNumber + 1 < this.$store.state.pages.length) {
				this.setCurrentPage(this.currentPageNumber + 1);
			} else if (e.key === 'PageUp' && this.currentPageNumber > 0) {
				this.setCurrentPage(this.currentPageNumber - 1);
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
				this.$store.commit('setItemXY', {
					item: selectedItem,
					x: selectedItem.x + dx,
					y: selectedItem.y + dy
				});
				Vue.nextTick(() => this.drawCurrentPage());
			} else {
				// Check if key is a menu shortcut
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
		drawCurrentPage() {

			const page = store.state.pages[this.currentPageNumber];
			const pageSize = store.state.pageSize;
			const canvas = document.getElementById('pageCanvas');
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, pageSize.width, pageSize.height);

			if (page.numberLabel) {
				ctx.fillStyle = 'black';
				ctx.font = 'bold 20pt Helvetica';
				ctx.fillText(page.number, page.numberLabel.x, page.numberLabel.y + page.numberLabel.height);
			}

			page.steps.forEach(stepNumber => {

				const step = store.state.steps[stepNumber];
				ctx.save();
				ctx.translate(step.x, step.y);

				if (step.csi != null) {
					const csi = store.state.csis[step.csi];
					const csiCanvas = document.getElementById(`CSI_${step.number}`);
					ctx.drawImage(csiCanvas, csi.x, csi.y);
				}

				if (step.pli != null) {
					const pli = store.state.plis[step.pli];
					ctx.strokeStyle = 'black';
					ctx.lineWidth = 2;
					roundedRect(ctx, pli.x, pli.y, pli.width, pli.height, 10);
					ctx.stroke();

					pli.pliItems.forEach(idx => {
						const pliItem = store.state.pliItems[idx];
						const part = model.parts[pliItem.partNumber];
						const pliCanvas = document.getElementById(`PLI_${part.name}_${part.color}`);
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
					ctx.fillText(step.number + '', step.numberLabel.x, step.numberLabel.y + step.numberLabel.height);
				}

				ctx.restore();
			});
		}
	},
	computed: {
		menuEntries() {
			return menu;
		},
		undoDisabled() {
			return this.undoIndex < 1;
		},
		redoDisabled() {
			return this.undoIndex >= undoStack.length - 1;
		},
		pageWidth() {
			return this.$store.state.pageSize.width;
		},
		pageHeight() {
			return this.$store.state.pageSize.height;
		},
		pages() {
			return this.$store.state.pages;
		},
		highlightStyle() {
			const selectedItem = this.selectedItem;
			if (selectedItem) {
				let box;
				if (selectedItem.type === 'page') {
					box = {x: 0, y: 0, width: this.$store.state.pageSize.width, height: this.$store.state.pageSize.height};
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

onSplitterDrag();

document.body.addEventListener('keyup', e => app.globalKeyPress(e));
window.onresize = onSplitterDrag;

function formatTime(start, end) {
	const t = end - start;
	if (t >= 1000) {
		return (t / 1000).toFixed(2) + 's';
	}
	return t + 'ms';
}

function clone(state) {
	return JSON.parse(JSON.stringify(state));
}

function roundedRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
	ctx.arc(x + w - r, y + r, r, 3 * Math.PI / 2, 0);
	ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
	ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
	ctx.closePath();
}

const labelSizeCache = {};  // {font: {text: {width: 10, height: 20}}}
function measureLabel(font, text) {
	if (labelSizeCache[font] && labelSizeCache[font][text]) {
		return labelSizeCache[font][text];
	}
	const container = document.getElementById('fontMeasureContainer');
	container.style.font = font;
	container.firstChild.textContent = text;
	const res = container.getBBox();
	res.width = Math.ceil(res.width);
	res.height = Math.ceil(res.height);
	labelSizeCache[font] = labelSizeCache[font] || {};
	labelSizeCache[font][text] = res;
	return res;
}

store.subscribe((mutation, state) => {
	if (app.undoIndex < undoStack.length - 1) {
		undoStack.splice(app.undoIndex + 1);
	}
	undoStack.push(clone(state));
	app.undoIndex++;
});

//app.importLDrawModel('Adventurers/5935 - Island Hopper.mpd');
app.importLDrawModel('Creator/20015 - Alligator.mpd');
//app.importLDrawModel('Star Wars/7140 - X-Wing Fighter.mpd');
//app.importLDrawModel('Architecture/21010 - Robie House.mpd');

window.app = app;
window.store = store;
window.model = model;

})();
