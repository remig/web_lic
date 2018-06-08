/* global Vue: false */
'use strict';

const _ = require('./util');
const store = require('./store');
const undoStack = require('./undoStack');
const openFileHandler = require('./fileUploader');

function fillTemplatePanel(templateEntry) {
	return {
		template: '#fillTemplatePanel',
		props: {
			title: {type: String, default: 'Fill'},
			templateEntry: {type: String, default: templateEntry}
		},
		data() {
			const template = _.get(this.templateEntry, store.state.template).fill;
			return {
				color: colorNameToRGB(template.color),
				gradient: template.gradient,
				imageFilename: template.image == null ? null : template.image.filename || ''
			};
		},
		methods: {
			pickImage() {
				openFileHandler('.png', 'dataURL', (src, filename) => {

					const template = _.get(this.templateEntry, store.state.template).fill;
					template.image = {filename, src};
					this.imageFilename = filename;

					const image = new Image();
					image.onload = () => {
						store.cache.set('page', 'backgroundImage', image);
						this.updateValues();
					};
					image.src = src;
				});
			},
			removeImage() {
				const template = _.get(this.templateEntry, store.state.template).fill;
				this.imageFilename = template.image = '';
				this.updateValues();
			},
			updateColor(newColor) {
				this.color = (newColor === 'transparent') ? null : newColor;
				this.updateValues();
			},
			updateValues() {
				const template = _.get(this.templateEntry, store.state.template).fill;
				template.color = this.color;
				this.$emit('new-values', _.prettyPrint(this.templateEntry));
			}
		},
		computed: {
			truncatedImageName() {
				const fn = this.imageFilename;
				return (fn.length > 12) ? fn.substr(0, 8) + '...png' : fn;
			}
		}
	};
}

function borderTemplatePanel(templateEntry) {
	return {
		template: '#borderTemplatePanel',
		props: {
			title: {type: String, default: 'Border'},
			templateEntry: {type: String, default: templateEntry}
		},
		data() {
			const template = _.get(this.templateEntry, store.state.template).border;
			return {
				width: template.width || 0,
				color: colorNameToRGB(template.color),
				cornerRadius: template.cornerRadius
			};
		},
		methods: {
			updateColor(newColor) {
				this.color = (newColor === 'transparent') ? null : newColor;
				this.updateValues();
			},
			updateValues() {
				const template = _.get(this.templateEntry, store.state.template).border;
				template.width = this.width;
				template.color = this.color;
				template.cornerRadius = this.cornerRadius;
				this.$emit('new-values', _.prettyPrint(this.templateEntry));
			}
		}
	};
}

// TODO: consider moving all font UI / state management to dedicated font.js or something.
const familyNames = ['Helvetica', 'Times New Roman'];
const customFamilyNames = JSON.parse(window.localStorage.getItem('lic_custom_fonts')) || [];

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
			this.color = colorNameToRGB(template.color);
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
			store.state.templatePage.needsLayout = true;
			this.$emit('new-values', _.prettyPrint(this.templateItem.type));
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
					window.localStorage.setItem('lic_custom_fonts', JSON.stringify(customFamilyNames));
				}
			}
			this.familyNames = getFamilyNames();
		}
	}
};

function fillAndBorderTemplatePanel(templateEntry) {
	return {
		template: '#fillAndBorderTemplatePanel',
		components: {
			fillTemplatePanel: fillTemplatePanel(templateEntry),
			borderTemplatePanel: borderTemplatePanel(templateEntry)
		},
		methods: {
			newValues() {
				this.$emit('new-values', _.prettyPrint(templateEntry));
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
				x: 0, y: 0, z: 0
			};
		},
		methods: {
			init(item) {
				const rotation = store.get.templateForItem(item).rotation;
				this.x = rotation.x;
				this.y = rotation.y;
				this.z = rotation.z;
				this.templateItem = _.clone(item);
			},
			apply() {
				// TODO: this works, but can be really slow for big instruction books:
				// redoing every page layout means measuring (and re-rendering) every rendered image again...
				// Consider simply setting page.needsLayout on each page; fully test that with undo / redo
				const text = `Change ${_.prettyPrint(this.templateItem.type)} Template`;
				store.state[this.templateItem.type + 's'].forEach(item => (item.isDirty = true));
				undoStack.commit('page.layoutAllPages', null, text, [this.templateItem.type]);
			},
			updateValues() {
				const template = store.get.templateForItem(this.templateItem).rotation;
				if (template.x !== this.x || template.y !== this.y || template.z !== this.z) {
					template.x = this.x;
					template.y = this.y;
					template.z = this.z;
					if (this.templateItem.type === 'csi') {
						store.get.csi(this.templateItem).isDirty = true;
					} else if (this.templateItem.type === 'pliItem') {
						const pli = store.get.parent(this.templateItem);
						pli.pliItems.forEach(id => (store.get.pliItem(id).isDirty = true));
					}
					store.state.templatePage.needsLayout = true;
					this.$emit('new-values', _.prettyPrint(this.templateItem.type));
				}
			}
		}
	};
}

