/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base :title="title" style="--label-width: 120px">
		<div class="label-input-row">
			{{ t('glossary.color') }}
			<LicColorPicker v-model="color" show-alpha @change="updateValues" />
		</div>
		<label class="label-input-row">
			{{ t('template.border.line_width') }}
			<input
				v-model.number="width"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			/>
		</label>
		<label v-if="cornerRadius != null" class="label-input-row">
			{{ t('template.border.corner_radius') }}
			<input
				v-model.number="cornerRadius"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			/>
		</label>
		<label v-if="innerMargin != null" class="label-input-row">
			{{ t('template.border.margin') }}
			<input
				v-model.number="innerMargin"
				type="number"
				step="0.1"
				class="form-control"
				@input="updateValues"
			/>
		</label>
	</panel-base>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { ref } from 'vue';

import store from '../../store';
import _ from '../../util';
import LicColorPicker from '../base/LicColorPicker.vue';
import PanelBase from './panel_base.vue';

const props = withDefaults(
	defineProps<{
		templateEntry: string;
		title?: string;
	}>(),
	{ title: 'template.border.title' },
);

const emit = defineEmits(['new-values']);

const template = _.get(store.state.template, props.templateEntry);
const width = ref(template.border.width || 0);
const color = ref(template.border.color);
const cornerRadius = ref(template.border.cornerRadius);
const innerMargin = ref(template.innerMargin == null ? null : template.innerMargin * 100);

function updateValues() {
	const tpl = _.get(store.state.template, props.templateEntry);
	tpl.border.width = width.value;
	tpl.border.color = color.value;
	tpl.border.cornerRadius = cornerRadius.value;
	tpl.innerMargin = innerMargin.value == null ? null : innerMargin.value / 100;
	emit('new-values', props.templateEntry);
}
</script>
