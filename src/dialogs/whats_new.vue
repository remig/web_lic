/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:show-close="false"
		:visible="visible"
		:title="tr('dialog.whats_new.title')"
		class="whatsNewDialog"
		width="700px"
		@close="visible = false"
	>
		<div v-for="(entry, eID) in content" :key="`entry_${eID}`" class="oneEntry">
			<h4>
				{{tr('dialog.whats_new.version')}}
				<strong>{{entry.version}}</strong>
				<span class="date">{{niceDate(entry.date)}}</span>
			</h4>
			<div class="innerContent">
				<h5 v-if="entry.features">{{tr('dialog.whats_new.features')}}</h5>
				<ul>
					<li v-for="(feature, fID) in entry.features" :key="`feature_${eID}_${fID}`">
						{{feature}}
					</li>
				</ul>
				<h5 v-if="entry.bug_fixes">{{tr('dialog.whats_new.bug_fixes')}}</h5>
				<ul>
					<li v-for="(bug, bID) in entry.bug_fixes" :key="`feature_${eID}_${bID}`">
						{{bug}}
					</li>
				</ul>
			</div>
		</div>
		<span slot="footer" class="dialog-footer">
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</el-dialog>
</template>

<script>

export default {
	data: function() {
		return {
			visible: false,
			content: {}
		};
	},
	methods: {
		show() {
			this.visible = true;
		},
		checkIncludeItem(item) {
			this.newState.include[item] = !this.newState.include[item];
		},
		niceDate(date) {
			const opts = {month: 'long', day: 'numeric', year: 'numeric'};
			return new Date(date).toLocaleDateString('en-us', opts);
		},
		ok() {
			this.visible = false;
		}
	},
	async mounted() {
		const content = await fetch('whats_new.json');
		if (content && content.ok) {
			this.content = await content.json();
		}
	}
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
