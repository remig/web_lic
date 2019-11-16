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
	| 'numberLabel'| 'page' | 'pli' | 'pliItem' | 'point' | 'part'
	| 'quantityLabel' | 'rotateIcon' | 'step' | 'submodelImage' | 'submodel'

export interface LookupItem {
	id: number;
	type: ItemTypes;
}

export interface Item extends LookupItem {
	parent: LookupItem;
}

export interface PointItem extends Item, Point {
	type: 'point';
}

export interface PartItem extends Item {
	type: 'part';
	stepID: number;
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
	annotations: any[];
	dividers: any[];
	innerContentOffset: Point;
	layout: PageLayouts
	locked: boolean;
	needsLayout: boolean;
	number: number;
	numberLabelID: number;
	pliItems: any[];
	steps: any[];
	stretchedStep: any;
}

export interface Step extends Item, Box {
	type: 'step';
	annotations: any[];
	callouts: any[];
	csiID?: number;
	dividers: any[];
	model: {
		filename: string;
	};
	number: number;
	numberLabelID: number;
	parts: number[];
	pliID?: number;
	rotateIconID?: number;
	steps: number[];
	stretchedPages: number[];
	subStepLayout: 'horizontal' | 'vertical';
	submodelImages: number[];
}

export interface PLIItem extends Item, Box {
	type: 'pliItem';
	domID: string | null;
	filename: string;
	colorCode: number;
	quantity: number;
	quantityLabelID: number;
}
