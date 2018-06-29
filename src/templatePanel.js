/* global Vue: false */
'use strict';

import _ from './util';
import store from './store';
import undoStack from './undoStack';
import fillPanel from './components/controlPanels/fill.vue';
import borderPanel from './components/controlPanels/border.vue';
import fontPanel from './components/controlPanels/font.vue';
import transformPanel from './components/controlPanels/transform.vue';
import pageTemplatePanel from './components/controlPanels/page_template.vue';

function applyDirtyAction(entryType) {
	store.mutations[entryType].markAllDirty();
	store.state.pages.forEach(page => (page.needsLayout = true));
	store.state.templatePage.needsLayout = true;
	const text = `Change ${_.prettyPrint(entryType)} Template`;
	undoStack.commit('', null, text, [entryType]);
}

function fillAndBorderTemplatePanel(templateEntry) {
	return {
		template: '#fillAndBorderTemplatePanel',
		data() {
			return {templateEntry};
		},
		components: {
			fillPanel,
			borderPanel
		},
		methods: {
			newValues() {
				this.$emit('new-values', templateEntry);
			}
		}
	};
}

function csiTemplatePanel(transformType) {
	return {
		template: '#csiTemplatePanel',
		props: ['selectedItem'],
		data() {
			return {transformType};
		},
		components: {
			transformPanel,
			fillPanel
		},
		methods: {
			apply() {
				applyDirtyAction('csi');
			},
			newArrowStyle() {
				store.get.csi(this.selectedItem).isDirty = true;
				this.$emit('new-values', 'CSI');
			},
			newValues() {
				store.get.csi(this.selectedItem).isDirty = true;
				this.$emit('new-values', {type: 'CSI', noLayout: true});
			}
		}
	};
}

const pliItemTemplatePanel = {
	props: ['selectedItem'],
	render(createElement) {
		return createElement(
			transformPanel,
			{
				props: {templateEntry: 'pliItem'},
				on: {'new-values': this.newValues}
			}
		);
	},
	methods: {
		apply() {
			applyDirtyAction('pliItem');
		},
		newValues() {
			const pli = store.get.parent(this.selectedItem);
			pli.pliItems.forEach(id => (store.get.pliItem(id).isDirty = true));
			this.$emit('new-values', 'PLIItem');
		}
	}
};

const pliTemplatePanel = {
	template: '#pliTemplatePanel',
	data() {
		return {
			includeSubmodels: store.state.template.pli.includeSubmodels
		};
	},
	components: {
		fillPanel,
		borderPanel
	},
	methods: {
		newValues() {
			this.$emit('new-values', 'PLI');
		},
		updateValues() {
			const template = store.state.template.pli;
			if (this.includeSubmodels !== template.includeSubmodels) {
				template.includeSubmodels = this.includeSubmodels;
				this.$emit('new-values', {type: 'PLI', noLayout: true});
			}
		}
	}
};

const pageNumberTemplatePanel = {
	template: '#pageNumberTemplatePanel',
	data() {
		return {
			position: store.state.template.page.numberLabel.position,
			positions: ['right', 'left', 'even-left', 'even-right']
		};
	},
	components: {
		fontPanel
	},
	methods: {
		updatePosition(newPosition) {
			store.state.template.page.numberLabel.position = this.position = newPosition;
			this.newValues();
		},
		newValues() {
			this.$emit('new-values', 'Page Number');
		}
	}
};

const rotateIconTemplatePanel = {
	template: '#rotateIconTemplatePanel',
	components: {
		fillPanel,
		borderPanel
	},
	methods: {
		newValues() {
			this.$emit('new-values', 'Rotate Icon');
		}
	}
};

function createBasicPanel(templateType, templateEntry, undoText) {
	return {
		render(createElement) {
			return createElement(
				templateType,
				{
					props: {templateEntry},
					on: {'new-values': this.newValues}
				}
			);
		},
		methods: {
			newValues() {
				this.$emit('new-values', undoText);
			}
		}
	};
}

const componentLookup = {
	templatePage: pageTemplatePanel,
	csi: {
		step: csiTemplatePanel('step.csi'),
		submodelImage: csiTemplatePanel('submodelImage.csi')
	},
	pliItem: pliItemTemplatePanel,
	pli: pliTemplatePanel,
	callout: fillAndBorderTemplatePanel('callout'),
	calloutArrow: createBasicPanel(borderPanel, 'callout.arrow', 'Callout Arrow'),
	submodelImage: fillAndBorderTemplatePanel('submodelImage'),
	divider: createBasicPanel(borderPanel, 'divider', 'Divider'),
	rotateIcon: rotateIconTemplatePanel,
	numberLabel: {
		templatePage: pageNumberTemplatePanel,
		step: {
			callout: createBasicPanel(fontPanel, 'callout.step.numberLabel', 'Step Label'),
			default: createBasicPanel(fontPanel, 'step.numberLabel', 'Step Label')
		}
	},
	quantityLabel: {
		submodelImage: createBasicPanel(fontPanel, 'submodelImage.quantityLabel', 'Submodel Label'),
		pliItem: createBasicPanel(fontPanel, 'pliItem.quantityLabel', 'PLI Label')
	}
};

Vue.component('templatePanel', {
	template: '#templatePanel',
	props: ['selectedItem', 'app'],
	data() {
		return {lastEdit: null};
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
		}
	},
	computed: {
		currentTemplatePanel: function() {
			if (!this.selectedItem) {
				return null;
			}
			const type = this.selectedItem.type;
			if (type in componentLookup) {
				Vue.nextTick(() => {
					if (typeof this.$refs.currentTemplatePanel.init === 'function') {
						this.$refs.currentTemplatePanel.init(this.selectedItem);
					}
				});
				const parent = store.get.parent(this.selectedItem);
				const grandparent = store.get.parent(parent);
				if (parent && parent.type in componentLookup[type]) {
					if (grandparent && grandparent.type in componentLookup[type][parent.type]) {
						return componentLookup[type][parent.type][grandparent.type];
					} else if (componentLookup[type][parent.type].default) {
						return componentLookup[type][parent.type].default;
					}
					return componentLookup[type][parent.type];
				}
				return componentLookup[type];
			}
			return null;
		}
	},
	beforeDestroy() {
		// Catch any changes if user switches from template panel directly to nav tree or new page via keyboard
		this.applyChanges();
	}
});
