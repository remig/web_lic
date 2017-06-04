/* global Vue: false, $: false, Split: false, jsPDF: false, JSZip: false, saveAs: false, LDParse: false, LDRender: false */

(function() {
'use strict';

const start = Date.now();

// Globals
var app;    // Global vue app
var model;  // Global LDraw model - contains full part data
var originalState;
const undoStack = [];  // Can't store this in app because then it becomes observed, which is slow and a massive memory hit

// These will end up in the template page, when we have one
const pageMargin = 20;
const pliMargin = pageMargin / 2;

// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic (except static stuff in model, like part geometries)
const store = {
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
	replaceState: function(state) {
		store.state = state;
	},
	commit: function(mutationName, opts) {

		store.mutations[mutationName](opts);

		if (app.undoIndex < undoStack.length - 1) {
			undoStack.splice(app.undoIndex + 1);
		}
		undoStack.push(clone(store.state));
		app.undoIndex++;

	},
	mutations: {
		setModelName(name) {
			store.state.modelName = name;
		},
		moveStepToPreviousPage(step) {
			const currentPage = store.state.pages[step.parent.index];
			const prevPage = store.state.pages[step.parent.index - 1];
			var stepIdx = currentPage.steps.indexOf(step.id);
			currentPage.steps.splice(stepIdx, 1);
			prevPage.steps.push(step.id);
			step.parent.index = prevPage.id;
			store.mutations.layoutPage(prevPage);
			store.mutations.layoutPage(currentPage);
		},
		deletePage(pageID) {
			store.state.pages.splice(pageID, 1);
		},
		setItemXY(opts) {
			opts.item.x = opts.x;
			opts.item.y = opts.y;
		},
		setItemXYWH(opts) {
			opts.item.x = opts.x;
			opts.item.y = opts.y;
			opts.item.width = opts.width;
			opts.item.height = opts.height;
		},
		layoutStep(opts) {

			const {step, box} = opts;
			const localModel = getSubmodel(step.submodel);

			step.x = box.x + pageMargin;
			step.y = box.y + pageMargin;
			step.width = box.width - pageMargin - pageMargin;
			step.height = box.height - pageMargin - pageMargin;

			if (step.csiID != null) {

				const csi_ID = `CSI_${step.id}`;
				let csiContainer = document.getElementById(csi_ID);
				if (!csiContainer) {
					csiContainer = document.createElement('canvas');
					csiContainer.setAttribute('id', csi_ID);
					document.getElementById('canvasHolder').appendChild(csiContainer);
				}
				const lastPart = step.parts ? step.parts[step.parts.length - 1] : null;
				const csiSize = LDRender.renderModel(localModel, csiContainer, 1000, {endPart: lastPart, resizeContainer: true});

				const csi = store.state.csis[step.csiID];
				csi.x = Math.floor((step.width - csiSize.width) / 2);
				csi.y = Math.floor((step.height - csiSize.height) / 2);
				csi.width = csiSize.width;
				csi.height = csiSize.height;
			}

			const qtyLabelOffset = 5;
			let maxHeight = 0;
			let left = pliMargin + qtyLabelOffset;

			if (step.pliID != null) {

				const pli = store.state.plis[step.pliID];

				//pliItems.sort((a, b) => ((attr(b, 'width') * attr(b, 'height')) - (attr(a, 'width') * attr(a, 'height'))))
				for (var i = 0; i < pli.pliItems.length; i++) {

					const idx = pli.pliItems[i];
					const pliItem = store.state.pliItems[idx];
					const part = localModel.parts[pliItem.partNumber];

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
					const pliQty = store.state.pliQtys[pliItem.quantityLabel];
					pliQty.x = -qtyLabelOffset;
					pliQty.y = pliSize.height - qtyLabelOffset;
					pliQty.width = lblSize.width;
					pliQty.height = lblSize.height;

					left += Math.floor(pliSize.width + pliMargin);
					maxHeight = Math.max(maxHeight, pliSize.height - qtyLabelOffset + pliQty.height);
				}

				maxHeight = pliMargin + maxHeight + pliMargin;
				pli.x = pli.y = 0;
				pli.width = left;
				pli.height = maxHeight;
			}

			if (step.numberLabel) {
				const lblSize = measureLabel('bold 20pt Helvetica', step.number);
				step.numberLabel.x = 0;
				step.numberLabel.y = maxHeight + pageMargin;
				step.numberLabel.width = lblSize.width;
				step.numberLabel.height = lblSize.height;
			}
		},
		layoutPage(page) {
			const pageSize = store.state.pageSize;
			const stepCount = page.steps.length;
			const cols = Math.ceil(Math.sqrt(stepCount));
			const rows = Math.ceil(stepCount / cols);
			const colSize = Math.floor(pageSize.width / cols);
			const rowSize = Math.floor(pageSize.height / rows);

			const box = {x: 0, y: 0, width: colSize, height: rowSize};

			for (var i = 0; i < stepCount; i++) {
				box.x = colSize * (i % cols);
				box.y = rowSize * Math.floor(i / cols);
				store.mutations.layoutStep({step: store.state.steps[page.steps[i]], box});
			}

			if (page.numberLabel) {
				const lblSize = measureLabel('bold 20pt Helvetica', page.number);
				page.numberLabel.x = pageSize.width - pageMargin - lblSize.width;
				page.numberLabel.y = pageSize.height - pageMargin - lblSize.height;
				page.numberLabel.width = lblSize.width;
				page.numberLabel.height = lblSize.height;
			}
		},
		addStateItem(item) {
			const stateList = store.state[item.type + 's'];
			item.id = stateList.length;
			stateList.push(item);
		},
		addTitlePage() {

			const addStateItem = item => {
				store.mutations.addStateItem(item);
				return item;
			};

			const page = addStateItem({
				type: 'page',
				steps: []
			});

			const step = addStateItem({
				type: 'step',
				parent: {type: 'page', index: page.id},
				x: null, y: null,
				width: null, height: null,
				csiID: null
			});

			const csi = addStateItem({
				type: 'csi',
				parent: {type: 'step', index: step.id},
				x: null, y: null,
				width: null, height: null
			});

			step.csiID = csi.id;
			page.steps.push(step.id);
			store.mutations.layoutPage(page);
		},
		addInitialPages(localModelIDList) {  // localModelIDList is an array of submodel IDs used to traverse the submodel tree

			localModelIDList = localModelIDList || [];
			const localModel = getSubmodel(localModelIDList);

			if (!localModel || !localModel.steps) {
				return;
			}

			const addStateItem = item => {
				store.mutations.addStateItem(item);
				return item;
			};

			localModel.steps.forEach(modelStep => {

				const parts = clone(modelStep.parts || []);
				const subModels = parts.filter(p => localModel.parts[p].abstractPart.isSubModel);
				subModels.forEach(submodel => store.mutations.addInitialPages(localModelIDList.concat(submodel)));

				const page = addStateItem({
					type: 'page',
					number: null,
					steps: [],
					numberLabel: {
						type: 'pageNumber',
						parent: {type: 'page', index: store.state.pages.length},
						x: null, y: null,
						width: null, height: null
					}
				});
				page.number = page.id;

				const step = addStateItem({
					type: 'step',
					parent: {type: 'page', index: page.id},
					number: null,
					parts: parts,
					submodel: localModelIDList,
					x: null, y: null,
					width: null, height: null,
					numberLabel: {
						type: 'stepNumber',
						parent: {type: 'step', index: null},
						x: null, y: null,
						width: null, height: null
					}
				});
				step.number = step.numberLabel.parent.index = step.id;

				page.steps.push(step.id);

				const csi = addStateItem({
					type: 'csi',
					parent: {type: 'step', index: step.id},
					x: null, y: null,
					width: null, height: null
				});

				const pli = addStateItem({
					type: 'pli',
					parent: {type: 'step', index: step.id},
					pliItems: [],
					x: null, y: null,
					width: null, height: null
				});

				step.csiID = csi.id;
				step.pliID = pli.id;

				parts.forEach(partNumber => {

					const part = localModel.parts[partNumber];
					const target = pli.pliItems
						.map(idx => store.state.pliItems[idx])
						.filter(pliItem => pliItem.name === part.name && pliItem.color === part.color)[0];

					if (target) {
						target.quantity++;
					} else {
						const pliQty = addStateItem({
							type: 'pliQty',
							parent: {type: 'pliItem', index: null},
							x: null, y: null, width: null, height: null
						});

						const pliItem = addStateItem({
							type: 'pliItem',
							parent: {type: 'pli', index: pli.id},
							name: part.name,
							partNumber: partNumber,
							color: part.color,
							x: null, y: null,
							width: null, height: null,
							quantity: 1,
							quantityLabel: pliQty.id
						});
						pli.pliItems.push(pliItem.id);
						pliQty.parent.index = pliItem.id;
					}
				});

				if (page.id < 3) {
					store.mutations.layoutPage(page);
				} else {
					page.needsLayout = true;
				}
			});
		}
	}
};

function disableIfNoModel() {
	return model == null;
}

const menu = [
	{name: 'File', children: [
		{text: 'Open... (NYI)', cb: () => {}},
		{text: 'Open Recent (NYI)', cb: () => {}},
		{text: 'separator'},
		{
			text: 'Close',
			disabled: disableIfNoModel,
			cb: () => {
				model = null;
				store.replaceState(clone(originalState));
				app.clearState();
				emptyNode(document.getElementById('canvasHolder'));
				Vue.nextTick(() => {
					app.clearSelected();
					app.clearPage();
				});
			}
		},
		{text: 'Save (NYI)', disabled: disableIfNoModel, cb: () => {}},
		{text: 'Save As... (NYI)', disabled: disableIfNoModel, cb: () => {}},
		{
			text: 'Import Model...',
			cb: () => {
				const uploader = document.getElementById('fileUploader');
				uploader.onchange = function() {
					const reader = new FileReader();
					reader.onload = function(e) {
						app.importLDrawModelFromContent(e.target.result);
					};
					reader.readAsText(uploader.files[0]);
					uploader.value = '';
				};
				uploader.click();
			}
		},
		{text: 'separator'},
		{text: 'Save Template (NYI)', disabled: () => true, cb: () => {}},
		{text: 'Save Template As... (NYI)', disabled: () => true, cb: () => {}},
		{text: 'Load Template (NYI)', disabled: () => true, cb: () => {}},
		{text: 'Reset Template (NYI)', disabled: () => true, cb: () => {}}
	]},
	{name: 'Edit', children: [
		{
			text: 'Undo',
			shortcut: 'ctrl+z',
			disabled: () => {
				return app ? app.undoIndex < 1 : true;
			},
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
			disabled: () => {
				return app ? app.undoIndex >= undoStack.length - 1 : true;
			},
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
		{text: 'Snap To (NYI)', disabled: disableIfNoModel, cb: () => {}},
		{text: 'Brick Colors... (NYI)', disabled: disableIfNoModel, cb: () => {}}
	]},
	{name: 'View (NYI)', children: [
		{text: 'Add Horizontal Guide', disabled: disableIfNoModel, cb: () => {}},
		{text: 'Add Vertical Guide', disabled: disableIfNoModel, cb: () => {}},
		{text: 'Remove Guides', disabled: disableIfNoModel, cb: () => {}},
		{text: 'separator'},
		{text: 'Zoom 100%', disabled: disableIfNoModel, cb: () => {}},
		{text: 'Zoom To Fit', disabled: disableIfNoModel, cb: () => {}},
		{text: 'Zoom In', disabled: disableIfNoModel, cb: () => {}},
		{text: 'Zoom Out', disabled: disableIfNoModel, cb: () => {}},
		{text: 'separator'},
		{text: 'Show One Page', disabled: disableIfNoModel, cb: () => {}},
		{text: 'Show Two Pages', disabled: disableIfNoModel, cb: () => {}}
	]},
	{name: 'Export', children: [
		{
			text: 'Generate PDF',
			disabled: disableIfNoModel,
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
					page.steps.forEach(stepID => {

						const step = store.state.steps[stepID];

						if (step.csiID != null) {
							const csi = store.state.csis[step.csiID];
							let renderResult;
							if (stepID === 0) {
								renderResult = LDRender.renderModelData(model, 1000);
							} else {
								const parts = store.state.steps[stepID].parts;
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

						if (step.pliID != null) {
							const pli = store.state.plis[step.pliID];
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
		},
		{
			text: 'Generate PNG Images',
			disabled: disableIfNoModel,
			cb: () => {

				const modelName = store.state.modelName.replace(/\..+$/, '').replace(/\//g, '-');
				const zip = new JSZip();
				var imgFolder = zip.folder(modelName);

				const canvas = document.getElementById('generateImagesCanvas');
				canvas.width = store.state.pageSize.width;
				canvas.height = store.state.pageSize.height;

				store.state.pages.forEach(page => {
					app.drawPage(page, canvas);
					const pageName = (page.id === 0) ? 'Title Page.png' : `Page ${page.number}.png`;
					let data = canvas.toDataURL();
					data = data.substr(data.indexOf(',') + 1);
					imgFolder.file(pageName, data, {base64: true});
				});

				zip.generateAsync({type: 'blob'})
					.then(content => saveAs(content, `${modelName}.zip`));
			}
		}
	]}
];

const contextMenuEntries = {
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
		{text: 'Add Annotation', cb: () => {}},
		{
			text: 'Delete This Blank Page',
			enabled: () => {
				if (app && app.selectedItem && app.selectedItem.type === 'page') {
					return store.state.pages[app.selectedItem.id].steps.length < 1;
				}
				return false;
			},
			cb: () => {
				store.commit('deletePage', app.selectedItem.id);
				Vue.nextTick(() => app.setCurrentPage(app.selectedItem.id + 1));
			}
		}
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
};

app = new Vue({
	el: '#container',
	data: {  // Store any transient UI state data here
		currentPageID: null,
		statusText: '',
		undoIndex: -1,
		selectedItem: null,
		contextMenu: null
	},
	methods: {
		openRemoteLDrawModel(modelName) {
			model = LDParse.loadPart(modelName);
			model.submodels = model.submodels || [];
			this.importLDrawModel(model, modelName);
		},
		importLDrawModelFromContent(content) {
			model = LDParse.importModelFromContent(content);
			this.importLDrawModel(model, model.name);
		},
		importLDrawModel(model, modelName) {

			store.commit('setModelName', modelName);
			store.commit('addTitlePage');
			store.commit('addInitialPages');

			this.currentPageID = store.state.pages[0].id;
			undoStack.splice(0, undoStack.length - 1);
			app.undoIndex = 0;

			Vue.nextTick(() => this.drawCurrentPage());

			var end = Date.now();
			this.statusText = `"${store.state.modelName}" loaded successfully (${formatTime(start, end)})`;
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
			this.undoIndex = -1;
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
			const page = store.state.pages[this.currentPageID];
			if (!page) {
				return null;
			}
			if (page.numberLabel && inBox(mx, my, page.numberLabel)) {
				return page.numberLabel;
			}
			for (let i = 0; i < page.steps.length; i++) {
				const step = store.state.steps[page.steps[i]];
				if (step.csiID != null && inBox(mx, my, store.state.csis[step.csiID])) {
					return store.state.csis[step.csiID];
				}
				if (step.numberLabel && inBox(mx, my, step.numberLabel)) {
					return step.numberLabel;
				}
				if (step.pliID != null) {
					const pli = store.state.plis[step.pliID];
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
				const menu = contextMenuEntries[this.selectedItem.type];
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
			if (e.key === 'PageDown' && this.currentPageID + 1 < store.state.pages.length) {
				this.setCurrentPage(this.currentPageID + 1);
			} else if (e.key === 'PageUp' && this.currentPageID > 0) {
				this.setCurrentPage(this.currentPageID - 1);
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
				store.commit('setItemXY', {
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
				page.needsLayout = false;
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
				const localModel = getSubmodel(step.submodel);

				ctx.save();
				ctx.translate(step.x, step.y);

				if (step.csiID != null) {
					const csi = store.state.csis[step.csiID];
					const csiCanvas = document.getElementById(`CSI_${step.id}`);
					ctx.drawImage(csiCanvas, csi.x, csi.y);
				}

				if (step.pliID != null) {
					const pli = store.state.plis[step.pliID];
					ctx.strokeStyle = 'black';
					ctx.lineWidth = 2;
					roundedRect(ctx, pli.x, pli.y, pli.width, pli.height, 10);
					ctx.stroke();

					pli.pliItems.forEach(idx => {
						const pliItem = store.state.pliItems[idx];
						const part = localModel.parts[pliItem.partNumber];
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
					ctx.fillText(
						step.number + '',
						step.numberLabel.x,
						step.numberLabel.y + step.numberLabel.height
					);
				}

				ctx.restore();
			});
		}
	},
	computed: {
		menuEntries() {
			return menu;
		},
		pageWidth() {
			return store.state.pageSize.width;
		},
		pageHeight() {
			return store.state.pageSize.height;
		},
		pages() {
			return store.state.pages;
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

function inBox(x, y, t) {
	const box = app.targetBox(t);
	return x > box.x && x < (box.x + box.width) && y > box.y && y < (box.y + box.height);
}

function roundedRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
	ctx.arc(x + w - r, y + r, r, 3 * Math.PI / 2, 0);
	ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
	ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
	ctx.closePath();
}

function getSubmodel(submodelIDList) {
	return (submodelIDList || []).reduce((p, id) => p.parts[id].abstractPart, model);
}

function emptyNode(node) {
	while (node && node.firstChild) {
		node.removeChild(node.firstChild);
	}
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

originalState = clone(store.state);

//app.openRemoteLDrawModel('Adventurers/5935 - Island Hopper.mpd');
//app.openRemoteLDrawModel('Creator/20015 - Alligator.mpd');
//app.openRemoteLDrawModel('Star Wars/7140 - X-Wing Fighter.mpd');
//app.openRemoteLDrawModel('Architecture/21010 - Robie House.mpd');

window.app = app;
window.store = store;
window.model = model;

})();
