/* Web Lic - Copyright (C) 2018 Remi Gagne */

import {hasProperty} from '../type_helpers';
import _ from '../util';
import LDParse from '../ld_parse';
import store from '../store';
import {isTemplateType, isPointListItem, isNotNull} from '../type_helpers';

function getter<T extends ItemTypes>(s: ItemTypeNames) {
	return (itemLookup: number | LookupItem) => {
		let res;
		if (typeof itemLookup === 'number') {
			res = store.get.lookupToItem({type: s, id: itemLookup});
			if (res == null) {
				throw `Invalid entity Lookup id: ${itemLookup}, type: ${s}`;
			}
		} else {
			res = store.get.lookupToItem(itemLookup);
			if (res == null) {
				throw `Invalid entity Lookup id: ${itemLookup.id}, type: ${itemLookup.type}`;
			}
		}
		return res as T;
	};
}

interface SubmodelIdentifier {
	filename: string;
	quantity: number;
	stepID: number;
}

function getStateChildList<T extends Item>(childType: ItemTypeNames): T[] {
	return (store.state as any)[childType + 's'];
}

function getChildIDList(item: Item, childType: ItemTypeNames): number[] {
	return (item as any)[childType + 's'];
}

function getChildID(item: Item, childType: ItemTypeNames): number {
	return (item as any)[childType + 'ID'];
}

export interface GetterInterface {

	annotation(id: LookupItem | number): Annotation;
	book(id: LookupItem | number): Book;
	callout(id: LookupItem | number): Callout;
	calloutArrow(id: LookupItem | number): CalloutArrow;
	csi(id: LookupItem | number): CSI;
	divider(id: LookupItem | number): Divider;
	numberLabel(id: LookupItem | number): NumberLabel;
	page(id: LookupItem | number): Page;
	pli(id: LookupItem | number): PLI;
	pliItem(id: LookupItem | number): PLIItem;
	point(id: LookupItem | number): PointItem;
	quantityLabel(id: LookupItem | number): QuantityLabel;
	rotateIcon(id: LookupItem | number): RotateIcon;
	step(id: LookupItem | number): Step;
	submodelImage(id: LookupItem | number): SubmodelImage;

	modelName(nice: boolean): string;
	modelFilename(): string;
	modelFilenameBase(ext?: string): string;
	pageCount(): number;
	isTitlePage(pageLookup: LookupItem): boolean;
	titlePage(): Page | null;
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
	prevPage(item: LookupItem): Page | null;
	nextPage(item: LookupItem): Page | null;
	pageList(): Page[];
	templatePage(): Page;
	templateForItem(item: LookupItem): any;
	isTemplatePage(pageLookup: number | LookupItem): boolean;
	firstBookPage(bookLookup: LookupItem): Page;
	firstPage(): Page | null;
	lastPage(): Page | null;
	adjacentStep(
		stepLookup: LookupItem, direction: 'prev' | 'next', limitToSubmodel: boolean
	): Step | null;
	prevStep(stepLookup: LookupItem, limitToSubmodel?: boolean): Step | null;
	nextStep(stepLookup: LookupItem, limitToSubmodel?: boolean): Step | null;
	part(partID: number, stepLookup: LookupItem): any;
	partsInStep(stepLookup: LookupItem): Part[];
	abstractPartsInStep(stepLookup: LookupItem): any[];
	stepHasSubmodel(stepLookup: LookupItem): boolean;
	partList(stepLookup: LookupItem): number[] | null;
	matchingPLIItem(parentLookup: LookupItem, part: any): PLIItem | null;
	pliItemIsSubmodel(pliItemLookup: LookupItem): boolean;
	pliTransform(filename: LDrawPartFilename): PLITransform;
	isMoveable(item: LookupItem): boolean;
	prev<T extends NumberedItem>(itemLookup: LookupItem, itemList?: NumberedItem[]): T | null;
	next<T extends NumberedItem>(itemLookup: LookupItem, itemList?: NumberedItem[]): T | null;
	parent(itemLookup: LookupItem): ItemTypes | null;
	isDescendent(itemLookup: LookupItem, ancestorLookup: LookupItem): boolean;
	childList(): ItemTypeNames[];
	stepChildren(step: LookupItem): ItemTypes[];
	hasChildren(itemLookup: LookupItem): boolean;
	children(itemLookup: LookupItem, childTypeList?: ItemTypeNames[]): ItemTypes[];
	pageForItem(item: any): Page;
	submodels(): SubmodelIdentifier[];
	topLevelTreeNodes(): ItemTypes[];
	nextItemID(item: ItemTypeNames): number
	nextItemID(item: LookupItem): number
	itemByNumber(type: ItemTypeNames, number: number): Item | null;
	lookupToItem(lookup: LookupItem | null): ItemTypes | null;
	lookupToItem(lookup: number, type: ItemTypeNames): ItemTypes | null;
	itemToLookup(item: Item): LookupItem | null;
	coords: {
		pageToItem(
			{x, y}: Point,
			itemLookup: LookupItem | null,
		): Point;
		itemToPage(itemLookup: LookupItem): Point;
		pointToPage(
			x: number | PointItem,
			y?: number,
			relativeTo?: LookupItem | null
		): Point;
	},
	targetBoxFromPoints(targetLookup: LookupItem): Box;
	targetBox(targetLookup: LookupItem): Box;
	highlightBox(
		itemLookup: LookupItem,
		pageSize: {width: number, height: number},
		currentPage?: Page | null
	): Box | null;
}

