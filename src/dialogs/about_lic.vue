/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		id="about_lic_dialog"
		:modal="true"
		:title="tr('dialog.about_lic.title')"
		class="aboutLicDialog"
		width="700px"
	>
		<div>
			<h4>{{tr('dialog.about_lic.version_@mf', {version})}}</h4>
			<!--
				TODO: Add server API to fetch the most recent lic version and display it here
				<p><i class="fas fa-check" />&nbsp;You are using the most recent version of Lic.</p>
			-->
			<p v-html="tr('dialog.about_lic.free_@link', 'https://github.com/remig/web_lic')" />
			<p v-html="tr('dialog.about_lic.read_more_@link', 'http://bugeyedmonkeys.com/lic/about/')" />
			<p v-html="tr('dialog.about_lic.contact_@link', 'https://github.com/remig/web_lic/issues')" />
			<!-- eslint-disable-next-line max-len -->
			<p v-html="tr('dialog.about_lic.lang_@link', 'https://github.com/remig/web_lic/wiki/Translating-Lic')" />
			<p><strong>{{tr('dialog.about_lic.thanks')}}</strong>
				<ul>
					<li>{{tr('dialog.about_lic.feedback')}}
						<a href="https://www.flickr.com/photos/legohaulic/" target="_blank">Tyler Clites</a>
						{{tr('dialog.about_lic.and')}}
						<a href="http://constructibles.net/" target="_blank">Jason Petrasich</a>
					</li>
					<li>{{tr('dialog.about_lic.german')}}
						<a href="https://github.com/mried" target="_blank">mried</a>
					</li>
					<li>{{tr('dialog.about_lic.french')}}Jean-Philippe Lechêne</li>
				</ul>
			</p>
			<br>
			<p>{{tr('dialog.about_lic.copyright')}} <a href="mailto:lic@bugeyedmonkeys.com">Remi Gagne</a></p>
		</div>
		<span slot="footer" class="dialog-footer">
			<el-button type="primary" @click="$emit('close')">{{tr("dialog.ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

import packageInfo from '../../package.json';

export default {
	data() {
		return {
			version: packageInfo.version
		};
	}
};

</script>

<style>

.aboutLicDialog ul {
	padding-left: 30px;
}

.aboutLicDialog p {
	line-height: 25px;
}

</style>
