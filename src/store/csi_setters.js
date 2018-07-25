/* Web Lic - Copyright (C) 2018 Remi Gagne */

'use strict';

import _ from '../util';
import store from '../store';

export default {
	add(opts) { // opts: {parent}
		return store.mutations.item.add({item: {
			type: 'csi', domID: null, annotations: [],
			rotation: null, scale: null,
			x: null, y: null, width: null, height: null
		}, parent: opts.parent});
	},
	rotate(opts) {  // opts: {csi, rotation: {x, y, z}, addRotateIcon, doLayout = false}
		const csi = store.get.lookupToItem(opts.csi);
		csi.rotation = opts.rotation;
		csi.isDirty = true;
		store.mutations.step.toggleRotateIcon(
			{step: {type: 'step', id: csi.parent.id}, display: opts.addRotateIcon}
		);
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(csi)});
		}
	},
	scale(opts) { // opts: {csi, scale, doLayout = false}
		const csi = store.get.lookupToItem(opts.csi);
		csi.scale = (opts.scale == null) ? null : _.clamp(opts.scale, 0.001, 5);
		csi.isDirty = true;
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(csi)});
		}
	},
	resetSize(opts) {  // opts: {csi}
		const csi = store.get.lookupToItem(opts.csi, 'csi');
		if (csi) {
			csi.width = csi.height = null;
			csi.isDirty = true;
		}
	},
	markAllDirty() {
		store.state.csis.forEach(csi => (csi.isDirty = true));
	}
};
