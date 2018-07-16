<template>
	<div :id="`treeParent_${target.type}_${target.id}`">
		<i
			v-if="$children.length > 1"
			:class="['treeIcon', 'fas', 'fa-lg', {'fa-caret-down': expanded, 'fa-caret-right': !expanded}]"
			@click.stop.prevent="arrowClick"
		/>
		<TreeRow
			:current-item="currentItem"
			:target="target"
			@select-item="$emit('select-item', arguments[0])"
		/>
		<ul :class="['treeChildren', 'indent', {hidden: !expanded}]">
			<li v-if="target.numberLabelID != null && rowVisibility.numberLabels">
				<TreeRow
					:current-item="currentItem"
					:target="store.get.numberLabel(target.numberLabelID)"
					@select-item="$emit('select-item', arguments[0])"
				/>
			</li>
			<template v-if="target.annotations != null && rowVisibility.annotations">
				<li
					v-for="annotationID in target.annotations"
					:key="`annotation_${annotationID}`"
				>
					<TreeRow
						:current-item="currentItem"
						:target="store.get.annotation(annotationID)"
						@select-item="$emit('select-item', arguments[0])"
					/>
				</li>
			</template>
			<template v-if="target.dividers != null && rowVisibility.dividers">
				<li
					v-for="dividerID in target.dividers"
					:key="`divider_${dividerID}`"
				>
					<TreeRow
						:current-item="currentItem"
						:target="store.get.divider(dividerID)"
						@select-item="$emit('select-item', arguments[0])"
					/>
				</li>
			</template>
			<template v-if="target.steps != null && rowVisibility.steps">
				<li
					v-for="step in target.steps.map(id => store.get.step(id))"
					:key="`step_${step.id}`"
					class="unindent"
				>
					<TreeExpandableRow
						:row-visibility="rowVisibility"
						:current-item="currentItem"
						:target="step"
						@select-item="$emit('select-item', arguments[0])"
					/>
				</li>
			</template>
			<li
				v-if="target.stretchedStep && rowVisibility.steps"
				class="unindent"
			>
				<TreeExpandableRow
					:row-visibility="rowVisibility"
					:current-item="currentItem"
					:target="store.get.step(target.stretchedStep.stepID)"
					@select-item="$emit('select-item', arguments[0])"
				/>
			</li>
			<template v-if="target.submodelImages != null && rowVisibility.submodelImages">
				<li
					v-for="submodelImage in target.submodelImages.map(id => store.get.submodelImage(id))"
					:key="`submodelImage_${submodelImage.id}`"
					class="unindent"
				>
					<TreeExpandableRow
						:row-visibility="rowVisibility"
						:current-item="currentItem"
						:target="submodelImage"
						@select-item="$emit('select-item', arguments[0])"
					/>
				</li>
			</template>
			<li
				v-if="target.csiID != null && rowVisibility.csis"
				class="unindent"
			>
				<TreeExpandableRow
					:row-visibility="rowVisibility"
					:current-item="currentItem"
					:target="store.get.csi(target.csiID)"
					@select-item="$emit('select-item', arguments[0])"
				>
					<template v-if="target.parts && rowVisibility.parts">
						<li v-for="partID in target.parts" :key="`part_${partID}_${target.id}`">
							<TreeRow
								:current-item="currentItem"
								:target="{type: 'part', id: partID, stepID: target.id}"
								@select-item="$emit('select-item', arguments[0])"
							/>
						</li>
					</template>
				</TreeExpandableRow>
			</li>
			<li
				v-if="target.pliID != null && store.state.plisVisible && rowVisibility.plis"
				class="unindent"
			>
				<!-- TODO: if pli is empty, don't include it in the tree -->
				<TreeExpandableRow
					:row-visibility="rowVisibility"
					:current-item="currentItem"
					:target="store.get.pli(target.pliID)"
					@select-item="$emit('select-item', arguments[0])"
				/>
			</li>
			<template v-if="target.pliItems != null && rowVisibility.pliItems">
				<li
					v-for="pliItem in target.pliItems.map(id => store.get.pliItem(id))"
					:key="`pliItem_${pliItem.id}`"
				>
					<TreeExpandableRow
						:row-visibility="rowVisibility"
						:current-item="currentItem"
						:target="pliItem"
						@select-item="$emit('select-item', arguments[0])"
					/>
				</li>
			</template>
			<li v-if="target.quantityLabelID != null && rowVisibility.quantityLabels">
				<TreeRow
					:current-item="currentItem"
					:target="store.get.quantityLabel(target.quantityLabelID)"
					@select-item="$emit('select-item', arguments[0])"
				/>
			</li>
			<template v-if="target.callouts != null && rowVisibility.callouts">
				<li
					v-for="calloutID in target.callouts"
					:key="`callout_${calloutID}`"
					class="unindent"
				>
					<TreeExpandableRow
						:row-visibility="rowVisibility"
						:current-item="currentItem"
						:target="store.get.callout(calloutID)"
						@select-item="$emit('select-item', arguments[0])"
					/>
				</li>
			</template>
			<template v-if="target.calloutArrows != null && rowVisibility.calloutArrows">
				<li
					v-for="calloutArrowID in target.calloutArrows"
					:key="`calloutArrow_${calloutArrowID}`"
					class="unindent"
				>
					<TreeExpandableRow
						:row-visibility="rowVisibility"
						:current-item="currentItem"
						:target="store.get.calloutArrow(calloutArrowID)"
						@select-item="$emit('select-item', arguments[0])"
					/>
				</li>
			</template>
			<slot />
		</ul>
	</div>
</template>

<script>

import TreeRow from './row.vue';
import store from '../../store';

export default {
	name: 'TreeExpandableRow',
	components: {TreeRow},
	props: ['currentItem', 'target', 'rowVisibility'],
	data() {
		this.store = store;
		return {expanded: false};
	},
	methods: {
		forceUpdate() {
			this.$forceUpdate();
			this.$children.forEach(c => {
				if (typeof c.forceUpdate === 'function') {
					c.forceUpdate();
				}
			});
		},
		expandChildren(currentLevel, expandLevel) {
			if (currentLevel > expandLevel) {
				return;
			}
			this.$children.forEach(c => {
				if (c.hasOwnProperty('expanded')) {
					c.expanded = true;
					c.expandChildren(currentLevel + 1, expandLevel);
				}
			});
		},
		collapseChildren(currentLevel, collapseLevel) {
			this.$children.forEach(c => {
				if (c.hasOwnProperty('expanded')) {
					if (currentLevel >= collapseLevel) {
						c.expanded = false;
					}
					c.collapseChildren(currentLevel + 1, collapseLevel);
				}
			});
		},
		arrowClick() {
			this.expanded = !this.expanded;
		}
	}
};
</script>
