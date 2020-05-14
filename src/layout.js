/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';
import LDParse from './ld_parse';
import store from './store';
import LocaleManager from './components/translate.vue';

const emptyCalloutSize = 50;
const rotateIconAspectRatio = 0.94; // height / width
const qtyLabelOffset = 5;  // TODO: this belongs in the template

const api = {

	book(book) {
		book = store.get.lookupToItem(book);
		for (let i = 0; i < book.pages.length; i++) {
			const page = store.get.lookupToItem('page', book.pages[i]);
			api.page(page);
		}
	},
	titlePage(page) {
		page = store.get.lookupToItem(page);
		const pageSize = store.state.template.page;
		const step = store.get.step(page.steps[0]);
		const csi = store.get.csi(step.csiID);
		const box = {x: 0, y: 0, width: pageSize.width, height: pageSize.height};
		store.mutations.step.layout({step, box});
		step.width = csi.width + 40;
		step.height = csi.height + 40;
		step.x = (pageSize.width - step.width) / 2;
		step.y = (pageSize.height - step.height) / 2;
		csi.x = csi.y = 20;

		// TODO: If an annotation was changed / deleted, need to fix it before setting it
		const title = store.get.annotation(page.annotations[0]);
		api.label(title);
		title.x = (pageSize.width - title.width) / 2;
		title.y = (step.y - title.height) / 2;

		const modelInfo = store.get.annotation(page.annotations[1]);
		api.label(modelInfo);
		modelInfo.x = (pageSize.width - modelInfo.width) / 2;
		modelInfo.y = step.y + step.height + ((step.y - modelInfo.height) / 2);

		delete page.needsLayout;
	},

	allInventoryPages() {

		// If we already have multiple inventory pages, move all pliItems to the first page,
		// then delete all but the first page and redo layout across entire part list,
		// adding new pages back as necessary
		const pages = store.get.inventoryPages();
		const firstPage = pages[0];
		if (pages.length > 1) {
			// Delete all but first inventory page
			for (let i = 1; i < pages.length; i++) {
				const pageToRemove = pages[i];
				while (pageToRemove.pliItems.length) {
					const id = pageToRemove.pliItems[0];
					store.mutations.item.reparent(
						{item: {type: 'pliItem', id}, newParent: firstPage}
					);
				}
				store.mutations.inventoryPage.delete({page: pageToRemove});
			}
		}

		const allPLIItems = firstPage.pliItems.map(store.get.pliItem);
		api.page(firstPage);
		let nextPage = firstPage;
		const unplaced = item => {
			return !nextPage.pliItems.includes(item.id);
		};
		const reparent = item => {
			store.mutations.item.reparent({item, newParent: nextPage});
		};
		let unplacedPLIItems = allPLIItems.filter(unplaced);
		while (unplacedPLIItems.length > 0) {
			// Create a new inventory page and add all remaining pli items to it
			const opts = {subtype: 'inventoryPage', pageNumber: nextPage.number + 1};
			nextPage = store.mutations.page.add(opts);
			unplacedPLIItems.forEach(reparent);
			api.page(nextPage);
			unplacedPLIItems = unplacedPLIItems.filter(unplaced);
		}
	},

	// Lays out a single inventory page. Any pli items on the page that don't fit are ignored
	inventoryPage(page, box) {

		// Start with a big list of unsorted pli items with no size or position info.
		const pliItems = page.pliItems.map(store.get.pliItem);

		// Layout each pli; this sets its size info and positions its quantity label.
		pliItems.forEach(pliItem => {
			api.pliItem(pliItem);
		});

		// Sort pli items by color code, then sort within one color code by pli width
		pliItems.sort(function(a, b) {
			if (a.colorCode < b.colorCode) {
				return -1;
			} else if (a.colorCode > b.colorCode) {
				return 1;
			} else if (a.width < b.width) {
				return -1;
			} else if (a.width > b.width) {
				return 1;
			} else if (a.quantity < b.quantity) {
				return -1;
			} else if (a.quantity > b.quantity) {
				return 1;
			}
			return 0;
		});
		page.pliItems = pliItems.map(el => el.id);  // Store sorted pliItem IDs back in the page

		const margin = (getMargin(store.state.template.page.innerMargin) + qtyLabelOffset) * 1.2;
		let colWidth = 0, x = margin, y = margin;
		let columns = [[]];

		box.width -= margin + margin;
		box.height -= margin;

		// Start placing items on the page.  First item goes top left, next below that then on
		// until we hit the bottom of the page.  That's one column.  Track the widest label
		// placed in that column, then place next item at top of page again, max column width over.
		// If new column exceeds page width, store plis that don't fit and return them
		for (let i = 0; i < pliItems.length; i++) {
			const pliItem = pliItems[i];
			if (y + pliItem.height > box.height) {  // Check if new item fits below current item
				x += colWidth + margin;
				y = margin;
				colWidth = 0;
				columns.push([]);
			}
			if (x + pliItem.width > box.width) {
				// Remove any pli items that didn't fit on this page
				// They'll be re-added to a different page later
				// This should only happen during overall inventory page creation
				page.pliItems = page.pliItems.slice(0, i);
				break;
			}

			columns[columns.length - 1].push(pliItem);
			pliItem.x = x;
			pliItem.y = y;
			y += pliItem.height + margin;
			colWidth = Math.max(colWidth, pliItem.width);
		}

		// Everything is in nice columns.
		// Increase horizontal space between columns so they evenly fill the page width
		columns = columns.filter(el => el.length);
		if (columns.length === 2) {
			// Special case: For two columns, position 2nd in the middle of the page
			if (columns[1][0].x < box.width / 2) {
				columns[1].forEach(item => (item.x = box.width / 2));
			}
		} else if (columns.length > 2) {
			const lastCol = _.last(columns);
			const remainingSpace = box.width - lastCol[0].x - Math.max(...(lastCol.map(el => el.width)));
			const spaceToAdd = Math.max(0, remainingSpace / (columns.length - 1));
			columns.forEach((col, idx) => {
				col.forEach(item => {
					item.x += spaceToAdd * idx;
				});
			});
		}

		// Increase vertical space between items in the same column so they evenly fill the page height
		columns.forEach(col => {
			if (col.length > 1) {
				const lastItem = _.last(col);
				const remainingSpace = box.height - lastItem.y - lastItem.height;
				const spaceToAdd = Math.max(0, remainingSpace / (col.length - 1));
				col.forEach((item, idx) => {
					item.y += spaceToAdd * idx;
				});
			}
		});

		delete page.needsLayout;
	},

	page(page, layout = 'horizontal') {

		if (page.subtype === 'titlePage') {
			api.titlePage(page);
			return;
		}

		const template = store.state.template.page;
		const margin = getMargin(template.innerMargin);
		const borderWidth = template.border.width;
		const pageSize = {
			width: template.width - borderWidth - borderWidth,
			height: template.height - borderWidth - borderWidth
		};

		page.innerContentOffset = {x: borderWidth, y: borderWidth};

		if (page.numberLabelID != null) {
			api.pageNumber(page);
			const lbl = store.get.numberLabel(page.numberLabelID);
			pageSize.height -= lbl.height + (margin / 2);
		}

		if (page.subtype === 'inventoryPage') {
			api.inventoryPage(page, pageSize);
			return;
		}

		const stepCount = page.steps.length;
		let cols = Math.ceil(Math.sqrt(stepCount));
		let rows = Math.ceil(stepCount / cols);
		let layoutDirection;
		if (layout.rows != null && layout.cols != null) {
			if (layout.rows === 'auto' && layout.cols !== 'auto') {
				cols = layout.cols;
				rows = Math.ceil(stepCount / cols);
			} else if (layout.rows !== 'auto' && layout.cols === 'auto') {
				rows = layout.rows;
				cols = Math.ceil(stepCount / rows);
			} else if (layout.rows !== 'auto' && layout.cols !== 'auto') {
				rows = layout.rows;
				cols = layout.cols;
			}
			layoutDirection = layout.direction
				|| (pageSize.width > pageSize.height ? 'horizontal' : 'vertical');
		} else {
			layoutDirection = layout;
			if (layout === 'vertical') {
				[cols, rows] = [rows, cols];
			}
		}
		const colSize = Math.floor(pageSize.width / cols);
		const rowSize = Math.floor(pageSize.height / rows);

		const box = {x: 0, y: 0, width: colSize, height: rowSize};

		for (let i = 0; i < stepCount; i++) {
			if (layoutDirection === 'vertical') {
				box.x = colSize * Math.floor(i / rows);
				box.y = rowSize * (i % rows);
			} else {
				box.x = colSize * (i % cols);
				box.y = rowSize * Math.floor(i / cols);
			}
			api.step(store.get.step(page.steps[i]), box);
		}

		if (stepCount < (rows * cols)) {
			// Have fewer steps than fit in the grid; expand steps in last row / col to fill empty cell
			const emptySlots = (rows * cols) - stepCount;
			if (layoutDirection === 'vertical') {
				const stepsInLastCol = rows - emptySlots;
				box.width = colSize;
				box.height = Math.floor(pageSize.height / stepsInLastCol);
				box.x = (cols - 1) * colSize;
				for (let i = 0; i < stepsInLastCol; i++) {
					box.y = box.height * i;
					const stepIndex = ((cols - 1) * rows) + i;
					api.step(store.get.step(page.steps[stepIndex]), box);
				}
			} else {
				const stepsInLastRow = cols - emptySlots;
				box.width = Math.floor(pageSize.width / stepsInLastRow);
				box.height = rowSize;
				box.y = (rows - 1) * rowSize;
				for (let i = 0; i < stepsInLastRow; i++) {
					box.x = box.width * i;
					const stepIndex = ((rows - 1) * cols) + i;
					api.step(store.get.step(page.steps[stepIndex]), box);
				}
			}
		}

		page.layout = layout;
		page.actualLayout = (rows > 1 || cols > 1) ? {rows, cols, direction: layoutDirection} : 'horizontal';
		api.dividers(page, layoutDirection, rows, cols, pageSize);

		if (0 && store.state.plisVisible) {
			alignStepContent(page);
		}

		delete page.needsLayout;
	},

	pageNumber(page) {
		const template = store.state.template.page;
		const margin = getMargin(template.innerMargin);
		const borderWidth = template.border.width;
		const pageSize = {
			width: template.width - borderWidth - borderWidth,
			height: template.height - borderWidth - borderWidth
		};

		const lblSize = _.measureLabel(template.numberLabel.font, page.number);
		const lbl = store.get.numberLabel(page.numberLabelID);
		lbl.width = lblSize.width;
		lbl.height = lblSize.height;
		lbl.y = pageSize.height - margin;

		let position = template.numberLabel.position;
		if (position === 'even-left') {
			position = _.isEven(page.number) ? 'left' : 'right';
		} else if (position === 'even-right') {
			position = _.isEven(page.number) ? 'right' : 'left';
		}
		if (position === 'left') {
			lbl.x = margin;
			lbl.align = 'left';
		} else {
			lbl.x = pageSize.width - margin;
			lbl.align = 'right';
		}
	},

	step(step, box, pageMargin) {

		if (step.stretchedPages.length) {
			const pageWidth = store.state.template.page.width;
			box.width *= (step.stretchedPages.length + 1);
			step.stretchedPages.forEach((pageID, idx) => {
				const page = store.get.page(pageID);
				page.stretchedStep.leftOffset = -(idx + 1) * pageWidth;
			});
		}

		// Starting with a pre-defined box, layout everything in this step inside it
		let template = store.state.template;
		template = (step.parent.type === 'callout') ? template.callout.step : template.step;
		pageMargin = (pageMargin == null) ? getMargin(store.state.template.page.innerMargin) : pageMargin;
		const margin = getMargin(template.innerMargin);

		// Position step in parent coordinates
		step.x = box.x + pageMargin;
		step.y = box.y + pageMargin;
		step.width = box.width - pageMargin - pageMargin;
		step.height = box.height - pageMargin - pageMargin;

		// transform box to step coordinates
		box = _.cloneDeep(box);
		box.x = box.y = 0;
		box.width = step.width;
		box.height = step.height;

		step.submodelImages.forEach(submodelImageID => {
			const submodelImage = store.get.submodelImage(submodelImageID);
			if (submodelImage) {
				api.submodelImage(submodelImage, box);
				_.geom.moveBoxEdge(box, 'top', submodelImage.height + margin);
			}
		});

		const pli = (step.pliID != null && store.state.plisVisible) ? store.get.pli(step.pliID) : null;
		if (pli) {
			api.pli(pli);
			pli.y = box.y;
			_.geom.moveBoxEdge(box, 'top', pli.height + margin);
		}

		if (step.numberLabelID != null) {
			const lblSize = _.measureLabel(template.numberLabel.font, step.number);
			const lbl = store.get.numberLabel(step.numberLabelID);
			lbl.x = 0;
			lbl.y = box.y;
			lbl.width = lblSize.width;
			lbl.height = lblSize.height;
			_.geom.moveBoxEdge(box, 'top', lbl.height + margin);
		}

		step.callouts.forEach(calloutID => {
			const callout = store.get.callout(calloutID);
			api.callout(callout, box);
			if (callout.position === 'left') {
				_.geom.moveBoxEdge(box, 'left', callout.width + margin);
			} else if (callout.position === 'right') {
				_.geom.moveBoxEdge(box, 'right', -(callout.width + margin));
			} else if (callout.position === 'top') {
				_.geom.moveBoxEdge(box, 'top', callout.height + margin);
			} else if (callout.position === 'bottom') {
				_.geom.moveBoxEdge(box, 'bottom', -(callout.height + margin));
			}
		});

		if (step.csiID == null && step.steps.length) {
			api.subSteps(step, box);
		} else if (step.csiID != null) {
			api.csi(store.get.csi(step.csiID), box);
		}

		// Layout callout arrows after CSI because arrow tip position depends on CSI layout
		step.callouts.forEach(calloutID => {
			const callout = store.get.callout(calloutID);
			api.calloutArrow(callout);
		});

		if (step.rotateIconID != null && step.csiID != null) {
			const csi = store.get.csi(step.csiID);
			const icon = store.get.rotateIcon(step.rotateIconID);
			icon.width = store.state.template.rotateIcon.size;
			icon.height = icon.width * rotateIconAspectRatio;
			icon.x = csi.x - icon.width - margin;
			icon.y = csi.y - icon.height;
			if (icon.x < 0) {
				csi.x -= icon.x;
				icon.x = 0;
			}
			if (icon.y < 0) {
				csi.y -= icon.y;
				icon.y = 0;
			}

			// Ensure icon doesn't overlap step label
			const stepLabel = store.get.numberLabel(step.numberLabelID);
			if (icon.y >= stepLabel.y && icon.y <= stepLabel.y + stepLabel.height + margin
				&& icon.x >= stepLabel.x && icon.x <= stepLabel.x + stepLabel.width + margin
			) {
				icon.y = stepLabel.y + stepLabel.height + margin;
			}
		}

		if (store.get.stepHasSubmodel(step)) {
			const tagName = `submodel_arrow_step_${step.id}`;
			let annotation = store.state.annotations.filter(a => a.tagName === tagName)[0];
			if (store.state.template.pli.includeSubmodels) {
				if (annotation) {
					store.mutations.annotation.delete({annotation});
				}
			} else {
				if (annotation == null) {
					annotation = store.mutations.annotation.add({
						annotationType: 'arrow',
						properties: {direction: 'right', tagName},
						parent: step,
						x: 0, y: 0
					});
				}
				annotation.direction = 'right';
				const csi = store.get.csi(step.csiID);
				const base = store.get.point(annotation.points[0]);
				const prevStep = store.get.prevStep(step);
				if (prevStep.parent.id === step.parent.id) {
					// The Step that places submodel is on same page as the step that completes submodel
					// Place arrow right of step and add points to make it look like a divider
					while (annotation.points.length < 4) {
						store.mutations.calloutArrow.addPoint({arrow: annotation});
					}
					base.relativeTo = {type: 'step', id: prevStep.id};
					base.x = step.width;
					base.y = 0;
					const p1 = store.get.point(annotation.points[1]);
					p1.relativeTo = {type: 'step', id: prevStep.id};
					p1.x = step.width;
					p1.y = step.height;
					const p2 = store.get.point(annotation.points[2]);
					p2.relativeTo = {type: 'step', id: prevStep.id};
					p2.x = step.width;
					p2.y = csi.y + (csi.height / 2);
				} else {
					// The Step that places submodel is on the page after the step that completes submodel
					// Start arrow on extreme left of page, ignoring page margins
					while (annotation.points.length > 2) {
						store.mutations.item.delete({item: {type: 'point', id: annotation.points[2]}});
					}
					base.relativeTo = {type: 'page', id: step.parent.id};
					base.y = store.get.coords.pointToPage(0, csi.height / 2, csi).y;
					base.x = 0;
				}

				const tip = store.get.point(_.last(annotation.points));
				tip.relativeTo = {type: 'csi', id: step.csiID};
				tip.x = -_.geom.arrow().head.length - 10;
				tip.y = csi.height / 2;
			}
		}
	},

	submodelImage(submodelImage, box) {

		// TODO: can only shrink multiple submodels in one step so much, might need to lay out horizontally
		// TODO: make submodel boxes the same size as PLI boxes if new 'make PLIs same size' option is checked
		// TODO: check if page's step falls off page with chosen submodel size; if so, shrink submodel
		const template = store.state.template.submodelImage;

		const margin = getMargin(store.state.template.submodelImage.innerMargin);
		const csi = store.get.csi(submodelImage.csiID);
		const part = LDParse.model.get.abstractPart(submodelImage.modelFilename);

		let csiSize;
		csi.isDirty = true;  // TODO: is this necessary?
		if (csi.scale != null) {  // If user chose a manual scale factor, respect it
			csiSize = store.render.pli(part.colorCode, part.filename, csi);
		} else {
			csi.autoScale = template.csi.scale;
			csiSize = store.render.pli(part.colorCode, part.filename, csi);
			if (csiSize.height > box.height * template.maxHeight) {
				csi.autoScale *= (box.height * template.maxHeight) / csiSize.height;
				csi.isDirty = true;  // This is necessary because we just rendered it; this forces re-render
				csiSize = store.render.pli(part.colorCode, part.filename, csi);
			} else {
				csi.autoScale = null;
			}
		}

		csi.x = csi.y = margin;
		csi.width = csiSize.width;
		csi.height = csiSize.height;

		const borderWidth = template.border.width;
		submodelImage.innerContentOffset = {x: borderWidth, y: borderWidth};

		submodelImage.x = box.x;
		submodelImage.y = box.y;
		submodelImage.width = borderWidth + margin + csiSize.width + margin + borderWidth;
		submodelImage.height = borderWidth + margin + csiSize.height + margin + borderWidth;

		if (submodelImage.quantityLabelID != null) {
			const lbl = store.get.quantityLabel(submodelImage.quantityLabelID);
			const font = template.quantityLabel.font;
			const lblSize = _.measureLabel(font, 'x' + submodelImage.quantity);
			submodelImage.width += lblSize.width + margin;
			lbl.x = submodelImage.width - borderWidth - borderWidth - margin;
			lbl.y = submodelImage.height - borderWidth - borderWidth - margin;
			_.assign(lbl, lblSize);
		}
	},

	csi(csi, box) {
		// Draw CSI centered in box
		const step = store.get.parent(csi);
		const localModel = LDParse.model.get.abstractPart(step.model.filename);
		const csiSize = store.render.csi(localModel, step, csi) || {width: 0, height: 0};
		csi.x = box.x + ((box.width - csiSize.width) / 2);
		csi.y = box.y + ((box.height - csiSize.height) / 2);
		csi.width = csiSize.width;
		csi.height = csiSize.height;
	},

	pli(pli) {

		// TOOD: if generated PLI is too big (say, > 30% of page), auto shrink the big items
		let pliItems = pli.pliItems;
		if (!store.state.template.pli.includeSubmodels) {
			pliItems = pliItems.filter(id => {
				return !store.get.pliItemIsSubmodel({id, type: 'pliItem'});
			});
		}

		const borderWidth = store.state.template.pli.border.width;
		pli.innerContentOffset = {x: borderWidth, y: borderWidth};

		pli.borderOffset.x = pli.borderOffset.y = 0;
		if (_.isEmpty(pliItems)) {
			pli.x = pli.y = pli.width = pli.height = 0;
			return;
		}

		const margin = getMargin(store.state.template.pli.innerMargin);
		let maxHeight = 0, left = margin + qtyLabelOffset;

		// aw = attr(a, 'width'), ah = attr(a, 'height')
		//pliItems.sort((a, b) => ((aw(b) * ah(b)) - (aw(a) * a(a))))
		for (let i = 0; i < pliItems.length; i++) {

			const pliItem = store.get.pliItem(pliItems[i]);
			api.pliItem(pliItem);
			pliItem.x = left;
			pliItem.y = margin;

			left += pliItem.width + margin;
			const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
			maxHeight = Math.max(maxHeight, pliItem.height - qtyLabelOffset + quantityLabel.height);
		}

		pli.x = pli.y = 0;
		pli.width = borderWidth + left + borderWidth;
		pli.height = borderWidth + margin + maxHeight + margin + borderWidth;
	},

	pliItem(pliItem) {
		// TODO: auto shrink big pliItems, like we already do in submodelImages()
		const pliSize = store.render.pli(pliItem.colorCode, pliItem.filename, pliItem);
		pliItem.x = pliItem.y = 0;
		pliItem.width = pliSize.width;
		pliItem.height = pliSize.height;

		const font = store.state.template.pliItem.quantityLabel.font;
		const lblSize = _.measureLabel(font, 'x' + pliItem.quantity);
		const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
		quantityLabel.x = pliSize.container.bottomX - qtyLabelOffset;
		quantityLabel.y = pliSize.height + qtyLabelOffset;
		quantityLabel.width = lblSize.width;
		quantityLabel.height = lblSize.height;
	},

	callout(callout, box) {
		// TODO: add horizontal / vertical layout options to callout
		const borderWidth = store.state.template.callout.border.width;
		const margin = getMargin(store.state.template.callout.innerMargin);
		const calloutBox = {x: 0, y: 0, width: 0, height: margin};
		const pos = callout.position;
		const isOnSide = (pos === 'left' || pos === 'right');

		callout.borderOffset.x = callout.borderOffset.y = 0;
		const stepSizes = callout.steps.map(stepID => {
			const step = store.get.step(stepID);
			return {step, ...measureStep(step)};
		});

		if (callout.layout === 'horizontal') {
			const maxCalloutWidth = isOnSide ? box.width * 0.75 : box.width;  // TODO: consider CSI width
			const tallestStep = Math.max(...stepSizes.map(el => el.height));
			const stepBox = {x: margin, y: margin, width: null, height: tallestStep};
			calloutBox.height = margin + tallestStep + margin;

			const rows = [[]];
			stepSizes.forEach((entry, idx) => {
				const stepWidth = borderWidth + stepBox.x + entry.width + margin + borderWidth;
				if (idx > 0 && (stepWidth > maxCalloutWidth)) {
					// Adding this step to the right will make the box too wide; wrap to next row
					// TODO: this often puts 3 steps on one row and the 4th on a new row.  Looks bad.
					rows.push([]);
					stepBox.x = margin;
					stepBox.y += tallestStep + margin;
					calloutBox.height += tallestStep + margin;
				}
				stepBox.width = entry.width;
				rows[rows.length - 1].push({step: entry.step, box: _.cloneDeep(stepBox)});
				api.step(entry.step, stepBox, 0);
				stepBox.x += stepBox.width + margin;
				calloutBox.width = Math.max(calloutBox.width, stepBox.x);
			});

			// Increase vertical space between each row so all rows align nicely
			const cols = _.unzip(rows);
			cols.forEach(col => {
				col = col.filter(el => el);
				const maxX = Math.max(...col.map(c => c.box.x));
				col.forEach(el => (el.step.x = maxX));
			});
		} else {
			const maxCalloutHeight = isOnSide ? box.height : box.height * 0.5;  // TODO: consider CSI height
			const widestStep = Math.max(...stepSizes.map(el => el.width));
			const stepBox = {x: margin, y: margin, width: widestStep, height: null};
			calloutBox.width = margin + widestStep + margin;

			const columns = [[]];
			stepSizes.forEach((entry, idx) => {
				const stepWidth = borderWidth + stepBox.y + entry.height + margin + borderWidth;
				if (idx > 0 && (stepWidth > maxCalloutHeight)) {
					// Adding this step to the bottom of the box makes the box too tall; wrap to next column
					columns.push([]);
					stepBox.y = margin;
					stepBox.x += widestStep + margin;
					calloutBox.width += widestStep + margin;
				}
				stepBox.height = entry.height;
				columns[columns.length - 1].push({step: entry.step, box: _.cloneDeep(stepBox)});
				api.step(entry.step, stepBox, 0);
				stepBox.y += stepBox.height + margin;
				calloutBox.height = Math.max(calloutBox.height, stepBox.y);
			});

			// Increase vertical space between each row so all rows align nicely
			const rows = _.unzip(columns);
			rows.forEach(row => {
				row = row.filter(el => el);
				const maxY = Math.max(...row.map(c => c.box.y));
				row.forEach(el => (el.step.y = maxY));
			});
		}

		callout.innerContentOffset = {x: borderWidth, y: borderWidth};
		callout.width = borderWidth + calloutBox.width + borderWidth;
		callout.height = borderWidth + calloutBox.height + borderWidth;
		if (isOnSide) {
			callout.x = (pos === 'left') ? box.x : box.x + box.width - callout.width;
			callout.y = box.y + ((box.height - callout.height) / 2);  // Center callout vertically
		} else {
			callout.x = box.x + ((box.width - callout.width) / 2);  // Center callout horizontall
			callout.y = (pos === 'top') ? box.y : box.y + box.height - callout.height;
		}
	},

	calloutArrow(callout) {

		// Delete all but first callout arrow
		while (callout.calloutArrows.length > 1) {
			store.mutations.item.delete({item: {type: 'calloutArrow', id: callout.calloutArrows[1]}});
		}

		// Delete all but first & last point in first arrow
		const calloutPos = callout.position;
		const isOnSide = (calloutPos === 'left' || calloutPos === 'right');
		const arrow = store.get.calloutArrow(callout.calloutArrows[0]);
		arrow.direction = {left: 'right', top: 'down', right: 'left', bottom: 'up'}[calloutPos];
		while (arrow.points.length > 2) {
			store.mutations.item.delete({item: {type: 'point', id: arrow.points[1]}});
		}

		// Coordinates for first point (base) are relative to the *callout*
		// Position on edge of callout centered on last step
		const lastStep = callout.steps.length > 1 ? store.get.step(_.last(callout.steps)) : null;
		const p1 = store.get.point(arrow.points[0]);
		p1.relativeTo = {type: 'callout', id: callout.id};

		if (isOnSide) {
			p1.x = (calloutPos === 'left') ? callout.borderOffset.x + callout.width : 0;
			p1.y = lastStep
				? lastStep.y + (lastStep.height / 2)
				: callout.borderOffset.y + callout.height / 2;
		} else {
			p1.x = lastStep
				? lastStep.x + (lastStep.width / 2)
				: callout.borderOffset.x + callout.width / 2;
			p1.y = (calloutPos === 'top') ? callout.borderOffset.y + callout.height : 0;
		}

		// Coordinates for last point (tip) are relative to the *CSI*
		// TODO: try to position arrow tip centered to inserted part bounding box instead of overall CSI box
		const step = store.get.step(callout.parent.id);
		const csi = store.get.csi(step.csiID);
		const p2 = store.get.point(arrow.points[1]);
		// p2 is arrow's base; move it to the left to make space for the arrow head
		const arrowSize = _.geom.arrow().head.length;
		p2.relativeTo = {type: 'csi', id: csi.id};

		if (isOnSide) {
			p2.x = (calloutPos === 'left') ? -arrowSize : csi.width + arrowSize;
			p2.y = csi ? csi.height / 2 : 50;
		} else {
			p2.x = csi ? csi.width / 2 : 50;
			p2.y = (calloutPos === 'top') ? -arrowSize : csi.height + arrowSize;
		}
	},

	subSteps(step, stepBox) {
		// TODO: sub steps should be able to span multiple pages
		// TODO: this dupes a lot of logic from page.layout; abstract both to a generic 'grid' layout call
		const stepCount = step.steps.length;
		let cols = Math.ceil(Math.sqrt(stepCount));
		let rows = Math.ceil(stepCount / cols);
		const layout = step.subStepLayout;
		if (layout === 'vertical') {
			[cols, rows] = [rows, cols];
		}
		const colSize = Math.floor(stepBox.width / cols);
		const rowSize = Math.floor(stepBox.height / rows);

		const box = {x: stepBox.x, y: stepBox.y, width: colSize, height: rowSize};

		for (let i = 0; i < stepCount; i++) {
			if (layout === 'vertical') {
				box.x = stepBox.x + (colSize * Math.floor(i / rows));
				box.y = stepBox.y + (rowSize * (i % rows));
			} else {
				box.x = stepBox.x + (colSize * (i % cols));
				box.y = stepBox.y + (rowSize * Math.floor(i / cols));
			}
			api.step(store.get.step(step.steps[i]), box);
		}
		api.dividers(step, step.subStepLayout, rows, cols, stepBox);
	},

	templatePageDividers(page, box) {
		const template = store.state.template.page;
		const margin = getMargin(template.innerMargin);
		const step = store.get.step(page.steps[0]);
		const csi = store.get.csi(step.csiID);
		const x = margin + csi.x + csi.width + 30;
		store.mutations.divider.add({
			parent: page,
			p1: {x, y: margin},
			p2: {x, y: box.height - margin}
		});
	},

	dividers(target, layoutDirection, rows, cols, box) {

		// Delete any dividers already on the target, then re-add new ones in the right places
		store.mutations.item.deleteChildList({item: target, listType: 'divider'});

		if (target.type === 'templatePage') {
			api.templatePageDividers(target, box);
			return;
		}

		const x = box.x || 0, y = box.y || 0;
		const template = store.state.template;
		const margin = getMargin(template[target.type].innerMargin);
		const colSize = Math.floor(box.width / cols);
		const rowSize = Math.floor(box.height / rows);

		if (layoutDirection === 'horizontal') {
			for (let i = 1; i < rows; i++) {
				store.mutations.divider.add({
					parent: target,
					p1: {x: x + margin, y: y + (rowSize * i)},
					p2: {x: x + box.width - margin, y: y + (rowSize * i)}
				});
			}
		} else {
			for (let i = 1; i < cols; i++) {
				store.mutations.divider.add({
					parent: target,
					p1: {x: x + (colSize * i), y: y + margin},
					p2: {x: x + (colSize * i), y: y + box.height - margin}
				});
			}
		}
	},

	label(label, font, text) {
		const labelSize = _.measureLabel(font || label.font, text || label.text);
		label.width = labelSize.width;
		label.height = labelSize.height;
	},

	async mergeSteps(stepsToMerge, progressCallback) {

		async function mergeOneStep() {
			return new Promise(resolve => window.setTimeout(() => {
				const step = stepsToMerge[0];
				const originalPage = store.get.pageForItem(step);
				const prevPage = store.get.prevBasicPage(originalPage);

				// TODO: use moveToPage, since we know what page to move to
				store.mutations.step.moveToPreviousPage({step});

				const stepsOverlap = prevPage.steps.some(stepID => isStepTooSmall(store.get.step(stepID)));
				if (stepsOverlap) {
					// Not enough room; move step back then start filling the next page
					store.mutations.step.moveToNextPage({step});
				} else {
					// Step fits; delete the now-empty page the step moved from
					store.mutations.page.delete({page: originalPage});
				}
				progressCallback(
					LocaleManager.translate('glossary.step_count_@c', stepsToMerge[0].number)
				);
				_.pullAt(stepsToMerge, 0);
				resolve();
			}, 100));
		}

		// Starting with one step per page, move adjacent steps to previous page until page is full-ish
		stepsToMerge = stepsToMerge.slice(1);
		while (stepsToMerge.length) {
			await mergeOneStep();
		}
	},

	adjustBoundingBox: {
		item(item, boxes, template) {
			const borderWidth = template.border ? template.border.width : 0;
			const margin = getMargin(template.innerMargin);
			const bbox = _.geom.bbox(boxes);
			item.borderOffset = item.borderOffset || {};
			item.borderOffset.x = bbox.x - item.x - margin;
			item.borderOffset.y = bbox.y - item.y - margin;
			item.width = borderWidth + margin + bbox.width + margin + borderWidth;
			item.height = borderWidth + margin + bbox.height + margin + borderWidth;
		},

		stepUnused(item) {
			const step = store.get.lookupToItem(item);
			const children = store.get.stepChildren(step);
			const boxes = [];
			children.forEach(child => {
				boxes.push(child);
			});
			if (boxes.length === 1) {
				const margin = getMargin(store.state.template.step.innerMargin);
				boxes[0] = {
					x: boxes[0].x - (margin / 2),
					y: boxes[0].y - (margin / 2),
					width: boxes[0].width + margin,
					height: boxes[0].height + margin
				};
			}
			const bbox = _.geom.bbox(boxes);  // bbox of all children in step coordinates
			step.x += bbox.x;
			step.y += bbox.y;
			step.width = bbox.width;
			step.height = bbox.height;
			if (step.parent.type === 'callout') {
				api.adjustBoundingBox.callout(store.get.parent(step));
			}
		},

		pli(item) {
			const pli = store.get.lookupToItem(item);
			const boxes = [];
			pli.pliItems.forEach(itemID => {
				const pliItem = store.get.pliItem(itemID);
				boxes.push({
					x: pli.x + pliItem.x, y: pli.y + pliItem.y,
					width: pliItem.width, height: pliItem.height
				});
				const qtyLabel = store.get.quantityLabel(pliItem.quantityLabelID);
				boxes.push({
					x: pli.x + pliItem.x + qtyLabel.x, y: pli.y + pliItem.y + qtyLabel.y,
					width: qtyLabel.width, height: qtyLabel.height
				});
			});
			api.adjustBoundingBox.item(pli, boxes, store.state.template.pli);
		},

		pliItem(item) {
			const pliItem = store.get.lookupToItem(item);
			if (pliItem.parent.type === 'pli') {
				api.adjustBoundingBox.pli(pliItem.parent);
			}
		},

		callout(item) {
			const callout = store.get.lookupToItem(item);
			const boxes = [];
			callout.steps.forEach(itemID => {
				const step = store.get.step(itemID);
				boxes.push({
					x: callout.x + step.x, y: callout.y + step.y,
					width: step.width, height: step.height
				});
			});
			api.adjustBoundingBox.item(callout, boxes, store.state.template.callout);
			api.calloutArrow(callout);
		},

		quantityLabel(item) {
			if (item.parent.type === 'pliItem') {
				api.adjustBoundingBox.pliItem(store.get.parent(item));
			}
		}
	}
};

