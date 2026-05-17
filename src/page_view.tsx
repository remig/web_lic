/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import Switch from "@mui/material/Switch";

import Guide, { type GuideHandle } from "./components/guide";

import { Draw } from "./draw";
import EventBus from "./event_bus";
import {
	type Box,
	type GuideInterface,
	type ItemTypeNames,
	type ItemTypes,
	type LookupItem,
	type Page,
	type Point,
	type Size,
	type Step,
} from "./item_types";
import store from "./store";
import { tr } from "./translations";
import uiState from "./ui_state";
import undoStack from "./undo_stack";
import _ from "./util";

const multiPagePadding = 15;

export interface PageViewHandle {
	scrollToPage(pageId: number): void;
	drawVisiblePages(): void;
	pageUp(): void;
	pageDown(): void;
	pageCoordsToCanvasCoords(point: Point): Point;
	setFacingPage(v: boolean): void;
	setScroll(v: boolean): void;
	forceUpdate(): void;
}

interface PageViewProps {
	app: any;
	selectedItem: LookupItem | null;
	currentPageId: number | null;
}

type MouseDragItem =
	| { type: "guide"; guide: GuideHandle; moved: boolean; x: number; y: number }
	| { type: "item"; item: ItemTypes; moved: boolean; x: number; y: number };

