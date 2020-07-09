/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		id="whats_new_dialog"
		:modal="true"
		:title="tr('dialog.whats_new.title')"
		class="whatsNewDialog"
		width="700px"
	>
		<div v-for="(entry, eID) in content" :key="`entry_${eID}`" class="oneEntry">
			<h4>
				{{tr('dialog.whats_new.version')}}
				<strong>{{entry.version}}</strong>
				<span class="date">{{niceDate(entry.date)}}</span>
			</h4>
			<div class="innerContent">
				<h5 v-if="entry.features && entry.features.length">
					{{tr('dialog.whats_new.features')}}
				</h5>
				<ul>
					<li v-for="(feature, fID) in entry.features" :key="`feature_${eID}_${fID}`">
						{{feature}}
					</li>
				</ul>
				<h5 v-if="entry.bug_fixes && entry.bug_fixes.length">
					{{tr('dialog.whats_new.bug_fixes')}}
				</h5>
				<ul>
					<li v-for="(bug, bID) in entry.bug_fixes" :key="`feature_${eID}_${bID}`">
						{{bug}}
					</li>
				</ul>
			</div>
		</div>
		<span slot="footer" class="dialog-footer">
			<el-button type="primary" @click="cancel">{{tr("dialog.ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

export default {
	data: function() {
		return {
			content: {},
		};
	},
	methods: {
		checkIncludeItem(item) {
			this.newState.include[item] = !this.newState.include[item];
		},
		niceDate(date) {
			const opts = {month: 'long', day: 'numeric', year: 'numeric'};
			return new Date(date).toLocaleDateString('en-us', opts);
		},
		cancel() {
			this.$emit('close');
		},
	},
	async mounted() {
		const content = await fetch('whats_new.json');
		if (content && content.ok) {
			this.content = await content.json();
		}
	},
};

</script>

<style>

.whatsNewDialog strong {
	padding-right: 5px;
}

.whatsNewDialog ul {
	padding-left: 35px;
}

.whatsNewDialog li {
	padding: 5px;
}

.whatsNewDialog .el-dialog__body {
	padding-top: 10px;
	max-height: 40vh;
	overflow-y: auto;
}

.whatsNewDialog .date {
	font-size: 85%;
}

.whatsNewDialog .oneEntry {
	padding-top: 5px;
}

.whatsNewDialog .innerContent {
	padding: 5px 0 0 15px;
}

</style>
