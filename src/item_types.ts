export type LDrawColorCode = number;

export interface Model {
	filename: string;
	name: string;
	parts: any[];
	steps: any[];
	hasAutoSteps?: boolean;
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

export interface Box extends Point {
	width: number;
	height: number;
}

export type ItemTypes =
	'annotation' | 'book' | 'callout' | 'calloutArrow' | 'csi' | 'divider' | 'numberLabel'| 'page'
	| 'pli' | 'pliItem' | 'point' | 'part' | 'quantityLabel' | 'rotateIcon' | 'step'	| 'submodelImage'

export interface LookupItem {
	id: number;
	type: ItemTypes;
}

export interface Item extends LookupItem {
	parent: LookupItem;
}

export interface PointItem extends Item, Point {
	type: 'point'
}

export type PageLayouts = 'horizontal' | 'vertical'
export type PageSubtypes = 'templatePage' | 'page' | 'titlePage' | 'inventoryPage'

export interface Divider extends Item {
	type: 'divider',
	p1: Point,
	p2: Point
}

export interface Page extends Item {
	type: 'page';
	subtype: PageSubtypes;
	steps: any[];
	dividers: any[];
	annotations: any[];
	pliItems: any[];
	needsLayout: boolean;
	locked: boolean;
	stretchedStep: any;
	innerContentOffset: Point;
	number: number;
	numberLabelID: number;
	layout: PageLayouts
}

export interface PLIItem extends Item, Box {
	type: 'pliItem';
	domID: string | null;
	filename: string;
	colorCode: number;
	quantity: number;
	quantityLabelID: number;
}
