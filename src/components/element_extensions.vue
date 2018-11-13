/* Web Lic - Copyright (C) 2018 Remi Gagne */

<script>

/* global Vue: false, ELEMENT: false */

// Change defaults for common Element components

Vue.component('licDialog', {
	mixins: [ELEMENT.Dialog],
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

</script>
