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
			<p>
				Lic is totally free and
				<a href="https://github.com/remig/web_lic" target="_blank">open source.</a>
			</p>
			<p>Read more about Lic and how to get started
				<a href="http://bugeyedmonkeys.com/lic/about/" target="_blank">here.</a>
			</p>
			<p>Contact
				<a href="mailto:lic@bugeyedmonkeys.com" target="_blank">lic@bugeyedmonkeys.com</a>
				with questions or feature requests, or
				<a href="https://github.com/remig/web_lic/issues" target="_blank">open an issue.</a>
			</p>
			<p>If you know more than one language, please help other Lic users by translating Lic.
				<a href="https://github.com/remig/web_lic/wiki/Translating-Lic" target="_blank">It's easy!</a>
			</p>
			<p><strong>Special thanks:</strong>
				<ul>
					<li> Major feedback, bug hunting and moral support:
						<a href="https://www.flickr.com/photos/legohaulic/" target="_blank">Tyler Clites</a>
						and
						<a href="http://constructibles.net/" target="_blank">Jason Petrasich</a>
					</li>
					<li>
						German Translation and translation code fixes -
						<a href="https://github.com/mried" target="_blank">mried</a>
					</li>
					<li>French Translation - Jean-Philippe Lechêne</li>
				</ul>
			</p>
			<br>
			<p>Copyright © 2019 <a href="mailto:lic@bugeyedmonkeys.com">Remi Gagne</a></p>
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