const PageView = forwardRef<PageViewHandle, PageViewProps>(function PageView(
	{ app, selectedItem, currentPageId },
	ref
) {
	const [pageSize, setPageSize] = useState<Size>({
		width: store.state.template.page.width,
		height: store.state.template.page.height,
	});
	const [pageCount, setPageCount] = useState(0);
	const [pageLockStatus, setPageLockStatus] = useState<boolean[]>([]);
	const [facingPage, setFacingPageState] = useState<boolean>(
		uiState.get("pageView.facingPage")
	);
	const [scroll, setScrollState] = useState<boolean>(
		uiState.get("pageView.scroll")
	);

	const mouseDownPt = useRef<Point | null>(null);
	const mouseDragItem = useRef<MouseDragItem | null>(null);
	const guideRefs = useRef<Map<string, GuideHandle>>(new Map());

	// Keep latest closures accessible from stable handle
	const latestRef = useRef<{
		selectedItem: LookupItem | null;
		currentPageId: number | null;
		facingPage: boolean;
		scroll: boolean;
		pageCount: number;
		pageSize: Size;
		pageLockStatus: boolean[];
		app: any;
	}>({
		selectedItem,
		currentPageId,
		facingPage,
		scroll,
		pageCount,
		pageSize,
		pageLockStatus,
		app,
	});

	latestRef.current = {
		selectedItem,
		currentPageId,
		facingPage,
		scroll,
		pageCount,
		pageSize,
		pageLockStatus,
		app,
	};

	const isFacingView =
		facingPage &&
		(currentPageId == null || !store.get.isTemplatePage(currentPageId));
	const isScrollingView =
		scroll &&
		pageCount > 1 &&
		(currentPageId == null || !store.get.isTemplatePage(currentPageId));

	// Keep latest computed values accessible without stale closures
	const isFacingViewRef = useRef(isFacingView);
	const isScrollingViewRef = useRef(isScrollingView);
	isFacingViewRef.current = isFacingView;
	isScrollingViewRef.current = isScrollingView;

	const drawPage = useCallback((canvas: HTMLCanvasElement) => {
		const page = getPageForCanvas(canvas);
		if (page != null) {
			Draw.page(page, canvas, { selectedItem: latestRef.current.selectedItem });
		}
	}, []);

	const drawVisiblePages = useCallback(() => {
		const container = document.getElementById("rightSubPane");
		if (container == null) {
			return;
		}
		const containerHeight = container.offsetHeight;
		const containerTop = container.parentElement?.offsetTop ?? 0;
		document
			.querySelectorAll<HTMLCanvasElement>('canvas[id^="pageCanvas"]')
			.forEach((canvas) => {
				const box = canvas.getBoundingClientRect();
				const y = box.y - containerTop;
				if (y < containerHeight && y + box.height > 0) {
					drawPage(canvas);
				}
			});
	}, [drawPage]);

	const scrollToPage = useCallback(
		(pageId: number) => {
			setTimeout(() => {
				if (!isScrollingViewRef.current) {
					drawVisiblePages();
					return;
				}
				const canvas = getCanvasForPage(pageId);
				if (!canvas) {
					return;
				}
				const container = document.getElementById("rightSubPane");
				if (!container) {
					return;
				}
				const dy =
					(container.offsetHeight - canvas.offsetHeight) / 2 - multiPagePadding;
				let newScroll: number;
				if (isFacingViewRef.current) {
					newScroll =
						(canvas.parentElement?.parentElement?.parentElement?.offsetTop ??
							0) - dy;
				} else {
					newScroll =
						(canvas.parentElement?.parentElement?.offsetTop ?? 0) - dy;
				}
				newScroll = Math.max(0, Math.floor(newScroll));
				if (container.scrollTop === newScroll) {
					drawVisiblePages();
				} else {
					container.scrollTop = newScroll;
				}
			}, 0);
		},
		[drawVisiblePages]
	);

	const doForceUpdate = useCallback(() => {
		const ps = store.state.template.page;
		setPageSize((prev) =>
			prev.width !== ps.width || prev.height !== ps.height
				? { width: ps.width, height: ps.height }
				: prev
		);
		const latestPageCount = store.get.pageCount();
		setPageCount(latestPageCount);
		const newLockStatus: boolean[] = [];
		if (latestPageCount > 0) {
			store.state.pages.forEach(
				(page) => (newLockStatus[page.id] = page.locked)
			);
		}
		setPageLockStatus(newLockStatus);
		setTimeout(drawVisiblePages, 0);
	}, [drawVisiblePages]);

	// page-resize event
	useEffect(() => {
		EventBus.on("page-resize", doForceUpdate);
		return () => EventBus.off("page-resize", doForceUpdate);
	}, [doForceUpdate]);

	// Watch selectedItem for scroll-to-page
	const prevSelectedItem = useRef<LookupItem | null>(null);
	useEffect(() => {
		if (selectedItem === prevSelectedItem.current) {
			return;
		}
		prevSelectedItem.current = selectedItem;

		if (selectedItem == null || currentPageId == null) {
			return;
		}
		const currentPage = store.get.page(currentPageId);
		if (currentPage?.stretchedStep != null) {
			const stretchedStep = {
				type: "step" as ItemTypeNames,
				id: currentPage.stretchedStep.stepID,
			};
			if (store.get.isDescendent(selectedItem, stretchedStep)) {
				scrollToPage(currentPageId);
				return;
			}
		}
		const newPage = store.get.pageForItem(selectedItem);
		if (newPage) {
			scrollToPage(newPage.id);
		} else {
			drawVisiblePages();
		}
	}, [selectedItem, currentPageId, scrollToPage, drawVisiblePages]);

	const mouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0 || e.target == null) {
			return;
		}
		const target = e.target as HTMLElement;
		if (target.nodeName !== "CANVAS" && !target.className.includes("guide")) {
			return;
		}
		mouseDownPt.current = {
			x: e.nativeEvent.offsetX,
			y: e.nativeEvent.offsetY,
		};
		if (target.className.includes("guide") && target.dataset.id != null) {
			const guide = guideRefs.current.get(target.dataset.id);
			if (guide) {
				mouseDragItem.current = {
					type: "guide",
					guide,
					moved: false,
					x: e.screenX,
					y: e.screenY,
				};
			}
		} else if (latestRef.current.selectedItem) {
			const item = store.get.lookupToItem(latestRef.current.selectedItem);
			const page = getPageForCanvas(target);
			if (
				item &&
				store.get.isMoveable(item) &&
				inHighlightBox(
					e.nativeEvent.offsetX,
					e.nativeEvent.offsetY,
					item,
					latestRef.current.pageSize,
					page
				)
			) {
				mouseDragItem.current = {
					type: "item",
					item,
					moved: false,
					x: e.screenX,
					y: e.screenY,
				};
			}
		}
	}, []);

	const mouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (e.buttons !== 1 || e.target == null) {
				return;
			}
			const target = e.target as HTMLElement;
			if (
				mouseDragItem.current == null ||
				(target.nodeName !== "CANVAS" && !target.className.includes("guide"))
			) {
				return;
			}
			const dx = Math.floor(e.screenX - mouseDragItem.current.x);
			const dy = Math.floor(e.screenY - mouseDragItem.current.y);
			if (dx === 0 && dy === 0) {
				return;
			}
			const up = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
			if (mouseDragItem.current.type === "guide") {
				mouseDragItem.current.guide.moveBy(dx, dy);
			} else if (
				mouseDownPt.current &&
				_.geom.distance(mouseDownPt.current, up) > 5 &&
				mouseDragItem.current.type === "item"
			) {
				store.mutations.item.reposition({
					item: mouseDragItem.current.item,
					dx,
					dy,
				});
				mouseDragItem.current.moved = true;
				drawVisiblePages();
			}
			mouseDragItem.current.x = e.screenX;
			mouseDragItem.current.y = e.screenY;
		},
		[drawVisiblePages]
	);

	const mouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0 || e.target == null) {
			return;
		}
		const target = e.target as HTMLElement;
		const appRef = latestRef.current.app;
		if (
			mouseDownPt.current &&
			(mouseDragItem.current == null || !mouseDragItem.current.moved) &&
			target.nodeName === "CANVAS"
		) {
			const page = getPageForCanvas(target);
			const clickTarget = findClickTargetInPage(
				page,
				e.nativeEvent.offsetX,
				e.nativeEvent.offsetY
			);
			if (clickTarget) {
				appRef.setSelected(clickTarget, page);
			} else {
				appRef.clearSelected();
			}
		} else if (mouseDragItem.current?.type === "guide") {
			mouseDragItem.current.guide.savePosition();
		} else if (
			mouseDragItem.current?.type === "item" &&
			mouseDragItem.current.moved
		) {
			const itemTypeName = tr(
				"glossary." + mouseDragItem.current.item.type.toLowerCase()
			);
			const undoText = tr("action.edit.item.move.undo_@mf", {
				item: itemTypeName,
			});
			undoStack.commit("", null, undoText);
		} else if (target.nodeName !== "CANVAS") {
			appRef.clearSelected();
		}
		mouseDownPt.current = null;
		mouseDragItem.current = null;
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			scrollToPage,
			drawVisiblePages,
			pageUp() {
				const { currentPageId: pid, app: appInst } = latestRef.current;
				if (pid == null) {
					return;
				}
				let prevPage = store.get.prevPage({ type: "page", id: pid });
				if (isFacingViewRef.current) {
					const page = store.get.page(pid);
					if (!_.isEven(page.number) && prevPage != null) {
						const prevPrevPage = store.get.prevPage(prevPage);
						if (prevPrevPage) {
							prevPage = prevPrevPage;
						}
					}
				}
				if (prevPage) {
					appInst.clearSelected();
					appInst.setCurrentPage(prevPage);
				}
			},
			pageDown() {
				const { currentPageId: pid, app: appInst } = latestRef.current;
				if (pid == null) {
					return;
				}
				let nextPage = store.get.nextPage({ type: "page", id: pid });
				if (isFacingViewRef.current) {
					const page = store.get.page(pid);
					if (nextPage != null && page.number > 0 && _.isEven(page.number)) {
						const nextNextPage = store.get.nextPage(nextPage);
						if (nextNextPage) {
							nextPage = nextNextPage;
						}
					}
				}
				if (nextPage) {
					appInst.clearSelected();
					appInst.setCurrentPage(nextPage);
				}
			},
			pageCoordsToCanvasCoords(point: Point) {
				const pid = latestRef.current.currentPageId;
				if (pid == null) {
					return { x: 0, y: 0 };
				}
				const canvas = getCanvasForPage(pid);
				if (canvas == null) {
					return { x: 0, y: 0 };
				}
				const box = canvas.getBoundingClientRect();
				return {
					x: Math.floor(point.x - box.x),
					y: Math.floor(point.y - box.y),
				};
			},
			setFacingPage(v: boolean) {
				setFacingPageState(v);
			},
			setScroll(v: boolean) {
				setScrollState(v);
			},
			forceUpdate: doForceUpdate,
		}),
		[scrollToPage, drawVisiblePages, doForceUpdate]
	);

	if (!store || !store.model) {
		return null;
	}

	let pageIDsToDraw: (number | null)[];
	const { width: pageWidth, height: pageHeight } = pageSize;

	if (currentPageId != null && store.get.isTemplatePage(currentPageId)) {
		pageIDsToDraw = [currentPageId];
	} else if (isScrollingView) {
		pageIDsToDraw = store.get.pageList().map((p) => p.id);
		pageIDsToDraw.shift();
		if (isFacingView) {
			pageIDsToDraw.unshift(null);
		}
	} else if (isFacingView) {
		pageIDsToDraw = getPairedPages(currentPageId);
	} else if (currentPageId != null) {
		pageIDsToDraw = [currentPageId];
	} else {
		return null;
	}

	function renderOnePage(idx: number, pageId: number | null, locked: boolean) {
		let lockIcon: React.ReactNode;
		let lockSwitch: React.ReactNode;
		let guideContainer: React.ReactNode;

		if (pageId != null && store.get.page(pageId).subtype !== "templatePage") {
			lockIcon = (
				<i
					className={`pageLockIcon fas ${locked ? "fa-lock" : "fa-lock-open"}`}
				/>
			);
			lockSwitch = (
				<Switch
					className="pageLockSwitch"
					checked={locked}
					onChange={(_e, checked) => setPageLocked(pageId)(checked)}
				/>
			);

			const guides: GuideInterface[] = uiState.get("guides");
			if (!_.isEmpty(guides)) {
				guideContainer = (
					<div className="pageGuideContainer">
						{guides.map((guideProps, guideId) => (
							<Guide
								key={guideId}
								ref={(handle) => {
									const key = `guide-${guideId}`;
									if (handle) {
										guideRefs.current.set(key, handle);
									} else {
										guideRefs.current.delete(key);
									}
								}}
								pageSize={{ width: pageWidth, height: pageHeight }}
								id={guideId}
								{...guideProps}
							/>
						))}
					</div>
				);
			}
		}

		const canvasId = pageId == null ? undefined : getCanvasID(pageId);
		const containerStyle: React.CSSProperties = {
			marginTop: isScrollingView ? multiPagePadding + "px" : undefined,
			marginBottom: isScrollingView ? multiPagePadding + "px" : undefined,
			visibility: pageId == null ? "hidden" : undefined,
		};
		const containerClass = [
			"pageContainer",
			isFacingView && !_.isEven(idx) ? "oddNumberedPage" : "",
		]
			.filter(Boolean)
			.join(" ");

		return (
			<div
				key={pageId ?? `placeholder-${idx}`}
				style={{
					position: "relative",
					display: isFacingView ? "inline" : undefined,
				}}
			>
				<div className={containerClass} style={containerStyle}>
					<canvas
						id={canvasId}
						width={pageWidth}
						height={pageHeight}
						className="pageCanvas"
					/>
					{guideContainer}
				</div>
				{lockIcon}
				{lockSwitch}
			</div>
		);
	}

	const pageNodes: React.ReactNode[] = [];
	if (isFacingView && isScrollingView) {
		let prevNode: React.ReactNode = null;
		pageIDsToDraw.forEach((pageId, idx) => {
			const locked = pageId == null ? false : pageLockStatus[pageId];
			const node = renderOnePage(idx, pageId, locked);
			if (prevNode) {
				pageNodes.push(
					<div key={`pair-${idx}`}>
						{prevNode}
						{node}
					</div>
				);
				prevNode = null;
			} else if (idx === pageIDsToDraw.length - 1) {
				pageNodes.push(<div key={`pair-last-${idx}`}>{node}</div>);
			} else {
				prevNode = node;
			}
		});
	} else {
		pageIDsToDraw.forEach((pageId, idx) => {
			const locked = pageId == null ? false : pageLockStatus[pageId];
			pageNodes.push(renderOnePage(idx, pageId, locked));
		});
	}

	if (isScrollingView) {
		const padHeight = getPageOffset() - multiPagePadding;
		const padStyle = { height: padHeight + "px" };
		pageNodes.unshift(<div key="pad-start" style={padStyle} />);
		pageNodes.push(<div key="pad-end" style={padStyle} />);
	}

	const containerWidth = isFacingView ? pageWidth + pageWidth + 70 : pageWidth;
	const subRoot = (
		<div
			className="pageViewContainer"
			style={{
				width: containerWidth + "px",
				height: isScrollingView ? undefined : pageHeight + "px",
			}}
		>
			{pageNodes}
		</div>
	);

	return (
		<div
			id="rightSubPane"
			className={isScrollingView ? "" : "singleEntry"}
			onMouseDown={mouseDown}
			onMouseMove={mouseMove}
			onMouseUp={mouseUp}
			onScroll={isScrollingView ? drawVisiblePages : undefined}
		>
			{subRoot}
		</div>
	);
});

