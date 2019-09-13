/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.multi_book.title')"
		:width="dialogWidth"
		class="multiBookDialog"
	>
		<div>
			<span>
				{{tr('dialog.multi_book.split_count')}}
			</span>
			<input
				v-model.number="bookCount"
				:min="1"
				type="number"
				class="form-control"
				@input="updateValues"
			>
		</div>
		<div>
			<table class="book-split-table">
				<thead>
					<tr>
						<th v-for="n in bookCount" :key="`book_${n}`">
							{{tr('dialog.multi_book.book_n_@mf', {n})}}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td v-for="n in pageDivisions" :key="`page_${n.start}`">
							{{tr('dialog.multi_book.pages_n_@mf', n)}}
						</td>
					</tr>
					<tr>
						<td v-for="n in stepDivisions" :key="`step_${n.start}`">
							{{tr('dialog.multi_book.steps_n_@mf', n)}}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div>
			<el-checkbox
				v-model="includeTitlePages"
				@change="updateValues"
			>
				{{tr('dialog.multi_book.include_title_page')}}
			</el-checkbox>
		</div>

		<div>
			<el-radio-group v-model="firstPageNumber" @change="updateValues">
				<licTooltip>
					<div
						slot="content"
						v-html="tr('dialog.multi_book.page_numbering.start_page_1.tooltip')"
					/>
					<el-radio label="start_page_1">
						{{tr('dialog.multi_book.page_numbering.start_page_1.text')}}
					</el-radio>
				</licTooltip>
				<licTooltip>
					<div
						slot="content"
						v-html="tr('dialog.multi_book.page_numbering.preserve_page_count.tooltip')"
					/>
					<el-radio label="preserve_page_count">
						{{tr('dialog.multi_book.page_numbering.preserve_page_count.text')}}
					</el-radio>
				</licTooltip>
			</el-radio-group>
		</div>

		<div>
			<el-radio-group v-model="fileSplit" @change="updateValues">
				<licTooltip>
					<div
						slot="content"
						v-html="tr('dialog.multi_book.file_split.one_file.tooltip')"
					/>
					<el-radio label="one_file">
						{{tr('dialog.multi_book.file_split.one_file.text')}}
					</el-radio>
				</licTooltip>
				<licTooltip>
					<div
						slot="content"
						v-html="tr('dialog.multi_book.file_split.separate_files.tooltip')"
					/>
					<el-radio label="separate_files">
						{{tr('dialog.multi_book.file_split.separate_files.text')}}
					</el-radio>
				</licTooltip>
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

function pageSpreadToStepSpread(pageSpread) {
	const startPage = store.get.itemByNumber('page', pageSpread.start) || store.get.firstPage();
	const startStep = store.get.step(startPage.steps[0]);
	const endPage = store.get.itemByNumber('page', pageSpread.end) || store.get.lastPage();
	const endStep = store.get.step(_.last(endPage.steps));
	return {start: startStep.number, end: endStep.number};
}

export default {
	data: function() {
		return {
			bookCount: 2,
			pageCount: store.get.totalPageCount(),
			includeTitlePages: true,
			firstPageNumber: 'start_page_1',  // or preserve_page_count
			fileSplit: 'one_file'  // or separate_files
		};
	},
	methods: {
		updateValues() {
			this.$emit('update', {});
		},
		ok() {
			this.$emit('ok', {});
			this.$emit('close');
		},
		cancel() {
			this.$emit('cancel');
			this.$emit('close');
		}
	},
	computed: {
		dialogWidth() {
			return Math.max(450, this.bookCount * 115) + 'px';
		},
		pageDivisions() {
			const pagesPerBook = Math.ceil(this.pageCount / this.bookCount);
			const res = [];
			for (let i = 0; i < this.bookCount; i++) {
				res.push({start: (i * pagesPerBook) + 1, end: ((i + 1) * pagesPerBook)});
			}
			_.last(res).end = this.pageCount;
			return res;
		},
		stepDivisions() {
			const pageDivisions = this.pageDivisions;
			const res = pageDivisions.map(pageSpread => {
				return pageSpreadToStepSpread(pageSpread);
			});
			return res;
		}
	}
};
</script>

<style>

.multiBookDialog .el-dialog__body > div {
	display: inline-block;
	margin: 12px;
	width: 100%;
}

.multiBookDialog input {
	display: inline-block;
	width: 75px;
	margin-left: 20px;
}

.multiBookDialog .book-split-table {
	width: 100%;
	text-align: center;
}

.multiBookDialog th {
	text-align: center;
}

.multiBookDialog .el-radio {
	margin-bottom: 10px;
}

</style>