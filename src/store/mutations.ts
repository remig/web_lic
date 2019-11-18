/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from '../util';
import store from '../store';
import {tr} from '../translations';
import LDParse from '../ld_parse';
import LDRender from '../ld_render';
import Layout from '../layout';

import {AnnotationMutationInterface, AnnotationMutations} from '../store/annotation_setters';
import {BookMutationInterface, BookMutations} from '../store/book_setters';
import CalloutSetters from '../store/callout_setters';
import CalloutArrowSetters from '../store/callout_arrow_setters';
import CSISetters from '../store/csi_setters';
import InventoryPageSetters from '../store/inventory_page_setters';
import ItemSetters from '../store/item_setters';
import PageSetters from '../store/page_setters';
import PartSetters from '../store/part_setters';
import PLISetters from '../store/pli_setters';
import PLIItemSetters from '../store/pli_item_setters';
import StepSetters from '../store/step_setters';
import StepInsertion from '../store/step_insertion';
import SubmodelSetters from '../store/submodel_setters';
import SubmodelImageSetters from '../store/submodel_image_setters';
import TemplatePageSetters from '../store/template_page_setters';

export interface MutationInterface {
	annotation: AnnotationMutationInterface,
	book: BookMutationInterface,
	callout: any,
	calloutArrow: any,
	csi: any,
	divider: {
		add({parent, p1, p2}: {parent: any, p1: Point, p2: Point}): Divider,
		reposition({item, dx, dy}: {item: LookupItem, dx: number, dy: number}): void,
		setLength({divider, newLength}: {divider: LookupItem, newLength: number}): void,
		delete({divider}: {divider: any}): void,
	},
	page: any,
	pli: any,
	pliItem: any,
	item: any,
	part: any,
	rotateIcon: {
		add({parent}: {parent: LookupItem}): any,
		delete({rotateIcon}: {rotateIcon: LookupItem}): void,
	},
	step: any,
	submodelImage: any,
	submodel: any,
	templatePage: any,
	inventoryPage: any,
	sceneRendering: {
		set(
			{zoom, edgeWidth, rotation, refresh}
			: {zoom: number, edgeWidth: number, rotation: any[], refresh: boolean}
		): void,
		refreshAll(): void,
	},
	pliTransform: {
		set(
			{filename, rotation, scale}
			: {filename: string, rotation: any[], scale: number}
		): void,
	},
	renumber(itemList: any[], start: number): void,
	layoutTitlePage(page: Page): void,
	addTitlePage(): void,
	removeTitlePage(): void,
	addInitialPages(
		{modelFilename, lastStepNumber, partsPerStep}
		: {modelFilename?: string, lastStepNumber: {num: number}, partsPerStep?: number}
	): number[],
	addInitialSubmodelImages(): void,
	mergeInitialPages(progressCallback: any): void,
}

