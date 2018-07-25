/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<panel-base title="Position">
			<el-form-item label-width="0px">
				<el-select
					:value="position | prettyPrint"
					@change="updatePosition"
				>
					<el-option
						v-for="position in positions"
						:key="position"
						:value="position"
					>
						{{position | prettyPrint}}
					</el-option>
				</el-select>
			</el-form-item>
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

// TODO: add default page layout UI
// TODO: should add UI to choose whether to redo layout or just extend canvas
// TODO: need to re-layout title page too, on some operations like page resize
// TODO: for page size, add preset sizes like 'A4', 'legal', etc.  See here for list of formats & sizes: https://github.com/MrRio/jsPDF/blob/master/jspdf.js
// TODO: explore component 'extends' to make panel / subpanel nesting easier (https://vuejs.org/v2/api/#extends)
export default {
	components: {PanelBase, FontPanel},
	data() {
		return {
			position: store.state.template.page.numberLabel.position,
			positions: ['right', 'left', 'even-left', 'even-right']
		};
	},
	methods: {
		updatePosition(newPosition) {
			store.state.template.page.numberLabel.position = this.position = newPosition;
			this.newValues();
		},
		newValues() {
			this.$emit('new-values', 'Page Number');
		}
	}
};

</script>
