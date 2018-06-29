/* global Vue: false */
'use strict';

import _ from './util';
import store from './store';
import undoStack from './undoStack';
import fillTemplatePanel from './components/controlPanels/fill.vue';
import borderTemplatePanel from './components/controlPanels/border.vue';
import fontTemplatePanel from './components/controlPanels/font.vue';
import transformTemplatePanel from './components/controlPanels/transform.vue';

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
			fillTemplatePanel,
			borderTemplatePanel
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
			transformTemplatePanel,
			fillTemplatePanel
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
			transformTemplatePanel,
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
		fillTemplatePanel,
		borderTemplatePanel
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

// TODO: add default page layout UI
// TODO: should add UI to choose whether to redo layout or just extend canvas
// TODO: need to re-layout title page too, on some operations like page resize
// TODO: for page size, add preset sizes like 'A4', 'legal', etc.  See here for list of formats & sizes: https://github.com/MrRio/jsPDF/blob/master/jspdf.js
// TODO: explore component 'extends' to make panel / subpanel nesting easier (https://vuejs.org/v2/api/#extends)
const pageTemplatePanel = {
	template: '#pageTemplatePanel',
	data() {
		const template = store.state.template.page;
		return {
			width: template.width,
			height: template.height,
			aspectRatio: template.width / template.height,
			maintainAspectRatio: true
		};
	},
	components: {
		fillTemplatePanel,
		borderTemplatePanel
	},
	methods: {
		changeAspectRatio() {
			this.height = Math.floor(this.width / this.aspectRatio);
			this.updateValues();
		},
		newValues() {
			this.$emit('new-values', 'Page');
		},
		updateValues() {
			const template = store.state.template.page;
			if (this.width !== template.width || this.height !== template.height) {
				if (this.maintainAspectRatio) {
					if (this.width !== template.width) {
						this.height = Math.floor(this.width / this.aspectRatio);
					} else if (this.height !== template.height) {
						this.width = Math.floor(this.height * this.aspectRatio);
					}
				}
				template.width = this.width;
				template.height = this.height;
				this.$emit('new-values', 'Page');
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
		fontTemplatePanel
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
		fillTemplatePanel,
		borderTemplatePanel
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
	calloutArrow: createBasicPanel(borderTemplatePanel, 'callout.arrow', 'Callout Arrow'),
	submodelImage: fillAndBorderTemplatePanel('submodelImage'),
	divider: createBasicPanel(borderTemplatePanel, 'divider', 'Divider'),
	rotateIcon: rotateIconTemplatePanel,
	numberLabel: {
		templatePage: pageNumberTemplatePanel,
		step: {
			callout: createBasicPanel(fontTemplatePanel, 'callout.step.numberLabel', 'Step Label'),
			default: createBasicPanel(fontTemplatePanel, 'step.numberLabel', 'Step Label')
		}
	},
	quantityLabel: {
		submodelImage: createBasicPanel(fontTemplatePanel, 'submodelImage.quantityLabel', 'Submodel Label'),
		pliItem: createBasicPanel(fontTemplatePanel, 'pliItem.quantityLabel', 'PLI Label')
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
