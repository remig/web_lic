/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.displace_part.title')"
		width="550px"
		class="displacePartDialog"
	>
		<el-form :inline="true" label-width="140px">
			<el-form-item :label="tr('dialog.displace_part.part_distance')">
				<input
					v-model.number="values.partDistance"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('dialog.displace_part.arrow_length')">
				<input
					v-model.number="values.arrowLength"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<el-form :inline="true" label-width="140px">
			<el-form-item :label="tr('dialog.displace_part.arrow_distance')">
				<input
					v-model.number="values.arrowOffset"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('dialog.displace_part.arrow_rotation')">
				<input
					v-model.number="values.arrowRotation"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

export default{
	data: function() {
		return {
			values: {
				partDistance: 0,
				arrowOffset: 0,
				arrowLength: 0,
				arrowRotation: 0
			}
		};
	},
	methods: {
		updateValues() {
			this.$emit('update', this.values);
		},
		ok() {
			this.$emit('ok', this.values);
			this.$emit('close');
		},
		cancel() {
			this.$emit('cancel', this.values);
			this.$emit('close');
		}
	}
};
</script>

<style>

.displacePartDialog input {
	width: 90px;
}

</style>
