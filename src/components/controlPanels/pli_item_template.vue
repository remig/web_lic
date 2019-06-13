/* Web Lic - Copyright (C) 2018 Remi Gagne */

<script>

import store from '../../store';
import transformPanel from './transform.vue';

export default {
	props: ['selectedItem', 'app'],
	render(createElement) {
		return createElement(
			transformPanel,
			{
				props: {templateEntry: 'pliItem'},
				on: {'new-values': this.newValues}
			}
		);
	},
	methods: {
		apply() {
			this.$parent.applyDirtyAction('pliItem');
		},
		newValues() {
			const pli = store.get.parent(this.selectedItem);
			pli.pliItems.forEach(id => (store.get.pliItem(id).isDirty = true));
			this.$emit('new-values', 'pliitem');
		}
	}
};

</script>
