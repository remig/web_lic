/* Web Lic - Copyright (C) 2019 Remi Gagne */

import { t } from '@/translations';

import {
	type Divider,
	type LookupItem,
	type Point,
	type RotateIcon,
	type Rotation,
	type Step,
} from '../item_types';
import Layout from '../layout';
import LDParse from '../ld_parse';
import LDRender from '../ld_render';
import { store } from '../store';
import { AnnotationMutations } from '../store/annotation_setters';
import { BookMutations } from '../store/book_setters';
import { CalloutArrowMutations } from '../store/callout_arrow_setters';
import { CalloutMutations } from '../store/callout_setters';
import { CSIMutations } from '../store/csi_setters';
import { InventoryPageMutations } from '../store/inventory_page_setters';
import { ItemMutations } from '../store/item_setters';
import { PageMutations } from '../store/page_setters';
import { PartMutations } from '../store/part_setters';
import { PLIItemMutations } from '../store/pli_item_setters';
import { PLIMutations } from '../store/pli_setters';
import { StepInsertion } from '../store/step_insertion';
import { StepMutations } from '../store/step_setters';
import { SubmodelImageMutations } from '../store/submodel_image_setters';
import { SubmodelMutations } from '../store/submodel_setters';
import { TemplatePageMutations } from '../store/template_page_setters';
import { TitlePageMutations } from '../store/title_page_setters';
import _ from '../util';

