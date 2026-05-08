/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div class="panel-template">
		<h5>{{tr(title)}}</h5>
		<div class="panel-body">
			<slot />
		</div>
	</div>
</template>

<script>

export default {
	props: ['title'],
};

</script>