// This is only used for 'inside-out' type layouts, which are only used in callouts for now
function measureStep(step) {

	const box = {width: 0, height: 0};
	const template = store.state.template;
	const margin = getMargin(template.step.innerMargin);

	if (step.numberLabelID != null) {
		const lblSize = _.measureLabel(template.callout.step.numberLabel.font, step.number);
		box.width += lblSize.width;
		box.height += lblSize.height;
	}

	const csi = store.get.csi(step.csiID);
	const localModel = LDParse.model.get.abstractPart(step.model.filename);
	const csiSize = store.render.csi(localModel, step, csi);
	if (csiSize != null) {
		box.width += (box.width === 0) ? csiSize.width : csiSize.width + margin;
		box.height += (box.height === 0) ? csiSize.height : csiSize.height + margin;
	}
	if (step.rotateIconID != null) {
		const size = template.rotateIcon.size;
		box.width += (box.width === 0) ? size : size + margin;
		box.height += size;
	}

	const children = store.get.stepChildren(step);
	if (children.length === 1) {
		// Special case: for exactly one child, pad step to be bigger than child so step is selectable
		box.width += margin;
		box.height += margin;
	}

	if (box.width < 1 && box.height < 1) {
		const emptyStepSize = emptyCalloutSize - margin;
		return {width: emptyStepSize, height: emptyStepSize};
	}

	return box;
}

