/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		id="about_lic_dialog"
		:modal="true"
		:title="tr('dialog.about_lic.title_@mf', {version})"
		class="aboutLicDialog"
		width="700px"
	>
		<div>
			(NYI)
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

</style>
