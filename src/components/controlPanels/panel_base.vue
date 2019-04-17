/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div class="panel panel-template">
		<h5>{{tr(title)}}</h5>
		<div class="panel-body">
			<el-form :label-width="labelWidth" label-position="left">
				<slot />
			</el-form>
		</div>
	</div>
</template>

<script>

export default {
	props: ['title', 'labelWidth']
};

</script>

<style scoped>

.el-form >>> .el-form-item {
	height: 48px;
}

</style>
