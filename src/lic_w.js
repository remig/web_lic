/* global Vue: false, Vuex: false, $: false, Split: false, jsPDF: false, LDParse: false, LDRender: false */

(function() {
'use strict';

const start = Date.now();

let model;  // Global LDraw model - contains full part data

const undoStack = [];  // Can't store this in app because then it becomes observed, which is slow and a massive memory hit

// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic (except static stuff in model, like part geometries)
const store = new Vuex.Store({
	strict: true,
	state: {
		modelName: '',
		pages: [],  // page: {number: 1, steps: [1,2,3]}
		steps: [],  // step: {number: 2, csi: {x, y, w, h}}
		pageSize: {width: 800, height: 600}
	},
	getters: {
		stateItem: (state) => (stateType, idx) => {  // stateType = step, csi, pli, pliItem; idx = stepNumber, pliItemIndex
			if (stateType === 'csi') {
				return state.steps[idx].csi;
			} else if (stateType === 'step') {
				return state.steps[idx].pos;
			} else if (stateType === 'pli') {
				return state.steps[idx].pli;
			} else if (stateType === 'pliItem') {
				const [stepNumber, pliIdx] = idx.split(',').map(i => parseInt(i, 10));
				return state.steps[stepNumber].pliList[pliIdx];
			} else if (stateType === 'pliQty') {
				const [stepNumber, pliIdx] = idx.split(',').map(i => parseInt(i, 10));
				return state.steps[stepNumber].pliList[pliIdx].quantityLabel;
			}
			return null;
		},
		step: (state) => (stepNumber) => {
			return state.steps[stepNumber];
		}
	},
	mutations: {
		setModelName(state, name) {
			state.modelName = name;
		},
		addPage(state, page) {
			state.pages.push(page);
		},
		addStep(state, step) {
			state.steps.push(step);
		},
		moveStepToPreviousPage(state, stepNumber) {
			for (var i = 2; i < state.pages.length; i++) {
				if (state.pages[i].steps.includes(stepNumber)) {
					var idx = state.pages[i].steps.indexOf(stepNumber);
					state.pages[i].steps.splice(idx, 1);
					state.pages[i - 1].steps.push(stepNumber);
					layoutPage(state.pages[i - 1]);
					layoutPage(state.pages[i]);
					break;
				}
			}
		},
		setItemXY(state, opts) {
			opts.item.x = opts.x;
			opts.item.y = opts.y;
			Vue.nextTick(() => app.refreshSelected());
		},
		setItemXYWH(state, opts) {
			opts.item.x = opts.x;
			opts.item.y = opts.y;
			opts.item.width = opts.width;
			opts.item.height = opts.height;
			Vue.nextTick(() => app.refreshSelected());
		},
		addPLI(state, pli) {
			state.pliList.push(pli);
		},
		addPartToStep(state, opts) {
			const step = state.steps[opts.stepNumber];
			const target = step.pliList.filter(pli => pli.name === opts.part.name && pli.color === opts.part.color)[0];
			if (target) {
				target.quantity++;
			} else {
				step.pliList.push({
					name: opts.part.name,
					partNumber: opts.partNumber,
					color: opts.part.color,
					x: null,
					y: null,
					quantity: 1,
					quantityLabel: {
						x: null,
						y: null
					}
				});
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
					Vue.nextTick(() => app.refreshSelected());
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
					Vue.nextTick(() => app.refreshSelected());
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
				const fontHeight = 20;
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
					page.steps.forEach((stepNumber) => {

						const step = store.state.steps[stepNumber];

						if (step.csi) {
							let renderResult;
							if (stepNumber === 0) {
								renderResult = LDRender.renderModelData(model, 1000);
							} else {
								const parts = store.state.steps[stepNumber].parts;
								renderResult = LDRender.renderModelData(model, 1000, parts[parts.length - 1]);
							}
							doc.addImage(
								renderResult.image, 'PNG',
								(step.pos.x + step.csi.x) * r,
								(step.pos.y + step.csi.y) * r,
								renderResult.width * r,
								renderResult.height * r
							);
						}

						if (step.pli) {
							doc.roundedRect(
								(step.pos.x + step.pli.x) * r,
								(step.pos.y + step.pli.y) * r,
								(step.pli.width) * r,
								(step.pli.height) * r,
								10 * r, 10 * r, 'S'
							);
						}

						step.pliList.forEach(pliItem => {

							const part = model.parts[pliItem.partNumber];
							const renderResult = LDRender.renderPartData(part, 1000);
							doc.addImage(
								renderResult.image, 'PNG',
								(step.pos.x + step.pli.x + pliItem.x) * r,
								(step.pos.y + step.pli.y + pliItem.y) * r,
								renderResult.width * r,
								renderResult.height * r
							);

							doc.setFontSize(10);
							doc.text(
								(step.pos.x + pliItem.x + pliItem.quantityLabel.x) * r,
								(step.pos.y + pliItem.y + pliItem.quantityLabel.y) * r,
								'x' + pliItem.quantity
							);
						});

						if (step.numberLabel) {
							doc.setFontSize(20);
							doc.text(
								(step.pos.x + step.numberLabel.x) * r,
								(step.pos.y + step.numberLabel.y + fontHeight) * r,
								step.number + ''
							);
						}
					});

					if (page.numberLabel) {
						doc.setFontSize(20);
						doc.text(
							(page.numberLabel.x) * r,
							(page.numberLabel.y) * r,
							page.number + ''
						);
					}
				});

				doc.save(store.state.modelName.replace(/\..+$/, '.pdf'));
			}
		}
	]}
];

