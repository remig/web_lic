/* global Vue: false */
'use strict';

const util = require('./util');
const store = require('./store');
const undoStack = require('./undoStack');

const colorTemplatePanel = {
	template: '#colorTemplatePanel',
	props: ['templateEntry'],
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
			this.$emit('new-values');
		}
	}
};

const borderTemplatePanel = {
	template: '#borderTemplatePanel',
	props: ['templateEntry'],
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
			this.$emit('new-values');
		}
	}
};

const calloutTemplatePanel = {
	template: '#calloutTemplatePanel',
	components: {
		colorTemplatePanel,
		borderTemplatePanel
	},
	methods: {
		newValues() {
			this.$emit('new-values', 'Callout');
		}
	}
};

Vue.component('templatePanel', {
	template: '#templatePanel',
	props: ['entry', 'app'],
	components: {
		calloutTemplatePanel
	},
	data() {
		return {lastEdit: ''};
	},
	watch: {
		entry() {
			if (this.lastEdit) {
				undoStack.commit('', null, 'Change Template ' + this.lastEdit);
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
			const templateName = this.entry ? `${this.entry.type}TemplatePanel` : null;
			if (templateName && templateName in this.$options.components) {
				Vue.nextTick(() => {
					if (typeof this.$refs.currentTemplatePanel.init === 'function') {
						this.$refs.currentTemplatePanel.init();
					}
				});
				return this.entry.type + 'TemplatePanel';
			}
			return null;
		}
	}
});

let app;

const templateMenu = {
	templatePage: [
		{text: 'Set Border...', cb: setBorder('page')},
		{text: 'Set Fill...', cb: setColor('page')},
		{
			text: 'Set Page Size...',
			cb() {
				const originalPageSize = {
					width: store.state.template.page.width,
					height: store.state.template.page.height
				};
				const aspectRatio = originalPageSize.width / originalPageSize.height;
				let prevValues = {
					maintainAspectRatio: true,
					...originalPageSize
				};
				app.currentDialog = 'pageSizeDialog';
				app.clearSelected();

				Vue.nextTick(() => {
					const dialog = app.$refs.currentDialog;
					dialog.$off();
					dialog.$on('ok', newValues => {
						undoStack.commit(
							'templatePage.setPageSize',
							{...newValues},
							'Set Page Size'
						);
						app.redrawUI(true);
					});
					dialog.$on('update', newValues => {
						if (newValues.maintainAspectRatio !== prevValues.maintainAspectRatio) {
							dialog.height = Math.floor(newValues.width / aspectRatio);
						} else if (newValues.maintainAspectRatio) {
							if (newValues.width !== prevValues.width) {
								dialog.height = Math.floor(newValues.width / aspectRatio);
							} else if (newValues.height !== prevValues.height) {
								dialog.width = Math.floor(newValues.height * aspectRatio);
							}
						}
						prevValues = util.clone(newValues);
					});
					dialog.width = originalPageSize.width;
					dialog.height = originalPageSize.height;
					dialog.maintainAspectRatio = true;
					dialog.show({x: 400, y: 150});
				});
				app.redrawUI(true);
			}
		}
	],
	step: [
	],
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
	submodelImage: [
		// TODO: need to be able to select the CSI inside submodel image
		{text: 'Set Border...', cb: setBorder('submodelImage')},
		{text: 'Set Fill...', cb: setColor('submodelImage')}
	],
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
	pli: [
		{text: 'Set Border...', cb: setBorder('pli')},
		{text: 'Set Fill...', cb: setColor('pli')}
	],
	pliItem: [],
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
	},
	callout: [
		{text: 'Set Border...', cb: setBorder('callout')},
		{text: 'Set Fill...', cb: setColor('callout')}
	],
	calloutArrow: [
		{text: 'Set Line Style...', cb: setBorder('callout.arrow')}
	],
	rotateIcon: [
		{text: 'Set Border...', cb: setBorder('rotateIcon')},
		{text: 'Set Fill...', cb: setColor('rotateIcon')},
		{text: 'Set Arrow Style...', cb: setBorder('rotateIcon.arrow')}
	],
	divider: [
		{text: 'Set Line Style...', cb: setBorder('page.divider')}
	]
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

function setBorder(templateEntry) {
	return function() {
		const border = util.get(templateEntry, store.state.template).border;
		const originalBorder = util.clone(border);
		const ignoreCornerRadius = !border.hasOwnProperty('cornerRadius');

		app.currentDialog = 'borderDialog';
		app.clearSelected();

		Vue.nextTick(() => {
			const dialog = app.$refs.currentDialog;
			dialog.$off();
			dialog.$on('ok', newValues => {
				const entry = templateEntry + '.border';
				newValues.color = rgbaToString(newValues.color);
				undoStack.commit(
					'templatePage.set',
					{entry, value: newValues},
					'Set Template Border'
				);
				app.redrawUI(true);
			});
			dialog.$on('cancel', () => {
				util.copy(border, originalBorder);
				app.redrawUI(true);
			});
			dialog.$on('update', newValues => {
				newValues.color = rgbaToString(newValues.color);
				util.copy(border, newValues);
				app.redrawUI(true);
			});
			util.copy(dialog, originalBorder);
			if (ignoreCornerRadius) {
				dialog.cornerRadius = null;
			}
			dialog.show({x: 400, y: 150});
		});
	};
}

module.exports = function TemplateMenu(entry, localApp) {
	app = localApp;
	let menu = templateMenu[entry.type];
	menu = (typeof menu === 'function') ? menu(entry) : menu;
	menu.forEach(m => (m.type = entry.type));  // Copy entry type to each meny entry; saves typing them all out everywhere above
	return menu;
};
