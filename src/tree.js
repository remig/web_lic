/* global Vue: false */
'use strict';

const util = require('./util');
const LDParse = require('./LDParse');

Vue.component('treeRow', {
	props: ['currentItem', 'target', 'selectionCallback'],
	template: '#treeRowTemplate',
	methods: {
		itemClick() {
			this.selectionCallback(this.target);  // Easier and faster than emitting an event across 3 levels of components
		}
	},
	watch: {
		currentItem(newItem) {
			// When an arbitrary item gets selected, make sure all of its ancestors in the tree are expanded
			if (util.itemEq(newItem, this.target)) {
				let parent = this.$parent;
				while (parent && parent.hasOwnProperty('expanded')) {
					parent.expanded = true;
					parent = parent.$parent;
				}
			}
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
			} else if (t.type === 'annotation') {
				switch (t.annotationType) {
					case 'label':
						return t.text;
				}
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
