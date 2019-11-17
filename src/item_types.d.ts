type Direction = 'up' | 'down' | 'left' | 'right';

type LDrawColorCode = number;

type Primitive = number[];

interface AbstractPart {
	filename: string;
	name: string;
	parts: any[];
	primitives: Primitive[];
	isSubModel?: boolean;
}

interface Part {
	filename: string;
	matrix: number[];
	colorCode?: number;
}

interface Model {
	filename: string;
	name: string;
	parts: any[];
	steps: any[];
	hasAutoSteps?: boolean;
	parentStepId?: number;
}

interface ColorTableEntry {
	name: string;
	color: string;
	edge: string;
	rgba: string;
	edgeRgba: string;
}

interface Point {
	x: number;
	y: number;
}

interface Size {
	width: number;
	height: number;
}

interface Box extends Point, Size {}

type ItemTypeNames =
	'annotation' | 'book' | 'callout' | 'calloutArrow' | 'csi' | 'divider'
	| 'numberLabel'| 'page' | 'pli' | 'pliItem' | 'point'
	| 'quantityLabel' | 'rotateIcon' | 'step' | 'submodelImage'
	| 'part' | 'submodel';

type ItemTypes =
	Book | Divider | Page | PartItem | PLIItem | PointItem | Step;

type ItemListTypes =
	'annotations' | 'books' | 'callouts' | 'calloutArrows' | 'csis' | 'dividers'
	| 'numberLabels'| 'pages' | 'plis' | 'pliItems' | 'points' | 'parts'
	| 'quantityLabels' | 'rotateIcons' | 'steps' | 'submodelImages' | 'submodels';

interface LookupItem {
	id: number;
	type: ItemTypeNames;
}

interface Item extends LookupItem {
	parent: LookupItem;
}

interface ItemWithChildList extends Item {
	getList(itemType: ItemTypeNames): number[];
}

interface NumberedItem extends Item {
	number: number;
}

interface PLIItemParent extends Item {
	pliItems: number[];
}

interface StepParent extends Item {
	steps: number[];
}

interface PointItem extends Item, Point {
	type: 'point';
}

interface PointListItem extends Item {
	points: number[];
}

interface PartItem extends Item {
	type: 'part';
	stepID: number;
}

type PageLayouts = 'horizontal' | 'vertical'
type PageSubtypes = 'templatePage' | 'page' | 'titlePage' | 'inventoryPage'

interface Book extends Item, NumberedItem {
	type: 'book';
	pages: number[];
}

interface Divider extends Item {
	type: 'divider',
	p1: Point,
	p2: Point
}

interface Page extends Item, PLIItemParent, NumberedItem, StepParent {
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

interface DisplacedPart {
	partID: number;
	direction: Direction;
}

interface Step extends Item, Box {
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

interface PLIItem extends Item, Box {
	type: 'pliItem';
	domID: string | null;
	filename: string;
	colorCode: number;
	quantity: number;
	quantityLabelID: number;
}

interface StateInterface {
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
