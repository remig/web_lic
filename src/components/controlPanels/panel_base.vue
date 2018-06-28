<template>
	<div class="panel panel-template">
		<h5>{{title}}</h5>
		<div class="panel-body">
			<form class="form-horizontal">
				<slot></slot>
			</form>
		</div>
	</div>
</template>

<script>

export default {
	props: {
		title: ''
	}
};

</script>
