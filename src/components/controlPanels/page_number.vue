/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<panel-base title="template.page_number.position">
			<el-form-item label-width="0px">
				<el-select
					:value="tr('template.page_number.positions.' + position)"
					@change="updatePosition"
				>
					<el-option
						v-for="position in positions"
						:key="position"
						:value="position"
					>
						{{tr('template.page_number.positions.' + position)}}
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

// TODO: add UI to choose default page layout
// TODO: add UI to choose whether to redo layout or just extend canvas
// TODO: need to re-layout title page too, on some operations like page resize
// TODO: explore component 'extends' to make panel / subpanel nesting easier https://vuejs.org/v2/api/#extends
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
			this.$emit('new-values', 'pagenumber');
		}
	}
};

</script>
