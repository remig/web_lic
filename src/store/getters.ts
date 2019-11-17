/* Web Lic - Copyright (C) 2018 Remi Gagne */

import {isItemSpecificType, hasProperty} from '../type_helpers';

import _ from '../util';
import LDParse from '../ld_parse';
import store from '../store';

function getter<T>(s: ItemTypes) {
	return (itemLookup: number | LookupItem) => {
		if (typeof itemLookup === 'number') {
			return store.get.lookupToItem({type: s, id: itemLookup}) as unknown as T;
		}
		return store.get.lookupToItem(itemLookup) as unknown as T;
	};
}

interface SubmodelIdentifier {
	filename: string;
	quantity: number;
	stepID: number;
}

// TODO: clean up 'submodel' as an item type vs. entry in getters
function getItem(itemType: ItemTypes, id: number): Item {
	return (store.get as any)[itemType](id);
}

function getChildIDList(item: Item, childType: ItemTypes): number[] {
	return (item as any)[childType + 's'];
}

function getChildID(item: Item, childType: ItemTypes): number {
	return (item as any)[childType + 'ID'];
}

export interface GetterInterface {
	book(id: LookupItem | number): Book;
	page(id: LookupItem | number): Page;
	divider(id: LookupItem | number): any;
	step(id: LookupItem | number): Step;
	csi(id: LookupItem | number): any;
	pli(id: LookupItem | number): any;
	pliItem(id: LookupItem | number): PLIItem;
	quantityLabel(id: LookupItem | number): any;
	numberLabel(id: LookupItem | number): any;
	submodelImage(id: LookupItem | number): any;
	annotation(id: LookupItem | number): any;
	callout(id: LookupItem | number): any;
	calloutArrow(id: LookupItem | number): any;
	point(id: LookupItem | number): any;
	rotateIcon(id: LookupItem | number): any;
	modelName(nice: boolean): string;
	modelFilename(): string;
	modelFilenameBase(ext?: string): string;
	pageCount(): number;
	isTitlePage(pageLookup: LookupItem): boolean;
	titlePage(): Page;
	isBasicPage(pageLookup: LookupItem): boolean;
	basicPages(): Page[];
	isInventoryPage(pageLookup: LookupItem): boolean;
	inventoryPages(): Page[];
	isFirstBasicPage(pageLookup: LookupItem): boolean;
	isLastBasicPage(pageLookup: LookupItem): boolean;
	isLastPage(page: LookupItem): boolean;
	firstBasicPage(): Page | null;
	lastBasicPage(): Page | null;
	prevBasicPage(item: LookupItem): Page | null;
	nextBasicPage(item: LookupItem): Page | null;
	prevPage(item: LookupItem): Page;
	nextPage(item: LookupItem): Page;
	pageList(): Page[];
	templatePage(): Page;
	templateForItem(itemLookup: LookupItem): any;
	isTemplatePage(pageLookup: LookupItem): boolean;
	firstBookPage(bookLookup: LookupItem): Page | null;
	firstPage(): Page | null;
	lastPage(): Page | null;
	adjacentStep(
		stepLookup: LookupItem, direction: 'prev' | 'next', limitToSubmodel: boolean
	): Step | null;
	prevStep(stepLookup: LookupItem, limitToSubmodel: boolean): Step | null;
	nextStep(stepLookup: LookupItem, limitToSubmodel: boolean): Step | null;
	part(partID: number, stepLookup: LookupItem): any;
	partsInStep(stepLookup: LookupItem): Part[];
	abstractPartsInStep(stepLookup: LookupItem): any[];
	stepHasSubmodel(stepLookup: LookupItem): boolean;
	partList(stepLookup: LookupItem): number[] | null;
	matchingPLIItem(parentLookup: LookupItem, part: any): PLIItem | null;
	pliItemIsSubmodel(pliItemLookup: LookupItem): boolean;
	pliTransform(filename: string): any;
	isMoveable(item: LookupItem): boolean;
	prev<T extends Item>(itemLookup: LookupItem, itemList?: Item[]): T | null;
	next<T extends Item>(itemLookup: LookupItem, itemList?: Item[]): T | null;
	parent(itemLookup: LookupItem): Item | null;
	isDescendent(itemLookup: LookupItem, ancestorLookup: LookupItem): boolean;
	childList(): ItemTypes[];
	stepChildren(step: LookupItem): Item[];
	hasChildren(itemLookup: LookupItem): boolean;
	children(itemLookup: LookupItem, childTypeList?: ItemTypes[]): Item[];
	pageForItem(item: any): Page;
	submodels(): SubmodelIdentifier[];
	topLevelTreeNodes(): any[];
	nextItemID(item: any): number;
	itemByNumber(type: string, number: number): Item | null;
	lookupToItem(lookup: LookupItem | null): Item | null;
	lookupToItem(lookup: number, type: ItemTypes): Item | null;
	itemToLookup(item: Item): LookupItem | null;
	coords: {
		pageToItem(
			{x, y}: {x: number, y: number},
			itemLookup: LookupItem,
		): Point;
		itemToPage(itemLookup: LookupItem): Point;
		pointToPage(
			x: number | {x: number, y: number, relativeTo: LookupItem},
			y?: number,
			relativeTo?: LookupItem
		): Point;
	},
	targetBoxFromPoints(targetLookup: LookupItem): Box;
	targetBox(targetLookup: LookupItem): Box;
	highlightBox(
		itemLookup: LookupItem,
		pageSize: {width: number, height: number},
		currentPage: Page
	): Box | {display: string};
}

