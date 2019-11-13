export type LDrawColorCode = number;

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

export interface Item {
	id: number;
	type: string;
	parent: any;
}

export type PageLayouts = 'horizontal' | 'vertical'
export type PageSubtypes = 'templatePage' | 'page' | 'titlePage' | 'inventoryPage'

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
