/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import cache from '../cache';
import Layout from '../layout';

export interface AnnotationMutationInterface {
	add(
		{annotationType, properties, parent, x, y}
		: {
			annotationType: AnnotationTypes,
			properties: any,
			parent: LookupItem,
			x: number, y: number
		}
	): Annotation
	set(
		{annotation, newProperties}
		: {annotation: LookupItem, newProperties: any}
	): void;
	delete(
		{annotation}
		: {annotation: LookupItem}
	): void;
}

export const AnnotationMutations: AnnotationMutationInterface = {
	add({annotationType, properties, parent, x, y}) {

		const annotation = store.mutations.item.add<Annotation>({item: {
			type: 'annotation', id: -1, parent,
			annotationType, points: [],
			color: '', font: '', text: '',
			align: 'left', valign: 'top',
			x: 0, y: 0, width: 0, height: 0,
		}, parent});

		_.assign(annotation, properties);

		// Guarantee some nice defaults
		if (annotation.annotationType === 'label') {
			annotation.text = annotation.text || 'Label';
			annotation.font = annotation.font || '20pt Helvetica';
			annotation.color = annotation.color || 'black';
			annotation.align = 'left';
			annotation.valign = 'top';
			annotation.x = x;
			annotation.y = y;
			if (properties.text) {
				Layout.label(annotation);
			}
		} else if (annotation.annotationType === 'arrow') {
			annotation.points = [];
			store.mutations.item.add<PointItem>({item: {
				type: 'point', id: -1, parent: annotation,
				x, y, relativeTo: null,
			}, parent: annotation});

			store.mutations.item.add<PointItem>({item: {
				type: 'point', id: -1, parent: annotation,
				x: (x || 0) + 100, y, relativeTo: null,
			}, parent: annotation});
		} else {
			// image annotation width & height set by image load logic during first draw
			annotation.x = x;
			annotation.y = y;
		}
		return annotation;
	},
	set({annotation, newProperties}) {
		const item = store.get.annotation(annotation);
		if (item) {
			const props = newProperties || {};
			if (item.annotationType === 'label') {
				item.text = (props.text == null) ? item.text : props.text;
				item.color = (props.color == null) ? item.color : props.color;
				item.font = (props.font == null) ? item.font : props.font;
				Layout.label(item);
			}
		}
	},
	delete({annotation}) {
		const item = store.get.annotation(annotation);
		if (item) {
			if (item.hasOwnProperty('points')) {
				store.mutations.item.deleteChildList({item, listType: 'point'});
			}
			cache.clear(item);  // Clear cached images, if any
			store.mutations.item.delete({item});
		}
	},
};