export default PageView;

// --- Helpers ---

function getPairedPages(pageId: number | null): (number | null)[] {
	if (pageId == null) {
		return [];
	}
	const page = store.get.page(pageId);
	if (store.get.isTitlePage(page)) {
		return [null, page.id];
	} else if (_.isEven(page.number)) {
		const nextPage = store.get.nextPage(page);
		return [page.id, nextPage?.id ?? null];
	}
	const prevPage = store.get.prevPage(page);
	if (prevPage == null || store.get.isTemplatePage(prevPage)) {
		return [null, page.id];
	}
	return [prevPage.id, page.id];
}

function setPageLocked(pageId: number): (locked?: boolean) => void {
	if (pageId == null) {
		return function () {};
	}
	return function (locked) {
		const opts = { page: { type: "page", id: pageId }, locked };
		undoStack.commit(
			"page.setLocked",
			opts,
			locked ? "Lock Page" : "Unlock Page"
		);
	};
}

function getPageOffset(): number {
	const pageHeight = store.state.template.page.height;
	const container = document.getElementById("rightSubPane");
	return container ? (container.offsetHeight - pageHeight) / 2 : 0;
}

function getCanvasID(pageId: number): string {
	return `pageCanvas_${pageId}`;
}

function getPageForCanvas(canvas: HTMLElement): Page {
	const [, id] = canvas.id.split("_");
	return store.get.page(parseInt(id, 10));
}

