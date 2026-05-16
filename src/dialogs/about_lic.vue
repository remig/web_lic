/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.about_lic.title')"
		width="700px"
		class="aboutLicDialog"
	>
		<div>
			<h4>{{t('dialog.about_lic.version_@mf', {version})}}</h4>
			<!--
				TODO: Add server API to fetch the most recent lic version and display it here
				<p><i class="fas fa-check" />&nbsp;You are using the most recent version of Lic.</p>
			-->
			<p v-html="t('dialog.about_lic.free_@link', 'https://github.com/remig/web_lic')" />
			<p v-html="t('dialog.about_lic.read_more_@link', 'http://bugeyedmonkeys.com/lic/about/')" />
			<p v-html="t('dialog.about_lic.ldraw_@link', 'https://www.ldraw.org/')" />
			<p v-html="t('dialog.about_lic.contact_@link', 'https://github.com/remig/web_lic/issues')" />
			<!-- eslint-disable-next-line max-len -->
			<p v-html="t('dialog.about_lic.lang_@link', 'https://github.com/remig/web_lic/wiki/Translating-Lic')" />
			<p>
				<strong>
					{{t('dialog.about_lic.thanks')}}
				</strong>
			</p>
			<ul>
				<li>
					{{t('dialog.about_lic.feedback')}}
					<a href="https://www.flickr.com/photos/legohaulic/" target="_blank">Tyler Clites</a>
					{{t('dialog.about_lic.and')}}
					<a href="http://constructibles.net/" target="_blank">Jason Petrasich</a>
				</li>
				<li>
					{{t('dialog.about_lic.german')}}
					<a href="https://github.com/mried" target="_blank">mried</a>
				</li>
				<li>{{t('dialog.about_lic.french')}}Jean-Philippe Lechêne</li>
			</ul>
			<br>
			<p>
				{{t('dialog.about_lic.copyright')}}
				<a href="mailto:lic@bugeyedmonkeys.com">Remi Gagne</a>
			</p>
		</div>
		<template #footer>
			<LicButton type="ok" @click="emit('ok')" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {t} from '../translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import packageInfo from '../../package.json';

const emit = defineEmits<{(e: 'ok'): void; (e: 'cancel'): void}>();

const version = packageInfo.version;

</script>

<style>

.aboutLicDialog {
	ul {
		padding-left: 30px;
	}

	p {
		line-height: 25px;
	}
}

</style>
