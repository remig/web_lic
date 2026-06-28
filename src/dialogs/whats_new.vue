/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		id="whats_new_dialog"
		:title="t('dialog.whats_new.title')"
		class="whatsNewDialog"
		width="700px"
	>
		<div v-for="(entry, eID) in content" :key="`entry_${eID}`" class="oneEntry">
			<h4>
				{{ t('dialog.whats_new.version') }}
				<strong>{{ entry.version }}</strong>
				<span class="date">{{ niceDate(entry.date) }}</span>
			</h4>
			<div class="innerContent">
				<h5 v-if="entry.features && entry.features.length">
					{{ t('dialog.whats_new.features') }}
				</h5>
				<ul>
					<li v-for="(feature, fID) in entry.features" :key="`feature_${eID}_${fID}`">
						{{ feature }}
					</li>
				</ul>
				<h5 v-if="entry.bug_fixes && entry.bug_fixes.length">
					{{ t('dialog.whats_new.bug_fixes') }}
				</h5>
				<ul>
					<li v-for="(bug, bID) in entry.bug_fixes" :key="`feature_${eID}_${bID}`">
						{{ bug }}
					</li>
				</ul>
			</div>
		</div>
		<template #footer>
			<LicButton type="ok" @click="emit('ok')" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { onMounted, ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

const emit = defineEmits<{ (e: 'ok'): void; (e: 'cancel'): void }>();

const content = ref<any[]>([]);

function niceDate(date: string) {
	const opts: Intl.DateTimeFormatOptions = {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	};
	return new Date(date).toLocaleDateString('en-us', opts);
}

onMounted(async () => {
	const res = await fetch('whats_new.json');
	if (res && res.ok) {
		content.value = await res.json();
	}
});
</script>

<style>
.whatsNewDialog {
	strong {
		padding-right: 5px;
	}

	ul {
		padding-left: 35px;
	}

	li {
		padding: 5px;
	}

	.body {
		padding-top: 10px;
		max-height: 40vh;
		overflow-y: auto;
	}

	.date {
		font-size: 85%;
	}

	.oneEntry {
		padding-top: 5px;
	}

	.innerContent {
		padding: 5px 0 0 15px;
	}
}
</style>