export const Mutations: MutationInterface = {
	annotation: AnnotationMutations,
	book: BookMutations,
	callout: CalloutSetters,
	calloutArrow: CalloutArrowSetters,
	csi: CSISetters,
	divider: {
		add({parent, p1, p2}: {parent: any, p1: Point, p2: Point}) {
			return store.mutations.item.add({item: {
				type: 'divider', p1, p2,
			}, parent});
		},
		reposition({item, dx, dy}: {item: LookupItem, dx: number, dy: number}) {
			const divider = store.get.divider(item);
			divider.p1.x += dx;
			divider.p2.x += dx;
			divider.p1.y += dy;
			divider.p2.y += dy;
		},
		setLength({divider, newLength}: {divider: LookupItem, newLength: number}) {
			const dividerItem = store.get.divider(divider);
			const bbox = _.geom.bbox([dividerItem.p1, dividerItem.p2]);
			const isHorizontal = (bbox.height === 0);
			if (isHorizontal) {
				dividerItem.p2.x = dividerItem.p1.x + newLength;
			} else {
				dividerItem.p2.y = dividerItem.p1.y + newLength;
			}
		},
		delete({divider}: {divider: any}) {
			store.mutations.item.delete({item: divider});
		},
	},
	// numberLabel
	page: PageSetters,
	pli: PLISetters,
	pliItem: PLIItemSetters,
	// point
	item: ItemSetters,
	part: PartSetters,
	// quantityLabel
	rotateIcon: {
		add({parent}: {parent: LookupItem}) {
			return store.mutations.item.add({item: {
				type: 'rotateIcon',
				x: null, y: null, scale: 1,
			}, parent});
		},
		delete({rotateIcon}: {rotateIcon: LookupItem}) {
			store.mutations.item.delete({item: rotateIcon});
		},
	},
	step: StepSetters,
	submodelImage: SubmodelImageSetters,
	submodel: SubmodelSetters,
	templatePage: TemplatePageSetters,
	inventoryPage: InventoryPageSetters,
	sceneRendering: {
		set(
			{zoom, edgeWidth, rotation, refresh = false}
			: {zoom: number, edgeWidth: number, rotation: any[], refresh: boolean}
		) {
			store.state.template.sceneRendering.zoom = zoom;
			store.state.template.sceneRendering.edgeWidth = edgeWidth;
			store.state.template.sceneRendering.rotation = _.cloneDeep(rotation);
			if (refresh) {
				store.mutations.sceneRendering.refreshAll();
			}
		},
		refreshAll() {
			LDRender.setRenderState(store.state.template.sceneRendering);
			store.mutations.csi.markAllDirty();
			store.mutations.pliItem.markAllDirty();
			store.mutations.page.markAllDirty();
		},
	},
	pliTransform: {
		set(
			{filename, rotation, scale}
			: {filename: string, rotation: Rotation[], scale: number}
		) {
			// If rotation or scale is null, delete those entries.  If they're missing, ignore them.
			let transform = store.state.pliTransforms[filename];
			if (!transform) {
				transform = store.state.pliTransforms[filename] = {} as PLITransform;
			}
			if (rotation != null) {
				if (Array.isArray(rotation)) {
					transform.rotation = rotation.filter(el => el.angle !== 0);
				} else {
					// TODO: can we even get here anymore?
				}
				if (rotation == null || _.isEmpty(transform.rotation)) {
					delete transform.rotation;
				}
			}
			if (scale != null) {
				transform.scale = scale;
				if (!transform.scale || transform.scale === 1) {
					delete transform.scale;
				}
			}
			if (_.isEmpty(transform)) {
				delete store.state.pliTransforms[filename];
			}
		},
	},
	renumber(itemList: any[], start = 1) {
		let prevNumber: number | null;
		itemList.forEach(el => {
			if (el && el.number != null) {
				if (prevNumber == null) {
					el.number = start;
				} else if (prevNumber != null && prevNumber !== el.number - 1) {
					el.number = prevNumber + 1;
				}
				prevNumber = el.number;
			}
		});
	},
	layoutTitlePage(page: Page) {
		Layout.titlePage(page);
	},
	addTitlePage() {

		function addOneTitlePage(parent?: any) {
			let insertionIndex = 1;
			if (parent) {
				insertionIndex = store.state.pages.findIndex(
					(page: any) => page.id === parent.pages[0]
				);
			}
			const page = store.mutations.page.add({
				subtype: 'titlePage',
				parent,
				insertionIndex,
				parentInsertionIndex: 0,
				doNotRenumber: true,
			});
			page.number = parent ? store.get.page(parent.pages[1]).number : 1;
			store.mutations.page.renumber();

			const step = store.mutations.step.add({dest: page});
			step.model.filename = store?.model?.filename;
			step.parts = null;

			store.mutations.annotation.add({
				annotationType: 'label',
				properties: {
					text: store.get.modelName(true),
					font: '20pt Helvetica',
				},
				parent: page,
			});

			// TODO: This part & page count gets out of sync with the doc as pages are added / removed
			const partCount = LDParse.model.get.partCount(store.model);
			const pageCount = store.get.pageCount();  // TODO: count only pages in the current book
			let text;
			if (parent) {
				const bookNumber = store.get.book(parent).number;
				text = tr('title_page.book_model_info_@mf', {bookNumber, partCount, pageCount});
			} else {
				text = tr('title_page.model_info_@mf', {partCount, pageCount});
			}

			store.mutations.annotation.add({
				annotationType: 'label',
				properties: {text, font: '16pt Helvetica'},
				parent: page,
			});
		}

		if (store.state.books.length > 1) {
			store.state.books.forEach(addOneTitlePage);
		} else {
			addOneTitlePage();
		}
	},
	removeTitlePage() {
		store.state.pages
			.map(store.get.page)
			.filter((page: Page) => page.subtype === 'titlePage')
			.forEach((page: Page) => {
				store.mutations.item.deleteChildList({item: page, listType: 'step'});
				store.mutations.page.delete({page});
			});
	},
	addInitialPages(
		{modelFilename, lastStepNumber = {num: 1}, partsPerStep}
		: {modelFilename?: string, lastStepNumber: {num: number}, partsPerStep?: number}
	) {

		if (!modelFilename) {
			modelFilename = store?.model?.filename;
		}
		const localModel = LDParse.model.get.abstractPart(modelFilename);

		if (!localModel.steps) {
			const submodels = LDParse.model.get.submodels(localModel);
			if (submodels.some((p: any) => p.steps && p.steps.length)) {
				// If main model contains no steps but contains submodels that contain steps,
				// add one step per part in main model.
				localModel.steps = localModel.parts.map((p: any, idx: number) => ({parts: [idx]}));
			} else if (localModel === store?.model || store?.model?.hasAutoSteps) {
				// Only auto-add steps to the main model, or to sub models if the main model itself
				// needed auto-steps.
				localModel.steps = StepInsertion(localModel, {partsPerStep});
				if (store.model && localModel === store.model) {
					store.model.hasAutoSteps = true;
				}
			} else {
				localModel.steps = [];
			}
		}

		const pagesAdded: number[] = [];

		localModel.steps.forEach((modelStep: any) => {

			const parts = _.cloneDeep(modelStep.parts || []);
			const submodelIDs = parts.filter((pID: number) => {
				return LDParse.model.isSubmodel(localModel.parts[pID].filename);
			});
			const submodelFilenames = new Set<string>(
				submodelIDs.map((pID: number) => localModel.parts[pID].filename)
			);

			const submodelPagesAdded: number[][] = [];
			submodelFilenames.forEach((filename: string) => {
				const newPages = store.mutations.addInitialPages({
					modelFilename: filename,
					partsPerStep,
					lastStepNumber,
				});
				if (newPages) {
					submodelPagesAdded.push(newPages);
				}
			});

			const page = store.mutations.page.add({pageNumber: 'id'});
			pagesAdded.push(page.id);

			const step = store.mutations.step.add({
				dest: page, doLayout: false, stepNumber: lastStepNumber.num,
			});
			lastStepNumber.num += 1;
			step.parts = parts;
			step.model.filename = modelFilename;

			submodelPagesAdded.forEach((submodelPageGroup: number[]) => {
				submodelPageGroup.forEach((pageID: number) => {
					const submodelPage = store.get.page(pageID);
					const submodelStep = store.get.step(submodelPage.steps[0]);
					submodelStep.model.parentStepID = step.id;
				});
			});

			const pli = store.get.pli(step.pliID);
			parts.forEach((partID: number) => {
				const part = localModel.parts[partID];
				store.mutations.pli.addPart({pli, part});
			});
		});
		return pagesAdded;
	},
	addInitialSubmodelImages() {
		store.get.submodels().forEach((submodel: any) => {
			store.mutations.submodelImage.add({
				parent: {id: submodel.stepID, type: 'step'},
				modelFilename: submodel.filename,
				quantity: submodel.quantity,
			});
		});
	},
	async mergeInitialPages(progressCallback: any) {
		return new Promise(async function(resolve) {
			window.setTimeout(async function() {
				let stepSet: Step[] = [], prevModelName;
				const steps = store.state.steps.filter((step: any) => {
					return step.parent.type === 'page';
				});
				progressCallback({
					stepCount: steps.length,
					text: tr('glossary.step_count_@c', 0),
				});
				for (let i = 0; i < steps.length; i++) {
					const step = steps[i];
					if (!prevModelName || prevModelName === step.model.filename) {
						stepSet.push(step);
					} else {
						await Layout.mergeSteps(stepSet, progressCallback);
						stepSet = [step];
					}
					prevModelName = step.model.filename;
				}
				if (stepSet.length > 1) {
					// Be sure to merge last set of step in the book
					await Layout.mergeSteps(stepSet, progressCallback);
				}
				progressCallback({clear: true});
				resolve();
			}, 100);
		});
	},
};