function getCanvasForPage(pageId: number): HTMLElement | null {
	return document.getElementById(getCanvasID(pageId));
}

function inBox(x: number, y: number, box: Box | null): boolean {
	if (box == null) {
		return false;
	}
	return (
		x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height
	);
}

function inHighlightBox(
	x: number,
	y: number,
	t: LookupItem,
	pageSize: Size,
	page?: Page | null
): boolean {
	const box = store.get.highlightBox(t, pageSize, page);
	return inBox(x, y, box);
}

function inTargetBox(x: number, y: number, t: LookupItem): boolean {
	const box = store.get.targetBox(t);
	return inBox(x, y, box);
}

function findClickTargetInStep(
	step: Step,
	mx: number,
	my: number
): ItemTypes | null {
	if (step.csiID != null) {
		const csi = store.get.csi(step.csiID);
		for (let i = 0; i < csi.annotations.length; i++) {
			const a = store.get.annotation(csi.annotations[i]);
			if (inTargetBox(mx, my, a)) {
				return a;
			}
		}
		if (inTargetBox(mx, my, csi)) {
			return csi;
		}
	}
	if (step.steps.length) {
		for (let i = 0; i < step.steps.length; i++) {
			const innerStep = store.get.step(step.steps[i]);
			const innerTarget = findClickTargetInStep(innerStep, mx, my);
			if (innerTarget) {
				return innerTarget;
			}
		}
	}
	if (step.submodelImages.length) {
		for (let i = 0; i < step.submodelImages.length; i++) {
			const submodelImage = store.get.submodelImage(step.submodelImages[i]);
			if (inTargetBox(mx, my, submodelImage)) {
				if (submodelImage.quantityLabelID != null) {
					const quantityLabel = store.get.quantityLabel(
						submodelImage.quantityLabelID
					);
					if (inTargetBox(mx, my, quantityLabel)) {
						return quantityLabel;
					}
				}
				if (submodelImage.csiID != null) {
					const submodelCSI = store.get.csi(submodelImage.csiID);
					if (inTargetBox(mx, my, submodelCSI)) {
						return submodelCSI;
					}
				}
				return submodelImage;
			}
		}
	}
	if (step.pliID != null && store.state.plisVisible) {
		const pli = store.get.pli(step.pliID);
		if (inTargetBox(mx, my, pli)) {
			for (let i = 0; i < pli.pliItems.length; i++) {
				const pliItem = store.get.pliItem(pli.pliItems[i]);
				if (inTargetBox(mx, my, pliItem)) {
					return pliItem;
				}
				if (pliItem.quantityLabelID != null) {
					const quantityLabel = store.get.quantityLabel(
						pliItem.quantityLabelID
					);
					if (inTargetBox(mx, my, quantityLabel)) {
						return quantityLabel;
					}
				}
			}
			return pli;
		}
	}
	if (step.callouts.length) {
		for (let i = 0; i < step.callouts.length; i++) {
			const callout = store.get.callout(step.callouts[i]);
			if (inTargetBox(mx, my, callout)) {
				for (let j = 0; j < callout.steps.length; j++) {
					const calloutStep = store.get.step(callout.steps[j]);
					const innerTarget = findClickTargetInStep(calloutStep, mx, my);
					if (innerTarget) {
						return innerTarget;
					}
				}
				return callout;
			}
			for (let k = 0; k < callout.calloutArrows.length; k++) {
				const arrow = store.get.calloutArrow(callout.calloutArrows[k]);
				if (inTargetBox(mx, my, arrow)) {
					return arrow;
				}
			}
		}
	}
	const children = store.get.stepChildren(step);
	for (let i = 0; i < children.length; i++) {
		if (inTargetBox(mx, my, children[i])) {
			return children[i];
		}
	}
	if (inTargetBox(mx, my, step)) {
		return step;
	}
	return null;
}

