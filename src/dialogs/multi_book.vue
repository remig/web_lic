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
				:min="2"
				type="number"
				class="form-control"
				@input="updateBookCount"
			>
		</div>
		<div>
			<table class="book-split-table">
				<thead>
					<tr>
						<th v-for="book in bookDivisions" :key="`book_${book.bookNumber}`">
							{{tr('dialog.multi_book.book_n_@c', book.bookNumber)}}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td v-for="(book, idx) in bookDivisions" :key="`page_${book.pages.start}`">
							<template v-if="idx === bookDivisions.length - 1">
								{{tr('dialog.multi_book.pages_n_@mf', book.pages)}}
							</template>
							<template v-else>
								{{tr('dialog.multi_book.pages_n_start_@c', book.pages.start)}}
								<input
									v-model.number="book.pages.end"
									:min="book.pages.start"
									type="number"
									class="form-control page-number-input"
									@input="updatePageStart"
								>
							</template>
						</td>
					</tr>
					<tr>
						<td v-for="book in bookDivisions" :key="`step_${book.steps.start}`">
							{{tr('dialog.multi_book.steps_n_@mf', book.steps)}}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div>
			<el-checkbox
				v-model="includeTitlePages"
				@change="updateTitlePages"
			>
				{{tr('dialog.multi_book.include_title_page')}}
			</el-checkbox>
		</div>

		<div>
			<el-radio-group v-model="firstPageNumber" @change="updateFirstPage">
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
			<el-radio-group v-model="fileSplit" @change="updateFileSplit">
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
	let startPage = store.get.itemByNumber('page', pageSpread.start);
	while (startPage.subtype !== 'page') {
		startPage = store.get.nextPage(startPage);
	}
	const startStep = store.get.step(startPage.steps[0]);

	let endPage = store.get.itemByNumber('page', pageSpread.end);
	while (endPage.subtype !== 'page') {
		endPage = store.get.prevPage(endPage);
	}
	const endStep = store.get.step(_.last(endPage.steps));

	return {start: startStep.number, end: endStep.number};
}

function calculateBookSplits(bookCount, pageCount) {
	const bookDivisions = [];
	const pagesPerBook = Math.ceil(pageCount / bookCount);

	for (let i = 0; i < bookCount; i++) {
		const pages = {
			start: (i * pagesPerBook) + 1,
			end: Math.min(((i + 1) * pagesPerBook), pageCount)
		};
		const steps = pageSpreadToStepSpread(pages);
		bookDivisions.push({bookNumber: i + 1, pages, steps});
	}
	_.last(bookDivisions).pages.end = pageCount;
	return bookDivisions;
}

export default {
	data: function() {
		const bookCount = 2;
		const pageCount = store.get.pageCount();
		const bookDivisions = calculateBookSplits(bookCount, pageCount);
		return {
			bookCount,
			pageCount,
			bookDivisions,
			includeTitlePages: true,
			firstPageNumber: 'start_page_1',  // or preserve_page_count
			fileSplit: 'one_file'  // or separate_files
		};
	},
	methods: {
		updatePageStart() {
			for (let i = 0; i < this.bookDivisions.length - 1; i++) {
				const pageEnd = this.bookDivisions[i].pages.end;
				this.bookDivisions[i + 1].pages.start = pageEnd + 1;
			}
			for (let i = 0; i < this.bookDivisions.length; i++) {
				const division = this.bookDivisions[i];
				division.steps = pageSpreadToStepSpread(division.pages);
			}
		},
		updateBookCount() {
			this.bookDivisions = calculateBookSplits(this.bookCount, this.pageCount);
		},
		updateTitlePages() {
		},
		updateFirstPage() {
		},
		updateFileSplit() {
		},
		ok() {
			this.$emit('ok', _.cloneDeep(this.bookDivisions));
			this.$emit('close');
		},
		cancel() {
			this.$emit('cancel');
			this.$emit('close');
		}
	},
	computed: {
		dialogWidth() {
			return Math.max(450, this.bookCount * 150) + 'px';
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
	height: 30px;
	margin-left: 10px;
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

.multiBookDialog .page-number-input {
	margin-left: 0;
	width: 56px;
	padding: 6px;
}

</style>