const csiTemplatePanel = {
	template: '#csiTemplatePanel',
	components: {
		rotateTemplatePanel: rotateTemplatePanel(),
		fillTemplatePanel: fillTemplatePanel('step.csi.displacementArrow'),
		borderTemplatePanel: borderTemplatePanel('step.csi.displacementArrow')
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
			this.$emit('new-values', 'CSI');
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
		fillTemplatePanel: fillTemplatePanel('pli'),
		borderTemplatePanel: borderTemplatePanel('pli')
	},
	methods: {
		apply() {
			// TODO: this works, but can be really slow for big instruction books:
			// redoing every page layout means measuring (and re-rendering) every rendered image again...
			// Consider simply setting page.needsLayout on each page; fully test that with undo / redo
			undoStack.commit('page.layoutAllPages', null, 'Change PLI Template');
		},
		newValues() {
			this.$emit('new-values', 'PLI');
		},
		updateValues() {
			const template = store.state.template.pli;
			if (this.includeSubmodels !== template.includeSubmodels) {
				template.includeSubmodels = this.includeSubmodels;
				store.state.templatePage.needsLayout = true;
				this.$emit('new-values', 'Page');
			}
		}
	}
};

// TODO: add default page layout UI
// TODO: when resizing the default page, need to redo layout of all other pages
// TODO: should also add UI to choose whether to redo layout or just extend canvas
// TODO: when page resizes, page highlight resizes correctly but does not reposition
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
		fillTemplatePanel: fillTemplatePanel('page'),
		borderTemplatePanel: borderTemplatePanel('page')
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
				store.state.templatePage.needsLayout = true;
				this.$emit('new-values', 'Page');
			}
		}
	}
};

const rotateIconTemplatePanel = {
	template: '#rotateIconTemplatePanel',
	components: {
		fillTemplatePanel: fillTemplatePanel('rotateIcon'),
		borderTemplatePanel: borderTemplatePanel('rotateIcon')
	},
	methods: {
		newValues() {
			this.$emit('new-values', 'Rotate Icon');
		}
	}
};

Vue.component('templatePanel', {
	template: '#templatePanel',
	props: ['selectedItem', 'app'],
	components: {
		templatePage: pageTemplatePanel,
		csi: csiTemplatePanel,
		pliItem: rotateTemplatePanel(),
		pli: pliTemplatePanel,
		callout: fillAndBorderTemplatePanel('callout'),
		calloutArrow: borderTemplatePanel('callout.arrow'),
		submodelImage: fillAndBorderTemplatePanel('submodelImage'),
		divider: borderTemplatePanel('divider'),
		rotateIcon: rotateIconTemplatePanel,
		numberLabel: fontTemplatePanel,
		quantityLabel: fontTemplatePanel
	},
	data() {
		return {lastEdit: ''};
	},
	watch: {
		selectedItem() {
			this.applyChanges();
		}
	},
	methods: {
		newValues(type) {
			this.lastEdit = type;
			this.app.redrawUI(false);
		},
		applyChanges() {
			if (this.lastEdit) {
				if (typeof this.$refs.currentTemplatePanel.apply === 'function') {
					this.$refs.currentTemplatePanel.apply();
				} else {
					undoStack.commit('', null, `Change ${this.lastEdit} Template`);
				}
				this.app.redrawUI(false);
				this.lastEdit = '';
			}
		}
	},
	computed: {
		currentTemplatePanel: function() {
			const templateName = this.selectedItem ? this.selectedItem.type : null;
			if (templateName && templateName in this.$options.components) {
				Vue.nextTick(() => {
					if (typeof this.$refs.currentTemplatePanel.init === 'function') {
						this.$refs.currentTemplatePanel.init(this.selectedItem, this.app);
					}
				});
				return this.selectedItem.type;
			}
			return null;
		}
	},
	beforeDestroy() {
		this.applyChanges();  // Catch any changes if user switches from template panel directly to nav tree or new page via keyboard
	}
});

const colorNames = {
	white: '#ffffff',
	black: '#000000',
	red: '#ff0000'
};

function colorNameToRGB(c) {
	if (colorNames.hasOwnProperty(c)) {
		return colorNames[c];
	}
	return c;
}