function findClickTargetInPage(
	page: Page,
	mx: number,
	my: number
): ItemTypes | null {
	if (!page) {
		return null;
	}
	if (page.numberLabelID != null) {
		const lbl = store.get.numberLabel(page.numberLabelID);
		if (inTargetBox(mx, my, lbl)) {
			return lbl;
		}
	}
	for (let i = 0; i < page.pliItems.length; i++) {
		const pliItem = store.get.pliItem(page.pliItems[i]);
		if (inTargetBox(mx, my, pliItem)) {
			return pliItem;
		}
		if (pliItem.quantityLabelID != null) {
			const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
			if (inTargetBox(mx, my, quantityLabel)) {
				return quantityLabel;
			}
		}
	}
	for (let i = 0; i < page.annotations.length; i++) {
		const a = store.get.annotation(page.annotations[i]);
		if (inTargetBox(mx, my, a)) {
			return a;
		}
	}
	for (let i = 0; i < page.dividers.length; i++) {
		const divider = store.get.divider(page.dividers[i]);
		let box = _.geom.bbox([divider.p1, divider.p2]);
		box = _.geom.expandBox(box, 8, 8);
		if (inTargetBox(mx, my, { ...divider, ...box })) {
			return divider;
		}
	}
	for (let i = 0; i < page.steps.length; i++) {
		const step = store.get.step(page.steps[i]);
		const innerTarget = findClickTargetInStep(step, mx, my);
		if (innerTarget) {
			return innerTarget;
		}
	}
	if (page.stretchedStep != null) {
		const step = store.get.step(page.stretchedStep.stepID);
		const dx = page.stretchedStep.leftOffset;
		const innerTarget = findClickTargetInStep(step, mx - dx, my);
		if (innerTarget) {
			return innerTarget;
		}
	}
	return page;
}
