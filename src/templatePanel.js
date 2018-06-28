/* global Vue: false */
'use strict';

import _ from './util';
import store from './store';
import undoStack from './undoStack';
import fillTemplatePanel from './components/controlPanels/fill.vue';
import borderTemplatePanel from './components/controlPanels/border.vue';
import fontTemplatePanel from './components/controlPanels/font.vue';

function fillAndBorderTemplatePanel(templateEntry) {
	return {
		template: '#fillAndBorderTemplatePanel',
		provide: {
			templateEntry
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

function rotateTemplatePanel() {
	return {
		template: '#rotateTemplatePanel',
		data() {
			return {
				templateItem: null,
				x: 0, y: 0, z: 0,
				scale: 1
			};
		},
		methods: {
			init(item) {
				const transform = store.get.templateForItem(item);
				this.x = transform.rotation.x;
				this.y = transform.rotation.y;
				this.z = transform.rotation.z;
				this.scale = transform.scale;
				this.templateItem = _.clone(item);
			},
			apply() {
				store.mutations[this.templateItem.type].markAllDirty();
				store.state.pages.forEach(page => (page.needsLayout = true));
				store.state.templatePage.needsLayout = true;
				const text = `Change ${_.prettyPrint(this.templateItem.type)} Template`;
				undoStack.commit('', null, text, [this.templateItem.type]);
			},
			updateValues() {
				const transform = store.get.templateForItem(this.templateItem);
				const rotation = transform.rotation;
				if (rotation.x !== this.x || rotation.y !== this.y || rotation.z !== this.z
						|| transform.scale !== this.scale) {
					rotation.x = this.x;
					rotation.y = this.y;
					rotation.z = this.z;
					transform.scale = this.scale;
					if (this.templateItem.type === 'csi') {
						store.get.csi(this.templateItem).isDirty = true;
					} else if (this.templateItem.type === 'pliItem') {
						const pli = store.get.parent(this.templateItem);
						pli.pliItems.forEach(id => (store.get.pliItem(id).isDirty = true));
					}
					this.$emit('new-values', this.templateItem.type);
				}
			}
		}
	};
}

const csiTemplatePanel = {
	template: '#csiTemplatePanel',
	provide: {
		templateEntry: 'step.csi.displacementArrow'
	},
	components: {
		rotateTemplatePanel: rotateTemplatePanel(),
		fillTemplatePanel,
		borderTemplatePanel
	},
	methods: {
		init(item) {
			this.templateItem = _.clone(item);
			this.$refs.rotateTemplatePanel.init(item);
		},
		apply() {
			this.$refs.rotateTemplatePanel.apply();
		},
		newArrowStyle() {
			store.get.csi(this.templateItem).isDirty = true;
			this.$emit('new-values', 'CSI');
		},
		newValues() {
			this.$emit('new-values', {type: 'CSI', noLayout: true});
		}
	}
};

const pliTemplatePanel = {
	template: '#pliTemplatePanel',
	provide: {
		templateEntry: 'pli'
	},
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
	provide: {
		templateEntry: 'page'
	},
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
	provide: {
		templateEntry: 'page.numberLabel'
	},
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
	provide: {
		templateEntry: 'rotateIcon'
	},
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
		provide: {templateEntry},
		render(createElement) {
			return createElement(templateType, {on: {'new-values': this.newValues}});
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
	csi: csiTemplatePanel,
	pliItem: rotateTemplatePanel(),
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
