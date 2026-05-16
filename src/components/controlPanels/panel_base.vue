/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div class="panel-template">
		<h5>{{ t(title) }}</h5>
		<div class="panel-body">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
import { t } from '@/translations';

defineProps<{ title: string }>();
</script>
