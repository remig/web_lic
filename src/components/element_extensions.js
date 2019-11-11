/* Web Lic - Copyright (C) 2018 Remi Gagne */

import Vue from 'vue';
import {Dialog, Tooltip} from 'element-ui';

// Change defaults for common Element components
Vue.component('licDialog', {
	mixins: [Dialog],
	props: {
		modal: {
			type: Boolean,
			'default': false
		},
		showClose: {
			type: Boolean,
			'default': false
		},
		visible: {
			type: Boolean,
			'default': true
		}
	}
});

Vue.component('licTooltip', {
	mixins: [Tooltip],
	props: {
		openDelay: {
			type: Number,
			'default': 500
		},
		effect: {
			type: String,
			'default': 'light'
		},
		arrowOffset: {
			type: Number,
			'default': 0
		},
		transition: {
			type: String,
			'default': 'none'
		},
		enterable: {
			type: Boolean,
			'default': false
		},
		placement: {
			type: String,
			'default': 'right'
		}
	}
});