export const Getters: GetterInterface = {
	annotation: getter('annotation'),
	book: getter('book'),
	callout: getter('callout'),
	calloutArrow: getter('calloutArrow'),
	csi: getter('csi'),
	divider: getter('divider'),
	numberLabel: getter('numberLabel'),
	page: getter('page'),
	pli: getter('pli'),
	pliItem: getter('pliItem'),
	point: getter('point'),
	quantityLabel: getter('quantityLabel'),
	rotateIcon: getter('rotateIcon'),
	step: getter('step'),
	submodelImage: getter('submodelImage'),
	modelName(nice: boolean) {
		if (!store.model) {
			return '';
		} else if (store.model.name) {
			return store.model.name;
		}
		const name = store.get.modelFilenameBase();
		if (nice) {
			return _.startCase(name.replace(/\//g, '-').replace(/_/g, ' '));
		}
		return name;
	},
	modelFilename() {
		if (!store.model || !store.model.filename) {
			return '';
		}
		return store.model.filename;
	},
	modelFilenameBase(ext = '') {
		if (!store.model || !store.model.filename) {
			return '';
		}
		return store.model.filename.split('.')[0] + ext;
	},
	pageCount() {
		return store.state.pages.length - 1;  // never want to include template page here
	},
	isTitlePage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		return (page || {}).subtype === 'titlePage';
	},
	titlePage() {
		return store.state.pages.find(store.get.isTitlePage);
	},
	isBasicPage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		return (page || {}).subtype === 'page';
	},
	basicPages() {
		return store.state.pages.filter(store.get.isBasicPage);
	},
	isInventoryPage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		return (page || {}).subtype === 'inventoryPage';
	},
	inventoryPages() {
		return store.state.pages.filter(store.get.isInventoryPage);
	},
	isFirstBasicPage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		const basicPages = store.get.basicPages();
		return (page != null) && (page.id === basicPages[0].id);
	},
	isLastBasicPage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		const lastPage = _.last(store.get.basicPages());
		return (page != null) && (lastPage != null) && (page.id === lastPage.id);
	},
	isLastPage(page: LookupItem) {
		const lastPage = _.last(store.state.pages) as Page;
		return (page != null) && (lastPage != null) && (page.id === lastPage.id);
	},
	firstBasicPage() {
		return store.get.basicPages()[0] || null;
	},
	lastBasicPage() {
		return _.last(store.get.basicPages()) || null;
	},
	prevBasicPage(item: LookupItem) {
		const prevPage = store.get.prevPage(item);
		return (prevPage || {}).subtype === 'page' ? prevPage : null;
	},
	nextBasicPage(item: LookupItem) {
		const nextPage = store.get.nextPage(item);
		return (nextPage || {}).subtype === 'page' ? nextPage : null;
	},
	prevPage(item: LookupItem) {
		const page = store.get.pageForItem(item);
		const pageList = store.get.pageList();
		const idx = pageList.indexOf(page);
		return pageList[idx - 1] || null;
	},
	nextPage(item: LookupItem) {
		const page = store.get.pageForItem(item);
		const pageList = store.get.pageList();
		const idx = pageList.indexOf(page);
		return pageList[idx + 1] || null;
	},
	pageList() {
		return store.state.pages.filter((el: object) => el);
	},
	templatePage() {
		return store.state.pages[0];
	},
	templateForItem(item: LookupItem) {
		const template = store.state.template;
		if (template[item.type]) {
			return template[item.type];
		}
		const parent = store.get.parent(item);
		switch (item.type) {
			case 'csi':
				return parent ? template[parent.type]?.csi : null;
			case 'divider':
				return template.page.divider;
			case 'quantityLabel':
				return parent ? template[parent.type].quantityLabel : null;
			case 'numberLabel':
				if (parent) {
					if (parent.parent && parent.parent.type === 'callout') {
						return template.callout.step.numberLabel;
					} else if (parent.type === 'page' && (parent as Page).subtype === 'templatePage') {
						return template.page.numberLabel;
					}
					return template[parent.type].numberLabel;
				}
		}
		return null;
	},
	isTemplatePage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		return (page != null) && (page.subtype === 'templatePage');
	},
	firstBookPage(bookLookup: LookupItem) {
		const book = store.get.book(bookLookup);
		if (book) {
			const firstPage = store.get.page(book.pages[0]);
			if (firstPage.subtype === 'templatePage') {
				return store.get.page(book.pages[1]);
			}
			return firstPage;
		}
		return null;
	},
	firstPage() {
		return store.state.pages[1];  // first page should still ignore template page
	},
	lastPage() {
		return _.last(store.state.pages) || null;
	},
	adjacentStep(stepLookup: LookupItem, direction: 'prev' | 'next', limitToSubmodel: boolean) {
		const step = store.get.step(stepLookup);
		let itemList;
		if (step.parent.type === 'step' || step.parent.type === 'callout') {
			const parent = store.get.parent(step);
			if (hasProperty<StepParent>(parent, 'steps')) {
				itemList = parent.steps.map(store.get.step);
			}
		}
		let adjacentStep = store.get[direction]<Step>(step, itemList);
		if (limitToSubmodel && itemList == null) {
			while (
				adjacentStep
				&& (step.model.filename !== adjacentStep.model.filename
					|| step.model.parentStepID !== adjacentStep.model.parentStepID)
			) {
				adjacentStep = store.get[direction](adjacentStep);
			}
		}
		return adjacentStep;
	},
	prevStep(stepLookup: LookupItem, limitToSubmodel: boolean) {
		return store.get.adjacentStep(stepLookup, 'prev', limitToSubmodel);
	},
	nextStep(stepLookup: LookupItem, limitToSubmodel: boolean) {
		return store.get.adjacentStep(stepLookup, 'next', limitToSubmodel);
	},
	part(partID: number, stepLookup: LookupItem) {
		const step = store.get.step(stepLookup);
		return LDParse.model.get.partFromID(partID, step.model.filename);
	},
	partsInStep(stepLookup: LookupItem) {
		const step = store.get.step(stepLookup);
		if (step) {
			return (step.parts || []).map((partID: number) => {
				return LDParse.model.get.partFromID(partID, step.model.filename);
			});
		}
		return [];
	},
	abstractPartsInStep(stepLookup: LookupItem) {
		const step = store.get.lookupToItem(stepLookup);
		if (step) {
			const parts = store.get.partsInStep(step);
			return parts.map((part: Part) => {
				return LDParse.model.get.abstractPart(part.filename);
			});
		}
		return [];
	},
	stepHasSubmodel(stepLookup: LookupItem) {
		const step = store.get.lookupToItem(stepLookup);
		if (step) {
			const parts = store.get.abstractPartsInStep(step);
			return parts.some((part: AbstractPart) => part.isSubModel);
		}
		return false;
	},
	partList(stepLookup: LookupItem) {
		// Return a list of part IDs for every part in this (and previous) step
		let step: Step | null = store.get.step(stepLookup);
		if (step.parts == null) {
			return null;
		}
		let partList: number[] = [];
		while (step) {
			if (step.parts) {
				partList = partList.concat(step.parts);
			}
			if (step.prevBookParts) {
				partList = partList.concat(step.prevBookParts);
				step = null;
			} else {
				step = store.get.prevStep(step, true);
			}
		}
		return partList;
	},

	// Given a parent and a part, find a pliItem in the parent that matches the part filename & color (if any)
	matchingPLIItem(parentLookup: LookupItem, part: Part) {
		const parent = store.get.lookupToItem(parentLookup);
		if (hasProperty<PLIItemParent>(parent, 'pliItems')) {
			return (parent.pliItems || []).map(store.get.pliItem)
				.find((i: PLIItem) => {
					return i.filename === part.filename && i.colorCode === part.colorCode;
				}) || null;
		}
		return null;
	},
	pliItemIsSubmodel(pliItemLookup: LookupItem) {
		const pliItem = store.get.lookupToItem(pliItemLookup);
		if (isItemSpecificType<PLIItem>(pliItem, 'pliItem')) {
			return LDParse.model.isSubmodel(pliItem.filename);
		}
		return false;
	},
	pliTransform(filename: string) {
		return store.state.pliTransforms[filename] || {};
	},
	isMoveable: (() => {
		const moveableItems = [
			'step', 'csi', 'pli', 'pliItem', 'quantityLabel',
			'numberLabel', 'annotation', 'submodelImage', 'callout',
			'divider', 'point', 'rotateIcon',
		];
		return function(item: LookupItem) {
			if (store.get.isTemplatePage(store.get.pageForItem(item))) {
				return false;
			}
			return moveableItems.includes(item.type);
		};
	})(),
	prev<T>(itemLookup: LookupItem, itemList?: Item[]) {
		// Get the previous item in the specified item's list, based on item.number and matching parent types
		const item = store.get.lookupToItem(itemLookup);
		if (!item || !hasProperty<NumberedItem>(item, 'number')) {
			return null;
		}
		const foo: NumberedItem[] = itemList || store.state[item.type + 's'];
		const idx = foo.findIndex((el: NumberedItem) => {
			if (el.number === item.number - 1 && (el.parent || {}).type === (item.parent || {}).type) {
				if ((el.parent || {}).type === 'page') {
					const page = store.get.page(item.parent);
					const elPage = store.get.page(el.parent);
					return page.subtype === elPage.subtype;
				}
				return true;
			}
			return false;
		});
		return (idx < 0) ? null : foo[idx] as unknown as T;
	},
	next<T>(itemLookup: LookupItem, itemList?: Item[]) {
		// Get the next item in the specified item's list, based on item.number and matching parent types
		const item = store.get.lookupToItem(itemLookup);
		if (!item || !hasProperty<NumberedItem>(item, 'number')) {
			return null;
		}
		const foo: NumberedItem[] = itemList || store.state[item.type + 's'];
		const idx = foo.findIndex((el: NumberedItem) => {
			if (el.number === item.number + 1 && el.parent.type === item.parent.type) {
				if (el.parent.type === 'page') {
					const page = store.get.page(item.parent);
					const elPage = store.get.page(el.parent);
					return page.subtype === elPage.subtype;
				}
				return true;
			}
			return false;
		});
		return (idx < 0) ? null : foo[idx] as unknown as T;
	},
	parent(itemLookup: LookupItem) {
		const item = store.get.lookupToItem(itemLookup);
		if (item && item.parent) {
			return store.get.lookupToItem(item.parent);
		}
		return null;
	},
	isDescendent(itemLookup: LookupItem, ancestorLookup: LookupItem) {
		// Return true if item is a descendent or equal to ancestor
		let item = store.get.lookupToItem(itemLookup);
		const ancestor = store.get.lookupToItem(ancestorLookup);
		while (item) {
			if (_.itemEq(item, ancestor)) {
				return true;
			}
			item = store.get.parent(item);
		}
		return false;
	},
	childList() {
		const children: ItemTypes[] = [
			'page', 'numberLabel', 'divider', 'annotation',
			'callout', 'csi', 'pliItem', 'quantityLabel',
			'rotateIcon', 'step', 'submodelImage', 'calloutArrow',
		];
		if (store.state.plisVisible) {
			children.push('pli');
		}
		return children;
	},
	stepChildren(step: LookupItem) {
		return store.get.children(step, store.get.childList());
	},
	hasChildren(itemLookup: LookupItem) {
		const item = store.get.lookupToItem(itemLookup);
		if (!item) {
			return false;
		}
		const possibleChildren = store.get.childList();
		for (let i = 0; i < possibleChildren.length; i++) {
			const childList = getChildIDList(item, possibleChildren[i]);
			if (Array.isArray(childList) && childList.length > 0) {
				return true;
			}
		}
		return false;
	},
	children(itemLookup: LookupItem, childTypeList?: ItemTypes[]) {
		const item = store.get.lookupToItem(itemLookup);
		if (item == null) {
			return [];
		}
		const children: Item[] = [];
		const foo = (childTypeList == null) ? store.get.childList() : childTypeList;
		foo.forEach((childType: ItemTypes) => {
			const childIDList = getChildIDList(item, childType);
			if (childIDList && childIDList.length) {
				children.push(...childIDList.map((id: number) => getItem(childType, id)));
			} else {
				const childID = getChildID(item, childType);
				if (childID != null) {
					children.push(getItem(childType, childID));
				}
			}
		});
		return children;
	},
	pageForItem(item: any) {
		if (item && item.type === 'part') {
			item = store.get.step(item.stepID);
		}
		item = store.get.lookupToItem(item);
		while (item && item.type && !item.type.toLowerCase().endsWith('page')) {
			item = store.get.parent(item);
		}
		return item;
	},
	// Return list of submodels used in main model, the step they're first used on and how many are used
	submodels(): SubmodelIdentifier[] {
		if (!store.model) {
			return [];
		}
		const submodels: SubmodelIdentifier[] = [];
		const mainModelFilename = store.model.filename;
		const addedModelNames = new Set([mainModelFilename]);
		store.state.steps.filter((step: Step) => {
			if (step.parent.type === 'page' && step.model.filename !== mainModelFilename) {
				return store.get.page(step.parent).subtype === 'page';
			}
			return false;
		}).forEach((step: Step) => {

			if (!addedModelNames.has(step.model.filename)) {
				const modelHierarchy = [{filename: step.model.filename, quantity: 1}];
				let parentStepID = step.model.parentStepID;
				while (parentStepID != null) {
					const parentStep = store.get.step(parentStepID);
					if (parentStep.parts.length > 1) {
						// Check if parent step contains multiple copies of the current submodel;
						// adjust quantity label accordingly
						const partNames = parentStep.parts.map((partID: number) => {
							return LDParse.model.get.partFromID(partID, parentStep.model.filename).filename;
						});
						const count = _.count(partNames, step.model.filename);
						const last = _.last(modelHierarchy);
						if (last) {
							last.quantity = count;
						}
					}
					modelHierarchy.push({filename: parentStep.model.filename, quantity: 1});
					parentStepID = parentStep.model.parentStepID;
				}
				modelHierarchy.reverse().forEach(entry => {
					if (!addedModelNames.has(entry.filename)) {
						submodels.push({stepID: step.id, ...entry});
						addedModelNames.add(entry.filename);
					}
				});
			}
		});
		return submodels;
	},
	topLevelTreeNodes() {  // Return list of pages & submodels to be drawn in the nav tree
		if (store.state.books.length) {
			return [
				store.get.templatePage(),
				...store.state.books,
			].filter(el => el);
		}
		const nodes: any[] = store.get.pageList();
		store.get.submodels().forEach((submodel: SubmodelIdentifier) => {
			const page = store.get.pageForItem({id: submodel.stepID, type: 'step'});
			const pageIndex = nodes.indexOf(page);
			const submodelNode = {
				...submodel,
				type: 'submodel',
				id: nodes.length,
			};
			_.insert(nodes, submodelNode, pageIndex);
		});
		return nodes.filter((el: object) => el);
	},
	nextItemID(item: any) {
		// Get the next unused ID in this item's list
		if (item && item.type) {
			item = item.type;
		}
		const itemList = store.state[item + 's'];
		if (_.isEmpty(itemList)) {
			return 0;
		}
		return Math.max(...itemList.map((el: LookupItem) => el.id)) + 1;
	},
	itemByNumber(type: string, number: number) {
		const itemList = store.state[type + 's'];
		if (itemList) {
			return itemList.find((el: any) => el.number === number) || null;
		}
		return null;
	},
	lookupToItem(lookup: number | LookupItem | null, type?: ItemTypes): Item | null {
		// Convert a {type, id} lookup object into the actual item it refers to
		if (lookup == null) {
			return null;
		}
		if (typeof lookup === 'number') {
			return (type == null)
				? null
				: store.get.lookupToItem({type, id: lookup});
		}
		if (lookup.hasOwnProperty('parent')
			|| lookup.hasOwnProperty('number')
			|| lookup.hasOwnProperty('steps')
		) {
			return lookup as Item;  // lookup is already an item
		} else if (store.state.hasOwnProperty(lookup.type)) {
			return store.state[lookup.type];
		}
		const itemList = store.state[lookup.type + 's'];
		if (itemList) {
			return itemList.find(
				(el: Item) => el.id === lookup.id
			) || null;
		}
		return null;
	},
	itemToLookup(item: Item) {  // Create a {type, id} lookup object from the specified item
		if (!item || item.type == null) {
			return null;
		} else if (item.type === 'part' || item.type === 'submodel') {
			return item;
		} else if (store.state.hasOwnProperty(item.type)) {
			return {type: item.type, id: item.id || 0};
		} else if (!store.state.hasOwnProperty(item.type + 's')) {
			return null;
		}
		return {type: item.type, id: item.id};
	},
	coords: {
		// x & y are in page coordinates; transform to item coordinates
		pageToItem(
			{x, y}: {x: number, y: number},
			itemLookup: LookupItem,
		) {
			let item: any = store.get.lookupToItem(itemLookup);
			while (item) {
				x -= item.x || 0;
				y -= item.y || 0;
				item = store.get.parent(item);
			}
			return {x, y};
		},
		itemToPage(itemLookup: LookupItem) {  // Find item's position on the page
			let x = 0, y = 0;
			let item: any = store.get.lookupToItem(itemLookup);
			while (item) {
				x += item.x || 0;
				y += item.y || 0;
				item = store.get.parent(item);
			}
			return {x, y};
		},
		pointToPage(
			xIn: number | {x: number, y: number, relativeTo: LookupItem},
			y?: number,
			relativeTo?: LookupItem
		) {
			let x;
			if (typeof xIn === 'number') {
				x = xIn;
			} else {
				x = xIn.x;
				y = xIn.y;
				relativeTo = xIn.relativeTo;
			}
			const offset = (relativeTo == null)
				? {x: 0, y: 0}
				: store.get.coords.itemToPage(relativeTo);
			return {
				x: x + offset.x,
				y: (y || 0) + offset.y,
			};
		},
	},
	targetBoxFromPoints(targetLookup: LookupItem) {
		const t = store.get.lookupToItem(targetLookup) as PointListItem;
		const parent = store.get.parent(t);
		const points = t.points.map((pointID: number) => {
			const pt = store.get.point(pointID);
			return store.get.coords.pointToPage(pt.x, pt.y, pt.relativeTo || parent);
		});
		return _.geom.expandBox(_.geom.bbox(points), 8, 8);
	},
	targetBox(targetLookup: LookupItem) {
		let t: any = store.get.lookupToItem(targetLookup);
		if (t && t.points) {
			return store.get.targetBoxFromPoints(t);
		}

		const box = {x: t.x, y: t.y, width: t.width, height: t.height};
		if (t.borderOffset) {
			box.x += t.borderOffset.x;
			box.y += t.borderOffset.y;
		}
		if (t.align === 'right') {
			box.x -= box.width;
		}
		if (t.valign === 'bottom') {
			box.y -= box.height;
		}
		while (t) {
			if (t.relativeTo) {
				t = store.get.lookupToItem(t.relativeTo);
			} else {
				t = store.get.parent(t);
			}
			if (t) {
				if (t.innerContentOffset) {
					box.x += t.innerContentOffset.x || 0;
					box.y += t.innerContentOffset.y || 0;
				}
				box.x += t.x || 0;
				box.y += t.y || 0;
			}
		}
		return box;
	},
	highlightBox(
		itemLookup: LookupItem,
		pageSize: {width: number, height: number},
		currentPage: Page
	) {
		const item = store.get.lookupToItem(itemLookup);
		if (!item || item.type === 'part') {
			return {display: 'none'};
		}
		const type = item.type;
		const page = store.get.pageForItem(item);
		if (page.needsLayout) {
			store.mutations.page.layout({page});
		}
		let box;
		if (type && type.toLowerCase().endsWith('page')) {
			box = {x: 5, y: 5, width: pageSize.width - 9, height: pageSize.height - 9};
		} else if (type === 'divider') {
			const divider = item as Divider;
			// TODO: when divider is rewritten to just a list of points, get rid of this
			let pointBox = _.geom.bbox([divider.p1, divider.p2]);
			pointBox = _.geom.expandBox(pointBox, 8, 8);
			box = store.get.targetBox({...divider, ...pointBox});
		} else if (type === 'pliItem') {  // Special case: pliItem box should include its quantity label
			const pliItem = item as PLIItem;
			box = store.get.targetBox(pliItem);
			const lbl = store.get.quantityLabel(pliItem.quantityLabelID);
			box = _.geom.bbox([box, store.get.targetBox(lbl)]);
		} else {
			box = store.get.targetBox(item);
			if (type === 'point') {
				box = {x: box.x - 2, y: box.y - 2, width: 4, height: 4};
			}
		}
		let dx = 0;
		if (currentPage && currentPage.stretchedStep) {
			const stretchedStep = store.get.step(currentPage.stretchedStep.stepID);
			if (store.get.isDescendent(item, stretchedStep)) {
				dx = currentPage.stretchedStep.leftOffset;
			}
		}
		const pad = 2;
		return {
			x: box.x - pad + dx,
			y: box.y - pad,
			width: pad + box.width + pad - 1,
			height: pad + box.height + pad - 1,
		};
	},
};
