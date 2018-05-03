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

let app;

const templateMenu = {
	numberLabel(selectedItem) {
		const parent = store.get.parent(selectedItem);
		switch (parent.type) {
			case 'templatePage':
				return [
					{text: 'Set Color...', cb: setColor('page', 'numberLabel')}
				];
			case 'step':
				switch (store.get.parent(parent).type) {
					case 'templatePage':
						return [
							{text: 'Set Color...', cb: setColor('step', 'numberLabel')}
						];
					case 'callout':
						return [
							{text: 'Set Color...', cb: setColor('callout.step', 'numberLabel')}
						];
				}
		}
		return [];
	},
	csi: [
		{
			text: 'Change Default Rotation... (NYI)',
			cb() {}
		},
		{
			text: 'Change Default Scale... (NYI)',
			cb() {}
		}
	],
	quantityLabel(selectedItem) {
		const parent = store.get.parent(selectedItem);
		switch (parent.type) {
			case 'submodelImage':
				return [
					{text: 'Set Font... (NYI)', cb() {}},
					{text: 'Set Color...', cb: setColor('submodelImage', 'quantityLabel')}
				];
			case 'pliItem':
				return [
					{text: 'Set Font... (NYI)', cb() {}},
					{text: 'Set Color...', cb: setColor('pliItem', 'quantityLabel')}
				];
		}
		return [];
	}
};

function rgbaToString(c) {
	if (typeof c === 'string') {
		return c;
	}
	c = c.rgba;
	return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

function setColor(templateEntry, colorType = 'fill') {
	return function() {
		const fill = util.get(templateEntry, store.state.template)[colorType];
		const originalColor = util.clone(fill.color);

		app.currentDialog = 'colorDialog';
		app.clearSelected();

		Vue.nextTick(() => {
			const dialog = app.$refs.currentDialog;
			dialog.$off();
			dialog.$on('ok', newValues => {
				const entry = `${templateEntry}.${colorType}`;
				undoStack.commit(
					'templatePage.set',
					{entry, value: {color: rgbaToString(newValues.color)}},
					'Set Template Fill'
				);
				app.redrawUI(true);
			});
			dialog.$on('cancel', () => {
				fill.color = originalColor;
				app.redrawUI(true);
			});
			dialog.$on('update', newValues => {
				fill.color = rgbaToString(newValues.color);
				app.redrawUI(true);
			});
			dialog.color = originalColor || 'black';
			dialog.show({x: 400, y: 150});
		});
	};
}

module.exports = function TemplateMenu(entry, localApp) {
	app = localApp;
	let menu = templateMenu[entry.type];
	menu = (typeof menu === 'function') ? menu(entry) : menu;
	if (menu) {
		menu.forEach(m => (m.type = entry.type));  // Copy entry type to each meny entry; saves typing them all out everywhere above
		return menu;
	}
	return null;
};
