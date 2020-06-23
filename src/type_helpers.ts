/* Web Lic - Copyright (C) 2019 Remi Gagne */

import defaultTemplate from './template';

export function hasProperty<T extends Item>(item: Item | null, prop: string): item is T {
	return (item != null) && item.hasOwnProperty(prop);
}

export function isItemSpecificType<T extends Item>(
	item: Item | null, itemType: ItemTypeNames
): item is T {
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

export function isNotNull<T>(v: T | null): v is T {
	return v != null;
}

export function isTemplate<T extends BaseTemplate>(t: any, type: string): t is T {
	return t.hasOwnProperty(type);
}

export function isTemplateType(p: string): p is keyof Template {
	return defaultTemplate.hasOwnProperty(p);
}
