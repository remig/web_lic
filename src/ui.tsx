/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import Split from "split.js";

import GettingStarted from "./components/getting_started";
import NavBar from "./components/nav_bar";
import NavTreeContainer from "./components/nav_tree_container";
import PopupMenu from "./components/popup_menu";
import TemplatePanel from "./components/template_panel";
import { TranslateDialog } from "./components/translate";

import packageInfo from "../package.json";
import backwardCompat from "./backward_compat";
import ContextMenu from "./context_menu";
import DialogManager from "./dialog";
import { DialogProvider } from "./dialogs/dialog_provider";
import { DialogProvider2 } from "./dialogs/dialog_provider_2";
import ImportModelDialog from "./dialogs/import_model";
import EventBus from "./event_bus";
import openFileHandler from "./file_uploader";
import { LookupItem } from "./item_types";
import LDParse from "./ld_parse";
import Menu from "./menu";
import NavTree from "./navtree";
import PageView, { type PageViewHandle } from "./page_view";
import Storage from "./storage";
import store from "./store";
import { tr } from "./translations";
import uiState from "./ui_state";
import undoStack from "./undo_stack";
import _ from "./util";

export default function App() {
	// ── State ────────────────────────────────────────────────────────────────
	const [currentPageId, setCurrentPageId] = useState<number | null>(null);
	const [selectedItemLookup, setSelectedItemLookup] =
		useState<LookupItem | null>(null);
	const [statusText, setStatusText] = useState("");
	const [busyText, setBusyText] = useState("");
	const [contextMenuEntries, setContextMenuEntries] = useState<any[] | null>(
		null
	);
	const [contextMenuPos, setContextMenuPos] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [filename, setFilename] = useState<string | null>(null);
	const [navMenuOpen, setNavMenuOpen] = useState<string | null>(null); // id of open nav menu
	const [renderCount, setRenderCount] = useState(0); // for forcing re-renders

	// ── Dialogs───────────────────────────────────────────────────────────────
	const [pickLanguageDialog, showPickLanguageDialog] = useState(false);
	const [importDialogModel, setImportDialogModel] = useState<any>(null);

	// ── Refs ─────────────────────────────────────────────────────────────────
	const pageViewRef = useRef<PageViewHandle>(null);
	const dirtyState = useRef({ undoIndex: 0, lastSaveIndex: 0 });
	const importStartRef = useRef(0);
	const lastRightClickPos = useRef({ x: 0, y: 0 });
	const disableLocalStorage = useRef(false);
	const currentPageIdRef = useRef(currentPageId);
	const selectedItemRef = useRef(selectedItemLookup);

	// Keep refs in sync with state
	currentPageIdRef.current = currentPageId;
	selectedItemRef.current = selectedItemLookup;

	// ── Derived ──────────────────────────────────────────────────────────────
	const isDirty =
		dirtyState.current.undoIndex !== dirtyState.current.lastSaveIndex;

	const isTemplatePageCurrent = useMemo(() => {
		if (currentPageId == null) {
			return false;
		}
		return store.get.isTemplatePage(currentPageId);
	}, [currentPageId, renderCount]); // eslint-disable-line react-hooks/exhaustive-deps

	const haveModel = () => store != null && store.model != null;

	// ── Force re-render ───────────────────────────────────────────────────────
	const forceRerender = useCallback(() => setRenderCount((n) => n + 1), []);

	// ── App API methods (stable, stored in ref) ───────────────────────────────

	const drawCurrentPage = useCallback(() => {
		const pageId = currentPageIdRef.current;
		if (pageId != null) {
			let page = store.get.lookupToItem(pageId, "page");
			if (page == null) {
				page = store.get.firstPage();
				const newId = page ? page.id : null;
				setCurrentPageId(newId);
				currentPageIdRef.current = newId;
			}
			setTimeout(() => pageViewRef.current?.drawVisiblePages(), 0);
		}
	}, []);

	const clearSelected = useCallback(() => {
		setContextMenuEntries(null);
		setSelectedItemLookup(null);
		selectedItemRef.current = null;
		drawCurrentPage();
		NavTree.clearSelected();
	}, [drawCurrentPage]);

	const setCurrentPage = useCallback((page: any) => {
		if (page.id !== currentPageIdRef.current) {
			setCurrentPageId(page.id);
			currentPageIdRef.current = page.id;
			setTimeout(() => pageViewRef.current?.scrollToPage(page.id), 0);
		}
	}, []);

	const setSelected = useCallback((target: any, page?: any) => {
		setContextMenuEntries(null);
		if (
			_.itemEq(target, selectedItemRef.current) &&
			(page == null || page.id === currentPageIdRef.current)
		) {
			return;
		}
		let targetPage;
		if (page) {
			targetPage = page;
		} else if (target.type === "submodel") {
			targetPage = store.get.pageForItem({ type: "step", id: target.stepID });
		} else {
			targetPage = store.get.pageForItem(target);
		}
		if (targetPage != null && targetPage.id !== currentPageIdRef.current) {
			setCurrentPageId(targetPage.id);
			currentPageIdRef.current = targetPage.id;
		}
		const lookup = store.get.itemToLookup(target);
		setSelectedItemLookup(lookup);
		selectedItemRef.current = lookup;
		NavTree.selectItem(target);
	}, []);

	const updateProgress: (opts?: any) => void = (() => {
		let progress = 0,
			count = 0,
			text = "";
		return function (opts?: any) {
			if (opts == null) {
				progress++;
			} else if (typeof opts === "string") {
				progress++;
				text = opts;
			} else {
				if (opts.stepCount) {
					count = opts.stepCount;
					progress = 0;
				}
				if (opts.clear) {
					setBusyText("");
					text = "";
					progress = count = 0;
				}
				if (opts.text) {
					text = opts.text;
				}
			}
			const bar = document.getElementById("progressbar");
			if (bar) {
				const pct = Math.floor((progress / count) * 100) || 0;
				bar.style.width = `${pct}%`;
				bar.innerText = text || bar.style.width;
			}
		};
	})();

	const forceUIUpdate = useCallback(() => {
		NavTree.update();
		forceRerender();
		setTimeout(() => pageViewRef.current?.drawVisiblePages(), 0);
	}, [forceRerender]);

	const redrawUI = useCallback(
		(props: { clearSelection?: boolean } = {}) => {
			setTimeout(() => {
				if (props.clearSelection) {
					clearSelected();
				}
				forceUIUpdate();
				drawCurrentPage();
			}, 0);
		},
		[clearSelected, forceUIUpdate, drawCurrentPage]
	);

	const clearState = useCallback(() => {
		clearSelected();
		setCurrentPageId(null);
		currentPageIdRef.current = null;
		setStatusText("");
		updateProgress({ clear: true });
		setContextMenuEntries(null);
		setFilename(null);
		dirtyState.current = { undoIndex: 0, lastSaveIndex: 0 };
		forceUIUpdate();
	}, [clearSelected, forceUIUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

	// ── Model operations ──────────────────────────────────────────────────────

	const closeModel = useCallback(() => {
		store.resetState();
		undoStack.clear();
		Storage.clear.model();
		clearState();
		store.render.clearCanvasCache();
		setTimeout(() => clearSelected(), 0);
	}, [clearState, clearSelected]);

	const importBuiltInModel = useCallback((url: string) => {
		const fullUrl = "./static/models/" + url;
		importModel(() => LDParse.loadRemotePart(fullUrl, updateProgress));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const importCustomModel = useCallback(() => {
		const importContent = (
			content: string | ArrayBuffer | null,
			fn: string
		) => {
			importModel(() =>
				LDParse.loadModelContent(content as string, fn, updateProgress)
			);
		};
		openFileHandler(".ldr, .mpd", "text", importContent);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const importModel = useCallback(
		async (modelGenerator: () => Promise<any>) => {
			importStartRef.current = Date.now();
			if (store.model) {
				closeModel();
			}
			await LDParse.loadLDConfig();
			setBusyText(tr("dialog.busy_indicator.loading_model"));
			const model = await modelGenerator();

			if (!_.isEmpty(LDParse.missingParts)) {
				await DialogManager("missingPartsDialog");
			}

			await store.mutations.templatePage.add();
			store.setModel(model);
			setFilename(store.state.licFilename);
			store.render.adjustCameraZoom();
			setImportDialogModel(model);
		},
		[closeModel]
	);

	const openLicFile = useCallback(() => {
		openFileHandler(".lic", "text", openLicFileFromContent);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const openLicFileFromContent = useCallback(
		(content: any) => {
			const start = Date.now();
			if (typeof content === "string") {
				content = JSON.parse(content);
			}
			backwardCompat.fixLicSaveFile(content);
			if (store.model) {
				closeModel();
			}
			store.load(content);
			setFilename(store.state.licFilename);
			const firstPage = store.get.firstPage();
			setCurrentPageId(firstPage?.id ?? null);
			currentPageIdRef.current = firstPage?.id ?? null;
			store.saveLocal();
			undoStack.saveBaseState();
			clearSelected();
			const time = _.formatTime(start, Date.now());
			const fn = store.model?.filename;
			setStatusText(
				tr("action.file.open_lic.success_message_@mf", { filename: fn, time })
			);
			setTimeout(() => {
				forceUIUpdate();
				drawCurrentPage();
			}, 0);
		},
		[clearSelected, closeModel, forceUIUpdate, drawCurrentPage]
	);

	const save = useCallback(() => {
		store.saveToFile();
		dirtyState.current.lastSaveIndex = undoStack.getIndex();
	}, []);

	const saveAs = useCallback(() => {
		DialogManager("stringChooserDialog", (dialog) => {
			dialog.$on("ok", (newString: string) => {
				const fn = newString
					.replace(/[^a-zA-Z0-9 _]/gi, "")
					.replace(/li[ct]$/gi, "");
				setFilename(fn);
				store.state.licFilename = fn;
				save();
			});
			dialog.title = tr("dialog.save_as.title");
			dialog.label = tr("dialog.save_as.fn");
			dialog.newString = filename ?? "";
		});
	}, [filename, save]);

	const saveTemplate = useCallback(
		(fn?: string) => {
			store.saveTemplate(fn || filename || "template");
		},
		[filename]
	);

	const saveTemplateAs = useCallback(() => {
		DialogManager("stringChooserDialog", (dialog) => {
			dialog.$on("ok", (newString: string) => {
				const fn = newString
					.replace(/[^a-zA-Z0-9 _]/gi, "")
					.replace(/li[ct]$/gi, "");
				saveTemplate(fn);
			});
			dialog.title = tr("dialog.save_template_as.title");
			dialog.label = tr("dialog.save_template_as.fn");
			dialog.newString = filename ?? "";
		});
	}, [filename, saveTemplate]);

	const importTemplate = useCallback(() => {
		const doImport = (result: string | ArrayBuffer | null, fn: string) => {
			const content = JSON.parse(result as string);
			backwardCompat.fixLicTemplate(content);
			undoStack.commit("templatePage.load", content, "Load Template");
			setStatusText(
				tr("action.file.template.load.success_message_@mf", { filename: fn })
			);
			setTimeout(() => {
				drawCurrentPage();
				forceUIUpdate();
			}, 0);
		};
		openFileHandler(".lit", "text", doImport);
	}, [drawCurrentPage, forceUIUpdate]);

	const setPageView = useCallback(
		({
			facingPage = false,
			scroll = false,
		}: {
			facingPage?: boolean;
			scroll?: boolean;
		}) => {
			clearSelected();
			if (pageViewRef.current) {
				pageViewRef.current.setFacingPage(facingPage);
				pageViewRef.current.setScroll(scroll);
			}
			uiState.set("pageView", { facingPage, scroll });
			if (scroll) {
				setTimeout(
					() => pageViewRef.current?.scrollToPage(currentPageIdRef.current!),
					0
				);
			} else {
				setTimeout(() => pageViewRef.current?.drawVisiblePages(), 0);
			}
		},
		[clearSelected]
	);

	const pageCoordsToCanvasCoords = useCallback((point: any) => {
		return (
			pageViewRef.current?.pageCoordsToCanvasCoords(point) ?? { x: 0, y: 0 }
		);
	}, []);

	// ── Context menu ───────────────────────────────────────────────────────────

	const closeMenus = useCallback(() => {
		setNavMenuOpen(null);
		setContextMenuEntries(null);
		setContextMenuPos(null);
	}, []);

	const rightClick = useCallback(
		(e: React.MouseEvent) => {
			closeMenus();
			lastRightClickPos.current = { x: e.clientX, y: e.clientY };
			const selItem = selectedItemRef.current;
			const pageId = currentPageIdRef.current;
			if (
				selItem != null &&
				pageId != null &&
				!store.get.isTemplatePage(pageId)
			) {
				setTimeout(() => {
					const menu = ContextMenu(selItem, appApi.current);
					if (menu && menu.length) {
						setContextMenuEntries(menu);
						setContextMenuPos({ x: e.clientX, y: e.clientY });
					}
				}, 0);
			}
		},
		[closeMenus]
	);

	// ── Keyboard handler ──────────────────────────────────────────────────────

	const globalKeyPress = useCallback(
		(e: KeyboardEvent, metaKeyDown: boolean) => {
			closeMenus();
			const selItem = selectedItemRef.current;
			if (e.key === "PageDown") {
				pageViewRef.current?.pageDown();
			} else if (e.key === "PageUp") {
				pageViewRef.current?.pageUp();
			} else if (e.key === "Enter") {
				DialogManager.ok();
			} else if (e.key === "Escape") {
				DialogManager.cancel();
			} else if (e.key === "Delete" || e.key === "Backspace") {
				if (
					selItem &&
					!store.get.isTemplatePage(store.get.pageForItem(selItem)) &&
					(store.mutations as any)[selItem.type] &&
					(store.mutations as any)[selItem.type].delete
				) {
					const opts: any = { doLayout: true };
					opts[selItem.type] = selItem;
					const undoText = tr("action.edit.item.delete.undo_@mf", {
						item: tr("glossary." + selItem.type.toLowerCase()),
					});
					try {
						clearSelected();
						undoStack.commit(`${selItem.type}.delete`, opts, undoText);
					} catch {
						// delete not supported
					}
				}
			} else if (e.key.startsWith("Arrow")) {
				if (selItem && store.get.isMoveable(selItem)) {
					let dx = 0,
						dy = 0,
						dv = 1;
					dv *= e.shiftKey ? 5 : 1;
					dv *= e.ctrlKey ? 20 : 1;
					if (e.key === "ArrowUp") dy = -dv;
					else if (e.key === "ArrowDown") dy = dv;
					else if (e.key === "ArrowLeft") dx = -dv;
					else if (e.key === "ArrowRight") dx = dv;

					const item = store.get.lookupToItem(selItem);
					if (dx !== 0 || dy !== 0) {
						const undoText = tr("action.edit.item.move.undo_@mf", {
							item: tr("glossary." + selItem.type.toLowerCase()),
						});
						undoStack.commit("item.reposition", { item, dx, dy }, undoText);
					}
				}
			} else {
				const menu = Menu(appApi.current) as any[];
				const key = (e.ctrlKey || metaKeyDown ? "ctrl+" : "") + e.key;
				for (let i = 0; i < menu.length; i++) {
					for (let j = 0; j < menu[i].children.length; j++) {
						const entry = menu[i].children[j];
						if (entry.shortcut === key) {
							entry.cb();
						}
					}
				}
			}
		},
		[closeMenus, clearSelected]
	);

	// ── Stable app API ref (used by Menu / ContextMenu) ───────────────────────
	const appApi = useRef<any>({});

	// Update appApi fields each render so they always have fresh closures
	appApi.current = {
		clearSelected,
		setSelected,
		setCurrentPage,
		drawCurrentPage,
		forceUIUpdate,
		redrawUI,
		updateProgress,
		importBuiltInModel,
		importCustomModel,
		openLicFile,
		openLicFileFromContent,
		save,
		saveAs,
		saveTemplate,
		saveTemplateAs,
		importTemplate,
		closeModel,
		setPageView,
		pageCoordsToCanvasCoords,
		closeMenus,
		haveModel,
		// Properties read by menu entries
		get busyText() {
			return busyText;
		},
		set busyText(v: string) {
			setBusyText(v);
		},
		get statusText() {
			return statusText;
		},
		set statusText(v: string) {
			setStatusText(v);
		},
	};

	// ── Mount effects ─────────────────────────────────────────────────────────

	useEffect(() => {
		const onKeyUp = (e: KeyboardEvent) => globalKeyPress(e, false);
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey && e.key !== "Meta") {
				globalKeyPress(e, true);
			}
			if (
				(e.key === "PageDown" ||
					e.key === "PageUp" ||
					e.key.startsWith("Arrow") ||
					(e.key === "s" && e.ctrlKey)) &&
				(e.target as HTMLElement).nodeName !== "INPUT"
			) {
				e.preventDefault();
			}
		};
		document.body.addEventListener("keyup", onKeyUp);
		document.body.addEventListener("keydown", onKeyDown);

		window.addEventListener("beforeunload", (e) => {
			if (!disableLocalStorage.current) {
				const splitStyle = document.getElementById("leftPane")?.style;
				if (splitStyle) {
					const m = splitStyle.width.match(/calc\(([0-9.]*)%/);
					if (m) uiState.set("splitter", parseFloat(m[1]));
				}
				uiState.set("lastUsedVersion", packageInfo.version);
				Storage.replace.ui(uiState.getCurrentState());
				if (dirtyState.current.undoIndex !== dirtyState.current.lastSaveIndex) {
					const msg = "You have unsaved changes. Leave anyway?";
					e.returnValue = msg;
					return msg;
				}
			}
			return null;
		});

		EventBus.on("set-selected", (item) => setSelected(item));
		EventBus.on("redraw-ui", (props = {}) => redrawUI(props));

		undoStack.onChange(() => {
			dirtyState.current.undoIndex = undoStack.getIndex();
			redrawUI();
		});

		// Splitter
		const split = Storage.get.ui().splitter;
		Split(["#leftPane", "#rightPane"], {
			sizes: [split, 100 - split],
			minSize: [100, store.state.template.page.width + 10],
			direction: "horizontal",
			gutterSize: 5,
			snapOffset: 0,
		});

		// Startup sequence
		(async () => {
			if (
				_.version.isOldVersion(
					uiState.get("lastUsedVersion"),
					packageInfo.version
				)
			) {
				await DialogManager("whatsNewDialog");
			}
			// TODO: how the hell do we await a declaratively defined dialog?
			if (TranslateDialog.needLocale()) {
				showPickLanguageDialog(true);
			}
			LDParse.setCustomColorTable(Storage.get.customBrickColors());
			const localModel = Storage.get.model();
			if (!_.isEmpty(localModel)) {
				openLicFileFromContent(localModel);
			}
		})();

		return () => {
			document.body.removeEventListener("keyup", onKeyUp);
			document.body.removeEventListener("keydown", onKeyDown);
			EventBus.off("set-selected");
			EventBus.off("redraw-ui");
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// ── Nav bar menu (computed each render) ───────────────────────────────────
	const navBarContent = Menu(appApi.current) as any;

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<div id="container" onClick={() => closeMenus()}>
			{busyText !== "" && (
				<div id="busyOverlay">
					<div id="busyContainer">
						<div className="busyText">{busyText}</div>
						<div className="progress">
							<div
								id="progressbar"
								className="progress-bar"
								role="progressbar"
								style={{ width: "0%" }}
							>
								0%
							</div>
						</div>
					</div>
				</div>
			)}

			<NavBar
				menuEntryList={navBarContent}
				filename={{ name: filename, isDirty }}
				openMenuId={navMenuOpen}
				onOpenMenu={setNavMenuOpen}
				onCloseMenus={closeMenus}
			/>

			<div
				className="mainBody"
				onContextMenu={(e) => {
					e.stopPropagation();
					e.preventDefault();
					rightClick(e);
				}}
			>
				<div id="leftPane" className="split split-horizontal">
					<NavTreeContainer />
				</div>

				<div id="rightPane" className="split split-horizontal">
					<PageView
						ref={pageViewRef}
						app={appApi.current}
						selectedItem={selectedItemLookup}
						currentPageId={currentPageId}
					/>
					{!haveModel() && <GettingStarted app={appApi.current} />}
					{isTemplatePageCurrent && (
						<TemplatePanel
							app={appApi.current}
							selectedItem={selectedItemLookup}
						/>
					)}
				</div>
			</div>

			{contextMenuEntries && contextMenuPos && (
				<PopupMenu
					id="contextMenu"
					className="dropdown"
					menuEntries={contextMenuEntries}
					selectedItem={selectedItemLookup}
					position={contextMenuPos}
					onHide={closeMenus}
				/>
			)}

			<DialogProvider />
			<DialogProvider2 />

			{pickLanguageDialog && (
				<TranslateDialog onClose={() => showPickLanguageDialog(false)} />
			)}

			{importDialogModel && (
				<ImportModelDialog
					model={importDialogModel}
					startTime={importStartRef.current}
					onBusy={setBusyText}
					onProgress={updateProgress}
					onSetPage={(id) => {
						setCurrentPageId(id);
						currentPageIdRef.current = id;
					}}
					onForceUpdate={forceUIUpdate}
					onStatus={setStatusText}
					onRedraw={drawCurrentPage}
					onClose={() => setImportDialogModel(null)}
				/>
			)}

			<div id="statusBar">{statusText}</div>
		</div>
	);
}
