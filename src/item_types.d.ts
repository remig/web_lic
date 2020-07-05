type Directions = 'up' | 'right' | 'down' | 'left';
type Positions = 'top' | 'right' | 'bottom' | 'left';
type Orientations = 'horizontal' | 'vertical'
type Anchors =
	'top_left' | 'top' | 'top_right'
	| 'left' | 'center' | 'right'
	| 'bottom_left' | 'bottom' | 'bottom_right';

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

type PartDictionary = {[key: string]: AbstractPart | Model};

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

interface Border {
	width: number;
	color: string | null;
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
	direction: Directions;
	arrowLength?: number;
	arrowOffset?: number;
	arrowRotation?: number;
	partDistance?: number;
}

type AnnotationTypes = 'label' | 'arrow' | 'stairStepArrow' | 'image';

type ItemTypeNames =
	'annotation' | 'book' | 'callout' | 'calloutArrow' | 'csi' | 'divider'
	| 'numberLabel'| 'page' | 'part' | 'pli' | 'pliItem' | 'point'
	| 'quantityLabel' | 'rotateIcon' | 'step' | 'submodel' | 'submodelImage';

type TemplateTypeNames = keyof Template;

type ItemTypes =
	Annotation | Book | Callout | CalloutArrow | CSI | Divider
	| NumberLabel | Page | PartItem | PLI | PLIItem | PointItem
	| QuantityLabel | RotateIcon | Step | SubmodelItem | SubmodelImage;

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

interface SubmodelItem extends Item {
	type: 'submodel';
	stepID: number;
	filename: string;
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
	direction?: Directions | null;
	border?: Border | null;
}

interface Book extends NumberedItem {
	type: 'book';
	pages: number[];
}

interface CalloutArrow extends PointListItem {
	type: 'calloutArrow';
	direction: Directions;
}

interface Callout extends StepParent, BoxedItem {
	type: 'callout';
	borderOffset: Point;
	calloutArrows: number[];
	innerContentOffset: Point;
	layout: Orientations;
	position: Positions;
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
	type: 'divider';
	p1: Point;
	p2: Point;
}

interface NumberLabel extends BoxedItem, Alignment {
	type: 'numberLabel';
}

type PageSubtypes = 'templatePage' | 'page' | 'titlePage' | 'inventoryPage'

interface GridLayout {
	rows: number | 'auto';
	cols: number | 'auto';
	direction: Orientations;
}

interface Page extends PLIItemParent, NumberedItem, StepParent {
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

interface LabelTemplate {
	font: string;
	color: string;
}

interface RoundBorderTemplate extends Border {
	cornerRadius: number;
}

interface FillTemplate {
	color: string | null;
}

interface ImageTemplate {
	x: number;
	y: number;
	width: number;
	height: number;
	src: string;
}

interface BaseTemplate { }

interface PageTemplate extends BaseTemplate {
	width: number;
	height: number;
	sizePreset: null;
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

interface StepTemplate extends BaseTemplate {
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

interface SubmodelTemplate extends BaseTemplate {
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

interface PLITemplate extends BaseTemplate {
	innerMargin: number;
	includeSubmodels: boolean;
	fill: FillTemplate;
	border: RoundBorderTemplate;
}

interface PLIItemTemplate extends BaseTemplate {
	scale: number;
	rotation: Rotation[];
	quantityLabel: LabelTemplate;
}

interface CalloutTemplate extends BaseTemplate {
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

interface Template {

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
		model;
		part1;
		part2;
	};
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
	template: Template;
}

interface SaveFileContent {
	version: string;
	partDictionary: PartDictionary;
	colorTable: any;
	modelFilename: string;
	state: StateInterface;
}
