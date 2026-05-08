/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.multi_book.title')"
		:width="dialogWidth"
		class="multiBookDialog"
	>
		<div>
			<span>
				{{t('dialog.multi_book.split_count')}}
			</span>
			<input
				v-model.number="bookCount"
				:min="2"
				type="number"
				class="form-control"
				data-testid="multi-book-book-count"
				@input="updateBookCount"
			>
		</div>
		<div>
			<table class="book-split-table">
				<thead>
					<tr>
						<th v-for="book in bookDivisions" :key="`book_${book.bookNumber}`">
							{{t('dialog.multi_book.book_n_@c', book.bookNumber)}}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td v-for="(book, idx) in bookDivisions" :key="`page_${book.pages.start}`">
							<template v-if="idx === bookDivisions.length - 1">
								{{t('dialog.multi_book.pages_n_@mf', book.pages)}}
							</template>
							<template v-else>
								{{t('dialog.multi_book.pages_n_start_@c', book.pages.start)}}
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
							{{t('dialog.multi_book.steps_n_@mf', book.steps)}}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="form-row">
			<label class="lic-checkbox check-row">
				<input v-model="includeTitlePages" type="checkbox" data-testid="multi-book-title-pages">
				{{t('dialog.multi_book.include_title_page')}}
			</label>
			<label class="lic-checkbox">
				<input v-model="noSplitSubmodels" type="checkbox" data-testid="multi-book-no-split-submodels">
				{{t('dialog.multi_book.split_submodels')}}
			</label>
		</div>

		<div class="form-row">
			<LicTooltip>
				<div
					slot="content"
					v-html="t('dialog.multi_book.page_numbering.start_page_1.tooltip')"
				/>
				<label class="lic-radio">
					<input
						type="radio"
						name="firstPageNumber"
						value="start_page_1"
						:checked="firstPageNumber === 'start_page_1'"
						data-testid="multi-book-page-start-1"
						@change="firstPageNumber = 'start_page_1'"
					>
					{{t('dialog.multi_book.page_numbering.start_page_1.text')}}
				</label>
			</LicTooltip>
			<LicTooltip>
				<div
					slot="content"
					v-html="t('dialog.multi_book.page_numbering.preserve_page_count.tooltip')"
				/>
				<label class="lic-radio">
					<input
						type="radio"
						name="firstPageNumber"
						value="preserve_page_count"
						:checked="firstPageNumber === 'preserve_page_count'"
						data-testid="multi-book-page-start-old"
						@change="firstPageNumber = 'preserve_page_count'"
					>
					{{t('dialog.multi_book.page_numbering.preserve_page_count.text')}}
				</label>
			</LicTooltip>
		</div>

		<div class="form-row">
			<LicTooltip>
				<div
					slot="content"
					v-html="t('dialog.multi_book.file_split.one_file.tooltip')"
				/>
				<label class="lic-radio">
					<input
						type="radio"
						name="fileSplit"
						value="one_file"
						:checked="fileSplit === 'one_file'"
						data-testid="multi-book-one-lic-file"
						@change="fileSplit = 'one_file'"
					>
					{{t('dialog.multi_book.file_split.one_file.text')}}
				</label>
			</LicTooltip>
			<LicTooltip>
				<div
					slot="content"
					v-html="t('dialog.multi_book.file_split.separate_files.tooltip')"
				/>
				<label class="lic-radio">
					<input
						type="radio"
						name="fileSplit"
						value="separate_files"
						:checked="fileSplit === 'separate_files'"
						data-testid="multi-book-many-lic-files"
						@change="fileSplit = 'separate_files'"
					>
					{{t('dialog.multi_book.file_split.separate_files.text')}}
				</label>
			</LicTooltip>
		</div>
		<template #footer>
			<LicButton type="cancel" data-testid="multi-book-cancel" @click="cancel" />
			<LicButton type="ok" data-testid="multi-book-ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref, computed} from 'vue';
