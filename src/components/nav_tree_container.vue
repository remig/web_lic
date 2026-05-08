/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div id="tree">
		<div class="treeButtons">
			<LicButton icon="fas fa-expand-arrows-alt" @click="expand" />
			<LicButton icon="fas fa-compress" @click="collapse" />
			<LicDropdown :label="tr('nav_tree.show')">
				<template v-for="(el, idx) in checkedElements">
					<div
						v-if="el.name === 'divider'"
						:key="`divider_${idx}`"
						class="lic-dropdown-divider"
					/>
					<div
						v-else
						:key="`item_${idx}`"
						class="lic-dropdown-item"
						@click="checkItem(el)"
					>
						{{tr(el.name)}}
						<i v-if="el.checked" class="fas fa-check" />
					</div>
				</template>
			</LicDropdown>
		</div>
		<div id="nav-tree" class="treeScroll" />
	</div>
</template>

<script>


import uiState from '../ui_state';
import store from '../store';
import NavTree from '../navtree';
import LicButton from '@/components/base/LicButton.vue';
import LicDropdown from '@/components/base/LicDropdown.vue';

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
	{name: 'nav_tree.group_parts', value: 'group_parts', checked: false},
];

const checkedItems = uiState.get('navTree.checkedItems');
if (checkedItems) {
	treeElementList.forEach(el => (el.checked = checkedItems[el.value]));
}

// TODO: need to scroll nav tree up / down whenever selected item changes, to ensure it's always in view
export default {
	name: 'NavTreeContainer',
	components: {LicButton, LicDropdown},
	props: ['currentItem'],
	data() {
		this.store = store;
		return {
			checkedElements: treeElementList,
			expandedLevel: 0,
			expandLeveInitialized: false,
		};
	},
	methods: {
		forceUpdate() {
			this.$forceUpdate();
		},
		updateCheckState() {

			const checkedItemList = this.checkedElements
				.filter(el => !el.checked && el.child)
				.map(el => el.value);
			NavTree.setInvisibleNodeTypes(checkedItemList);

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
		},
	},
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
	flex-direction: row;
	justify-content: flex-end;
	padding: 10px;
	min-width: 110px;
	border-bottom: 1px solid #AAA;
}

.treeButtons button {
	margin-right: 6px;
	font-size: 8pt !important;
	padding: 6px 7px !important;
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
	margin-left: 30px;
}

.treeChildren .treeParent {
	position: relative;
	left: -13px;  /* treeIcon 10px width + 3px right margin */
	white-space: nowrap;
}

.treeIcon {
	display: inline-block;
	margin-right: 3px;
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
	padding: 0 2px;
	border: 2px solid white;
	cursor: pointer;
}

.treeSelected {
	border: 2px dashed #2eb9ce;
}

</style>