const app = new Vue({
	el: '#container',
	store,
	data: {  // Store any transient UI state data here
		currentPage: {steps: []},
		statusText: '',
		undoIndex: -1,
		selectedItem: {
			node: null,
			nodeType: null,
			stateItem: null
		},
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
					const stepNumber = parseInt(app.selectedItem.stateItem, 10);
					store.commit('moveStepToPreviousPage', stepNumber);
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
		setSelected(target) {
			this.$data.selectedItem.node = target;
			this.$data.selectedItem.nodeType = target.dataset.objType;
			this.$data.selectedItem.stateItem = target.dataset.stateItem;
		},
		refreshSelected() {
			// Hacky way to force an update on anything that depends on the currently selected item changing in any way
			const tmp = this.$data.selectedItem.node;
			this.$data.selectedItem.node = null;
			this.$data.selectedItem.node = tmp;
		},
		setCurrentPage(page) {
			app.currentPage = page;
		},
		clearSelected() {
			this.$data.selectedItem.node = null;
			this.$data.selectedItem.nodeType = null;
			this.$data.selectedItem.stateItem = null;
		},
		globalClick(e) {
			this.closeMenu();
			const target = e.target;
			if (target.classList.contains('selectable')) {
				this.setSelected(target);
			} else {
				this.clearSelected();
			}
		},
		rightClick(e) {
			const selectedType = this.$data.selectedItem.nodeType;
			if (selectedType != null) {
				const menu = this.$data.contextMenuEntries[selectedType];
				if (menu && menu.length) {
					this.$data.contextMenu = menu;
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
			const selectedItem = this.$data.selectedItem;
			const currentPageNumber = app.currentPage.number;
			if (e.key === 'PageDown') {
				if (currentPageNumber + 1 < this.$store.state.pages.length) {
					this.drawPage(this.$store.state.pages[currentPageNumber + 1]);
				}
			} else if (e.key === 'PageUp') {
				if (currentPageNumber > 0) {
					this.drawPage(this.$store.state.pages[currentPageNumber - 1]);
				}
			} else if (e.key.startsWith('Arrow') && selectedItem.node.classList.contains('moveable')) {
				const stateItem = this.$store.getters.stateItem(selectedItem.nodeType, selectedItem.stateItem);
				if (stateItem) {
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
						item: stateItem,
						x: stateItem.x + dx,
						y: stateItem.y + dy
					});
				}
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
		drawPage(page) {
			if (page === app.currentPage) {
				return;
			}

			this.clearSelected();
			this.setCurrentPage(page);

			Vue.nextTick((function(page) {
				return function() {
					page.steps.forEach(stepNumber => {
						if (stepNumber === 0) {
							LDRender.renderModel(model, 'CSI_0', 1000);
						} else {
							let parts = store.state.steps[stepNumber].parts;
							LDRender.renderModel(model, `CSI_${stepNumber}`, 1000, parts[parts.length - 1]);

							const uniqueParts = {};
							parts = parts.map(p => model.parts[p]);
							parts.forEach(function(part) {
								uniqueParts[part.name] = uniqueParts[part.name] || {part, quantity: 0};
								uniqueParts[part.name].quantity += 1;
							});
							parts = Object.values(uniqueParts);

							parts.forEach((pliItem, i) => LDRender.renderPart(pliItem.part, `PLI_${stepNumber}_${i}`, 1000));
						}
					});
				};
			})(page));
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
		pages() {
			return this.$store.state.pages;
		},
		highlightStyle() {
			const target = this.$data.selectedItem.node;
			if (target) {
				const box = target.getBoundingClientRect();
				return {
					display: 'block',
					left: `${box.left - 3}px`,
					top: `${box.top - 3}px`,
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

function setItemXY(direct, opts) {
	if (direct) {
		opts.item.x = opts.x;
		opts.item.y = opts.y;
	} else {
		store.commit('setItemXY', opts);
	}
}

function setItemXYWH(direct, opts) {
	if (direct) {
		opts.item.x = opts.x;
		opts.item.y = opts.y;
		opts.item.width = opts.width;
		opts.item.height = opts.height;
	} else {
		store.commit('setItemXY', opts);
	}
}

const pageMargin = 20;

function layoutStep(step, box, direct) {

	setItemXYWH(direct, {
		item: step.pos,
		x: box.x + pageMargin,
		y: box.y + pageMargin,
		width: box.width - pageMargin - pageMargin,
		height: box.height - pageMargin - pageMargin
	});

	const lastPart = step.parts ? step.parts[step.parts.length - 1] : null;
	const csiSize = LDRender.measureModel(model, 1000, lastPart);
	setItemXY(direct, {
		item: step.csi,
		x: Math.floor((step.pos.width - csiSize.width) / 2),
		y: Math.floor((step.pos.height - csiSize.height) / 2)
	});

	const pliMargin = 10;
	let maxHeight = 0;
	let left = pliMargin;

	//pliList.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
	for (var i = 0; i < step.pliList.length; i++) {


		const pliItem = step.pliList[i];
		const pliSize = LDRender.measurePart(model.parts[pliItem.partNumber], 1000);
		setItemXY(direct, {
			item: pliItem,
			x: Math.floor(left),
			y: Math.floor(pliMargin)
		});
		setItemXY(direct, {
			item: pliItem.quantityLabel,
			x: -5,
			y: pliSize.height + 5
		});

		left += Math.floor(pliSize.width + pliMargin);
		maxHeight = Math.max(maxHeight, pliSize.height);
	}

	if (step.pli) {
		setItemXYWH(direct, {
			item: step.pli,
			x: 0,
			y: 0,
			width: left,
			height: maxHeight + pageMargin
		});
	}

	if (step.numberLabel) {
		setItemXY(direct, {
			item: step.numberLabel,
			x: 0,
			y: maxHeight + pageMargin + pageMargin
		});
	}
}

function layoutPage(page, state, direct) {

	state = state || store.state;
	const pageSize = state.pageSize;
	const stepCount = page.steps.length;
	const cols = Math.ceil(Math.sqrt(stepCount));
	const rows = Math.ceil(stepCount / cols);
	const colSize = Math.floor(pageSize.width / cols);
	const rowSize = Math.floor(pageSize.height / rows);

	const box = {x: 0, y: 0, width: colSize, height: rowSize};

	for (var i = 0; i < stepCount; i++) {
		box.x = colSize * (i % cols);
		box.y = rowSize * (i % rows);
		layoutStep(state.steps[page.steps[i]], box, direct);
	}

	if (page.numberLabel) {
		setItemXY(direct, {
			item: page.numberLabel,
			x: pageSize.width - pageMargin,
			y: pageSize.height - pageMargin
		});
	}
}

function formatTime(start, end) {
	const t = end - start;
	if (t >= 1000) {
		return (t / 1000).toFixed(2) + 's';
	}
	return t + 'ms';
}

// Add one new page for each step in model
function addInitialPages(model, initialState) {

	if (!model.steps) {
		return model;
	}

	model.steps.unshift(null);  // Add one empty step to the begining of the model's step list as a placeholder for the title page (until we have a proper title page, anyway)

	initialState.steps.push({
		number: 0,
		pos: {x: null, y: null, width: null, height: null},
		csi: {x: null, y: null},
		pli: null,
		pliList: [],
		parts: []
	});

	const titlePage = {
		number: 0,
		steps: [0]
	};
	layoutPage(titlePage, initialState, true);
	initialState.pages.push(titlePage);

	for (let i = 1; i < model.steps.length; i++) {

		const step = {
			number: i,
			pos: {x: null, y: null, width: null, height: null},
			numberLabel: {x: null, y: null},
			parts: clone(model.steps[i].parts),
			csi: {x: null, y: null},
			pli: {x: null, y: null, width: null, height: null},
			pliList: []
		};
		initialState.steps.push(step);

		model.steps[i].parts.forEach(partNumber => {

			const part = model.parts[partNumber];
			const target = step.pliList.filter(pli => pli.name === part.name && pli.color === part.color)[0];
			if (target) {
				target.quantity++;
			} else {
				step.pliList.push({
					name: part.name,
					partNumber: partNumber,
					color: part.color,
					x: null,
					y: null,
					quantity: 1,
					quantityLabel: {
						x: null,
						y: null
					}
				});
			}
		});

		let stepsToAdd;
		if (i % 2 === 0) {
			stepsToAdd = [i - 1, i];
		} else if (i === model.steps.length - 1) {
			stepsToAdd = [i];
		}
		if (stepsToAdd) {
			const page = {
				number: Math.ceil(i / 2),
				numberLabel: {x: null, y: null},
				steps: stepsToAdd
			};
			layoutPage(page, initialState, true);
			initialState.pages.push(page);
		}
	}
	return model;
}

function clone(state) {
	return JSON.parse(JSON.stringify(state));
}

function importLDrawModel(modelName) {

	model = LDParse.loadPart(modelName);
	var initialState = {
		modelName,
		pages: [],
		steps: [],
		pageSize: {width: 800, height: 600}
	};

	addInitialPages(model, initialState);

	app.undoIndex = 0;
	undoStack.push(initialState);
	store.replaceState(clone(initialState));

	app.currentPage = store.state.pages[0];

	Vue.nextTick(() => LDRender.renderModel(model, 'CSI_0', 1000));

	var end = Date.now();
	app.statusText = `"${store.state.modelName}" loaded successfully (${formatTime(start, end)})`;

	store.subscribe((mutation, state) => {
		if (app.undoIndex < undoStack.length - 1) {
			undoStack.splice(app.undoIndex + 1);
		}
		undoStack.push(clone(state));
		app.undoIndex++;
	});
}

//importLDrawModel('Adventurers/5935 - Island Hopper.mpd');
importLDrawModel('Creator/20015 - Alligator.mpd');
//importLDrawModel('Star Wars/7140 - X-Wing Fighter.mpd');
//importLDrawModel('Architecture/21010 - Robie House.mpd');

window.app = app;
window.store = store;
window.model = model;

})();
