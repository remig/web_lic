/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div class="container" @click.stop>
		<h4>{{title()}}</h4>
		<div class="panel-group">
			<component
				:is="currentTemplatePanel"
				ref="currentTemplateRef"
				:selected-item="selectedItem"
				:template-entry="templateEntry"
				@new-values="newValues"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">

import {ref, watch, nextTick, onBeforeUnmount, getCurrentInstance, onMounted, onUnmounted} from 'vue';
import {t} from '@/translations';
import _ from '../util';
import store from '../store';
import undoStack from '../undo_stack';
import borderPanel from './controlPanels/border.vue';
import fontPanel from './controlPanels/font.vue';
import fillAndBorderTemplatePanel from './controlPanels/fill_border.vue';
import pageTemplatePanel from './controlPanels/page_template.vue';
import csiTemplatePanel from './controlPanels/csi_template.vue';
import pliTemplatePanel from './controlPanels/pli_template.vue';
import pliItemTemplatePanel from './controlPanels/pli_item_template.vue';
import pageNumberTemplatePanel from './controlPanels/page_number.vue';
import rotateIconTemplatePanel from './controlPanels/rotate_icon_template.vue';
import * as UiOps from '../ui_ops';
import EventBus from '@/event_bus';

const props = defineProps<{selectedItem: any;}>();

const instance = getCurrentInstance();
const currentTemplateRef = ref<any>(null);
const currentTemplatePanel = ref<any>(null);
const templateEntry = ref<string | null>(null);
const lastEdit = ref<any>(null);

// Top level keys match the basic type of the selected item
// First level child keys match the basic type of the selected item's parent
// Second level child keys match the basic type of the selected item's parent's parent (grandparent)
const componentLookup: any = {
	page: [pageTemplatePanel, ''],
	csi: {
		step: [csiTemplatePanel, 'step.csi'],
		submodelImage: [csiTemplatePanel, 'submodelImage.csi'],
	},
	pliItem: [pliItemTemplatePanel, ''],
	pli: [pliTemplatePanel, ''],
	callout: [fillAndBorderTemplatePanel, 'callout'],
	calloutArrow: [borderPanel, 'callout.arrow'],
	submodelImage: [fillAndBorderTemplatePanel, 'submodelImage'],
	divider: [borderPanel, 'divider'],
	rotateIcon: [rotateIconTemplatePanel, ''],
	numberLabel: {
		page: [pageNumberTemplatePanel, ''],
		step: {
			callout: [fontPanel, 'callout.step.numberLabel'],
			'default': [fontPanel, 'step.numberLabel'],
		},
	},
	quantityLabel: {
		submodelImage: [fontPanel, 'submodelImage.quantityLabel'],
		pliItem: [fontPanel, 'pliItem.quantityLabel'],
	},
};

function getTemplate(selectedItem: any) {
	if (!selectedItem) {
		return null;
	}
	const type = selectedItem.type;
	if (type in componentLookup) {
		const lookup = componentLookup[type];
		const parent = store.get.parent(selectedItem);
		const grandparent = parent ? store.get.parent(parent) : null;
		if (parent && parent.type in lookup) {
			if (grandparent && grandparent.type in lookup[parent.type]) {
				return lookup[parent.type][grandparent.type];
			} else if (lookup[parent.type].default) {
				return lookup[parent.type].default;
			}
			return lookup[parent.type];
		}
		return lookup;
	}
	return null;
}

function title() {
	return props.selectedItem
		? t('glossary.' + props.selectedItem.type.toLowerCase())
		: t('template.select_page_item');
}

function newValues(opts: any) {
	lastEdit.value = (typeof opts === 'string') ? {type: opts} : opts;
	if (!opts.noLayout) {
		store.get.templatePage().needsLayout = true;
	}
	UiOps.drawCurrentPage();
}

function applyChanges() {
	// TODO: Make sure something actually changed before pushing to the undo stack
	// eg: add then immediately remove an image...
	if (lastEdit.value) {
		if (typeof currentTemplateRef.value?.apply === 'function') {
			currentTemplateRef.value.apply();
		} else {
			if (!lastEdit.value.noLayout) {
				store.mutations.page.markAllDirty();
			}
			const parts: string[] = lastEdit.value.type.split('.');
			const item = t('glossary.' + (_.last(parts) || '').toLowerCase());
			const undoText = t('action.edit.template.change.undo_@mf', {item});
			undoStack.commit('', null, undoText);
		}
		lastEdit.value = null;
	}
}

function applyDirtyAction(entryType: string) {
	const item = t('glossary.' + entryType.toLowerCase());
	const undoText = t('action.edit.template.change.undo_@mf', {item});
	undoStack.commit('', null, undoText, [entryType, 'page'] as any);
}

function setCurrentTemplate() {
	currentTemplatePanel.value = null;
	templateEntry.value = null;
	const res = getTemplate(props.selectedItem);
	if (res) {
		nextTick(() => {
			currentTemplatePanel.value = res[0];
			templateEntry.value = res[1];
		});
	}
}

function forceUpdate() {
	setCurrentTemplate();
	instance?.proxy?.$forceUpdate();
	if (currentTemplateRef.value) {
		currentTemplateRef.value.$forceUpdate?.();
		currentTemplateRef.value.$children?.forEach((el: any) => el.$forceUpdate?.());
	}
}

watch(() => props.selectedItem, () => {
	applyChanges();
	setCurrentTemplate();
});

onBeforeUnmount(() => {
	// Catch changes if user switches from template panel directly to nav tree or new page via keyboard
	applyChanges();
});

const initRes = getTemplate(props.selectedItem) || [];
currentTemplatePanel.value = initRes[0] ?? null;
templateEntry.value = initRes[1] ?? null;

onMounted(() => {
	EventBus.on('force-update', forceUpdate);
});

onUnmounted(() => {
	EventBus.off('force-update', forceUpdate);
});

defineExpose({forceUpdate, applyDirtyAction});

</script>
