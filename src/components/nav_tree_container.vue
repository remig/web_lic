/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div id="tree">
		<div class="treeButtons">
			<LicButton icon="fas fa-expand-arrows-alt" @click="expand" />
			<LicButton icon="fas fa-compress" @click="collapse" />
			<LicDropdown :label="t('nav_tree.show')">
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
						{{t(el.name)}}
						<i v-if="el.checked" class="fas fa-check" />
					</div>
				</template>
			</LicDropdown>
		</div>
		<div id="nav-tree" class="treeScroll" />
	</div>
</template>

<script setup lang="ts">

import {ref, getCurrentInstance, onMounted, onUnmounted} from 'vue';
import {t} from '@/translations';
import uiState from '../ui_state';
import NavTree from '../navtree';
import LicButton from '@/components/base/LicButton.vue';
import LicDropdown from '@/components/base/LicDropdown.vue';
import EventBus from '@/event_bus';

// TODO: need to scroll nav tree up / down whenever selected item changes, to ensure it's always in view

const instance = getCurrentInstance();

const treeElementList: {name: string; value?: string; checked?: boolean; child?: boolean}[] = [
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

const savedCheckedItems = uiState.get('navTree.checkedItems');
if (savedCheckedItems) {
	treeElementList.forEach(el => {el.checked = savedCheckedItems[el.value as string];});
}

const checkedElements = ref(treeElementList);
let expandedLevel = 0;

function forceUpdate() {
	instance?.proxy?.$forceUpdate();
}

function updateCheckState() {
	const checkedItemList = checkedElements.value
		.filter(el => !el.checked && el.child)
		.map(el => el.value)
		.filter((v): v is string => v != null);
	NavTree.setInvisibleNodeTypes(checkedItemList);
	checkedElements.value.forEach(el => {
		uiState.set('navTree.checkedItems.' + el.value, el.checked);
	});
}

function checkAll() {
	checkedElements.value.forEach(el => {
		if ('child' in el || el.value === 'all') {
			el.checked = true;
		} else if (el.value === 'page_step_part') {
			el.checked = false;
		}
	});
	updateCheckState();
}

function checkPageStepParts() {
	checkedElements.value.forEach(el => {
		if (el.value === 'step' || el.value === 'csi'
			|| el.value === 'part' || el.value === 'page_step_part'
		) {
			el.checked = true;
		} else if ('child' in el || el.value === 'all') {
			el.checked = false;
		}
	});
	updateCheckState();
}

function checkItem(item: {value?: string; checked?: boolean} | null) {
	if (!item) {
		return;
	}
	item.checked = !item.checked;
	if (item.value === 'all') {
		if (item.checked) {
			checkAll();
		} else {
			checkPageStepParts();
		}
	} else if (item.value === 'page_step_part') {
		if (item.checked) {
			checkPageStepParts();
		} else {
			checkAll();
		}
	// } else if (item.name === 'Group Parts By Type') {
	} else {
		updateCheckState();
	}
}

function expand() {
	expandedLevel += 1;
	NavTree.expandToLevel(expandedLevel);
}

function collapse() {
	expandedLevel = 0;
	NavTree.collapseAll();
}

onMounted(() => {
	EventBus.on('force-update', forceUpdate);
});

onUnmounted(() => {
	EventBus.off('force-update', forceUpdate);
});

defineExpose({forceUpdate});

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