export const Mutations = {
	annotation: AnnotationMutations,
	book: BookMutations,
	callout: CalloutMutations,
	calloutArrow: CalloutArrowMutations,
	csi: CSIMutations,
	divider: {
		add({ parent, p1, p2 }: { parent: any; p1: Point; p2: Point }): Divider {
			return store.mutations.item.add<Divider>({
				item: {
					type: 'divider',
					id: -1,
					parent,
					p1,
					p2,
				},
				parent,
			});
		},
		reposition({ item, dx, dy }: { item: LookupItem; dx: number; dy: number }): void {
			const divider = store.get.divider(item);
			if (divider == null) {
				throw 'Trying to reposition a non-existent Divider';
			}
			divider.p1.x += dx;
			divider.p2.x += dx;
			divider.p1.y += dy;
			divider.p2.y += dy;
		},
		setLength({ divider, newLength }: { divider: LookupItem; newLength: number }): void {
			const dividerItem = store.get.divider(divider);
			if (dividerItem == null) {
				throw 'Trying to set length of a non-existent Divider';
			}
			const bbox = _.geom.bbox([dividerItem.p1, dividerItem.p2]);
			const isHorizontal = bbox.height === 0;
			if (isHorizontal) {
				dividerItem.p2.x = dividerItem.p1.x + newLength;
			} else {
				dividerItem.p2.y = dividerItem.p1.y + newLength;
			}
		},
		delete({ divider }: { divider: any }): void {
			store.mutations.item.delete({ item: divider });
		},
	},
	numberLabel: {},
	page: PageMutations,
	titlePage: TitlePageMutations,
	pli: PLIMutations,
	pliItem: PLIItemMutations,
	point: {},
	item: ItemMutations,
	part: PartMutations,
	quantityLabel: {},
	rotateIcon: {
		add({ parent }: { parent: LookupItem }): RotateIcon {
			return store.mutations.item.add<RotateIcon>({
				item: {
					type: 'rotateIcon',
					id: -1,
					parent,
					x: 0,
					y: 0,
					scale: 1,
					width: 0,
					height: 0,
				},
				parent,
			});
		},
		delete({ rotateIcon }: { rotateIcon: LookupItem }): void {
			store.mutations.item.delete({ item: rotateIcon });
		},
	},
	step: StepMutations,
	submodelImage: SubmodelImageMutations,
	submodel: SubmodelMutations,
	templatePage: TemplatePageMutations,
	inventoryPage: InventoryPageMutations,
	sceneRendering: {
		set({
			zoom,
			edgeWidth,
			rotation,
			refresh = false,
		}: {
			zoom: number;
			edgeWidth: number;
			rotation: any[];
			refresh: boolean;
		}): void {
			store.state.template.sceneRendering.zoom = zoom;
			store.state.template.sceneRendering.edgeWidth = edgeWidth;
			store.state.template.sceneRendering.rotation = _.cloneDeep(rotation);
			if (refresh) {
				store.mutations.sceneRendering.refreshAll();
			}
		},
		refreshAll(): void {
			LDRender.setRenderState(store.state.template.sceneRendering);
			store.mutations.csi.markAllDirty();
			store.mutations.pliItem.markAllDirty();
			store.mutations.page.markAllDirty();
		},
	},
	pliTransform: {
		rotate(filename: string, rotation: Rotation[] | null): void {
			let transform = store.state.pliTransforms[filename];
			if (!transform) {
				transform = store.state.pliTransforms[filename] = {};
			}
			if (_.isEmpty(rotation) || rotation == null) {
				delete transform.rotation;
			} else {
				transform.rotation = rotation.filter((el) => el.angle !== 0);
			}
			if (_.isEmpty(transform)) {
				delete store.state.pliTransforms[filename];
			}
		},
		scale(filename: string, scale: number | null): void {
			let transform = store.state.pliTransforms[filename];
			if (!transform) {
				transform = store.state.pliTransforms[filename] = {};
			}
			if (scale == null || scale === 1) {
				delete transform.scale;
			} else {
				transform.scale = scale;
			}
			if (_.isEmpty(transform)) {
				delete store.state.pliTransforms[filename];
			}
		},
	},
	renumber(itemList: any[], start?: number): void {
		let prevNumber: number | null;
		itemList.forEach((el) => {
			if (el && el.number != null) {
				if (prevNumber == null) {
					if (start != null) {
						el.number = start;
					}
				} else if (prevNumber !== el.number - 1) {
					el.number = prevNumber + 1;
				}
				prevNumber = el.number;
			}
		});
	},
	addInitialPages({
		modelFilename,
		lastStepNumber = { num: 1 },
		partsPerStep,
	}: {
		modelFilename?: string;
		lastStepNumber?: { num: number };
		partsPerStep: number | null;
	}): number[] {
		if (!modelFilename) {
			modelFilename = store?.model?.filename;
		}
		const localModel = LDParse.model.get.abstractPart(modelFilename);

		if (!localModel.steps) {
			const submodels = LDParse.model.get.submodels(localModel);
			if (submodels.some((p: any) => p.steps && p.steps.length)) {
				// If main model contains no steps but contains submodels that contain steps,
				// add one step per part in main model.
				localModel.steps = localModel.parts.map((p: any, idx: number) => ({
					parts: [idx],
				}));
			} else if (localModel === store?.model || store?.model?.hasAutoSteps) {
				// Only auto-add steps to the main model, or to sub models if the main model itself
				// needed auto-steps.
				localModel.steps = StepInsertion(localModel, partsPerStep);
				if (store.model && localModel === store.model) {
					store.model.hasAutoSteps = true;
				}
			} else {
				localModel.steps = [];
			}
		}

		const pagesAdded: number[] = [];

		localModel.steps.forEach((modelStep: any, index: number) => {
			const parts = _.cloneDeep(modelStep.parts || []);
			const submodelIDs = parts.filter((pID: number) => {
				return LDParse.model.isSubmodel(localModel.parts[pID].filename);
			});
			const submodelFilenames = new Set<string>(
				submodelIDs.map((pID: number) => localModel.parts[pID].filename),
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

			const page = store.mutations.page.add({ pageNumber: 'id' });
			pagesAdded.push(page.id);

			const step = store.mutations.step.add({
				dest: page,
				doLayout: false,
				stepNumber: lastStepNumber.num,
			});
			lastStepNumber.num += 1;
			step.parts = parts;
			if (modelFilename) {
				step.model.filename = modelFilename;
			}
			if (modelStep.rotation != null && step.csiID != null) {
				const globalRotation = store.state.template.sceneRendering.rotation;
				const csi = store.get.csi(step.csiID);
				const previousStep = localModel.steps[index - 1];
				// handle absolute ROTSTEP command
				if (modelStep.rotation.type === 'ABS') {
					// record rotations on the csi
					csi.rotation = [
						{ axis: 'x', angle: modelStep.rotation.x },
						{ axis: 'y', angle: modelStep.rotation.y },
						{ axis: 'z', angle: modelStep.rotation.z },
					];
					// apply global rotations
					for (index = 0; index < globalRotation.length; index++) {
						csi.rotation.unshift({
							axis: globalRotation[index].axis,
							angle: -globalRotation[index].angle,
						});
					}
					// check for previous step with rotation
					if (previousStep != null && previousStep.rotation != null) {
						// compare rotations for total change above 5 degrees
						if (
							Math.abs(previousStep.rotation.x - modelStep.rotation.x) +
								Math.abs(previousStep.rotation.y - modelStep.rotation.y) +
								Math.abs(previousStep.rotation.z - modelStep.rotation.z) >
							5
						) {
							// toggle rotation icon
							store.mutations.step.toggleRotateIcon({ step, display: true });
						}
					}
					// // handle relative ROTSTEP command
					// } else if (modelStep.rotation.type == 'REL') {
					// 	csi.rotation = [
					// 		{axis: 'x', angle: modelStep.rotation.x},
					// 		{axis: 'y', angle: modelStep.rotation.y},
					// 		{axis: 'z', angle: modelStep.rotation.z},
					// 	];
				}
			}

			submodelPagesAdded.forEach((submodelPageGroup: number[]) => {
				submodelPageGroup.forEach((pageID: number) => {
					const submodelPage = store.get.page(pageID);
					if (submodelPage == null) {
						throw 'Trying to set a model into a non-existent submodel page';
					}
					const submodelStep = store.get.step(submodelPage.steps[0]);
					if (submodelStep == null) {
						throw 'Trying to set a model into a non-existent submodel';
					}
					submodelStep.model.parentStepID = step.id;
				});
			});

			if (step.pliID != null) {
				const pli = store.get.pli(step.pliID);
				if (pli != null) {
					parts.forEach((partID: number) => {
						const part = localModel.parts[partID];
						store.mutations.pli.addPart({ pli, part });
					});
				}
			}
		});
		return pagesAdded;
	},
	addInitialSubmodelImages(): void {
		store.get.submodels().forEach((submodel: any) => {
			store.mutations.submodelImage.add({
				parent: { id: submodel.stepID, type: 'step' },
				modelFilename: submodel.filename,
				quantity: submodel.quantity,
			});
		});
	},
	async mergeInitialPages(progressCallback: any): Promise<void> {
		return new Promise((resolve) => {
			window.setTimeout(async function () {
				let stepSet: Step[] = [],
					prevModelName;
				const steps = store.state.steps.filter((step: any) => {
					return step.parent.type === 'page';
				});
				progressCallback({
					stepCount: steps.length,
					text: t('glossary.step_count_@c', 0),
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
				progressCallback({ clear: true });
				resolve();
			}, 100);
		});
	},
} as const;
