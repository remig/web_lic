/* global Vue: false, app: false, util: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
(function() {
'use strict';

Vue.component('treeRow', {
	props: ['currentItem', 'target'],
	template: '#treeRowTemplate',
	methods: {
		itemClick() {
			app.setSelected(this.target);
		}
	},
	watch: {
		currentItem(newItem) {
			expandParents(this, newItem);
		}
	},
	computed: {
		selected() {
			return util.itemEq(this.currentItem, this.target);
		},
		text() {
			const t = this.target;
			if (!t) {
				return '';
			} else if (t.type === 'titlePage') {
				return 'Title Page';
			} else if (t.type === 'page') {
				return 'Page ' + (t.number || '');
			} else if (t.type === 'step') {
				return 'Step ' + (t.number || '');
			} else if (t.type === 'label') {
				return t.text;
			} else if (t.type === 'pliItem') {
				const part = LDParse.partDictionary[t.filename];
				if (!part || !part.name) {
					return 'Unknown Part';
				} else if (part.isSubModel) {
					return part.name.replace(/\.(mpd|ldr)/ig, '');
				}
				const partName = part.name.replace(' x ', 'x');
				const partColor = LDParse.colorTable[t.colorCode].name.replace('_', ' ');
				return partName + ' - ' + partColor;
			}
			return util.prettyPrint(t.type);
		}
	}
});

Vue.component('treeParentRow', {
	props: ['treeData', 'currentItem', 'target'],
	template: '#treeParentRowTemplate',
	data() {
		return {
			expanded: false
		};
	},
	methods: {
		arrowClick() {
			this.expanded = !this.expanded;
		}
	}
});

Vue.component('tree', {
	props: ['treeData', 'currentItem'],
	template: '#treeTemplate'
});

function expandParents(node, newItem) {
	if (util.itemEq(newItem, node.target)) {
		let parent = node.$parent;
		while (parent && parent.hasOwnProperty('expanded')) {
			parent.expanded = true;
			parent = parent.$parent;
		}
	}
}

})();
