/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.missing_parts.title')"
		class="missingPartsDialog"
		width="550px"
	>
		<div
			class="subheading"
			v-html="t('dialog.missing_parts.subtitle')"
		/>
		<table class="missingPartsTable">
			<tr v-for="(value, filename) in missingPartsData" :key="filename" class="missingPartRow">
				<td>
					<i v-if="value.uploaded" class="fas fa-check" />
					{{filename}}
				</td>
				<td>{{partCount(value.count)}}</td>
				<td>
					<LicTooltip v-if="showSendButton(filename)">
						<div
							slot="content"
							v-html="t('dialog.missing_parts.send_to_remote.tooltip')"
						/>
						<LicButton @click="sendToRemote(filename)">
							{{t("dialog.missing_parts.send_to_remote.title")}}
						</LicButton>
					</LicTooltip>
					<LicButton v-else-if="!value.uploaded" @click="upload(filename)">
						{{t("glossary.import")}}
					</LicButton>
				</td>
			</tr>
		</table>
		<template #footer>
			<LicButton type="primary" @click="ok">
				{{okText}}
			</LicButton>
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {reactive, computed, set} from 'vue';
import {t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicTooltip from '@/components/base/LicTooltip.vue';
import _ from '../util';
import LDParse from '../ld_parse';
import openFileHandler from '../file_uploader';

const emit = defineEmits<{(e: 'ok'): void; (e: 'cancel'): void}>();

type PartEntry = {uploaded: boolean; count: number};
type MissingPartsData = Record<string, PartEntry>;
type LoadedContent = Record<string, string | null>;

function buildMissingPartsTable(): MissingPartsData {
	const missingParts = _.cloneDeep(LDParse.missingParts);
	const result: MissingPartsData = {};
	_.forOwn(missingParts, (value: number, key: string) => {
		result[key] = {uploaded: false, count: value};
	});
	return result;
}

const enablePartSend = window.location.host.toLowerCase().includes('bugeyedmonkeys');
const missingPartsData = reactive<MissingPartsData>(buildMissingPartsTable());
const loadedPartContent = reactive<LoadedContent>({});

const stillHaveMissingParts = computed(() => _.some(missingPartsData, p => !p.uploaded));

const okText = computed(() => stillHaveMissingParts.value
	? t('dialog.missing_parts.proceed')
	: t('dialog.ok'),
);

function partCount(count: number) {
	return t('dialog.missing_parts.used_@mf', {count});
}

function showSendButton(filename: string) {
	return missingPartsData[filename].uploaded
		&& enablePartSend
		&& loadedPartContent[filename] != null;
}

function ok() {
	if (stillHaveMissingParts.value) {
		LDParse.model.removeMissingParts();
	}
	emit('ok');
}

function upload(filename: string) {
	openFileHandler('.dat, .ldr, .mpd', 'text', (content: string | ArrayBuffer | null) => {
		LDParse.loadPartContent(content as string).then(() => {
			set(loadedPartContent, filename, content);
			missingPartsData[filename].uploaded = true;
			_.each(LDParse.missingParts, (count: number, fn: string) => {
				if (!(fn in missingPartsData)) {
					set(missingPartsData, fn, {uploaded: false, count});
				}
			});
		});
	});
}

function sendToRemote(filename: string) {
	if (enablePartSend) {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', 'http://bugeyedmonkeys.com/lic/upload_part.php', true);
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		const content = `&content=filename: ${filename}\n`
			+ '------------------------------\n'
			+ `${loadedPartContent[filename]}\n`
			+ '------------------------------';
		xhr.send(content);
	}
	loadedPartContent[filename] = null;
}

</script>

<style>

.missingPartsDialog {
	.subheading {
		padding-bottom: 20px;
		border-bottom: 1px solid #ddd;
		margin-bottom: 20px;
	}

	.body {
		max-height: 70vh;
	}
}

.missingPartsTable {
	table-layout: fixed;
	width: 100%;

	tr {
		height: 50px;
	}

	td {
		text-align: center;
	}

	i {
		color: #00c700;
		margin-right: 10px;
	}

	td:nth-of-type(1) {
		text-align: right;
	}

	td:nth-of-type(2) {
		width: 125px;
	}

	td:nth-of-type(3) {
		width: 200px;
	}
}

</style>
