/* global Vue: false */
'use strict';

import _ from './util';
import store from './store';
import undoStack from './undoStack';
import borderPanel from './components/controlPanels/border.vue';
import fontPanel from './components/controlPanels/font.vue';
import fillAndBorderTemplatePanel from './components/controlPanels/fill_border.vue';
import pageTemplatePanel from './components/controlPanels/page_template.vue';
import csiTemplatePanel from './components/controlPanels/csi_template.vue';
import pliTemplatePanel from './components/controlPanels/pli_template.vue';
import pliItemTemplatePanel from './components/controlPanels/pli_item_template.vue';
import pageNumberTemplatePanel from './components/controlPanels/page_number.vue';
import rotateIconTemplatePanel from './components/controlPanels/rotate_icon_template.vue';

const templatePageComponentLookup = {
	templatePage: pageTemplatePanel,
	csi: {
		step: [csiTemplatePanel, 'step.csi'],
		submodelImage: [csiTemplatePanel, 'submodelImage.csi']
	},
	pliItem: pliItemTemplatePanel,
	pli: pliTemplatePanel,
	callout: [fillAndBorderTemplatePanel, 'callout'],
	calloutArrow: [borderPanel, 'callout.arrow'],
	submodelImage: [fillAndBorderTemplatePanel, 'submodelImage'],
	divider: [borderPanel, 'divider'],
	rotateIcon: rotateIconTemplatePanel,
	numberLabel: {
		templatePage: pageNumberTemplatePanel,
		step: {
			callout: [fontPanel, 'callout.step.numberLabel'],
			default: [fontPanel, 'step.numberLabel']
		}
	},
	quantityLabel: {
		submodelImage: [fontPanel, 'submodelImage.quantityLabel'],
		pliItem: [fontPanel, 'pliItem.quantityLabel']
	}
};

const pageComponentLookup = {
};

Vue.component('templatePanel', {
	template: '#templatePanel',
	props: ['selectedItem', 'app'],
	data() {
		return {lastEdit: null, templateEntry: null};
	},
	watch: {
		selectedItem() {
			this.applyChanges();
		}
	},
	methods: {
		newValues(opts) {
			this.lastEdit = (typeof opts === 'string') ? {type: opts} : opts;
			if (!opts.noLayout) {
				store.state.templatePage.needsLayout = true;
			}
			this.app.redrawUI(false);
		},
		applyChanges() {
			// TODO: Make sure something actually changed before pushing to the undo stack.  eg: add then immediately remove an image...
			if (this.lastEdit) {
				if (typeof this.$refs.currentTemplatePanel.apply === 'function') {
					this.$refs.currentTemplatePanel.apply();
				} else {
					if (!this.lastEdit.noLayout) {
						store.state.pages.forEach(page => (page.needsLayout = true));
					}
					undoStack.commit('', null, `Change ${_.prettyPrint(this.lastEdit.type)} Template`);
				}
				this.lastEdit = null;
			}
		},
		applyDirtyAction(entryType) {
			store.mutations[entryType].markAllDirty();
			store.state.pages.forEach(page => (page.needsLayout = true));
			store.state.templatePage.needsLayout = true;
			const text = `Change ${_.prettyPrint(entryType)} Template`;
			undoStack.commit('', null, text, [entryType]);
		}
	},
	computed: {
		currentTemplatePanel: function() {
			if (!this.selectedItem) {
				return null;
			}
			let componentLookup, res;
			const page = store.get.pageForItem(this.selectedItem);
			if (store.get.isTemplatePage(page)) {
				componentLookup = templatePageComponentLookup;
			} else {
				componentLookup = pageComponentLookup;
			}
			const type = this.selectedItem.type;
			if (type in componentLookup) {
				const parent = store.get.parent(this.selectedItem);
				const grandparent = store.get.parent(parent);
				if (parent && parent.type in componentLookup[type]) {
					if (grandparent && grandparent.type in componentLookup[type][parent.type]) {
						res = componentLookup[type][parent.type][grandparent.type];
					} else if (componentLookup[type][parent.type].default) {
						res = componentLookup[type][parent.type].default;
					} else {
						res = componentLookup[type][parent.type];
					}
				} else {
					res = componentLookup[type];
				}
				if (Array.isArray(res)) {
					this.templateEntry = res[1];  // eslint-disable-line vue/no-side-effects-in-computed-properties
					return res[0];
				}
				return res;
			}
			return null;
		}
	},
	beforeDestroy() {
		// Catch any changes if user switches from template panel directly to nav tree or new page via keyboard
		this.applyChanges();
	}
});
