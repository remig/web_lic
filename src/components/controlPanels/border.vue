<template>
	<div class="panel panel-template">
		<h5>{{title}}</h5>
		<div class="panel-body">
			<form class="form-horizontal">
				<div class="form-group">
					<label
						for="borderColorInput"
						class="control-label col-sm-7"
					>
						Color
					</label>
					<el-color-picker
						v-model="color"
						v-on:active-change="updateColor"
						v-on:change="updateValues"
						show-alpha
					></el-color-picker>
				</div>
				<div class="form-group">
					<label for="lineWidth" class="control-label col-sm-7">Line Width</label>
					<div class="col-sm-5">
						<input
							v-model.number="width"
							v-on:input="updateValues"
							type="number"
							min="0"
							class="form-control"
							id="lineWidth"
						/>
					</div>
				</div>
				<div class="form-group" v-if="cornerRadius != null">
					<label for="cornerRadius" class="control-label col-sm-7">Corner Radius</label>
					<div class="col-sm-5">
						<input
							v-model.number="cornerRadius"
							v-on:input="updateValues"
							type="number"
							min="0"
							class="form-control"
							id="cornerRadius"
						/>
					</div>
				</div>
			</form>
		</div>
	</div>
</template>

<script>

import _ from '../../util';
import store from '../../store';

export default {
	inject: ['templateEntry'],
	props: {
		title: {type: String, default: 'Border'}
	},
	data() {
		const template = _.get(this.templateEntry, store.state.template).border;
		return {
			width: template.width || 0,
			color: template.color,
			cornerRadius: template.cornerRadius
		};
	},
	methods: {
		updateColor(newColor) {
			this.color = (newColor === 'transparent') ? null : newColor;
			this.updateValues();
		},
		updateValues() {
			const template = _.get(this.templateEntry, store.state.template).border;
			template.width = this.width;
			template.color = this.color;
			template.cornerRadius = this.cornerRadius;
			this.$emit('new-values', this.templateEntry);
		}
	}
};

</script>
