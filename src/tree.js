/* global module: false, $: false, Vue: false, app: false, util: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
(function() {
'use strict';

Vue.component('treeRow', {
	props: ['currentItem', 'target'],
	template: '#treeRowTemplate',
	methods: {
		itemClick() {
			app.setSelected(this.target);
		}
	},
	watch: {
		currentItem: function(newItem) {
			if (newItem === this.target) {
				let el = this.$el.parentElement;
				while (el) {
					if (el.nodeName === 'UL') {
						$(el).removeClass('hidden').prev().children().first().removeClass('treeIconClosed');
					}
					el = el.parentElement;
				}
			}
		}
	},
	computed: {
		selected() {
			return this.currentItem && this.target &&
				this.target.id === this.currentItem.id &&
				this.target.type === this.currentItem.type;
		},
		text() {
			const t = this.target;
			if (!t) {
				return '';
			} else if (t.type === 'page') {
				return t.number == null ? 'Title Page' : 'Page ' + t.number;
			} else if (t.type === 'step') {
				return 'Step ' + (t.number || '');
			} else if (t.type === 'label') {
				return t.text;
			} else if (t.type === 'pliItem') {
				const part = LDParse.partDictionary[t.filename];
				if (!part || !part.name) {
					return 'Unknown Part';
				} else if (part.isSubModel) {
					return part.name.replace(/\.(mpd|ldr)/ig, '');
				}
				const partName = part.name.replace(' x ', 'x');
				const partColor = LDParse.colorTable[t.colorCode].name.replace('_', ' ');
				return partName + ' - ' + partColor;
			}
			return util.titleCase(t.type);
		}
	}
});

Vue.component('treeParentRow', {
	props: ['currentItem', 'target'],
	template: '#treeParentRowTemplate',
	methods: {
		arrowClick() {
			$(this.$el.firstElementChild).toggleClass('treeIconClosed');
			$('#' + this.target.type + 'ListItem' + this.target.id).toggleClass('hidden');
		}
	}
});

Vue.component('tree', {
	props: ['store', 'currentItem'],
	template: '#treeTemplate'
});

})();
