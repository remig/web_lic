<template>
	<span
		:id="`treeRow_${target.type}_${target.id}`"
		:class="['clickable', 'treeText', {selected: selected}]"
		@click.stop.prevent="itemClick"
	>{{text}}</span>
</template>

<script>

import _ from '../../util';
import LDParse from '../../LDParse';

export default {
	name: 'TreeRow',
	props: ['currentItem', 'target', 'selectionCallback'],
	methods: {
		itemClick() {
			this.selectionCallback(this.target);  // Easier and faster than emitting an event across 3 levels of components
		}
	},
	watch: {
		currentItem(newItem) {
			// When an arbitrary item gets selected, make sure all of its ancestors in the tree are expanded
			if (_.itemEq(newItem, this.target)) {
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
			return _.itemEq(this.currentItem, this.target);
		},
		text() {
			const t = this.target;
			if (!t) {
				return '';
			} else if (t.type === 'templatePage') {
				return 'Template';
			} else if (t.type === 'titlePage') {
				return 'Title Page';
			} else if (t.type === 'page') {
				return 'Page ' + (t.number || '');
			} else if (t.type === 'step') {
				return 'Step ' + (t.number || '');
			} else if (t.type === 'submodel') {
				return t.filename;
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
			return _.prettyPrint(t.type);
		}
	}
};

</script>

<style>

</style>
