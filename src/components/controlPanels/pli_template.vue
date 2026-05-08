/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<panel-base title="template.pli.content">
			<div class="panel-row">
				<label class="lic-checkbox">
					<input
						v-model="includeSubmodels"
						type="checkbox"
						@change="updateValues"
					>
					{{tr('template.pli.include_submodels')}}
				</label>
			</div>
		</panel-base>
		<fill-panel
			template-entry="pli"
			@new-values="newValues"
		/>
		<border-panel
			template-entry="pli"
			@new-values="newValues"
		/>
	</div>
</template>

<script>

import store from '../../store';
import PanelBase from './panel_base.vue';
import FillPanel from './fill.vue';
import BorderPanel from './border.vue';

export default {
	components: {PanelBase, FillPanel, BorderPanel},
	data() {
		return {
			includeSubmodels: store.state.template.pli.includeSubmodels,
		};
	},
	methods: {
		newValues() {
			this.$emit('new-values', 'pli');
		},
		updateValues() {
			const template = store.state.template.pli;
			if (this.includeSubmodels !== template.includeSubmodels) {
				template.includeSubmodels = this.includeSubmodels;
				this.$emit('new-values', 'pli');
			}
		},
	},
};

</script>