export const Getters: GetterInterface = {
	annotation: getter<Annotation>('annotation'),
	book: getter<Book>('book'),
	callout: getter<Callout>('callout'),
	calloutArrow: getter<CalloutArrow>('calloutArrow'),
	csi: getter<CSI>('csi'),
	divider: getter<Divider>('divider'),
	numberLabel: getter<NumberLabel>('numberLabel'),
	page: getter<Page>('page'),
	pli: getter<PLI>('pli'),
	pliItem: getter<PLIItem>('pliItem'),
	point: getter<PointItem>('point'),
	quantityLabel: getter<QuantityLabel>('quantityLabel'),
	rotateIcon: getter<RotateIcon>('rotateIcon'),
	step: getter<Step>('step'),
	submodelImage: getter<SubmodelImage>('submodelImage'),

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
		return page.subtype === 'titlePage';
	},
	titlePage() {
		return store.state.pages.find(store.get.isTitlePage) || null;
	},
	isBasicPage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		return page.subtype === 'page';
	},
	basicPages() {
		return store.state.pages.filter(store.get.isBasicPage);
	},
	isInventoryPage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		return page.subtype === 'inventoryPage';
	},
	inventoryPages() {
		return store.state.pages.filter(store.get.isInventoryPage);
	},
	isFirstBasicPage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		const basicPages = store.get.basicPages();
		return page.id === basicPages[0].id;
	},
	isLastBasicPage(pageLookup: LookupItem) {
		const page = store.get.page(pageLookup);
		const lastPage = _.last(store.get.basicPages());
		return (lastPage != null) && (page.id === lastPage.id);
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
	templateForItem(item: LookupItem): any {
		const template = store.state.template;
		if (isTemplateType(item.type)) {
			return template[item.type];
		}
		const parent = store.get.parent(item);
		if (parent == null) {
			return null;
		}
		if (isTemplateType(parent.type)) {
			const parentTemplate = template[parent.type];
			if (parentTemplate == null) {
				return null;
			}
		} else {
			return null;
		}
		if (item.type === 'csi') {
			if (parent.type === 'step') {
				return template.step.csi;
			} else if (parent.type === 'submodelImage') {
				return template.submodelImage.csi;
			}
		} else if (item.type === 'quantityLabel') {
			if (parent.type === 'pliItem') {
				return template.pliItem.quantityLabel;
			} else if (parent.type === 'submodelImage') {
				return template.submodelImage.quantityLabel;
			}
		} else if (item.type === 'numberLabel') {
			if (parent.type === 'page' && parent.subtype === 'templatePage') {
				return template.page.numberLabel;
			} else if (parent.type === 'step') {
				return template.step.numberLabel;
			} else if (parent.parent.type === 'callout') {
				return template.callout.step.numberLabel;
			}
		}
		return null;
	},
	isTemplatePage(pageLookup) {
		const page = store.get.page(pageLookup);
		return page.subtype === 'templatePage';
	},
	firstBookPage(bookLookup: LookupItem) {
		const book = store.get.book(bookLookup);
		const firstPage = store.get.page(book.pages[0]);
		if (firstPage && firstPage.subtype === 'templatePage') {
			return store.get.page(book.pages[1]);
		}
		return firstPage;
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
				itemList = parent.steps
					.map(store.get.step)
					.filter(isNotNull);
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
	prevStep(stepLookup: LookupItem, limitToSubmodel: boolean = false) {
		return store.get.adjacentStep(stepLookup, 'prev', limitToSubmodel);
	},
	nextStep(stepLookup: LookupItem, limitToSubmodel: boolean = false) {
		return store.get.adjacentStep(stepLookup, 'next', limitToSubmodel);
	},
	part(partID: number, stepLookup: LookupItem) {
		const step = store.get.step(stepLookup);
		return LDParse.model.get.partFromID(partID, step.model.filename);
	},
	partsInStep(stepLookup: LookupItem) {
		const step = store.get.step(stepLookup);
		return (step.parts || []).map((partID: number) => {
			return LDParse.model.get.partFromID(partID, step.model.filename);
		});
	},
	abstractPartsInStep(stepLookup: LookupItem) {
		const step = store.get.step(stepLookup);
		const parts = store.get.partsInStep(step);
		return parts.map((part: Part) => {
			return LDParse.model.get.abstractPart(part.filename);
		});
	},
	stepHasSubmodel(stepLookup: LookupItem) {
		const step = store.get.step(stepLookup);
		const parts = store.get.abstractPartsInStep(step);
		return parts.some((part: AbstractPart) => part.isSubModel);
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
				.find(i => {
					return i
					&& (i.filename === part.filename)
					&& (i.colorCode === part.colorCode);
				}) || null;
		}
		return null;
	},
	pliItemIsSubmodel(pliItemLookup: LookupItem) {
		const pliItem = store.get.pliItem(pliItemLookup);
		return LDParse.model.isSubmodel(pliItem.filename);
	},
	pliTransform(filename: LDrawPartFilename) {
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
	prev<T>(itemLookup: LookupItem, itemList?: NumberedItem[]) {
		// Get the previous item in the specified item's list, based on
		// item.number and matching types and parent types
		const item = store.get.lookupToItem(itemLookup);
		if (!item || !hasProperty<NumberedItem>(item, 'number')) {
			return null;
		}
		const foo: NumberedItem[] = itemList || getStateChildList<NumberedItem>(item.type);
		const foundItem = foo.find((el: NumberedItem) => {
			if (el.number !== item.number - 1 || el.type !== item.type) {
				return false;
			}
			if (el.parent.type === item.parent.type) {
				if (el.parent.type === 'page') {
					const page = store.get.page(item.parent);
					const elPage = store.get.page(el.parent);
					return page && elPage && (page.subtype === elPage.subtype);
				}
				return true;
			}
			return false;
		});
		return foundItem ? foundItem as unknown as T : null;
	},
	next<T>(itemLookup: LookupItem, itemList?: NumberedItem[]) {
		// Get the next item in the specified item's list, based on
		// item.number and matching types and parent types
		const item = store.get.lookupToItem(itemLookup);
		if (!item || !hasProperty<NumberedItem>(item, 'number')) {
			return null;
		}
		const foo = itemList || getStateChildList<NumberedItem>(item.type);
		const foundItem = foo.find(el => {
			if (el == null || el.number !== item.number + 1 || el.type !== item.type) {
				return false;
			}
			if (el.parent.type === item.parent.type) {
				if (el.parent.type === 'page') {
					const page = store.get.page(item.parent);
					const elPage = store.get.page(el.parent);
					return page && elPage && (page.subtype === elPage.subtype);
				}
				return true;
			}
			return false;
		});
		return foundItem ? foundItem as unknown as T : null;
	},
	parent(itemLookup: LookupItem) {
		const item = store.get.lookupToItem(itemLookup);
		if (item != null) {
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
		const children: ItemTypeNames[] = [
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
	children(itemLookup: LookupItem, childTypeList?: ItemTypeNames[]) {

		// TODO: clean up 'submodel' as an item type vs. entry in getters
		function getItem(itemType: ItemTypeNames, id: number): ItemTypes {
			return (store.get as any)[itemType](id);
		}

		const item = store.get.lookupToItem(itemLookup);
		if (item == null || item.type === 'part' || item.type === 'submodel') {
			return [];
		}
		const children: ItemTypes[] = [];
		const foo = (childTypeList == null) ? store.get.childList() : childTypeList;
		foo.forEach((childType: ItemTypeNames) => {
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
				const tmpPage = store.get.page(step.parent);
				return (tmpPage == null) ? false : tmpPage.subtype === 'page';
			}
			return false;
		}).forEach((step: Step) => {

			if (!addedModelNames.has(step.model.filename)) {
				const modelHierarchy = [{filename: step.model.filename, quantity: 1}];
				let parentStepID = step.model.parentStepID;
				while (parentStepID != null) {
					const parentStep = store.get.step(parentStepID);
					if (parentStep == null) {
						throw 'Trying to find submodels in non-existent parent Step';
					}
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
		const nodes: (Page | SubmodelItem)[] = store.get.pageList();
		const submodels = store.get.submodels();
		submodels.forEach((submodel: SubmodelIdentifier) => {
			const page = store.get.pageForItem({id: submodel.stepID, type: 'step'});
			const pageIndex = nodes.indexOf(page);
			const submodelNode: SubmodelItem = {
				...submodel,
				type: 'submodel',
				id: nodes.length,
				parent: page,
			};
			_.insert(nodes, submodelNode, pageIndex);
		});
		return nodes.filter((el: object) => el);
	},
	nextItemID(item: ItemTypeNames | LookupItem) {
		// TODO: get rid of ItemTypeNames option in here; always call this with a non-null lookup
		// Get the next unused ID in this item's list
		let itemType: ItemTypeNames;
		if (typeof item === 'string') {
			itemType = item;
		} else {
			itemType = item.type;
		}
		const itemList = getStateChildList(itemType);
		if (_.isEmpty(itemList)) {
			return 0;
		}
		return Math.max(...itemList.map((el: LookupItem) => el.id)) + 1;
	},
	itemByNumber(type: ItemTypeNames, number: number) {
		const itemList = getStateChildList(type);
		if (itemList) {
			return itemList.find((el: any) => el.number === number) || null;
		}
		return null;
	},
	lookupToItem(lookup: number | LookupItem | null, type?: ItemTypeNames): ItemTypes | null {
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
			return lookup as ItemTypes;  // lookup is already an item
		} else if (store.state.hasOwnProperty(lookup.type)) {
			// TODO: do we ever get in here?  For what?
			return (store.state as any)[lookup.type];
		}
		const itemList = getStateChildList<ItemTypes>(lookup.type);
		if (itemList) {
			return itemList.find(
				(el: Item) => el.id === lookup.id,
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
		pageToItem({x, y}, itemLookup) {
			let item = store.get.lookupToItem(itemLookup);
			while (item && hasProperty<PointedItem>(item, 'x')) {
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
			xIn: number | PointItem,
			y?: number,
			relativeTo?: LookupItem | null,
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
	targetBoxFromPoints(t: PointListItem) {
		const parent = store.get.parent(t);
		const points = t.points.map(pointID => {
			const pt = store.get.point(pointID);
			return pt
				? store.get.coords.pointToPage(pt.x, pt.y, pt.relativeTo || parent)
				: null;
		}).filter((p): p is Point => p != null);
		return _.geom.expandBox(_.geom.bbox(points), 8, 8);
	},
	targetBox(targetLookup) {
		let t: any = store.get.lookupToItem(targetLookup);
		if (isPointListItem(t) && t.points.length > 0) {
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
	highlightBox(itemLookup, pageSize, currentPage) {
		const item = store.get.lookupToItem(itemLookup);
		if (item == null || item.type === 'part') {
			return null;
		}
		const type = item.type;
		const page = store.get.pageForItem(item);
		if (page.needsLayout) {
			store.mutations.page.layout({page});
		}
		let box;
		if (item.type === 'page') {
			box = {
				x: 5,
				y: 5,
				width: pageSize.width - 9,
				height: pageSize.height - 9,
			};
		} else if (item.type === 'divider') {
			// TODO: when divider is rewritten to just a list of points, get rid of this
			let pointBox = _.geom.bbox([item.p1, item.p2]);
			pointBox = _.geom.expandBox(pointBox, 8, 8);
			box = store.get.targetBox({...item, ...pointBox});
		} else if (item.type === 'pliItem') {  // Special case: pliItem box should include its quantity label
			box = store.get.targetBox(item);
			if (item.quantityLabelID != null) {
				const lbl = store.get.quantityLabel(item.quantityLabelID);
				const lblBox = store.get.targetBox(lbl);
				if (box && lblBox) {
					box = _.geom.bbox([box, lblBox]);
				}
			}
		} else {
			box = store.get.targetBox(item);
			if (box && type === 'point') {
				box = {x: box.x - 2, y: box.y - 2, width: 4, height: 4};
			}
		}
		if (box == null) {
			return null;
		}
		let dx = 0;
		if (currentPage?.stretchedStep != null) {
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
