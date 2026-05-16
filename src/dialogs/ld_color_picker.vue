/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="t('dialog.ld_color_picker.title')" class="ldColorPickerDialog" width="500px">
		<table class="el-table brickColorTable">
			<thead>
				<tr>
					<th>{{ t('dialog.ld_color_picker.ld_code') }}</th>
					<th style="text-align: left">
						{{ t('dialog.ld_color_picker.name') }}
					</th>
					<th style="text-align: left">
						{{ t('dialog.ld_color_picker.choose') }}
					</th>
				</tr>
			</thead>
		</table>
		<div class="brickColorTableScroll">
			<table class="el-table brickColorTable">
				<tbody>
					<tr v-for="row in colorData" :key="row.id" class="brickColorRow">
						<td>{{ row.id }}</td>
						<td style="text-align: left">
							{{ _.startCase(row.name) }}
						</td>
						<td>
							<div class="swatch" @click="pick(row.id)">
								<div :style="{ 'background-color': row.color }" class="inner_swatch" />
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="emit('cancel')" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

import LDParse from '../ld_parse';
import Storage from '../storage';
import _ from '../util';

const emit = defineEmits<{
	(e: 'ok', colorCode: number): void;
	(e: 'cancel'): void;
}>();

const customColors = Storage.get.customBrickColors();

function buildColorTable() {
	const colors: { id: number; name: string; color: string; edge: string }[] = [];
	_.forOwn(LDParse.colorTable, (v, k) => {
		if (v.color < 0 || v.edge < 0) {
			return;
		}
		const id = parseInt(k, 10);
		const customColor = customColors[id] || {};
		colors.push({
			id,
			name: v.name,
			color: customColor.color || v.color,
			edge: customColor.edge || v.edge,
		});
	});
	return colors;
}

const colorData = ref(buildColorTable());

function pick(colorCode: number) {
	emit('ok', colorCode);
}
</script>

<style>
.ldColorPickerDialog {
	table-layout: fixed;
}

.ldColorPickerDialog td:nth-of-type(1),
.ldColorPickerDialog th:nth-of-type(1) {
	width: 100px;
}

.ldColorPickerDialog td:nth-of-type(2),
.ldColorPickerDialog th:nth-of-type(2) {
	width: 140px;
}

.ldColorPickerDialog td:nth-of-type(3),
.ldColorPickerDialog th:nth-of-type(3) {
	width: 50px;
}

.ldColorPickerDialog .swatch {
	width: 30px;
	height: 30px;
	border: 1px solid #ccc;
	border-radius: 4px;
	padding: 3px;
	margin-left: 20px;
	cursor: pointer;
}

.ldColorPickerDialog .inner_swatch {
	width: 100%;
	height: 100%;
	border: 1px solid #999;
	border-radius: 2px;
}

.brickColorTableScroll {
	max-height: 55vh;
	overflow-x: hidden;
	overflow-y: scroll;
}

.ldColorPickerDialog .el-table th,
.ldColorPickerDialog .el-table td {
	padding: 5px 0;
	text-align: center;
	overflow: hidden;
}
</style>
