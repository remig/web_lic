/* Web Lic - Copyright (C) 2018 Remi Gagne */

import { type CSI, type LookupItem, type Rotation } from '../item_types';
import { store } from '../store';

export const CSIMutations = {
	add({ parent }: { parent: LookupItem }): CSI {
		return store.mutations.item.add<CSI>({
			item: {
				type: 'csi',
				id: -1,
				parent,
				domID: null,
				isDirty: false,
				annotations: [],
				rotation: null,
				scale: null,
				autoScale: null,
				x: 0,
				y: 0,
				width: 0,
				height: 0,
			},
			parent,
		});
	},
	rotate({
		csi,
		rotation,
		addRotateIcon,
		doLayout = false,
	}: {
		csi: LookupItem;
		rotation: Rotation[];
		addRotateIcon: boolean;
		doLayout: boolean;
	}): void {
		const csiItem = store.get.csi(csi);
		if (csiItem != null) {
			csiItem.rotation = rotation;
			csiItem.isDirty = true;
			store.mutations.step.toggleRotateIcon({
				step: { type: 'step', id: csiItem.parent.id },
				display: addRotateIcon,
			});
			if (doLayout) {
				store.mutations.page.layout({ page: store.get.pageForItem(csiItem) });
			}
		}
	},
	scale({
		csi,
		scale,
		doLayout = false,
	}: {
		csi: LookupItem;
		scale: number;
		doLayout: boolean;
	}): void {
		const csiItem = store.get.csi(csi);
		if (csiItem != null) {
			csiItem.scale = scale;
			csiItem.isDirty = true;
			if (doLayout) {
				store.mutations.page.layout({ page: store.get.pageForItem(csiItem) });
			}
		}
	},
	resetSize({ csi }: { csi: number | LookupItem }): void {
		const csiItem = store.get.csi(csi);
		if (csiItem) {
			csiItem.width = csiItem.height = 0;
			csiItem.isDirty = true;
		}
	},
	markAllDirty(): void {
		store.state.csis.forEach((csi) => (csi.isDirty = true));
	},
} as const;
