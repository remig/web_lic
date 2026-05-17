/* Web Lic - Copyright (C) 2019 Remi Gagne */

import React, { useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Tooltip from "@mui/material/Tooltip";

import { Button } from "../components/button";

import store from "../store";
import { tr } from "../translations";
import uiState from "../ui_state";
import _ from "../util";

interface BookDivision {
	bookNumber: number;
	pages: { start: number; end: number };
	steps: { start: number; end: number } | null;
	isInvalid?: boolean;
}

function pageSpreadToStepSpread(pageSpread: { start: number; end: number }) {
	let startPage = store.get.itemByNumber("page", pageSpread.start);
	while (startPage && (startPage as any).subtype !== "page") {
		startPage = store.get.nextPage(startPage);
	}
	if (!startPage) {
		return null;
	}
	const startStep = store.get.step((startPage as any).steps[0]);

	let endPage = store.get.itemByNumber("page", pageSpread.end);
	while (endPage && (endPage as any).subtype !== "page") {
		endPage = store.get.prevPage(endPage);
	}
	if (!endPage) {
		return null;
	}
	const endStep = store.get.step(_.last((endPage as any).steps) as any);
	if (!startStep || !endStep) {
		return null;
	}
	return { start: startStep.number, end: endStep.number };
}

function isPageSplitValid(pageNumber: number): boolean {
	const page = store.get.itemByNumber("page", pageNumber);
	const lastStep = store.get.step(_.last((page as any).steps) as any);
	if (!lastStep || lastStep.model.parentStepID == null) {
		return true;
	}
	if (!page) {
		return true;
	}
	const nextPage = store.get.nextPage(page);
	if (!nextPage) {
		return true;
	}
	const firstStep = store.get.step((nextPage as any).steps[0]);
	if (!firstStep) {
		return true;
	}
	if (lastStep.model.parentStepID === firstStep.model.parentStepID) {
		return false;
	}
	if (lastStep.model.parentStepID === firstStep.id) {
		return false;
	}
	return true;
}

function calculateBookSplits(
	bookCount: number,
	pageCount: number,
	noSplitSubmodels: boolean
): BookDivision[] {
	const pagesPerBook = Math.ceil(pageCount / bookCount);
	const bookDivisions: BookDivision[] = [];
	for (let i = 0; i < bookCount; i++) {
		const pages = {
			start: i * pagesPerBook + 1,
			end: Math.min((i + 1) * pagesPerBook, pageCount),
		};
		bookDivisions.push({
			bookNumber: i + 1,
			pages,
			steps: pageSpreadToStepSpread(pages),
		});
	}
	_.last(bookDivisions)!.pages.end = pageCount;

	function splitOffset(i: number) {
		return Math.ceil(i / 2) * (_.isEven(i) ? 1 : -1);
	}

	if (noSplitSubmodels) {
		for (let i = 0; i < bookDivisions.length - 1; i++) {
			const division = bookDivisions[i];
			if (division.isInvalid) {
				continue;
			}
			const lastPageNumber = store.get.lastPage()?.number ?? 0;
			const pageSplitNumber = division.pages.end;
			let split = 0,
				newPageSplit = pageSplitNumber + splitOffset(split);
			while (
				newPageSplit >= division.pages.start &&
				newPageSplit <= lastPageNumber &&
				!isPageSplitValid(newPageSplit)
			) {
				split += 1;
				newPageSplit = pageSplitNumber + splitOffset(split);
			}
			if (newPageSplit !== pageSplitNumber) {
				if (newPageSplit <= division.pages.start) {
					division.isInvalid = true;
				} else {
					division.pages.end = newPageSplit;
					division.steps = pageSpreadToStepSpread(division.pages);
					const nextDivision = bookDivisions[i + 1];
					nextDivision.pages.start = newPageSplit + 1;
					if (nextDivision.pages.end <= nextDivision.pages.start) {
						nextDivision.isInvalid = true;
					}
					nextDivision.steps = pageSpreadToStepSpread(nextDivision.pages);
				}
			}
		}
	}

	for (let i = 0; i < bookDivisions.length; i++) {
		const division = bookDivisions[i];
		if (division.isInvalid) {
			if (i === 0) {
				bookDivisions[1].pages.start = division.pages.start;
				bookDivisions[1].steps = pageSpreadToStepSpread(bookDivisions[1].pages);
			} else {
				bookDivisions[i - 1].pages.end = division.pages.start;
				bookDivisions[i - 1].steps = pageSpreadToStepSpread(
					bookDivisions[i - 1].pages
				);
			}
		}
	}

	return bookDivisions.filter((d) => !d.isInvalid);
}

interface Props {
	onOk: (v: any) => void;
	onCancel: () => void;
	onClose: () => void;
}

export default function MultiBookDialog({ onOk, onCancel, onClose }: Props) {
	const pageCount = store.get.pageCount();
	const [bookCount, setBookCount] = useState(2);
	const [bookDivisions, setBookDivisions] = useState<BookDivision[]>(() =>
		calculateBookSplits(2, pageCount, true)
	);
	const [includeTitlePages, setIncludeTitlePages] = useState(true);
	const [noSplitSubmodels, setNoSplitSubmodels] = useState(true);
	const [firstPageNumber, setFirstPageNumber] = useState<string>(
		uiState.get("dialog.multiBook.firstPageNumber") || "start_page_1"
	);
	const [fileSplit, setFileSplit] = useState("one_file");

	function updateBookCount(count: number) {
		setBookCount(count);
		setBookDivisions(calculateBookSplits(count, pageCount, noSplitSubmodels));
	}

	function updatePageStart(divisions: BookDivision[]) {
		const updated = [...divisions];
		for (let i = 0; i < updated.length - 1; i++) {
			updated[i + 1].pages.start = updated[i].pages.end + 1;
		}
		for (let i = 0; i < updated.length; i++) {
			updated[i].steps = pageSpreadToStepSpread(updated[i].pages);
		}
		setBookDivisions(updated);
	}

	function ok() {
		uiState.set("dialog.multiBook.firstPageNumber", firstPageNumber);
		onOk({
			bookDivisions: _.cloneDeep(bookDivisions),
			includeTitlePages,
			noSplitSubmodels,
			firstPageNumber,
			fileSplit,
		});
	}

	const dialogWidth = Math.max(450, bookDivisions.length * 150) + "px";

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="multiBookDialog"
			PaperProps={{ style: { width: dialogWidth } }}
		>
			<DialogTitle>{tr("dialog.multi_book.title")}</DialogTitle>
			<DialogContent>
				<div style={{ display: "inline-block", margin: 12, width: "100%" }}>
					<label>{tr("dialog.multi_book.split_count")}</label>
					<input
						type="number"
						min={2}
						className="form-control"
						value={bookCount}
						style={{
							display: "inline-block",
							width: 75,
							height: 30,
							marginLeft: 10,
						}}
						data-testid="multi-book-book-count"
						onChange={(e) => updateBookCount(parseInt(e.target.value, 10) || 2)}
					/>
				</div>
				<div style={{ display: "inline-block", margin: 12, width: "100%" }}>
					<table style={{ width: "100%", textAlign: "center" }}>
						<thead>
							<tr>
								{bookDivisions.map((book) => (
									<th
										className="form-label"
										key={`book_${book.bookNumber}`}
										style={{ textAlign: "center" }}
									>
										{tr("dialog.multi_book.book_n_@c", book.bookNumber)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							<tr>
								{bookDivisions.map((book, idx) => (
									<td key={`page_${book.pages.start}`}>
										{idx === bookDivisions.length - 1 ? (
											<label>
												{tr("dialog.multi_book.pages_n_@mf", book.pages)}
											</label>
										) : (
											<>
												<label>
													{tr(
														"dialog.multi_book.pages_n_start_@c",
														book.pages.start
													)}
												</label>
												<input
													type="number"
													min={book.pages.start}
													className="form-control page-number-input"
													value={book.pages.end}
													style={{
														display: "inline-block",
														width: 56,
														marginLeft: 0,
														padding: 6,
													}}
													onChange={(e) => {
														const updated = [...bookDivisions];
														updated[idx].pages.end = parseInt(
															e.target.value,
															10
														);
														updatePageStart(updated);
													}}
												/>
											</>
										)}
									</td>
								))}
							</tr>
							<tr>
								{bookDivisions.map((book) => (
									<td key={`step_${book.steps?.start}`}>
										<label>
											{book.steps
												? tr("dialog.multi_book.steps_n_@mf", book.steps)
												: ""}
										</label>
									</td>
								))}
							</tr>
						</tbody>
					</table>
				</div>
				<div className="form-row2" style={{ maxWidth: 400, margin: 12 }}>
					<FormControlLabel
						className="el-checkbox"
						control={
							<Checkbox
								checked={includeTitlePages}
								data-testid="multi-book-title-pages"
								onChange={(e) => setIncludeTitlePages(e.target.checked)}
							/>
						}
						label={tr("dialog.multi_book.include_title_page")}
						style={{ display: "block", marginBottom: 10 }}
					/>
					<FormControlLabel
						className="el-checkbox"
						control={
							<Checkbox
								checked={noSplitSubmodels}
								data-testid="multi-book-no-split-submodels"
								onChange={(e) => setNoSplitSubmodels(e.target.checked)}
							/>
						}
						label={tr("dialog.multi_book.split_submodels")}
					/>
				</div>
				<div className="form-row2" style={{ maxWidth: 400, margin: 12 }}>
					<RadioGroup
						value={firstPageNumber}
						onChange={(e) => setFirstPageNumber(e.target.value)}
					>
						<Tooltip
							title={
								<span
									dangerouslySetInnerHTML={{
										__html: tr(
											"dialog.multi_book.page_numbering.start_page_1.tooltip"
										),
									}}
								/>
							}
						>
							<FormControlLabel
								className="el-radio"
								value="start_page_1"
								control={<Radio data-testid="multi-book-page-start-1" />}
								label={tr("dialog.multi_book.page_numbering.start_page_1.text")}
								style={{ marginBottom: 10 }}
							/>
						</Tooltip>
						<Tooltip
							title={
								<span
									dangerouslySetInnerHTML={{
										__html: tr(
											"dialog.multi_book.page_numbering.preserve_page_count.tooltip"
										),
									}}
								/>
							}
						>
							<FormControlLabel
								className="el-radio"
								value="preserve_page_count"
								control={<Radio data-testid="multi-book-page-start-old" />}
								label={tr(
									"dialog.multi_book.page_numbering.preserve_page_count.text"
								)}
							/>
						</Tooltip>
					</RadioGroup>
				</div>
				<div className="form-row2" style={{ maxWidth: 400, margin: 12 }}>
					<RadioGroup
						value={fileSplit}
						onChange={(e) => setFileSplit(e.target.value)}
					>
						<Tooltip
							title={
								<span
									dangerouslySetInnerHTML={{
										__html: tr("dialog.multi_book.file_split.one_file.tooltip"),
									}}
								/>
							}
						>
							<FormControlLabel
								className="el-radio"
								value="one_file"
								control={<Radio data-testid="multi-book-one-lic-file" />}
								label={tr("dialog.multi_book.file_split.one_file.text")}
								style={{ marginBottom: 10 }}
							/>
						</Tooltip>
						<Tooltip
							title={
								<span
									dangerouslySetInnerHTML={{
										__html: tr(
											"dialog.multi_book.file_split.separate_files.tooltip"
										),
									}}
								/>
							}
						>
							<FormControlLabel
								className="el-radio"
								value="separate_files"
								control={<Radio data-testid="multi-book-many-lic-files" />}
								label={tr("dialog.multi_book.file_split.separate_files.text")}
							/>
						</Tooltip>
					</RadioGroup>
				</div>
			</DialogContent>
			<DialogActions>
				<Button
					variant="cancel"
					data-testid="multi-book-cancel"
					onClick={onCancel}
				/>
				<Button variant="ok" data-testid="multi-book-ok" onClick={ok} />
			</DialogActions>
		</Dialog>
	);
}
