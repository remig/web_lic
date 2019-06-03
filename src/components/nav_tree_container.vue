/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div id="tree">
		<div class="treeButtons">
			<el-button icon="fas fa-expand-arrows-alt" @click="expand" />
			<el-button icon="fas fa-compress" @click="collapse" />
			<el-dropdown
				id="treeShowHideMenu"
				:hide-on-click="false"
				size="mini"
				trigger="click"
				placement="bottom-start"
				@command="checkItem"
			>
				<span class="el-dropdown-link">{{tr('nav_tree.show')}}</span>
				<el-dropdown-menu slot="dropdown" class="treeShowHideDropdown">
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
							{{tr(el.name)}}
							<i v-if="el.checked" class="fas fa-check"/>
						</el-dropdown-item>
					</template>
				</el-dropdown-menu>
			</el-dropdown>
		</div>
		<div id="nav-tree" class="treeScroll" />
	</div>
</template>

<script>


import uiState from '../../uiState';
import store from '../../store';
import NavTree from '../../navtree';

const treeElementList = [
	{name: 'nav_tree.all', value: 'all', checked: true},
	{name: 'nav_tree.page_step_part', value: 'page_step_part', checked: false},
	{name: 'divider'},
	{name: 'nav_tree.steps', value: 'step', checked: true, child: true},
	{name: 'nav_tree.submodel_images', value: 'submodelImage', checked: true, child: true},
	{name: 'nav_tree.csis', value: 'csi', checked: true, child: true},
	{name: 'nav_tree.parts', value: 'part', checked: true, child: true},
	{name: 'nav_tree.plis', value: 'pli', checked: true, child: true},
	{name: 'nav_tree.pli_items', value: 'pliItem', checked: true, child: true},
	{name: 'nav_tree.callouts', value: 'callout', checked: true, child: true},
	{name: 'nav_tree.callout_arrows', value: 'calloutArrow', checked: true, child: true},
	{name: 'nav_tree.annotations', value: 'annotation', checked: true, child: true},
	{name: 'nav_tree.number_labels', value: 'numberLabel', checked: true, child: true},
	{name: 'nav_tree.quantity_labels', value: 'quantityLabel', checked: true, child: true},
	{name: 'nav_tree.dividers', value: 'divider', checked: true, child: true},
	{name: 'divider'},
	{name: 'nav_tree.group_parts', value: 'group_parts', checked: false}
];

const checkedItems = uiState.get('navTree.checkedItems');
if (checkedItems) {
	treeElementList.forEach(el => (el.checked = checkedItems[el.value]));
}

// TODO: need to scroll nav tree up / down whenever selected item changes, to ensure it's always in view
export default {
	name: 'NavTreeContainer',
	props: ['currentItem'],
	data() {
		this.store = store;
		return {
			checkedElements: treeElementList,
			expandedLevel: 0,
			expandLeveInitialized: false
		};
	},
	methods: {
		forceUpdate() {
			this.$forceUpdate();
		},
		updateCheckState() {

			const checkedItems = this.checkedElements
				.filter(el => !el.checked && el.child)
				.map(el => el.value);
			NavTree.setInvisibleNodeTypes(checkedItems);

			this.checkedElements.forEach(el => {
				uiState.set('navTree.checkedItems.' + el.value, el.checked);
			});
		},
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
			} else {
				this.updateCheckState();
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
			this.updateCheckState();
		},
		checkPageStepParts() {
			this.checkedElements.forEach(el => {
				if (el.value === 'step' || el.value === 'csi'
					|| el.value === 'part' || el.value === 'page_step_part'
				) {
					el.checked = true;
				} else if (el.hasOwnProperty('child') || el.value === 'all') {
					el.checked = false;
				}
			});
			this.updateCheckState();
		},
		expand() {
			this.expandedLevel += 1;
			NavTree.expandToLevel(this.expandedLevel);
		},
		collapse() {
			this.expandedLevel = 0;
			NavTree.collapseAll();
		}
	}
};

</script>

<style>

#tree {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.treeButtons {
	display: flex;
	padding: 10px;
	min-width: 110px;
	border-bottom: 1px solid #AAA;
}

.treeButtons > button {
	align-self: flex-end;
	margin-left: auto;
	font-size: 8pt;
	margin-right: 6px;
	padding: 6px 7px;
}

.treeButtons .el-dropdown {
	float: right;
	height: 24px;
	font-size: 10pt;
	padding: 2px 5px;
}

.treeShowHideDropdown {
	min-width: 190px;
}

.treeShowHideDropdown i {
	padding-top: 5px;
}

.treeScroll {
	flex: 1;
	overflow-y: auto;
	padding: 10px 0 50px 10px;
	margin: 0;
}

.treeScroll ul {
	list-style: none;
	list-style-type: none;
}

.treeParent .treeChildren {
	margin-left: 35px;
}

.treeChildren .treeParent {
	position: relative;
	left: -16px;
	white-space: nowrap;
}

.indent {
	margin-left: 35px;
	list-style-type: none;
}

.unindent {
	position: relative;
	left: -16px;
	white-space: nowrap;
}

.treeIcon {
	display: inline-block;
	margin-right: 4px;
	width: 10px;
	font-size: 1.25em;
	vertical-align: 1px;
	cursor: pointer;
}

.treeText {
	font: 9pt Helvetica;
	white-space: nowrap;
	overflow: hidden;
	position: relative;
	bottom: 4px;
	width: 100%;
	cursor: pointer;
}

</style>
