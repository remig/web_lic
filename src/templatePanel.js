/* global Vue: false */
'use strict';

const util = require('./util');
const store = require('./store');
const undoStack = require('./undoStack');

function colorTemplatePanel(templateEntry) {
	return {
		template: '#colorTemplatePanel',
		props: {
			title: {type: String, default: 'Fill'},
			templateEntry: {type: String, default: templateEntry}
		},
		data() {
			const template = util.get(this.templateEntry, store.state.template).fill;
			return {
				fill: template.color || 'transparent'
			};
		},
		methods: {
			updateValues() {
				const template = util.get(this.templateEntry, store.state.template).fill;
				template.color = rgbaToString(this.fill);
				this.$emit('new-values', util.prettyPrint(this.templateEntry));
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
			const template = util.get(this.templateEntry, store.state.template).border;
			return {
				width: template.width || 0,
				color: template.color || 'transparent',
				cornerRadius: template.cornerRadius
			};
		},
		methods: {
			updateValues() {
				const template = util.get(this.templateEntry, store.state.template).border;
				template.width = this.width;
				template.color = rgbaToString(this.color);
				template.cornerRadius = this.cornerRadius;
				this.$emit('new-values', util.prettyPrint(this.templateEntry));
			}
		}
	};
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
			color: 'transparent'
		};
	},
	methods: {
		init(entry) {
			const template = store.get.templateForItem(entry);
			const fontParts = util.fontToFontParts(template.font);
			this.templateItem = util.clone(entry);
			this.family = fontParts.fontFamily;
			this.size = parseInt(fontParts.fontSize, 10);
			this.bold = fontParts.fontWeight === 'bold';
			this.italic = fontParts.fontStyle === 'italic';
			this.underline = false;
			this.color = template.color;
		},
		toggleProp(prop) {
			this[prop] = !this[prop];
			this.updateValues();
		},
		updateValues() {
			const template = store.get.templateForItem(this.templateItem);
			const fontParts = {
				fontSize: this.size + 'pt',
				fontFamily: this.family,
				fontWeight: this.bold ? 'bold' : null,
				fontStyle: this.italic ? 'italic' : null
			};
			template.font = util.fontPartsToFont(fontParts);
			template.color = rgbaToString(this.color);
			store.state.templatePage.needsLayout = true;
			this.$emit('new-values', util.prettyPrint(this.templateEntry));
		}
	}
};

function fillAndBorderTemplatePanel(templateEntry) {
	return {
		template: '#fillAndBorderTemplatePanel',
		components: {
			colorTemplatePanel: colorTemplatePanel(templateEntry),
			borderTemplatePanel: borderTemplatePanel(templateEntry)
		},
		methods: {
			newValues() {
				this.$emit('new-values', util.prettyPrint(templateEntry));
			}
		}
	};
}

function rotateTemplatePanel(templateEntry) {
	return {
		template: '#rotateTemplatePanel',
		props: {
			templateEntry: {type: String, default: templateEntry}
		},
		data() {
			const rotation = util.get(this.templateEntry, store.state.template).rotation || {};
			return {
				x: rotation.x || 0,
				y: rotation.y || 0,
				z: rotation.z || 0
			};
		},
		methods: {
			updateValues() {
				let template = util.get(this.templateEntry, store.state.template).rotation;
				if (!template || template.x !== this.x || template.y !== this.y || template.z !== this.z) {
					template = template || {};
					template.x = this.x;
					template.y = this.y;
					template.z = this.z;
					store.state.templatePage.needsLayout = true;
					this.$emit('new-values', util.prettyPrint(this.templateEntry));
				}
			}
		}
	};
}

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
		colorTemplatePanel: colorTemplatePanel('page'),
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
		colorTemplatePanel: colorTemplatePanel('rotateIcon'),
		borderTemplatePanel: borderTemplatePanel('rotateIcon')
	},
	methods: {
		newValues() {
			this.$emit('new-values', 'Rotate Icon');
		}
	}
};

// TODO: need to be able to select the CSI inside submodel image
Vue.component('templatePanel', {
	template: '#templatePanel',
	props: ['entry', 'app'],
	components: {
		templatePage: pageTemplatePanel,
		csi: rotateTemplatePanel('csi'),
		pli: fillAndBorderTemplatePanel('pli'),
		callout: fillAndBorderTemplatePanel('callout'),
		calloutArrow: borderTemplatePanel('callout.arrow'),
		submodelImage: fillAndBorderTemplatePanel('submodelImage'),
		divider: borderTemplatePanel('page.divider'),
		rotateIcon: rotateIconTemplatePanel,
		numberLabel: fontTemplatePanel,
		quantityLabel: fontTemplatePanel
	},
	data() {
		return {lastEdit: ''};
	},
	watch: {
		entry() {
			if (this.lastEdit) {
				undoStack.commit('', null, `Change ${this.lastEdit} Template`);
				this.lastEdit = '';
				this.app.redrawUI(false);
			}
		}
	},
	methods: {
		newValues(type) {
			this.lastEdit = type;
			this.app.redrawUI(false);
		}
	},
	computed: {
		currentTemplatePanel: function() {
			const templateName = this.entry ? this.entry.type : null;
			if (templateName && templateName in this.$options.components) {
				Vue.nextTick(() => {
					if (typeof this.$refs.currentTemplatePanel.init === 'function') {
						this.$refs.currentTemplatePanel.init(this.entry);
					}
				});
				return this.entry.type;
			}
			return null;
		}
	}
});

const templateMenu = {
	csi: [
		{
			text: 'Change Default Rotation... (NYI)',
			cb() {}
		},
		{
			text: 'Change Default Scale... (NYI)',
			cb() {}
		}
	]
};

function rgbaToString(c) {
	if (typeof c === 'string') {
		return c;
	}
	c = c.rgba;
	return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

module.exports = function TemplateMenu(entry) {
	let menu = templateMenu[entry.type];
	menu = (typeof menu === 'function') ? menu(entry) : menu;
	if (menu) {
		menu.forEach(m => (m.type = entry.type));  // Copy entry type to each meny entry; saves typing them all out everywhere above
		return menu;
	}
	return null;
};
