export type Direction = 'up' | 'down' | 'left' | 'right';

export type LDrawColorCode = number;

export type Primitive = number[];

export interface AbstractPart {
	filename: string;
	name: string;
	parts: any[];
	primitives: Primitive[];
	isSubModel?: boolean;
}

export interface Part {
	filename: string;
	matrix: number[];
	colorCode?: number;
}

export interface Model {
	filename: string;
	name: string;
	parts: any[];
	steps: any[];
	hasAutoSteps?: boolean;
	parentStepId?: number;
}

export interface ColorTableEntry {
	name: string;
	color: string;
	edge: string;
	rgba: string;
	edgeRgba: string;
}

export interface Point {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Box extends Point, Size {}

export type ItemTypes =
	'annotation' | 'book' | 'callout' | 'calloutArrow' | 'csi' | 'divider'
	| 'numberLabel'| 'page' | 'pli' | 'pliItem' | 'point'
	| 'quantityLabel' | 'rotateIcon' | 'step' | 'submodelImage'
	| 'part' | 'submodel';

export type ItemTypeReal =
	Book | Divider | Page | PLIItem | Step;

export type ItemListTypes =
	'annotations' | 'books' | 'callouts' | 'calloutArrows' | 'csis' | 'dividers'
	| 'numberLabels'| 'pages' | 'plis' | 'pliItems' | 'points' | 'parts'
	| 'quantityLabels' | 'rotateIcons' | 'steps' | 'submodelImages' | 'submodels';

export interface LookupItem {
	id: number;
	type: ItemTypes;
}

export interface Item extends LookupItem {
	parent: LookupItem;
}

export function hasProperty<T extends Item>(item: Item | null, prop: string): item is T {
	return (item != null) && item.hasOwnProperty(prop);
}

export interface ItemWithChildList extends Item {
	getList(itemType: ItemTypes): number[];
}

export function hasListProperty(item: Item | null, prop: ItemTypes): item is ItemWithChildList {
	return (item != null) && item.hasOwnProperty(prop + 's');
}

export interface NumberedItem extends Item {
	number: number;
}

export interface PLIItemParent extends Item {
	pliItems: number[];
}

export interface StepParent extends Item {
	steps: number[];
}

export interface PointItem extends Item, Point {
	type: 'point';
}

export interface PointListItem extends Item {
	points: number[];
}

export interface PartItem extends Item {
	type: 'part';
	stepID: number;
}

export type PageLayouts = 'horizontal' | 'vertical'
export type PageSubtypes = 'templatePage' | 'page' | 'titlePage' | 'inventoryPage'

export interface Book extends Item, NumberedItem {
	type: 'book';
	pages: number[];
}

export interface Divider extends Item {
	type: 'divider',
	p1: Point,
	p2: Point
}

export interface Page extends Item, PLIItemParent, NumberedItem, StepParent {
	type: 'page';
	subtype: PageSubtypes;
	annotations: number[];
	dividers: number[];
	innerContentOffset: Point;
	layout: PageLayouts
	locked: boolean;
	needsLayout: boolean;
	numberLabelID: number;
	pliItems: number[];
	stretchedStep: any;
}

export interface DisplacedPart {
	partID: number;
	direction: Direction;
}

export interface Step extends Item, Box {
	type: 'step';
	annotations: number[];
	callouts: number[];
	csiID?: number;
	displacedParts: DisplacedPart[];
	dividers: number[];
	model: {
		filename: string;
		parentStepID: number;
	};
	number: number;
	numberLabelID: number;
	parts: number[];
	pliID: number;
	rotateIconID?: number;
	steps: number[];
	stretchedPages: number[];
	subStepLayout: 'horizontal' | 'vertical';
	submodelImages: number[];
	prevBookParts: number[];
}

export interface PLIItem extends Item, Box {
	type: 'pliItem';
	domID: string | null;
	filename: string;
	colorCode: number;
	quantity: number;
	quantityLabelID: number;
}

export function isItemSpecificType<T extends Item>(item: Item | null, itemType: string): item is T {
	return (item != null) && item.type === itemType;
}

export function isPLIItem(item: Item | null): item is PLIItem {
	return (item != null) && item.type === 'pliItem';
}

export interface StateInterface {
	annotations: any[];
	books: any[];
	calloutArrows: any[];
	callouts: any[];
	csis: any[];
	dividers: Divider[];
	licFilename: string;
	numberLabels: any[];
	pages: Page[];
	pliItems: PLIItem[];
	pliTransforms: any[];
	plis: any[];
	plisVisible: boolean;
	points: Point[];
	quantityLabels: any[];
	rotateIcons: any[];
	steps: Step[];
	submodelImages: any[];
	template: any;
}
