<template>
	<div id="tree">
		<div class="treeButtons">
			<el-dropdown
				id="treeShowHideMenu"
				:hide-on-click="false"
				size="mini"
				trigger="click"
				placement="bottom-start"
				@command="checkItem"
			>
				<span class="el-dropdown-link">
					Show
				</span>
				<el-dropdown-menu slot="dropdown">
					<template v-for="(el, idx) in checkedElements">
						<el-dropdown-item
							v-if="el.name === 'divider'"
							:key="`${el}_${idx}`"
							:divided="true"
						/>
						<el-dropdown-item
							v-else
							:key="`${el}_${idx}`"
							:command="el"
						>
							{{el.name}}
							<i v-if="el.checked" class="fas fa-check"/>
						</el-dropdown-item>
					</template>
				</el-dropdown-menu>
			</el-dropdown>
			<el-button icon="fas fa-compress" @click="collapse" />
			<el-button icon="fas fa-expand-arrows-alt" @click="expand" />
		</div>
		<ul>
			<li v-if="treeData.store.get.templatePage() != null">
				<TreeExpandableRow
					:tree-data="treeData"
					:row-visibility="rowVisibility"
					:current-item="currentItem"
					:target="treeData.store.get.templatePage()"
				/>
			</li>
			<li v-if="treeData.store.get.titlePage() != null">
				<TreeExpandableRow
					:tree-data="treeData"
					:row-visibility="rowVisibility"
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
					:row-visibility="rowVisibility"
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

const elements = [
	{name: 'All', value: 'all', checked: false},
	{name: 'Pages, Steps, Parts', value: 'page_step_part', checked: false},
	{name: 'divider'},
	{name: 'Steps', value: 'steps', checked: false, child: true},
	{name: 'Submodel Images', value: 'submodelImages', checked: false, child: true},
	{name: 'Submodel CSIs', value: 'submodelCSI', checked: false, child: true},
	{name: 'CSIs', value: 'csis', checked: false, child: true},
	{name: 'Parts', value: 'parts', checked: false, child: true},
	{name: 'PLIs', value: 'plis', checked: false, child: true},
	{name: 'PLI Images', value: 'pliItems', checked: false, child: true},
	{name: 'Callouts', value: 'callouts', checked: false, child: true},
	{name: 'Callout Arrows', value: 'calloutArrows', checked: false, child: true},
	{name: 'Annotations', value: 'annotations', checked: false, child: true},
	{name: 'Number Labels', value: 'numberLabels', checked: false, child: true},
	{name: 'Quantity Labels', value: 'quantityLabels', checked: false, child: true},
	{name: 'divider'},
	{name: 'Group Parts By Type (NYI)', value: '', checked: false}
];

export default {
	name: 'NavTree',
	components: {TreeExpandableRow, TreeRow},
	props: ['treeData', 'currentItem'],
	data() {
		return {
			expandedLevel: 0,
			checkedElements: elements
		};
	},
	methods: {
		checkItem(item) {
			if (!item) {
				return;
			}
			item.checked = !item.checked;
			if (item.value === 'all') {
				this[item.checked ? 'checkAll' : 'checkPageStepParts']();
			} else if (item.value === 'page_step_part') {
				this[item.checked ? 'checkPageStepParts' : 'checkAll']();
			// } else if (item.name === 'Group Parts By Type') {
			}
		},
		checkAll() {
			this.checkedElements.forEach(el => {
				if (el.hasOwnProperty('child') || el.value === 'all') {
					el.checked = true;
				} else if (el.value === 'page_step_part') {
					el.checked = false;
				}
			});
		},
		checkPageStepParts() {
			this.checkedElements.forEach(el => {
				if (el.value === 'steps' || el.value === 'parts' || el.value === 'page_step_part') {
					el.checked = true;
				} else if (el.hasOwnProperty('child') || el.value === 'all') {
					el.checked = false;
				}
			});
		},
		expand() {
			const level = this.expandedLevel;
			this.$children.forEach(c => {
				if (c.hasOwnProperty('expanded')) {
					if (level === 0) {
						c.expanded = true;
					} else {
						c.expandChildren(1, level);
					}
				}
			});
			this.expandedLevel += 1;
		},
		collapse() {
			const level = this.expandedLevel;
			if (level < 1) {
				return;
			}
			this.$children.forEach(c => {
				if (c.hasOwnProperty('expanded')) {
					if (level === 1) {
						c.expanded = false;
					}
					c.collapseChildren(1, level - 1);
				}
			});
			this.expandedLevel -= 1;
		}
	},
	computed: {
		rowVisibility() {
			const res = {};
			elements.filter(el => el.child).forEach(el => (res[el.value] = el.checked));
			return res;
		}
	}
};

</script>

<style>

#tree {
	padding: 7px 5px;
}

.treeButtons {
	margin-bottom: 10px;
	min-width: 110px;
	height: 32px;
	border-bottom: 1px solid #AAA;
}

.treeButtons > button {
	float: right;
	font-size: 8pt;
	margin-right: 6px;
	padding: 6px 7px;
}

.treeButtons .el-dropdown {
	float: right;
	height: 24px;
	padding: 2px 5px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 10pt;
}

.treeButtons .el-button+.el-button {
	margin-left: unset;
}

.indent {
	margin-left: 40px;
	list-style-type: none;
}

.unindent {
	position: relative;
	left: -20px;
}

.treeIcon {
	display: inline-block;
	width: 10px;
	font-size: 1.25em;
	vertical-align: 1px;
}

.treeText {
	font: 9pt Helvetica;
	white-space:nowrap;
	overflow: hidden;
	position: relative;
	bottom: 4px;
	width: 100%;
	border: 1px dashed #fff;
}

.el-dropdown-menu i {
	float: right;
	margin-left: 12px;
	padding-top: 5px;
}

ul.el-dropdown-menu {
	min-width: 190px;
}

</style>
