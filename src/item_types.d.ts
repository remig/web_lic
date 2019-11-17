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

interface Alignment {
	align: 'left' | 'right';
	valign: 'top' | 'bottom';
}

interface DisplacedPart {
	partID: number;
	direction: Direction;
}

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

interface PointListItem extends Item {
	points: number[];
}

interface PartItem extends Item {
	type: 'part';
	stepID: number;
}

type PageLayouts = 'horizontal' | 'vertical'
type PageSubtypes = 'templatePage' | 'page' | 'titlePage' | 'inventoryPage'

interface Annotation extends Item, Box, Alignment {
	type: 'annotation';
	annotationType: 'label' | 'image';
	color: string;
	font: string;
	text: string;
}

interface Book extends Item, NumberedItem {
	type: 'book';
	pages: number[];
}

interface CalloutArrow extends Item, PointListItem {
	type: 'calloutArrow';
	direction: Direction;
}

interface Callout extends Item, StepParent, Box {
	type: 'Callout';
	borderOffset: Point;
	calloutArrows: number[];
	innerContentOffset: Point;
	layout: PageLayouts;
	position: 'left';
}

interface CSI extends Item, Box {
	type: 'csi';
	annotations: number[];
	domID: string;
	rotation: any;
	scale: number;
}

interface Divider extends Item {
	type: 'divider',
	p1: Point,
	p2: Point
}

interface NumberLabel extends Item, Box, Alignment {
	type: 'numberLabel';
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

interface PLI extends Item, PLIItemParent, Box {
	type: 'pli';
	borderOffset: Point;
	innerContentOffset: Point;
}

interface PLIItem extends Item, Box {
	type: 'pliItem';
	domID: string | null;
	filename: string;
	colorCode: number;
	quantity: number;
	quantityLabelID: number;
}

interface PointItem extends Item, Point {
	type: 'point';
	relativeTo: LookupItem;
}

interface QuantityLabel extends Item, Box, Alignment {
	type: 'quantityLabel';
}

interface RotateIcon extends Item, Box {
	type: 'rotateIcon';
	scale: number;
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

interface SubmodelImage extends Item, Box {
	type: 'submodelImage';
	csiID: number;
	innerContentOffset: Point;
	modelFilename: string;
	quantity: number;
	quantityLabelId: number;
}

interface StateInterface {
	annotations: Annotation[];
	books: Book[];
	calloutArrows: CalloutArrow[];
	callouts: Callout[];
	csis: CSI[];
	dividers: Divider[];
	licFilename: string | null;
	numberLabels: NumberLabel[];
	pages: Page[];
	pliItems: PLIItem[];
	pliTransforms: any;
	plis: PLI[];
	plisVisible: boolean;
	points: Point[];
	quantityLabels: QuantityLabel[];
	rotateIcons: RotateIcon[];
	steps: Step[];
	submodelImages: SubmodelImage[];
	template: any;
}
