type Direction = 'up' | 'right' | 'down' | 'left';
type Position = 'top' | 'right' | 'bottom' | 'left';
type Orientation = 'horizontal' | 'vertical'

type LDrawColorCode = number;

type LDrawPartFilename = string;

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
	parentStepID?: number;
}

interface StepModel {
	filename: string;
	parentStepID: number | null;
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

interface Rotation {
	axis: 'x' | 'y' | 'z';
	angle: number;
}

interface PLITransform {
	rotation: Rotation[];
	scale: number;
}

interface Alignment {
	align: 'left' | 'right';
	valign: 'top' | 'bottom';
}

interface DisplacedPart {
	partID: number;
	direction: Direction;
	arrowLength?: number;
	arrowOffset?: number;
	arrowRotation?: number;
	partDistance?: number;
}

type AnnotationTypes = 'label' | 'arrow' | 'stairStepArrow' | 'image';

type ItemTypeNames =
	'annotation' | 'book' | 'callout' | 'calloutArrow' | 'csi' | 'divider'
	| 'numberLabel'| 'page' | 'pli' | 'pliItem' | 'point'
	| 'quantityLabel' | 'rotateIcon' | 'step' | 'submodelImage'
	| 'part' | 'submodel';

type ItemTypes =
	Annotation | Book | Callout | CalloutArrow | CSI | Divider
	| NumberLabel | Page | PartItem | PLIItem | PLI | PointItem
	| QuantityLabel | RotateIcon | Step | SubmodelImage;

interface LookupItem {
	id: number;
	type: ItemTypeNames;
}

interface Item extends LookupItem {
	parent: LookupItem;
}

interface PointedItem extends Item, Point {}

interface BoxedItem extends Item, Box {
	borderOffset?: Point;
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

interface Annotation extends BoxedItem, Alignment, PointListItem {
	type: 'annotation';
	annotationType: AnnotationTypes;
	color: string;
	font: string;
	text: string;
	tagName?: string;
	meta?: any;  // TODO: use tagName instead
	src?: string | null;
	direction?: Direction | null;
	border?: {
		color: string;
		width: number;
	} | null;
}

interface Book extends NumberedItem {
	type: 'book';
	pages: number[];
}

interface CalloutArrow extends PointListItem {
	type: 'calloutArrow';
	direction: Direction;
}

interface Callout extends StepParent, BoxedItem {
	type: 'callout';
	borderOffset: Point;
	calloutArrows: number[];
	innerContentOffset: Point;
	layout: Orientation;
	position: Position;
}

interface CSI extends BoxedItem {
	type: 'csi';
	annotations: number[];
	autoScale: number | null;
	domID: string | null;
	rotation: Rotation[] | null;
	scale: number | null;
	isDirty: boolean;
}

interface Divider extends Item {
	type: 'divider',
	p1: Point,
	p2: Point
}

interface NumberLabel extends BoxedItem, Alignment {
	type: 'numberLabel';
}

type PageSubtypes = 'templatePage' | 'page' | 'titlePage' | 'inventoryPage'

interface GridLayout {
	rows: number | 'auto',
	cols: number | 'auto',
	direction: Orientation,
}

interface Page extends PLIItemParent, NumberedItem, StepParent {
	type: 'page';
	subtype: PageSubtypes;
	annotations: number[];
	dividers: number[];
	innerContentOffset: Point;
	layout: Orientation | GridLayout;
	actualLayout?: Orientation | GridLayout,
	locked: boolean;
	needsLayout: boolean;
	numberLabelID: number | null;
	pliItems: number[];
	stretchedStep: any;
}

interface PLI extends PLIItemParent, BoxedItem {
	type: 'pli';
	borderOffset: Point;
	innerContentOffset: Point;
}

interface PLIItem extends BoxedItem {
	type: 'pliItem';
	domID: string | null;
	filename: string;
	colorCode: number;
	quantity: number;
	quantityLabelID: number;
	isDirty: boolean;
}

interface PointItem extends PointedItem {
	type: 'point';
	relativeTo: LookupItem | null;
}

interface QuantityLabel extends BoxedItem, Alignment {
	type: 'quantityLabel';
}

interface RotateIcon extends BoxedItem {
	type: 'rotateIcon';
	scale: number;
}

interface Step extends NumberedItem, BoxedItem {
	type: 'step';
	annotations: number[];
	callouts: number[];
	csiID: number | null;
	displacedParts: DisplacedPart[] | null;
	dividers: number[];
	model: StepModel;
	numberLabelID: number | null;
	parts: number[];
	pliID: number | null;
	rotateIconID: number | null;
	steps: number[];
	stretchedPages: number[];
	subStepLayout: 'horizontal' | 'vertical';
	submodelImages: number[];
	prevBookParts: number[] | null;
}

interface SubmodelImage extends BoxedItem {
	type: 'submodelImage';
	csiID: number | null;
	innerContentOffset: Point;
	modelFilename: string;
	quantity: number;
	quantityLabelID: number | null;
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
	pliTransforms: {[key: string]: PLITransform};  // key should be LDrawPartFilename but that doesn't work...
	plis: PLI[];
	plisVisible: boolean;
	points: Point[];
	quantityLabels: QuantityLabel[];
	rotateIcons: RotateIcon[];
	steps: Step[];
	submodelImages: SubmodelImage[];
	template: any;
}
