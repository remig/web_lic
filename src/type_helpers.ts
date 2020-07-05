/* Web Lic - Copyright (C) 2019 Remi Gagne */

import defaultTemplate from './template';

export function hasProperty<T extends Item>(item: Item | null, prop: string): item is T {
	return (item != null) && item.hasOwnProperty(prop);
}

type Lookup = Item | LookupItem | null;

export function isItemSpecificType(item: Lookup, itemType: 'annotation'): item is Annotation;
export function isItemSpecificType(item: Lookup, itemType: 'book'): item is Book;
export function isItemSpecificType(item: Lookup, itemType: 'callout'): item is Callout;
export function isItemSpecificType(item: Lookup, itemType: 'calloutArrow'): item is CalloutArrow;
export function isItemSpecificType(item: Lookup, itemType: 'csi'): item is CSI;
export function isItemSpecificType(item: Lookup, itemType: 'divider'): item is Divider;
export function isItemSpecificType(item: Lookup, itemType: 'numberLabel'): item is NumberLabel;
export function isItemSpecificType(item: Lookup, itemType: 'page'): item is Page;
export function isItemSpecificType(item: Lookup, itemType: 'part'): item is PartItem;
export function isItemSpecificType(item: Lookup, itemType: 'pli'): item is PLI;
export function isItemSpecificType(item: Lookup, itemType: 'pliItem'): item is PLIItem;
export function isItemSpecificType(item: Lookup, itemType: 'point'): item is PointItem;
export function isItemSpecificType(item: Lookup, itemType: 'quantityLabel'): item is QuantityLabel;
export function isItemSpecificType(item: Lookup, itemType: 'rotateIcon'): item is RotateIcon;
export function isItemSpecificType(item: Lookup, itemType: 'step'): item is Step;
export function isItemSpecificType(item: Lookup, itemType: 'submodel'): item is SubmodelItem;
export function isItemSpecificType(item: Lookup, itemType: 'submodelImage'): item is SubmodelImage;
export function isItemSpecificType(item: Lookup, itemType: ItemTypeNames): item is LookupItem;
export function isItemSpecificType(item: Lookup, itemType: ItemTypeNames): item is LookupItem {
	return (item != null) && item.type === itemType;
}

export function isSize(s: any): s is Size {
	return (s && s.width != null && s.height != null);
}

export function isPoint(p: any): p is Point {
	return (p && p.x != null && p.y != null);
}

export function isBox(b: any): b is Box {
	return (b && b.x != null && b.y != null && b.width != null && b.height != null);
}

export function isPointItem(p: any): p is PointItem {
	return (p && p.relativeTo != null);
}

export function isPointListItem(p: any): p is PointListItem {
	return (p && Array.isArray(p.points));
}

export function isStepParent(t: any): t is StepParent {
	return t.hasOwnProperty('steps');
}

export function isNotNull<T>(v: T | null): v is T {
	return v != null;
}

export function isTemplate<T extends BaseTemplate>(t: any, type: string): t is T {
	return t.hasOwnProperty(type);
}

export function isTemplateType(p: string): p is keyof Template {
	return defaultTemplate.hasOwnProperty(p);
}