function getMargin(margin) {
	const pageSize = store.state.template.page;
	return margin * Math.max(pageSize.width, pageSize.height);
}

// TODO: should push callouts down too
// TODO: this duplicates a lot of step layout logic, badly. eg: it doesn't push content below step numbers
function alignStepContent(page) {
	const margin = getMargin(store.state.template.step.innerMargin);
	const steps = page.steps.map(stepID => store.get.step(stepID));
	if (steps.length < 2 || typeof page.actualLayout !== 'object'
		|| page.actualLayout.direction !== 'horizontal'
	) {
		return;  // only align step content across horizontally laid out pages with multiple steps
	}
	const stepsByRow = _.chunk(steps, page.actualLayout.cols);
	stepsByRow.forEach(stepList => {
		// Don't adjust steps with submodel images here
		stepList = stepList.filter(el => !el.submodelImages.length);
		const tallestPLIHeight = Math.max(
			...stepList.map(step => (store.get.pli(step.pliID) || {}).height || 0)
		);
		stepList.forEach(step => {
			const csi = store.get.csi(step.csiID);
			if (csi) {
				csi.y = (step.height + tallestPLIHeight - csi.height) / 2;
			}
			const lbl = store.get.numberLabel(step.numberLabelID);
			if (lbl) {
				lbl.y = tallestPLIHeight ? tallestPLIHeight + margin : 0;
			}
		});
	});
}

function isStepTooSmall(step) {
	const csi = store.get.csi(step.csiID);
	const pli = store.state.plisVisible ? store.get.pli(step.pliID) : null;
	const pliHeight = pli ? pli.height : 0;
	const submodelSpace = {width: 0, height: 0};
	step.submodelImages.forEach(submodelImageID => {
		const submodelImage = store.get.submodelImage(submodelImageID);
		submodelSpace.width = Math.max(submodelImage.width * 1.05, submodelSpace.width);
		submodelSpace.height += submodelImage.height;
	});

	if (step.width < csi.width * 1.1) {
		return true;
	} else if (pli && step.width < pli.width * 1.05) {
		return true;
	} else if (step.width < submodelSpace.width) {
		return true;
	} else if (step.height < (submodelSpace.height + pliHeight + csi.height) * 1.2) {
		return true;
	}
	return false;
}

export default api;
