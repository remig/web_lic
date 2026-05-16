/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base :title="title" class="fillTemplate" style="--label-width: 80px">
		<div class="label-input-row">
			{{t('glossary.color')}}
			<LicColorPicker v-model="color" show-alpha @change="updateValues" />
		</div>
		<div v-if="gradient != null" class="label-input-row">
			{{t('template.fill.gradient')}}
			<span>NYI</span>
		</div>
		<div v-if="imageFilename != null" class="label-input-row">
			{{t('template.fill.image')}}
			<div class="flex-row">
				<LicButton
					v-if="imageFilename"
					icon="fas fa-image"
					class="tight"
					@click="pickImage"
				>
					{{truncatedImageName}}
				</LicButton>
				<LicButton
					v-else
					icon="fas fa-image"
					@click="pickImage"
				/>
				<LicButton
					v-if="imageFilename"
					type="text"
					icon="fas fa-times"
					class="template-close"
					@click="removeImage"
				/>
			</div>
		</div>
	</panel-base>
</template>

<script setup lang="ts">

import {computed,ref} from 'vue';

import cache from '../../cache';
import {readDpi} from '../../changedpi';
import {showResizeImageDialog} from '../../dialog';
import openFileHandler from '../../file_uploader';
import store from '../../store';
import {t} from '../../translations';
import _ from '../../util';
import LicButton from '../base/LicButton.vue';
import LicColorPicker from '../base/LicColorPicker.vue';
import PanelBase from './panel_base.vue';

const props = withDefaults(defineProps<{
	templateEntry: string;
	title?: string;
}>(), {
	title: 'template.fill.title',
});

const emit = defineEmits<{(e: 'new-values', val: {type: string; noLayout: boolean}): void}>();

const fillTemplate = () => _.get(store.state.template, props.templateEntry).fill;

const color = ref(fillTemplate().color);
const gradient = ref(fillTemplate().gradient);
const imageFilename = ref(fillTemplate().image == null ? null : fillTemplate().image.filename || '');

const truncatedImageName = computed(() => {
	const fn = imageFilename.value as string;
	return (fn.length > 12) ? fn.substring(0, 5) + '...png' : fn;
});

function updateValues() {
	fillTemplate().color = color.value;
	emit('new-values', {type: props.templateEntry, noLayout: true});
}


function removeImage() {
	imageFilename.value = fillTemplate().image = '';
	updateValues();
}

function pickImage() {
	openFileHandler('.png', 'dataURL', (src: string | ArrayBuffer | null, filename: string) => {
		const template = _.get(store.state.template, props.templateEntry);
		const dpi = Math.round(readDpi(src as string) || 96);
		const originalFillImage = _.cloneDeep(template.fill.image);
		const prevImageFilename = imageFilename.value;
		if (_.isEmpty(template.fill.image)) {
			template.fill.image = {};
		}
		template.fill.image.filename = filename;
		template.fill.image.src = src;
		template.fill.image.dpi = dpi;
		imageFilename.value = filename;

		const image = new Image();
		image.onload = async() => {
			if (props.templateEntry === 'page') {
				if (image.width !== template.width || image.height !== template.height) {
					const imgInfo = template.fill.image;
					imgInfo.width = imgInfo.originalWidth = image.width;
					imgInfo.height = imgInfo.originalHeight = image.height;
					const result = await showResizeImageDialog(
						{
							initialImageInfo: {
								x: 0,
								y: 0,
								preserveSize: false,
								preserveAspectRatio: true,
								anchorPosition: 'center',
								...imgInfo,
								pageWidth: template.width,
								pageHeight: template.height,
							},
						},
						{
							onUpdate: (newImageInfo) => {
								template.fill.image = newImageInfo;
								updateValues();
							},
							onCancel: () => {
								template.fill.image = originalFillImage;
								imageFilename.value = prevImageFilename;
								updateValues();
							},
						},
					);
					if (result != null) {
						template.fill.image = result;
						updateValues();
					}
				}
			}
			cache.set('page', 'backgroundImage', image);
			updateValues();
		};
		image.src = src as string;
	});
}

</script>

<style>

.lic-btn.tight {
	padding: 9px;
	max-width: 110px;
	overflow: hidden;
}

.lic-btn.template-close {
	border: none;
	padding: 0;
}

</style>
