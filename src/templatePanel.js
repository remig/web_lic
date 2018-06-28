/* global Vue: false */
'use strict';

import _ from './util';
import store from './store';
import undoStack from './undoStack';
import Storage from './storage';
import fillTemplatePanel from './components/controlPanels/fill.vue';
import borderTemplatePanel from './components/controlPanels/border.vue';

// TODO: consider moving all font UI / state management to dedicated font.js or something.
const familyNames = ['Helvetica', 'Times New Roman'];
const customFamilyNames = Storage.get.customFonts();

function getFamilyNames() {
	if (customFamilyNames.length) {
		return [
			{label: 'builtInFonts', options: familyNames},
			{label: 'customFonts', options: customFamilyNames},
			{label: 'custom', options: ['Custom...']}
		];
	}
	return [
		{label: 'builtInFonts', options: familyNames},
		{label: 'customFonts', options: ['Custom...']}
	];
}

// TODO: support underlining fonts in general
// TODO: font styling buttons (bold, italic, underline) need to toggle
const fontTemplatePanel = {
	template: '#fontTemplatePanel',
	data() {
		return {
			templateItem: null,
			family: '',
			size: 0,
			bold: false,
			italic: false,
			underline: false,
			color: 'transparent',
			familyNames: getFamilyNames()
		};
	},
	methods: {
		init(item, app) {
			const template = store.get.templateForItem(item);
			const fontParts = _.fontToFontParts(template.font);
			this.templateItem = _.clone(item);
			this.family = fontParts.fontFamily;
			this.addCustomFont(fontParts.fontFamily);
			this.size = parseInt(fontParts.fontSize, 10);
			this.bold = fontParts.fontWeight === 'bold';
			this.italic = fontParts.fontStyle === 'italic';
			this.underline = false;
			this.color = template.color;
			this.app = app;
		},
		toggleProp(prop) {
			this[prop] = !this[prop];
			this.updateValues();
		},
		updateFontName() {
			if (this.family === 'Custom...') {
				this.app.currentDialog = 'fontNameDialog';
				Vue.nextTick(() => {
					const dialog = this.app.$refs.currentDialog;
					dialog.$off();  // TODO: initialize these event listeners just once... somewhere, somehow.  This code smells.
					dialog.$on('ok', newValues => {
						this.family = newValues.fontName;
						this.addCustomFont(newValues.fontName);
						this.updateValues();
					});
					dialog.font = this.fontString();
					dialog.fontName = '';
					dialog.show({x: 400, y: 150});
				});
			} else {
				this.updateValues();
			}
		},
		updateColor(newColor) {
			this.color = (newColor === 'transparent') ? null : newColor;
			this.updateValues();
		},
		updateValues() {
			const template = store.get.templateForItem(this.templateItem);
			template.font = this.fontString();
			template.color = this.color;
			this.$emit('new-values', this.templateItem.type);
		},
		fontString() {
			return _.fontPartsToFont({
				fontSize: this.size + 'pt',
				fontFamily: this.family,
				fontWeight: this.bold ? 'bold' : null,
				fontStyle: this.italic ? 'italic' : null
			});
		},
		addCustomFont(family) {
			if (!_.isEmpty(family)) {
				const familyLower = family.toLowerCase();
				const names = [
					...familyNames.map(f => f.toLowerCase()),
					...customFamilyNames.map(f => f.toLowerCase())
				];
				if (!names.includes(familyLower)) {
					customFamilyNames.push(family);
					Storage.replace.customFonts(customFamilyNames);
				}
			}
			this.familyNames = getFamilyNames();
		}
	}
};

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
	data() {
		return {
			position: store.state.template.page.numberLabel.position,
			positions: ['right', 'left', 'even-left', 'even-right']
		};
	},
	components: {
		fontTemplatePanel: fontTemplatePanel
	},
	methods: {
		init(item, app) {
			this.templateItem = _.clone(item);
			this.$refs.fontTemplatePanel.init(item, app);
		},
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

function createBorderTemplatePanel(templateEntry, undoText) {
	return {
		provide: {templateEntry},
		render(createElement) {
			return createElement(borderTemplatePanel, {on: {'new-values': this.newValues}});
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
	calloutArrow: createBorderTemplatePanel('callout.arrow', 'Callout Arrow'),
	submodelImage: fillAndBorderTemplatePanel('submodelImage'),
	divider: createBorderTemplatePanel('divider', 'Divider'),
	rotateIcon: rotateIconTemplatePanel,
	numberLabel: {
		templatePage: pageNumberTemplatePanel,
		default: fontTemplatePanel
	},
	quantityLabel: fontTemplatePanel
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
						this.$refs.currentTemplatePanel.init(this.selectedItem, this.app);
					}
				});
				const parent = store.get.parent(this.selectedItem);
				if (parent && parent.type in componentLookup[type]) {
					return componentLookup[type][parent.type];
				} else if ('default' in componentLookup[type]) {
					return componentLookup[type].default;
				}
				return componentLookup[type];
			}
			return null;
		}
	},
	beforeDestroy() {
		this.applyChanges();  // Catch any changes if user switches from template panel directly to nav tree or new page via keyboard
	}
});
