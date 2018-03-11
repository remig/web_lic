/* global Vue: false, $: false */

(function() {
'use strict';

Vue.component('baseDialog', {
	template: '#baseDialogTemplate',
	data: function() {
		return {
			visible: false,
			position: {x: 0, y: 0}
		};
	},
	props: {
		title: '',
		okButtonText: {type: String, default: 'Ok'},
		cancelButtonText: {type: String, default: 'Cancel'}
	},
	methods: {
		show() {
			$(`#${this.$el.id}`).modal({backdrop: false});
		},
		ok() {
			this.$emit('ok');
		},
		cancel() {
			this.$emit('cancel');
		}
	}
});

// Pass along 'ok' and 'cancel' events from child (baseDialog) to this dialog,
// and pass along position and show() from this dialog to child.
const baseDialogPropagator = {
	mounted() {
		this.$children[0].$on('ok', () => this.$emit('ok'));
		this.$children[0].$on('cancel', () => this.$emit('cancel'));
	},
	methods: {
		show(position) {
			this.$children[0].position = position;
			this.$children[0].show();
		}
	}
};

Vue.component('partDisplacementDialog', {
	template: '#partDisplacementDialogTemplate',
	mixins: [baseDialogPropagator],
	data: function() {
		return {
			arrowOffset: 0,
			partDistance: 60
		};
	},
	methods: {
		updateValues() {
			this.$emit('update', {...this.$data});
		}
	}
});

})();
