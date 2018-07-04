<template>
	<span
		:id="`treeRow_${target.type}_${target.id}`"
		:class="['clickable', 'treeText', {selected: selected}]"
		@click.stop.prevent="itemClick"
	>{{text()}}</span>
</template>

<script>

import _ from '../../util';
import LDParse from '../../LDParse';
import store from '../../store';

export default {
	name: 'TreeRow',
	props: ['currentItem', 'target'],
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
	methods: {
		itemClick() {
			this.$emit('select-item', this.target);
		},
		text() {
			const t = this.target;
			if (!t) {
				return '';
			} else if (t.type === 'templatePage') {
				return 'Template';
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
				return `${nicePartName(t.filename)} - ${niceColorName(t.colorCode)}`;
			} else if (t.type === 'part') {
				const step = store.get.step(t.stepID);
				const part = LDParse.model.get.partFromID(t.id, step.model.filename);
				const partName = nicePartName(part.filename);
				const partColor = niceColorName(part.colorCode);
				if (partColor) {
					return `${partName} - ${partColor}`;
				}
				return `${partName}`;
			}
			return _.prettyPrint(t.type);
		}
	},
	computed: {
		selected() {
			return _.itemEq(this.currentItem, this.target);
		}
	}
};

function nicePartName(filename) {
	const part = LDParse.partDictionary[filename];
	if (!part || !part.name) {
		return 'Unknown Part';
	} else if (part.isSubModel) {
		return part.name.replace(/\.(mpd|ldr)/ig, '');
	}
	return part.name.replace(' x ', 'x');
}

function niceColorName(colorCode) {
	const color = LDParse.colorTable[colorCode];
	return color ? color.name.replace('_', ' ') : '';
}

</script>

<style>

</style>
