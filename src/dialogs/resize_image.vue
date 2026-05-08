/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<LicDialog
		:title="tr('dialog.resize_image.title')"
		width="500px"
	>
		<div>{{bodyText}}</div>
		<div v-if="imageInfo.dpi > 96">
			{{tr('dialog.resize_image.high_dpi_@mf', {dpi: imageInfo.dpi})}}
		</div>
		<div>
			<div class="flex-row">
				<label class="lic-radio">
					<input
						type="radio"
						name="preserveSize"
						:checked="!imageInfo.preserveSize"
						@change="imageInfo.preserveSize = false; updateValues()"
					>
					{{resizeText}}
				</label>
				<label class="lic-radio">
					<input
						type="radio"
						name="preserveSize"
						:checked="imageInfo.preserveSize"
						@change="imageInfo.preserveSize = true; updateValues()"
					>
					{{tr('dialog.resize_image.do_nothing')}}
				</label>
			</div>
		</div>
		<div v-if="needAspectRatioUI">
			<label class="lic-checkbox">
				<input
					v-model="imageInfo.preserveAspectRatio"
					type="checkbox"
					@change="updateValues"
				>
				{{tr('dialog.resize_image.preserve_aspect_ratio')}}
			</label>
		</div>
		<div v-if="needPositionUI" class="position-picker">
			<div>
				{{tr('dialog.resize_image.anchor_text')}}
			</div>
			<div class="anchor-grid">
				<div
					v-for="pos in anchorPositions"
					:key="pos.value"
					:class="['anchor-cell', {selected: imageInfo.anchorPosition === pos.value}]"
					@click="selectAnchor(pos.value)"
				>
					{{pos.label}}
				</div>
			</div>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref, computed} from 'vue';
import {tr} from '@/translations';
import {type Anchors} from '@/item_types';
import _ from '../util';
import store from '../store';
import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

const anchorOffsets: Record<Anchors, {x: number; y: number}> = {
	top_left: {x: 0, y: 0},
	top: {x: 0.5, y: 0},
	top_right: {x: 1, y: 0},
	left: {x: 0, y: 0.5},
	center: {x: 0.5, y: 0.5},
	right: {x: 1, y: 0.5},
	bottom_left: {x: 0, y: 1},
	bottom: {x: 0.5, y: 1},
	bottom_right: {x: 1, y: 1},
};

const anchorPositions: {value: Anchors; label: string}[] = [
	{value: 'top_left', label: tr('dialog.resize_image.anchors.top_left')},
	{value: 'top', label: tr('dialog.resize_image.anchors.top')},
	{value: 'top_right', label: tr('dialog.resize_image.anchors.top_right')},
	{value: 'left', label: tr('dialog.resize_image.anchors.left')},
	{value: 'center', label: tr('dialog.resize_image.anchors.center')},
	{value: 'right', label: tr('dialog.resize_image.anchors.right')},
	{value: 'bottom_left', label: tr('dialog.resize_image.anchors.bottom_left')},
	{value: 'bottom', label: tr('dialog.resize_image.anchors.bottom')},
	{value: 'bottom_right', label: tr('dialog.resize_image.anchors.bottom_right')},
];

const page = store.state.template.page;
const imageInfo = ref({
	filename: '',
	src: null as string | null,
	width: 0, originalWidth: 0,
	height: 0, originalHeight: 0,
	x: 0, y: 0, dpi: 0,
	preserveSize: true,
	preserveAspectRatio: true,
	anchorPosition: 'top_left' as Anchors,
	pageWidth: page.width,
	pageHeight: page.height,
});

const emit = defineEmits(['update', 'ok', 'cancel', 'close']);

const aspectRatiosMatch = computed(() => {
	const info = imageInfo.value;
	return _.equal(
		info.originalWidth / info.originalHeight,
		info.pageWidth / info.pageHeight,
		0.0001,
	);
});

const isImageTooBig = computed(() => {
	const info = imageInfo.value;
	return info.originalWidth > info.pageWidth || info.originalHeight > info.pageHeight;
});

const bodyText = computed(() =>
	tr(`dialog.resize_image.${isImageTooBig.value ? 'too_big' : 'too_small'}`),
);

const resizeText = computed(() =>
	tr(`dialog.resize_image.${isImageTooBig.value ? 'shrink' : 'stretch'}`),
);

const needAspectRatioUI = computed(() =>
	!imageInfo.value.preserveSize && !aspectRatiosMatch.value,
);

const needPositionUI = computed(() => {
	const info = imageInfo.value;
	return info.preserveSize || aspectRatiosMatch.value || info.preserveAspectRatio;
});

function updateImageInfo() {
	const info = imageInfo.value;
	if (info.preserveSize) {
		info.width = info.originalWidth;
		info.height = info.originalHeight;
	} else {
		if (info.preserveAspectRatio) {
			const aspectRatio = info.originalWidth / info.originalHeight;
			const dw = info.pageWidth - (info.pageWidth / aspectRatio);
			let scaleBy = 'height';
			if (info.originalWidth < info.pageWidth) {
				if ((info.originalHeight < info.pageHeight) && (dw > 0)) {
					scaleBy = 'width';
				}
			} else {
				if (info.originalHeight > info.pageHeight) {
					if (dw > 0) {
						scaleBy = 'height';
					}
				} else {
					scaleBy = 'width';
				}
			}
			if (scaleBy === 'width') {
				info.width = info.pageWidth;
				info.height = info.width / aspectRatio;
			} else {
				info.height = info.pageHeight;
				info.width = info.height * aspectRatio;
			}
		} else {
			info.width = info.pageWidth;
			info.height = info.pageHeight;
		}
	}
	info.width = Math.round(info.width);
	info.height = Math.round(info.height);
	const anchorOffset = anchorOffsets[info.anchorPosition];
	info.x = Math.round((info.pageWidth * anchorOffset.x) - (info.width * anchorOffset.x));
	info.y = Math.round((info.pageHeight * anchorOffset.y) - (info.height * anchorOffset.y));
}

function selectAnchor(pos: Anchors) {
	imageInfo.value.anchorPosition = pos;
	updateValues();
}

function updateValues() {
	updateImageInfo();
	emit('update', _.clone(imageInfo.value));
}

function ok() {
	updateImageInfo();
	emit('ok', _.clone(imageInfo.value));
	emit('close');
}

function cancel() {
	emit('cancel');
	emit('close');
}

defineExpose({imageInfo, updateImageInfo});

</script>

<style>

.body > div {
	display: inline-block;
	margin: 10px;
}

.anchor-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	margin-top: 5px;
	border-top: 1px solid #c7c7c7;
	border-left: 1px solid #c7c7c7;
}

.anchor-cell {
	padding: 6px 12px;
	text-align: center;
	cursor: pointer;
	border-right: 1px solid #c7c7c7;
	border-bottom: 1px solid #c7c7c7;
	color: #606266;
	font-size: 13px;
}

.anchor-cell:hover {
	color: #409eff;
}

.anchor-cell.selected {
	background: #409eff;
	color: #fff;
}

</style>