import {tr as t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicTooltip from '@/components/base/LicTooltip.vue';
import _ from '../util';
import store from '../store';
import uiState from '../ui_state';

const emit = defineEmits(['ok', 'cancel', 'close']);

function pageSpreadToStepSpread(pageSpread: {start: number; end: number}) {
	if (pageSpread.start === pageSpread.end) {
		const page = store.get.itemByNumber('page', pageSpread.start) as any;
		const startStep = store.get.step(page.steps[0]);
		const endStep = store.get.step(_.last(page.steps) as any);
		if (startStep == null || endStep == null) {
			return null;
		}
	}
	let startPage: any = store.get.itemByNumber('page', pageSpread.start);
	while (startPage && startPage.subtype !== 'page') {
		startPage = store.get.nextPage(startPage);
	}
	if (startPage == null) {
		return null;
	}
	const startStep = store.get.step(startPage.steps[0]);

	let endPage: any = store.get.itemByNumber('page', pageSpread.end);
	while (endPage && endPage.subtype !== 'page') {
		endPage = store.get.prevPage(endPage);
	}
	if (endPage == null) {
		return null;
	}
	const endStep = store.get.step(_.last(endPage.steps) as any);

	return {start: (startStep as any).number, end: (endStep as any).number};
}

// Can't split in the middle of a sub model, and can't split between
// the last step of a submodel and its placement in its parent model
// So, given a page number, return true if the last step on that page is in the
// main model or in a different submodel than the first step in the next page
function isPageSplitValid(pageNumber: number) {
	const page = store.get.itemByNumber('page', pageNumber) as any;
	const lastStep = store.get.step(_.last(page.steps) as any) as any;
	if (lastStep.model.parentStepID == null) {
		return true;
	}
	const nextPage = store.get.nextPage(page) as any;
	const firstStep = store.get.step(nextPage.steps[0]) as any;
	if (lastStep.model.parentStepID === firstStep.model.parentStepID) {
		return false;  // split steps are in same submodel
	}
	// Check if last step is the last step in the submodel, and next step places it in its parent
	if (lastStep.model.parentStepID === firstStep.id) {
		return false;
	}
	return true;
}

function calculateBookSplits(bookCountVal: number, pageCountVal: number, noSplitSubmodelsVal: boolean) {
	const bookDivisionsResult: any[] = [];
	const pagesPerBook = Math.ceil(pageCountVal / bookCountVal);

	for (let i = 0; i < bookCountVal; i++) {
		const pages = {
			start: (i * pagesPerBook) + 1,
			end: Math.min(((i + 1) * pagesPerBook), pageCountVal),
		};
		const steps = pageSpreadToStepSpread(pages);
		bookDivisionsResult.push({bookNumber: i + 1, pages, steps});
	}
	_.last(bookDivisionsResult).pages.end = pageCountVal;

	function splitOffset(i: number) {
		return Math.ceil(i / 2) * (_.isEven(i) ? 1 : -1);
	}

	// TODO: with a lot of books, this doesn't always work
	if (noSplitSubmodelsVal) {
		// Move each step division forward / backward to nearest submodel completion step
		for (let i = 0; i < bookDivisionsResult.length - 1; i++) {
			const division = bookDivisionsResult[i];
			if (division.isInvalid) {
				continue;
			}
			const firstValidPage = division.pages.start;
			const lastPageNumber = (store.get.lastPage() as any).number;

			const pageSplitNumber = division.pages.end;
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
				if (newPageSplit <= division.pages.start) {
					// split went all the way to the begining of this book; mark it for deletion
					division.isInvalid = true;
				} else {
					division.pages.end = newPageSplit;
					division.steps = pageSpreadToStepSpread(division.pages);

					const nextDivision = bookDivisionsResult[i + 1];
					nextDivision.pages.start = newPageSplit + 1;
					if (nextDivision.pages.end <= nextDivision.pages.start) {
						// split went past the entire next book; mark next book for deletion
						nextDivision.isInvalid = true;
					}
					nextDivision.steps = pageSpreadToStepSpread(nextDivision.pages);
				}
			}
		}
	}

	// Merge any invalid divisions into the previous (or next) division
	for (let i = 0; i < bookDivisionsResult.length; i++) {
		const division = bookDivisionsResult[i];
		if (division.isInvalid) {
			if (i === 0) {
				bookDivisionsResult[1].pages.start = division.pages.start;
				bookDivisionsResult[1].steps = pageSpreadToStepSpread(bookDivisionsResult[1].pages);
			} else {
				bookDivisionsResult[i - 1].pages.end = division.pages.start;
				bookDivisionsResult[i - 1].steps = pageSpreadToStepSpread(bookDivisionsResult[i - 1].pages);
			}
		}
	}

	return bookDivisionsResult.filter(division => !division.isInvalid);
}

const pageCount = store.get.pageCount();
const bookCount = ref(2);
const bookDivisions = ref(calculateBookSplits(2, pageCount, true));
const includeTitlePages = ref(true);
const noSplitSubmodels = ref(true);
// firstPageNumber: start_page_1 or preserve_page_count
const firstPageNumber = ref(uiState.get('dialog.multiBook.firstPageNumber'));
const fileSplit = ref('one_file');  // or separate_files

const dialogWidth = computed(() => Math.max(450, bookDivisions.value.length * 150) + 'px');

function updatePageStart() {
	for (let i = 0; i < bookDivisions.value.length - 1; i++) {
		const pageEnd = bookDivisions.value[i].pages.end;
		bookDivisions.value[i + 1].pages.start = pageEnd + 1;
	}
	for (let i = 0; i < bookDivisions.value.length; i++) {
		const division = bookDivisions.value[i];
		division.steps = pageSpreadToStepSpread(division.pages);
	}
}

function updateBookCount() {
	bookDivisions.value = calculateBookSplits(bookCount.value, pageCount, noSplitSubmodels.value);
}

function ok() {
	uiState.set('dialog.multiBook.firstPageNumber', firstPageNumber.value);
	emit('ok', {
		bookDivisions: _.cloneDeep(bookDivisions.value),
		includeTitlePages: includeTitlePages.value,
		noSplitSubmodels: noSplitSubmodels.value,
		firstPageNumber: firstPageNumber.value,
		fileSplit: fileSplit.value,
	});
	emit('close');
}

function cancel() {
	emit('cancel');
	emit('close');
}

</script>

<style>

.multiBookDialog .body > div {
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
