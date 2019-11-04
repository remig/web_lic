/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div class="container" @click.stop="">
		<h4>{{title()}}</h4>
		<div class="panel-group">
			<component
				ref="currentTemplateRef"
				:is="currentTemplatePanel"
				:selected-item="selectedItem"
				:template-entry="templateEntry"
				@new-values="newValues"
			/>
		</div>
	</div>
</template>

<script>

/* global Vue: false */
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

// Top level keys match the basic type of the selected item
// First level child keys match the basic type of the selected item's parent
// Second level child keys match the basic type of the selected item's parent's parent (grandparent)
const componentLookup = {
	page: [pageTemplatePanel, ''],
	csi: {
		step: [csiTemplatePanel, 'step.csi'],
		submodelImage: [csiTemplatePanel, 'submodelImage.csi']
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
			'default': [fontPanel, 'step.numberLabel']
		}
	},
	quantityLabel: {
		submodelImage: [fontPanel, 'submodelImage.quantityLabel'],
		pliItem: [fontPanel, 'pliItem.quantityLabel']
	}
};

function getCurrentTemplate(selectedItem) {
	if (!selectedItem) {
		return null;
	}
	const type = selectedItem.type;
	if (type in componentLookup) {
		const lookup = componentLookup[type];
		const parent = store.get.parent(selectedItem);
		const grandparent = store.get.parent(parent);
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

export default {
	props: ['selectedItem', 'app'],
	data() {
		const res = getCurrentTemplate(this.selectedItem) || [];
		return {
			currentTemplatePanel: res[0],
			templateEntry: res[1],
			lastEdit: null
		};
	},
	watch: {
		selectedItem() {
			this.applyChanges();
			this.setCurrentTemplate(this.selectedItem);
		}
	},
	methods: {
		newValues(opts) {
			this.lastEdit = (typeof opts === 'string') ? {type: opts} : opts;
			if (!opts.noLayout) {
				store.get.templatePage().needsLayout = true;
			}
			this.app.drawCurrentPage();
		},
		applyChanges() {
			// TODO: Make sure something actually changed before pushing to the undo stack
			// eg: add then immediately remove an image...
			if (this.lastEdit) {
				if (typeof this.$refs.currentTemplateRef.apply === 'function') {
					this.$refs.currentTemplateRef.apply();
				} else {
					if (!this.lastEdit.noLayout) {
						store.mutations.page.markAllDirty();
					}
					let item = _.last(this.lastEdit.type.split('.'));
					item = this.tr('glossary.' + item.toLowerCase());
					const undoText = this.tr('action.edit.template.change.undo_@mf', {item});
					undoStack.commit('', null, undoText);
				}
				this.lastEdit = null;
			}
		},
		applyDirtyAction(entryType) {
			const item = this.tr('glossary.' + entryType.toLowerCase());
			const undoText = this.tr('action.edit.template.change.undo_@mf', {item});
			undoStack.commit('', null, undoText, [entryType, 'page']);
		},
		title() {
			return this.selectedItem
				? this.tr('glossary.' + this.selectedItem.type.toLowerCase())
				: this.tr('template.select_page_item');
		},
		forceUpdate() {
			this.setCurrentTemplate();
			this.$forceUpdate();
			if (this.$refs.currentTemplateRef) {
				this.$refs.currentTemplateRef.$forceUpdate();
				this.$refs.currentTemplateRef.$children.forEach(el => el.$forceUpdate());
			}
		},
		setCurrentTemplate() {
			this.currentTemplatePanel = this.templateEntry = null;
			const res = getCurrentTemplate(this.selectedItem);
			if (res) {
				Vue.nextTick(() => {
					this.currentTemplatePanel = res[0];
					this.templateEntry = res[1];
				});
			}
		}
	},
	beforeDestroy() {
		// Catch changes if user switches from template panel directly to nav tree or new page via keyboard
		this.applyChanges();
	}
};

</script>
