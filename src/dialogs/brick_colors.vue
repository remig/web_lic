/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.brick_colors.title')"
		width="500px"
	>
		<table class="brickColorTable">
			<tr>
				<th>{{t('dialog.brick_colors.ld_code')}}</th>
				<th style="text-align: left;">
					{{t('dialog.brick_colors.name')}}
				</th>
				<th>
					{{t('glossary.color')}}
				</th>
				<th>
					{{t('dialog.brick_colors.edge_color')}}
				</th>
			</tr>
		</table>
		<div class="brickColorTableScroll">
			<table class="brickColorTable">
				<tr v-for="row in colorData" :key="row.id" class="brickColorRow">
					<td>{{row.id}}</td>
					<td style="text-align: left;">
						{{_.startCase(row.name)}}
					</td>
					<td>
						<LicColorPicker v-model="row.color" />
					</td>
					<td>
						<LicColorPicker v-model="row.edge" />
					</td>
				</tr>
			</table>
		</div>
		<template #footer>
			<LicButton type="reset" @click="reset" />
			<LicButton type="cancel" @click="emit('close')" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref} from 'vue';
import _ from '../util';
import {t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicColorPicker from '@/components/base/LicColorPicker.vue';
import store from '../store';
import LDParse from '../ld_parse';
import Storage from '../storage';
import backwardCompat from '../backward_compat';
import EventBus from '../event_bus';
import {type LDrawColorCode, type ColorTableEntry} from '../item_types';

const emit = defineEmits(['close']);

const customColors = Storage.get.customBrickColors();

interface colorRow {
	id: LDrawColorCode;
	name: string;
	color: string;
	edge: string;
}

function buildColorTable(): colorRow[] {
	const colors: colorRow[] = [];
	_.forOwn(LDParse.colorTable, (v: ColorTableEntry, k: string) => {
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

function applyChange() {
	const fixedColors = backwardCompat.fixColorTable(customColors);
	LDParse.setCustomColorTable(fixedColors);
	Storage.replace.customBrickColors(fixedColors);
	store.mutations.csi.markAllDirty();
	store.mutations.pliItem.markAllDirty();
	EventBus.emit('redraw-ui', {});
}

function ok() {
	colorData.value.forEach(el => {
		const ldColor = LDParse.colorTable[el.id];
		let customColor = customColors[el.id];
		if (ldColor.color === el.color && customColor) {
			delete (customColor as any).color;
			delete (customColor as any).rgba;
		} else if (ldColor.color !== el.color) {
			customColor = customColors[el.id] = customColors[el.id] || {};
			customColor.color = el.color;
		}
		if (ldColor.edge === el.edge && customColor) {
			delete (customColor as any).edge;
			delete (customColor as any).edgeRgba;
		} else if (ldColor.edge !== el.edge) {
			customColor = customColors[el.id] = customColors[el.id] || {};
			customColor.edge = el.edge;
		}
		if (_.isEmpty(customColor)) {
			delete (customColors as any)[el.id];
		}
	});
	applyChange();
	emit('close');
}

function reset() {
	colorData.value.forEach(el => {
		const entry = LDParse.colorTable[el.id];
		el.color = entry.color;
		el.edge = entry.edge;
	});
}

</script>

<style>

.brickColorTable {
	table-layout: fixed;
	width: 440px;
}

.brickColorTable td:nth-of-type(1),
.brickColorTable th:nth-of-type(1) {
	width: 110px;
}

.brickColorTable td:nth-of-type(2),
.brickColorTable th:nth-of-type(2) {
	width: 160px;
}

.brickColorTable td:nth-of-type(3),
.brickColorTable th:nth-of-type(3) {
	width: 60px;
}

.brickColorTable td:nth-of-type(4),
.brickColorTable th:nth-of-type(4) {
	width: 110px;
}

.brickColorTable th,
.brickColorTable td {
	padding: 5px 0;
	text-align: center;
	overflow: hidden;
}

.brickColorTableScroll {
	max-height: 65vh;
	overflow-x: hidden;
	overflow-y: scroll;
}

.brickColorTableScroll .lic-color-picker {
	display: inline-block;
	height: 34px;
	margin-bottom: -4px;
}

</style>
