/* Web Lic - Copyright (C) 2018 Remi Gagne */

<script setup lang="ts">
import { t } from '@/translations';
import { computed } from 'vue';

type NamedType = 'ok' | 'cancel' | 'reset';
type ButtonType = NamedType | 'primary' | 'text';

const NAMED: Record<NamedType, { key: string; style: string }> = {
	ok: { key: 'dialog.ok', style: 'primary' },
	cancel: { key: 'dialog.cancel', style: 'default' },
	reset: { key: 'dialog.reset', style: 'default' },
};

const props = defineProps<{ type?: ButtonType; icon?: string }>();
const emit = defineEmits(['click']);

const named = computed(() =>
	props.type != null && props.type in NAMED ? NAMED[props.type as NamedType] : null,
);
const label = computed(() => (named.value ? t(named.value.key) : null));
const styleClass = computed(() => named.value?.style ?? props.type ?? 'default');
</script>

<template>
	<button type="button" :class="['lic-btn', styleClass]" @click="emit('click')">
		<i v-if="icon" :class="icon" />
		<span v-if="label">{{ label }}</span>
		<slot v-else />
	</button>
</template>

<style scoped>
.lic-btn {
	padding: 9px 20px;
	border-radius: 3px;
	border: 1px solid #ccc;
	background: #fff;
	color: #606266;
	cursor: pointer;
	font-size: 14px;
	line-height: 1;
	white-space: nowrap;
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.lic-btn:focus,
.lic-btn:focus-visible {
	outline: none;
}

.lic-btn:hover {
	background: #f5f7fa;
	border-color: #c0c4cc;
}

.lic-btn.primary {
	background: #409eff;
	border-color: #409eff;
	color: #fff;
}

.lic-btn.primary:hover {
	background: #66b1ff;
	border-color: #66b1ff;
}

.lic-btn.text {
	background: transparent;
	border-color: transparent;
	color: #409eff;
	padding: 8px 0;
}

.lic-btn.text:hover {
	color: #66b1ff;
}
</style>
