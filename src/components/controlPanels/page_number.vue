/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<panel-base title="template.page_number.position">
			<div class="panel-row">
				<LicSelect v-model="position" :options="positionOptions" @change="updatePosition" />
			</div>
		</panel-base>
		<font-panel
			template-entry="page.numberLabel"
			@new-values="newValues"
		/>
	</div>
</template>

<script>

import store from '../../store';
import PanelBase from './panel_base.vue';
import FontPanel from './font.vue';
import LicSelect from '../base/LicSelect.vue';
import {tr} from '../../translations';

// TODO: add UI to choose default page layout
// TODO: add UI to choose whether to redo layout or just extend canvas
// TODO: need to re-layout title page too, on some operations like page resize
// TODO: explore component 'extends' to make panel / subpanel nesting easier https://vuejs.org/v2/api/#extends
export default {
	components: {PanelBase, FontPanel, LicSelect},
	data() {
		return {
			position: store.state.template.page.numberLabel.position,
			positionOptions: ['right', 'left', 'even-left', 'even-right'].map(p => ({
				value: p,
				label: tr('template.page_number.positions.' + p),
			})),
		};
	},
	methods: {
		updatePosition(newPosition) {
			store.state.template.page.numberLabel.position = this.position = newPosition;
			this.newValues();
		},
		newValues() {
			this.$emit('new-values', 'pagenumber');
		},
	},
};

</script>
