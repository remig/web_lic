/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.missing_parts.title')"
		class="missingPartsDialog"
		width="550px"
	>
		<div
			class="subheading"
			v-html="tr('dialog.missing_parts.subtitle')"
		/>
		<table class="missingPartsTable">
			<tr v-for="(value, filename) in missingPartsData" :key="filename" class="missingPartRow">
				<td>
					<i v-if="value.uploaded" class="fas fa-check" />
					{{filename}}
				</td>
				<td>{{partCount(value.count)}}</td>
				<td>
					<licTooltip v-if="showSendButton(filename)">
						<div
							slot="content"
							v-html="tr('dialog.missing_parts.send_to_remote.tooltip')"
						/>
						<el-button @click="sendToRemote(filename)">
							{{tr("dialog.missing_parts.send_to_remote.title")}}
						</el-button>
					</licTooltip>
					<el-button v-else-if="!value.uploaded" @click="upload(filename)">
						{{tr("glossary.import")}}
					</el-button>
				</td>
			</tr>
		</table>
		<span slot="footer" class="dialog-footer">
			<el-button type="primary" @click="ok()">{{okText}}</el-button>
		</span>
	</licDialog>
</template>

<script>

/* global Vue: false */
import _ from '../util';
import LDParse from '../ld_parse';
import openFileHandler from '../file_uploader';

function buildMissingPartsTable() {
	const missingParts = _.cloneDeep(LDParse.missingParts);
	_.forOwn(missingParts, (value, key) => {
		missingParts[key] = {uploaded: false, count: value};
	});
	return missingParts;
}

export default {
	data: function() {
		return {
			enablePartSend: window.location.host.toLowerCase().includes('bugeyedmonkeys'),
			missingPartsData: buildMissingPartsTable(),
			loadedPartContent: {}  // key: filename, value: LDraw content string
		};
	},
	methods: {
		ok() {
			if (this.stillHaveMissingParts) {
				LDParse.model.removeMissingParts();
			}
			this.$emit('close');
		},
		upload(filename) {
			openFileHandler('.dat, .ldr, .mpd', 'text', content => {
				LDParse.loadPartContent(content).then(() => {
					this.loadedPartContent[filename] = content;
					this.missingPartsData[filename].uploaded = true;
					_.each(LDParse.missingParts, (count, filename) => {
						if (!(filename in this.missingPartsData)) {
							Vue.set(this.missingPartsData, filename, {uploaded: false, count});
						}
					});
				});
			});
		},
		sendToRemote(filename) {
			if (this.enablePartSend) {
				const xhr = new XMLHttpRequest();
				xhr.open('POST', 'http://bugeyedmonkeys.com/lic/upload_part.php', true);
				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				const content = `&content=filename: ${filename}\n`
					+ '------------------------------\n'
					+ `${this.loadedPartContent[filename]}\n`
					+ '------------------------------';
				xhr.send(content);
			}
			this.loadedPartContent[filename] = null;
			this.$forceUpdate();
		},
		partCount(count) {
			return this.tr('dialog.missing_parts.used_@mf', {count});
		},
		showSendButton(filename) {
			return this.missingPartsData[filename].uploaded
				&& this.enablePartSend
				&& this.loadedPartContent[filename] != null;
		}
	},
	computed: {
		stillHaveMissingParts() {
			return _.some(this.missingPartsData, p => !p.uploaded);
		},
		okText() {
			return this.stillHaveMissingParts
				? this.tr('dialog.missing_parts.proceed')
				: this.tr('dialog.ok');
		}
	}
};
</script>

<style>

.missingPartsDialog .subheading {
	padding-bottom: 20px;
	border-bottom: 1px solid #ddd;
	margin-bottom: 20px;
}

.missingPartsTable {
	table-layout: fixed;
	width: 100%;
}

.missingPartsTable tr {
	height: 50px;
}

.missingPartsTable td {
	text-align: center;
}

.missingPartsTable i {
	color: #00c700;
	margin-right: 10px;
}

.missingPartsTable td:nth-of-type(1) {
	text-align: right;
}

.missingPartsTable td:nth-of-type(2) {
	width: 125px;
}

.missingPartsTable td:nth-of-type(3) {
	width: 200px;
}

.missingPartsDialog .el-dialog__body {
	max-height: 70vh;
}

</style>
