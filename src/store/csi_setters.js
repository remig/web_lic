/* Web Lic - Copyright (C) 2018 Remi Gagne */

import store from '../store';

export default {
	add({parent}) {
		return store.mutations.item.add({item: {
			type: 'csi', domID: null, annotations: [],
			rotation: null, scale: null,
			x: null, y: null, width: null, height: null,
		}, parent});
	},
	rotate({csi, rotation, addRotateIcon, doLayout = false}) {  // rotation: [{axis, angle}]
		const csiItem = store.get.csi(csi);
		csiItem.rotation = rotation;
		csiItem.isDirty = true;
		store.mutations.step.toggleRotateIcon(
			{step: {type: 'step', id: csiItem.parent.id}, display: addRotateIcon}
		);
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(csiItem)});
		}
	},
	scale({csi, scale, doLayout = false}) {
		const csiItem = store.get.csi(csi);
		csiItem.scale = scale;
		csiItem.isDirty = true;
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(csiItem)});
		}
	},
	resetSize({csi}) {
		const csiItem = store.get.csi(csi);
		if (csiItem) {
			csiItem.width = csiItem.height = null;
			csiItem.isDirty = true;
		}
	},
	markAllDirty() {
		store.state.csis.forEach(csi => (csi.isDirty = true));
	},
};
