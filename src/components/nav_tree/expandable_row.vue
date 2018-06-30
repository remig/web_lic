<template>
	<div :id="`treeParent_${target.type}_${target.id}`">
		<i
			:class="['treeIcon', 'fas', 'fa-lg', {'fa-caret-down': expanded, 'fa-caret-right': !expanded}]"
			@click.stop.prevent="arrowClick"
		/>
		<treeRow
			:currentItem="currentItem"
			:target="target"
			:selectionCallback="treeData.selectionCallback"
		/>
		<ul :class="['treeChildren', 'indent', {hidden: !expanded}]">
			<li v-if="target.numberLabelID != null">
				<treeRow
					:currentItem="currentItem"
					:target="treeData.store.get.numberLabel(target.numberLabelID)"
					:selectionCallback="treeData.selectionCallback"
				/>
			</li>
			<template v-if="target.annotations != null">
				<li v-for="annotationID in target.annotations">
					<treeRow
						:currentItem="currentItem"
						:target="treeData.store.get.annotation(annotationID)"
						:selectionCallback="treeData.selectionCallback"
					/>
				</li>
			</template>
			<template v-if="target.steps != null">
				<li
					v-for="step in this.target.steps.map(id => treeData.store.get.step(id))"
					class="unindent"
				>
					<treeExpandableRow :tree-data="treeData" :currentItem="currentItem" :target="step" />
				</li>
			</template>
			<template v-if="target.submodelImages != null">
				<li
					v-for="submodelImage in target.submodelImages.map(id => treeData.store.get.submodelImage(id))"
				>
					<treeRow
						:currentItem="currentItem"
						:target="submodelImage"
						:selectionCallback="treeData.selectionCallback"
					/>
				</li>
			</template>
			<li v-if="target.csiID != null">
				<treeRow
					:currentItem="currentItem"
					:target="treeData.store.get.csi(target.csiID)"
					:selectionCallback="treeData.selectionCallback"
				/>
			</li>
			<li v-if="target.pliID != null && treeData.store.state.plisVisible" class="unindent">
				<treeExpandableRow
					:tree-data="treeData"
					:currentItem="currentItem"
					:target="treeData.store.get.pli(target.pliID)"
				/>
			</li>
			<template v-if="target.pliItems != null">
				<li v-for="pliItem in target.pliItems.map(id => treeData.store.get.pliItem(id))">
					<treeRow
						:currentItem="currentItem"
						:target="pliItem"
						:selectionCallback="treeData.selectionCallback"
					/>
				</li>
			</template>
			<li v-if="target.quantityLabelID != null">
				<treeRow
					:currentItem="currentItem"
					:target="treeData.store.get.quantityLabel(target.quantityLabelID)"
					:selectionCallback="treeData.selectionCallback"
				/>
			</li>
			<template v-if="target.callouts != null">
				<li v-for="calloutID in target.callouts" class="unindent">
					<treeExpandableRow
						:tree-data="treeData"
						:currentItem="currentItem"
						:target="treeData.store.get.callout(calloutID)"
					/>
				</li>
			</template>
		</ul>
	</div>	
</template>

<script>

import treeRow from './row.vue';

export default {
	name: 'treeExpandableRow',
	props: ['treeData', 'currentItem', 'target'],
	components: {treeRow},
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
