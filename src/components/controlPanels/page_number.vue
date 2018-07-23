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
