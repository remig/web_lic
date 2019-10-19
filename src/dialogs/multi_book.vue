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

		<div class="form-row">
			<el-checkbox v-model="includeTitlePages" class="check-row">
				{{tr('dialog.multi_book.include_title_page')}}
			</el-checkbox>
			<el-checkbox v-model="noSplitSubmodels">
				{{tr('dialog.multi_book.split_submodels')}}
			</el-checkbox>
		</div>

		<div class="form-row">
			<el-radio-group v-model="firstPageNumber">
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

		<div class="form-row">
			<el-radio-group v-model="fileSplit">
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
	if (pageSpread.start === pageSpread.end) {
		const page = store.get.itemByNumber('page', pageSpread.start);
		const startStep = store.get.step(page.steps[0]);
		const endStep = store.get.step(_.last(page.steps));
		if (startStep == null || endStep == null) {
			return null;
		}
	}
	let startPage = store.get.itemByNumber('page', pageSpread.start);
	while (startPage && startPage.subtype !== 'page') {
		startPage = store.get.nextPage(startPage);
	}
	if (startPage == null) {
		return null;
	}
	const startStep = store.get.step(startPage.steps[0]);

	let endPage = store.get.itemByNumber('page', pageSpread.end);
	while (endPage && endPage.subtype !== 'page') {
		endPage = store.get.prevPage(endPage);
	}
	if (endPage == null) {
		return null;
	}
	const endStep = store.get.step(_.last(endPage.steps));

	return {start: startStep.number, end: endStep.number};
}

// Can't split in the middle of a sub model, and can't split between
// the last step of a submodel and its placement in its parent model
// So, given a page number, return true if the last step on that page is in the
// main model or in a different submodel than the first step in the next page
function isPageSplitValid(pageNumber) {
	const page = store.get.itemByNumber('page', pageNumber);
	const lastStep = store.get.step(_.last(page.steps));
	if (lastStep.model.parentStepID == null) {
		return true;
	}
	const nextPage = store.get.nextPage(page);
	const firstStep = store.get.step(nextPage.steps[0]);
	if (lastStep.model.parentStepID === firstStep.model.parentStepID) {
		return false;  // split steps are in same submodel
	}
	// Check if last step is the last step in the submodel, and next step places it in its parent
	if (lastStep.model.parentStepID === firstStep.id) {
		return false;
	}
	return true;
}

function calculateBookSplits(bookCount, pageCount, noSplitSubmodels) {
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

	function splitOffset(i) {
		return Math.ceil(i / 2) * (_.isEven(i) ? 1 : -1);
	}

	// TODO: with a lot of books, this doesn't always work
	if (noSplitSubmodels) {
		// Move each step division forward / backward to nearest submodel completion step
		for (let i = 0; i < bookDivisions.length - 1; i++) {
			let firstValidPage = 1;
			if (i > 0) {
				firstValidPage = bookDivisions[i - 1].pages.end + 1;
			}
			let lastPageNumber = store.get.lastPage().number;
			if (i < bookDivisions.length - 2) {
				lastPageNumber = bookDivisions[i + 1].pages.start - 1;
			}

			const pageSplitNumber = bookDivisions[i].pages.end;
			let split = 0, newPageSplit = pageSplitNumber + splitOffset(split);
			while (
				(newPageSplit >= firstValidPage)
				&& (newPageSplit <= lastPageNumber)
				&& !isPageSplitValid(newPageSplit)
			) {
				split += 1;
				newPageSplit = pageSplitNumber + splitOffset(split);
			}
			if (newPageSplit !== pageSplitNumber) {
				bookDivisions[i].pages.end = newPageSplit;
				bookDivisions[i].steps = pageSpreadToStepSpread(bookDivisions[i].pages);

				bookDivisions[i + 1].pages.start = newPageSplit + 1;
				bookDivisions[i + 1].steps = pageSpreadToStepSpread(bookDivisions[i + 1].pages);
			}
		}
	}

	// Merge any invalid divisions into the previous (or next) division
	for (let i = 0; i < bookDivisions.length; i++) {
		const division = bookDivisions[i];
		if (division.pages.start === division.pages.end) {
			if (i === 0) {
				bookDivisions[1].pages.start = division.pages.start;
				bookDivisions[1].steps = pageSpreadToStepSpread(bookDivisions[1].pages);
			} else {
				bookDivisions[i - 1].pages.end = division.pages.start;
				bookDivisions[i - 1].steps = pageSpreadToStepSpread(bookDivisions[i - 1].pages);
			}
		}
	}

	return bookDivisions.filter(division => {
		return division.pages.start !== division.pages.end;
	});
}

export default {
	data: function() {
		const bookCount = 2;
		const pageCount = store.get.pageCount();
		const bookDivisions = calculateBookSplits(bookCount, pageCount, true);
		return {
			bookCount,
			pageCount,
			bookDivisions,
			includeTitlePages: true,
			noSplitSubmodels: true,
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
			this.bookDivisions = calculateBookSplits(this.bookCount, this.pageCount, this.noSplitSubmodels);
		},
		ok() {
			this.$emit('ok', {
				bookDivisions: _.cloneDeep(this.bookDivisions),
				includeTitlePages: this.includeTitlePages,
				noSplitSubmodels: this.noSplitSubmodels,
				firstPageNumber: this.firstPageNumber,
				fileSplit: this.fileSplit
			});
			this.$emit('close');
		},
		cancel() {
			this.$emit('cancel');
			this.$emit('close');
		}
	},
	computed: {
		dialogWidth() {
			return Math.max(450, this.bookDivisions.length * 150) + 'px';
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

.multiBookDialog .form-row {
	max-width: 400px;
}

.multiBookDialog .check-row {
	margin-bottom: 10px;
}

</style>
