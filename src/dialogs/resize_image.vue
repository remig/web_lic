/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.resize_image.title')"
		width="500px"
		class="resizeImageDialog"
	>
		<div>{{bodyText}}</div>
		<div v-if="imageInfo.dpi > 96">
			{{tr('dialog.resize_image.high_dpi_@mf', {dpi: imageInfo.dpi})}}
		</div>
		<el-switch
			v-model="imageInfo.preserveSize"
			:inactive-text="resizeText"
			:active-text="tr('dialog.resize_image.do_nothing')"
			@change="updateValues"
		/>
		<div v-if="needAspectRatioUI">
			<el-checkbox
				v-model="imageInfo.preserveAspectRatio"
				@change="updateValues"
			>
				{{tr('dialog.resize_image.preserve_aspect_ratio')}}
			</el-checkbox>
		</div>
		<div v-if="needPositionUI" class="position-picker">
			<div>
				{{tr('dialog.resize_image.anchor_text')}}
			</div>
			<el-radio-group v-model="imageInfo.anchorPosition" @change="updateValues">
				<table class="anchor-table">
					<tbody>
						<tr>
							<td><el-radio-button label="top_left">
								{{tr('dialog.resize_image.anchors.top_left')}}
							</el-radio-button></td>
							<td><el-radio-button label="top">
								{{tr('dialog.resize_image.anchors.top')}}
							</el-radio-button></td>
							<td><el-radio-button label="top_right">
								{{tr('dialog.resize_image.anchors.top_right')}}
							</el-radio-button></td>
						</tr>
						<tr>
							<td><el-radio-button label="left">
								{{tr('dialog.resize_image.anchors.left')}}
							</el-radio-button></td>
							<td><el-radio-button label="center">
								{{tr('dialog.resize_image.anchors.center')}}
							</el-radio-button></td>
							<td><el-radio-button label="right">
								{{tr('dialog.resize_image.anchors.right')}}
							</el-radio-button></td>
						</tr>
						<tr>
							<td><el-radio-button label="bottom_left">
								{{tr('dialog.resize_image.anchors.bottom_left')}}
							</el-radio-button></td>
							<td><el-radio-button label="bottom">
								{{tr('dialog.resize_image.anchors.bottom')}}
							</el-radio-button></td>
							<td><el-radio-button label="bottom_right">
								{{tr('dialog.resize_image.anchors.bottom_right')}}
							</el-radio-button></td>
						</tr>
					</tbody>
				</table>
			</el-radio-group>
		</div>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("dialog.cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("dialog.ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

import _ from '../util';
import store from '../store';
import LocaleManager from '../components/translate.vue';

const tr = LocaleManager.translate;

const anchorOffsets = {
	top_left: {x: 0, y: 0},
	top: {x: 0.5, y: 0},
	top_right: {x: 1, y: 0},
	left: {x: 0, y: 0.5},
	center: {x: 0.5, y: 0.5},
	right: {x: 1, y: 0.5},
	bottom_left: {x: 0, y: 1},
	bottom: {x: 0.5, y: 1},
	bottom_right: {x: 1, y: 1}
};

export default {
	data: function() {
		const page = store.state.template.page;
		return {
			imageInfo: {
				filename: '',
				src: null,
				width: 0, originalWidth: 0,
				height: 0, originalHeight: 0,
				x: 0, y: 0, dpi: 0,
				preserveSize: true,
				preserveAspectRatio: true,
				anchorPosition: 'top_left',
				pageWidth: page.width,
				pageHeight: page.height
			}
		};
	},
	methods: {
		updateImageInfo() {
			const info = this.imageInfo;
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
		},
		updateValues() {
			this.updateImageInfo();
			this.$emit('update', _.clone(this.imageInfo));
		},
		ok() {
			this.updateImageInfo();
			this.$emit('ok', _.clone(this.imageInfo));
			this.$emit('close');
		},
		cancel() {
			this.$emit('cancel');
			this.$emit('close');
		}
	},
	computed: {
		anchorPositionList() {
			return [
				'top_left', 'top', 'top_right',
				'left', 'center', 'right',
				'bottom_left', 'bottom', 'bottom_right'
			];
		},
		isImageTooBig() {
			const info = this.imageInfo;
			return info.originalWidth > info.pageWidth
				|| info.originalHeight > info.pageHeight;
		},
		bodyText() {
			return tr(`dialog.resize_image.${this.isImageTooBig ? 'too_big' : 'too_small'}`);
		},
		resizeText() {
			return tr(`dialog.resize_image.${this.isImageTooBig ? 'shrink' : 'stretch'}`);
		},
		needAspectRatioUI() {
			if (this.imageInfo.preserveSize || this.aspectRatiosMatch) {
				return false;
			}
			return true;
		},
		needPositionUI() {
			const info = this.imageInfo;
			if (info.preserveSize || this.aspectRatiosMatch || info.preserveAspectRatio) {
				return true;
			}
			return false;
		},
		aspectRatiosMatch() {
			const info = this.imageInfo;
			return _.eq(
				info.originalWidth / info.originalHeight,
				info.pageWidth / info.pageHeight
			);
		}
	}
};
</script>

<style>

.resizeImageDialog .el-dialog__body > div {
	display: inline-block;
	margin: 10px;
}

.resizeImageDialog .anchor-table {
	margin-top: 5px;
}

.resizeImageDialog .anchor-table td {
	width: 33%;
	border: 1px solid #c7c7c7;
}

.resizeImageDialog .el-radio-button {
	width: 100%;
}

.resizeImageDialog .el-radio-button__inner {
	padding: 6px 12px;
	width: 100%;
	border: 0 !important;
	border-radius: 0 !important;
}

</style>
