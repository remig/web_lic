<template>
	<div id="tree">
		<ul>
			<li v-if="treeData.store.get.templatePage() != null">
				<treeExpandableRow
					:tree-data="treeData"
					:currentItem="currentItem"
					:target="treeData.store.get.templatePage()"
				/>
			</li>
			<li v-if="treeData.store.get.titlePage() != null">
				<treeExpandableRow
					:tree-data="treeData"
					:currentItem="currentItem"
					:target="treeData.store.get.titlePage()"
				/>
			</li>
			<li v-for="node in treeData.store.get.topLevelTreeNodes()">
				<treeExpandableRow
					v-if="node.type === 'page'"
					:tree-data="treeData"
					:currentItem="currentItem"
					:target="node"
				/>
				<treeRow
					v-else :currentItem="currentItem"
					:target="node"
					:selectionCallback="treeData.selectionCallback"
				/>
			</li>
		</ul>
	</div>
</template>

<script>

import treeExpandableRow from './expandable_row.vue';
import treeRow from './row.vue';

export default {
	name: 'navTree',
	props: ['treeData', 'currentItem'],
	components: {treeExpandableRow, treeRow}
};

</script>

<style>

</style>
