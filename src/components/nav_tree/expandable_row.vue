<template>
	<div :id="`treeParent_${target.type}_${target.id}`">
		<i
			:class="['treeIcon', 'fas', 'fa-lg', {'fa-caret-down': expanded, 'fa-caret-right': !expanded}]"
			@click.stop.prevent="arrowClick"
		/>
		<TreeRow
			:current-item="currentItem"
			:target="target"
			:selection-callback="treeData.selectionCallback"
		/>
		<ul :class="['treeChildren', 'indent', {hidden: !expanded}]">
			<li v-if="target.numberLabelID != null">
				<TreeRow
					:current-item="currentItem"
					:target="treeData.store.get.numberLabel(target.numberLabelID)"
					:selection-callback="treeData.selectionCallback"
				/>
			</li>
			<template v-if="target.annotations != null">
				<li
					v-for="annotationID in target.annotations"
					:key="`annotation_${annotationID}`"
				>
					<TreeRow
						:current-item="currentItem"
						:target="treeData.store.get.annotation(annotationID)"
						:selection-callback="treeData.selectionCallback"
					/>
				</li>
			</template>
			<template v-if="target.steps != null">
				<li
					v-for="step in target.steps.map(id => treeData.store.get.step(id))"
					:key="`step_${step.id}`"
					class="unindent"
				>
					<TreeExpandableRow
						:tree-data="treeData"
						:current-item="currentItem"
						:target="step"
					/>
				</li>
			</template>
			<template v-if="target.submodelImages != null">
				<li
					v-for="submodelImage in target.submodelImages.map(id => treeData.store.get.submodelImage(id))"
					:key="`submodelImage_${submodelImage.id}`"
				>
					<TreeRow
						:current-item="currentItem"
						:target="submodelImage"
						:selection-callback="treeData.selectionCallback"
					/>
				</li>
			</template>
			<li v-if="target.csiID != null">
				<TreeRow
					:current-item="currentItem"
					:target="treeData.store.get.csi(target.csiID)"
					:selection-callback="treeData.selectionCallback"
				/>
			</li>
			<li
				v-if="target.pliID != null && treeData.store.state.plisVisible"
				class="unindent"
			>
				<TreeExpandableRow
					:tree-data="treeData"
					:current-item="currentItem"
					:target="treeData.store.get.pli(target.pliID)"
				/>
			</li>
			<template v-if="target.pliItems != null">
				<li
					v-for="pliItem in target.pliItems.map(id => treeData.store.get.pliItem(id))"
					:key="`pliItem_${pliItem.id}`"
				>
					<TreeRow
						:current-item="currentItem"
						:target="pliItem"
						:selection-callback="treeData.selectionCallback"
					/>
				</li>
			</template>
			<li v-if="target.quantityLabelID != null">
				<TreeRow
					:current-item="currentItem"
					:target="treeData.store.get.quantityLabel(target.quantityLabelID)"
					:selection-callback="treeData.selectionCallback"
				/>
			</li>
			<template v-if="target.callouts != null">
				<li
					v-for="calloutID in target.callouts"
					:key="`callout_${calloutID}`"
					class="unindent"
				>
					<TreeExpandableRow
						:tree-data="treeData"
						:current-item="currentItem"
						:target="treeData.store.get.callout(calloutID)"
					/>
				</li>
			</template>
		</ul>
	</div>
</template>

<script>

import TreeRow from './row.vue';

export default {
	name: 'TreeExpandableRow',
	components: {TreeRow},
	props: ['treeData', 'currentItem', 'target'],
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
};
</script>

<style>

</style>
