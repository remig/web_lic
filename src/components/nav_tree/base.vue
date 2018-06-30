<template>
	<div id="tree">
		<ul>
			<li v-if="treeData.store.get.templatePage() != null">
				<TreeExpandableRow
					:tree-data="treeData"
					:current-item="currentItem"
					:target="treeData.store.get.templatePage()"
				/>
			</li>
			<li v-if="treeData.store.get.titlePage() != null">
				<TreeExpandableRow
					:tree-data="treeData"
					:current-item="currentItem"
					:target="treeData.store.get.titlePage()"
				/>
			</li>
			<li
				v-for="(node, idx) in treeData.store.get.topLevelTreeNodes()"
				:key="`root_${idx}`"
			>
				<TreeExpandableRow
					v-if="node.type === 'page'"
					:tree-data="treeData"
					:current-item="currentItem"
					:target="node"
				/>
				<TreeRow
					v-else
					:current-item="currentItem"
					:target="node"
					:selection-callback="treeData.selectionCallback"
				/>
			</li>
		</ul>
	</div>
</template>

<script>

import TreeExpandableRow from './expandable_row.vue';
import TreeRow from './row.vue';

export default {
	name: 'NavTree',
	components: {TreeExpandableRow, TreeRow},
	props: ['treeData', 'currentItem']
};

</script>
