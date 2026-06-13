export type Directions = 'up' | 'right' | 'down' | 'left';
export type Positions = 'top' | 'right' | 'bottom' | 'left';
export type Orientations = 'horizontal' | 'vertical';
export type Anchors =
	| 'top_left'
	| 'top'
	| 'top_right'
	| 'left'
	| 'center'
	| 'right'
	| 'bottom_left'
	| 'bottom'
	| 'bottom_right';

export type LDrawColorCode = number;

export type LDrawPartFilename = string;

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
	parentStepID?: number;
}

export type PartDictionary = { [key: string]: AbstractPart | Model };

export interface StepModel {
	filename: string;
	parentStepID: number | null;
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

export interface Border {
	width: number;
	color: string | null;
}

export interface Box extends Point, Size {}

export interface Rotation {
	axis: 'x' | 'y' | 'z';
	angle: number;
}

export interface PLITransform {
	rotation?: Rotation[];
	scale?: number;
}

export interface Alignment {
	align: 'left' | 'right';
	valign: 'top' | 'bottom';
}

export interface DisplacedPart {
	partID: number;
	direction: Directions;
	arrowLength?: number;
	arrowOffset?: number;
	arrowRotation?: number;
	partDistance?: number;
}

export type AnnotationTypes = 'label' | 'arrow' | 'stairStepArrow' | 'image';

export type ItemTypeNames =
	| 'annotation'
	| 'book'
	| 'callout'
	| 'calloutArrow'
	| 'csi'
	| 'divider'
	| 'numberLabel'
	| 'page'
	| 'part'
	| 'pli'
	| 'pliItem'
	| 'point'
	| 'quantityLabel'
	| 'rotateIcon'
	| 'step'
	| 'submodel'
	| 'submodelImage';

export interface LookupItem {
	id: number;
	type: ItemTypeNames;
}

export interface Item extends LookupItem {
	parent: LookupItem;
}

export interface PointedItem extends Item, Point {}

export interface BoxedItem extends Item, Box {}

export interface BoxedOffsetItem extends Item, Box {
	borderOffset: Point;
	innerContentOffset: Point;
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

export interface QuantityLabelParent extends Item {
	quantity: number;
	quantityLabelID: number | null;
}

export interface PointListItem extends Item {
	points: number[];
}

export interface PartItem extends Item {
	type: 'part';
	stepID: number;
}

export interface SubmodelItem extends Item {
	type: 'submodel';
	stepID: number;
	filename: string;
}

export interface Annotation extends BoxedItem, Alignment, PointListItem {
	type: 'annotation';
	annotationType: AnnotationTypes;
	color: string;
	font: string;
	text: string;
	tagName?: string;
	meta?: any; // TODO: use tagName instead
	src?: string | null;
	direction?: Directions | null;
	border?: Border | null;
}

export interface Book extends NumberedItem {
	type: 'book';
	pages: number[];
}

export interface CalloutArrow extends PointListItem {
	type: 'calloutArrow';
	direction: Directions;
}

export interface Callout extends BoxedOffsetItem, StepParent {
	type: 'callout';
	calloutArrows: number[];
	layout: Orientations;
	position: Positions;
}

export interface CSI extends BoxedItem {
	type: 'csi';
	annotations: number[];
	autoScale: number | null;
	domID: string | null;
	rotation: Rotation[] | null;
	scale: number | null;
	isDirty: boolean;
}

export interface Divider extends Item {
	type: 'divider';
	p1: Point;
	p2: Point;
}

export interface NumberLabel extends BoxedItem, Alignment {
	type: 'numberLabel';
}

export type PageSubtypes = 'templatePage' | 'page' | 'titlePage' | 'inventoryPage';

export interface GridLayout {
	rows: number | 'auto';
	cols: number | 'auto';
	direction: Orientations;
}

export interface Page extends PLIItemParent, NumberedItem, StepParent {
	type: 'page';
	subtype: PageSubtypes;
	annotations: number[];
	dividers: number[];
	innerContentOffset: Point;
	layout: Orientations | GridLayout;
	actualLayout?: Orientations | GridLayout;
	locked: boolean;
	needsLayout: boolean;
	numberLabelID: number | null;
	pliItems: number[];
	stretchedStep: {
		stepID: number;
		leftOffset: number;
	} | null;
}

export interface PLI extends BoxedOffsetItem, PLIItemParent {
	type: 'pli';
}

export interface PLIItem extends BoxedItem, QuantityLabelParent {
	type: 'pliItem';
	domID: string | null;
	filename: string;
	colorCode: number;
	isDirty: boolean;
}

export interface PointItem extends PointedItem {
	type: 'point';
	relativeTo: LookupItem | null;
}

export interface QuantityLabel extends BoxedItem, Alignment {
	type: 'quantityLabel';
}

export interface RotateIcon extends BoxedItem {
	type: 'rotateIcon';
	scale: number;
}

export interface Step extends NumberedItem, BoxedItem {
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

export interface SubmodelImage extends BoxedOffsetItem, QuantityLabelParent {
	type: 'submodelImage';
	csiID: number | null;
	modelFilename: string;
}

export interface LabelTemplate {
	font: string;
	color: string;
}

export interface RoundBorderTemplate extends Border {
	cornerRadius: number;
}

export interface FillTemplate {
	color: string | null;
}

export interface ImageTemplate {
	x: number;
	y: number;
	width: number;
	height: number;
	src: string;
}

export type ItemTypes =
	| Annotation
	| Book
	| Callout
	| CalloutArrow
	| CSI
	| Divider
	| NumberLabel
	| Page
	| PartItem
	| PLI
	| PLIItem
	| PointItem
	| QuantityLabel
	| RotateIcon
	| Step
	| SubmodelItem
	| SubmodelImage;

export interface BaseTemplate {}

export interface PageTemplate extends BaseTemplate {
	width: number;
	height: number;
	sizePreset: { format: string; orientation: string } | null;
	layout: GridLayout;
	innerMargin: number;
	numberLabel: {
		font: string;
		color: string;
		position: 'right' | 'left' | 'even-right' | 'even-left';
	};
	fill: {
		color: string;
		gradient: string;
		image: ImageTemplate;
	};
	border: RoundBorderTemplate;
}

export interface StepTemplate extends BaseTemplate {
	innerMargin: number;
	csi: {
		scale: number;
		rotation: Rotation[];
		displacementArrow: {
			fill: FillTemplate;
			border: Border;
		};
	};
	numberLabel: LabelTemplate;
}

export interface SubmodelTemplate extends BaseTemplate {
	innerMargin: number;
	maxHeight: number;
	csi: {
		scale: number;
		rotation: Rotation[];
	};
	fill: FillTemplate;
	border: RoundBorderTemplate;
	quantityLabel: LabelTemplate;
}

export interface PLITemplate extends BaseTemplate {
	innerMargin: number;
	includeSubmodels: boolean;
	fill: FillTemplate;
	border: RoundBorderTemplate;
}

export interface PLIItemTemplate extends BaseTemplate {
	scale: number;
	rotation: Rotation[];
	quantityLabel: LabelTemplate;
}

export interface CalloutTemplate extends BaseTemplate {
	innerMargin: number;
	fill: FillTemplate;
	border: RoundBorderTemplate;
	arrow: {
		border: Border;
	};
	step: {
		innerMargin: number;
		numberLabel: LabelTemplate;
	};
}

export interface Template {
	page: PageTemplate;
	step: StepTemplate;
	submodelImage: SubmodelTemplate;
	pli: PLITemplate;
	pliItem: PLIItemTemplate;
	callout: CalloutTemplate;
	divider: {
		border: Border;
	};
	rotateIcon: {
		size: number;
		fill: FillTemplate;
		border: RoundBorderTemplate;
		arrow: {
			border: Border;
		};
	};
	sceneRendering: {
		zoom: number;
		edgeWidth: number;
		rotation: Rotation[];
	};
	useBlackStudFaces: boolean;
	modelData: {
		model: any;
		part1: any;
		part2: any;
	};
}

export type TemplateTypeNames = keyof Template;

export interface GuideInterface {
	orientation: 'horizontal' | 'vertical';
	position: number;
}

export interface StateInterface {
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
	pliTransforms: { [key: string]: PLITransform }; // key should be LDrawPartFilename but that doesn't work...
	plis: PLI[];
	plisVisible: boolean;
	points: Point[];
	quantityLabels: QuantityLabel[];
	rotateIcons: RotateIcon[];
	steps: Step[];
	submodelImages: SubmodelImage[];
	template: Template;
}

export interface SaveFileContent {
	version: string;
	partDictionary: PartDictionary;
	colorTable: any;
	modelFilename: string;
	state: StateInterface;
}
