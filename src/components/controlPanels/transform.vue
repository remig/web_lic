/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base title="template.transform.title" style="--label-width: 80px">
		<label class="label-input-row">
			{{ t('template.transform.scale') }}
			<input
				v-model.number="scale"
				type="number"
				min="0"
				max="10"
				step="0.1"
				class="form-control"
				@input="updateValues"
			/>
		</label>
		<rotate-builder
			:initial-rotation="rotation"
			:include-labels="false"
			title="Rotations"
			@new-values="updateValues"
		/>
	</panel-base>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { computed, ref } from 'vue';

import store from '../../store';
import _ from '../../util';
import RotateBuilder from '../rotate.vue';
import PanelBase from './panel_base.vue';

const props = defineProps<{ templateEntry: string }>();
const emit = defineEmits(['new-values']);

const scale = ref(_.get(store.state.template, props.templateEntry).scale);

const rotation = computed(() => _.get(store.state.template, props.templateEntry).rotation);

function updateValues(newRotation?: unknown) {
	// TODO: only emit if something actually changed
	const transform = _.get(store.state.template, props.templateEntry);
	if (newRotation && Array.isArray(newRotation)) {
		transform.rotation = newRotation;
	}
	transform.scale = scale.value;
	emit('new-values');
}
</script>
