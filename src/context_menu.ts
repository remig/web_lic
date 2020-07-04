/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';
import LDParse from './ld_parse';
import LicGL from './webgl/licgl';
import store from './store';
import undoStack from './undo_stack';
import openFileHandler from './file_uploader';
import DialogManager from './dialog';
import {tr, noTranslate} from './translations';
import {isItemSpecificType} from './type_helpers';

interface ContextMenuSeparator {
	text: 'separator'
}

interface ContextMenuEntryInterface {
	text: string;
	id: string;
	cb?: (selectedItem: LookupItem) => void;
	enabled?: (selectedItem: LookupItem) => boolean;
	shown?: (selectedItem: LookupItem) => boolean;
	children?: ContextMenuEntry;
	selectedItem?: LookupItem;  // TODO: Is this necessary
}

function isSeparator(menuEntry: any): menuEntry is ContextMenuSeparator {
	return menuEntry.text === 'separator';
}

type ContextMenuEntry =
	(ContextMenuSeparator | ContextMenuEntryInterface)[]
	| ((selectedItem: LookupItem) => (ContextMenuSeparator | ContextMenuEntryInterface)[]);

type DisplaceDirection = 'up' | 'down' | 'left' | 'right' | 'forward' | 'backward' | null;
const displaceDirections =
	['up', 'down', 'left', 'right', 'forward', 'backward', null] as DisplaceDirection[];

const arrowDirections = ['up', 'right', 'down', 'left'] as Direction[];

let app: any;

const clampScale = (() => {
	const min = 0.0001, max = 20;
	function clamp(v: number) {
		return _.clamp(v || 0, min, max);
	}
	clamp.min = min;
	clamp.max = max;
	return clamp;
})();

const annotationMenu = {
	text: 'action.annotation.add.name',
	id: 'annotation_add_cmenu',
	children: [
		{
			text: 'action.annotation.add.label.name',
			id: 'annotation_add_label_cmenu',
			cb(selectedItem: LookupItem) {
				const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
				const pos = store.get.coords.pageToItem(clickPos, selectedItem);
				const opts = {
					annotationType: 'label',
					properties: {text: tr('action.annotation.add.label.initial_text')},
					parent: selectedItem,
					...pos,
				};
				undoStack.commit('annotation.add', opts, tr('action.annotation.add.label.undo'));
			},
		},
		{
			text: 'action.annotation.add.line.name',
			id: 'annotation_add_line_cmenu',
			cb() {},
		},
		{
			text: 'action.annotation.add.circle.name',
			id: 'annotation_add_circle_cmenu',
			cb() {},
		},
		{
			text: 'action.annotation.add.arrow.name',
			id: 'annotation_add_arrow_cmenu',
			cb(selectedItem: LookupItem) {
				const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
				const pos = store.get.coords.pageToItem(clickPos, selectedItem);
				const opts = {
					annotationType: 'arrow',
					properties: {direction: 'right', border: {color: 'black', width: 2}},
					parent: selectedItem,
					...pos,
				};
				undoStack.commit('annotation.add', opts, tr('action.annotation.add.arrow.undo'));
			},
		},
		{
			text: 'action.annotation.add.image.name',
			id: 'annotation_add_image_cmenu',
			cb(selectedItem: LookupItem) {
				const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
				const pos = store.get.coords.pageToItem(clickPos, selectedItem);
				openFileHandler('.png', 'dataURL', src => {
					const opts = {
						annotationType: 'image',
						properties: {src},
						parent: selectedItem,
						...pos,
					};
					undoStack.commit('annotation.add', opts, tr('action.annotation.add.image.undo'));
				});
			},
		},
	],
};

const contextMenu: {[key: string]: ContextMenuEntry} = {
	titlePage: [
		{
			text: 'action.layout.redo_layout.name',
			id: 'title_page_layout_cmenu',
			cb(selectedItem: LookupItem) {
				undoStack.commit('page.layout', {page: selectedItem}, tr(this.text));
			},
		},
		annotationMenu,
	],
	inventoryPage: [
		// TODO: add way to add new parts to page and delete existing parts
		// TODO: add way to auto-recalculate part quantities (basically reset entire page)
		{
			text: 'action.layout.redo_layout.name',
			id: 'inventory_page_layout_cmenu',
			cb(selectedItem: LookupItem) {
				undoStack.commit('page.layout', {page: selectedItem}, tr(this.text));
			},
		},
		annotationMenu,
	],
	page: [
		{
			// TODO: concatenate parent -> child text so it comes out 'Layout Vertical' and not 'Vertical'
			text: 'action.layout.name',
			id: 'page_layout_cmenu',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'action.layout.redo_layout.name',
					id: 'page_redo_layout_cmenu',
					cb(selectedItem: LookupItem) {
						undoStack.commit('page.layout', {page: selectedItem}, tr(this.text));
					},
				},
				{
					text: 'action.layout.vertical.name',
					id: 'page_layout_v_cmenu',
					shown(selectedItem: LookupItem) {
						const page = store.get.page(selectedItem);
						return page?.layout !== 'vertical';
					},
					cb(selectedItem: LookupItem) {
						undoStack.commit(
							'page.layout',
							{page: selectedItem, layout: 'vertical'},
							tr('action.layout.vertical.undo')
						);
					},
				},
				{
					text: 'action.layout.horizontal.name',
					id: 'page_layout_h_cmenu',
					shown(selectedItem: LookupItem) {
						const page = store.get.page(selectedItem);
						return page?.layout !== 'horizontal';
					},
					cb(selectedItem: LookupItem) {
						const opts = {page: selectedItem, layout: 'horizontal'};
						undoStack.commit('page.layout', opts, tr('action.layout.horizontal.undo'));
					},
				},
				{
					// TODO: don't allow insufficient row / col layouts that hide steps
					text: 'action.layout.by_row_and_column.name',
					id: 'page_layout_rc_cmenu',
					cb(selectedItem: LookupItem) {
						const page = store.get.page(selectedItem);
						const originalLayout = _.cloneDeep(page.layout);

						app.clearSelected();
						app.redrawUI(true);

						DialogManager('pageLayoutDialog', dialog => {
							dialog.$on('ok', newValues => {
								undoStack.commit(
									'page.layout',
									{page, layout: newValues},
									tr('action.layout.by_row_and_column.undo')
								);
							});
							dialog.$on('cancel', () => {
								store.mutations.page.layout({page, layout: originalLayout});
								app.redrawUI(true);
							});
							dialog.$on('update', newValues => {
								store.mutations.page.layout({page, layout: newValues});
								app.redrawUI(true);
							});
							// TODO: move these setters and 'show' call into single 'setValues' method
							dialog.values.rows = originalLayout.rows || 'auto';
							dialog.values.cols = originalLayout.cols || 'auto';
							dialog.values.direction = originalLayout.direction || 'vertical';
							dialog.show();
						});
					},
				},
			],
		},
		{text: 'separator'},
		{
			text: 'action.page.prepend_blank_page.name',
			id: 'page_prepend_blank_cmenu',
			cb(selectedItem: LookupItem) {
				const nextPage = store.get.page(selectedItem);
				undoStack.commit(
					'page.add',
					{
						pageNumber: nextPage.number,
						insertionIndex: store.state.pages.indexOf(nextPage),
					},
					tr(this.text)
				);
			},
		},
		{
			text: 'action.page.append_blank_page.name',
			id: 'page_append_blank_cmenu',
			cb(selectedItem: LookupItem) {
				const prevPage = store.get.page(selectedItem);
				undoStack.commit(
					'page.add',
					{
						pageNumber: prevPage.number + 1,
						insertionIndex: store.state.pages.indexOf(prevPage) + 1,
					},
					tr(this.text)
				);
			},
		},
		{text: 'separator'},
		{
			text: 'action.page.hide_step_separators.name',
			id: 'page_hide_seps_cmenu',
			cb: () => {},
		},
		{
			text: 'action.page.add_blank_step.name',
			id: 'page_add_step_cmenu',
			enabled: enableIfUnlocked,
			cb(selectedItem: LookupItem) {
				const dest = store.get.page(selectedItem.id);
				let lastStep = _.last(dest.steps);
				let prevStep = lastStep ? store.get.step(lastStep) : null;
				if (prevStep == null) {
					let prevPage = dest;
					while (prevPage && !prevPage.steps.length) {
						prevPage = store.get.prevBasicPage(prevPage);
					}
					if (prevPage && prevPage.type === 'page' && prevPage.steps.length) {
						lastStep = _.last(prevPage.steps);
						prevStep = lastStep ? store.get.step(lastStep) : null;
					} else {
						prevStep = {number: 0};
					}
				}
				const opts = {
					dest,
					stepNumber: prevStep.number + 1,
					doLayout: true, renumber: true,
					model: _.cloneDeep(prevStep.model),
					insertionIndex: store.state.steps.indexOf(prevStep) + 1,
				};
				undoStack.commit('step.add', opts, tr(this.text));
			},
		},
		annotationMenu,
		{
			text: 'action.page.delete_this_blank_page.name',
			id: 'page_delete_page_cmenu',
			shown(selectedItem: LookupItem) {
				const page = store.get.page(selectedItem);
				return page.steps.length < 1;
			},
			cb(selectedItem: LookupItem) {
				const page = store.get.page(selectedItem);
				const nextPage = store.get.isLastBasicPage(page)
					? store.get.prevPage(page)
					: store.get.nextPage(page);
				undoStack.commit(
					'page.delete',
					{page},
					tr('action.page.delete_this_blank_page.undo')
				);
				app.clearSelected();
				app.setCurrentPage(nextPage);
			},
		},
	],
	step: [
		{
			text: 'action.layout.name',
			id: 'step_layout_cmenu',
			enabled: enableIfUnlocked,
			shown(selectedItem: LookupItem) {
				const step = store.get.lookupToItem(selectedItem);
				return step.steps.length > 0;
			},
			children: [
				{
					text: 'action.layout.vertical.name',
					id: 'step_layout_v_cmenu',
					shown(selectedItem: LookupItem) {
						const step = store.get.lookupToItem(selectedItem);
						return step.subStepLayout !== 'vertical';
					},
					cb(selectedItem: LookupItem) {
						const opts = {step: selectedItem, layout: 'vertical', doLayout: true};
						undoStack.commit('step.setSubStepLayout', opts, tr('action.layout.vertical.undo'));
					},
				},
				{
					text: 'action.layout.horizontal.name',
					id: 'step_layout_h_cmenu',
					shown(selectedItem: LookupItem) {
						const step = store.get.lookupToItem(selectedItem);
						return step.subStepLayout !== 'horizontal';
					},
					cb(selectedItem: LookupItem) {
						const opts = {step: selectedItem, layout: 'horizontal', doLayout: true};
						undoStack.commit('step.setSubStepLayout', opts, tr('action.layout.horizontal.undo'));
					},
				},
				{
					text: 'action.layout.by_row_and_column.name',
					id: 'step_layout_rc_cmenu',
					cb(selectedItem: LookupItem) {
						const page = store.get.page(selectedItem);
						const originalLayout = _.cloneDeep(page.layout);

						app.clearSelected();
						app.redrawUI(true);

						DialogManager('pageLayoutDialog', dialog => {
							dialog.$on('ok', newValues => {
								undoStack.commit(
									'page.layout',
									{page, layout: newValues},
									tr('action.layout.by_row_and_column.undo_step')
								);
							});
							dialog.$on('cancel', () => {
								store.mutations.page.layout({page, layout: originalLayout});
								app.redrawUI(true);
							});
							dialog.$on('update', newValues => {
								store.mutations.page.layout({page, layout: newValues});
								app.redrawUI(true);
							});
							dialog.values.rows = originalLayout.rows || 2;
							dialog.values.cols = originalLayout.cols || 2;
							dialog.direction = originalLayout.direction || 'vertical';
							dialog.show({x: 400, y: 150});
						});
					},
				},
			],
		},
		{
			text: 'action.step.add_callout.name',
			id: 'step_add_callout_cmenu',
			shown(selectedItem: LookupItem) {
				const step = store.get.step(selectedItem.id);
				return !step.steps.length;
			},
			cb(selectedItem: LookupItem) {
				undoStack.commit('step.addCallout', {step: selectedItem}, tr(this.text));
			},
		},
		{
			text: 'action.step.divide_into_sub_steps.name',
			id: 'step_to_substeps_cmenu',
			shown(selectedItem: LookupItem) {
				const step = store.get.step(selectedItem.id);
				const parent = store.get.parent(selectedItem);
				if (parent.type === 'page' && !step.callouts.length && !step.steps.length) {
					return true;
				}
				return false;
			},
			cb(selectedItem: LookupItem) {
				undoStack.commit('step.addSubStep', {step: selectedItem, doLayout: true}, tr(this.text));
			},
		},
		{
			text: 'action.step.stretch_to_next_page.name',
			id: 'step_stretch_cmenu',
			enabled(selectedItem: LookupItem) {
				const step = store.get.lookupToItem(selectedItem);
				if (step.parent.type !== 'page') {
					return false;  // Only stretch basic page steps
				}
				const page = store.get.pageForItem(selectedItem);
				const nextPage = store.get.nextBasicPage(page);
				return nextPage && nextPage.steps.length < 1 && page.steps.length === 1;
			},
			cb(selectedItem: LookupItem) {
				const step = store.get.lookupToItem(selectedItem);
				let page;
				if (step.stretchedPages.length) {
					page = store.get.page(_.last(step.stretchedPages));
				} else {
					page = store.get.pageForItem(selectedItem);
				}
				const stretchToPage = store.get.nextBasicPage(page);
				const opts = {step: selectedItem, stretchToPage, doLayout: true};
				undoStack.commit('step.stretchToPage', opts, tr(this.text));
			},
		},
		{
			text: 'action.step.move_to.name',
			id: 'step_move_to_cmenu',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'action.step.move_to.previous_page.name',
					id: 'step_move_prev_cmenu',
					shown(selectedItem: LookupItem) {
						const page = store.get.pageForItem(selectedItem);
						if (store.get.isFirstBasicPage(page) || store.get.isTitlePage(page)) {
							return false;  // Previous page doesn't exist
						} else if (page.steps.indexOf(selectedItem.id) !== 0) {
							return false;  // Can only move first step on a page to the previous page
						}
						return true;
					},
					enabled(selectedItem: LookupItem) {
						return !(store.get.prevBasicPage(selectedItem) || {}).locked;
					},
					cb(selectedItem: LookupItem) {
						undoStack.commit(
							'step.moveToPreviousPage',
							{step: selectedItem},
							tr('action.step.move_to.previous_page.undo')
						);
					},
				},
				{
					text: 'action.step.move_to.next_page.name',
					id: 'step_move_next_cmenu',
					shown(selectedItem: LookupItem) {
						const page = store.get.pageForItem(selectedItem);
						if (store.get.isLastBasicPage(page) || store.get.isTitlePage(page)) {
							return false;  // Next page doesn't exist
						} else if (page.steps.indexOf(selectedItem.id) !== page.steps.length - 1) {
							return false;  // Can only move last step on a page to the next page
						}
						return true;
					},
					enabled(selectedItem: LookupItem) {
						return !(store.get.nextBasicPage(selectedItem) || {}).locked;
					},
					cb(selectedItem: LookupItem) {
						undoStack.commit(
							'step.moveToNextPage',
							{step: selectedItem},
							tr('action.step.move_to.next_page.undo')
						);
					},
				},
			],
		},
		{
			// TODO: If step being merged contains a submodel, must reorder all steps in that submodel too
			text: 'action.step.merge_with.name',
			id: 'step_merge_cmenu',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'action.step.merge_with.previous_step.name',
					id: 'step_merge_prev_cmenu',
					shown(selectedItem: LookupItem) {
						return store.get.prevStep(selectedItem, true) != null;
					},
					cb(selectedItem: LookupItem) {
						const srcStep = selectedItem;
						const destStep = store.get.prevStep(selectedItem, true);
						undoStack.commit(
							'step.mergeWithStep',
							{srcStep, destStep},
							tr('action.step.merge_with.previous_step.undo')
						);
						app.clearSelected();
					},
				},
				{
					text: 'action.step.merge_with.next_step.name',
					id: 'step_merge_next_cmenu',
					shown(selectedItem: LookupItem) {
						return store.get.nextStep(selectedItem, true) != null;
					},
					cb(selectedItem: LookupItem) {
						const srcStep = selectedItem;
						const destStep = store.get.nextStep(selectedItem, true);
						undoStack.commit(
							'step.mergeWithStep',
							{srcStep, destStep},
							tr('action.step.merge_with.next_step.undo')
						);
						app.clearSelected();
					},
				},
			],
		},
		{
			text: 'action.step.delete_empty_step.name',
			id: 'step_delete_cmenu',
			enabled: enableIfUnlocked,
			shown(selectedItem: LookupItem) {
				const step = store.get.step(selectedItem);
				if (step.parent.type === 'callout' && store.get.parent(step).steps.length < 2) {
					return false;  // Can't delete first step in a callout
				}
				return _.isEmpty(step.parts);
			},
			cb(selectedItem: LookupItem) {
				undoStack.commit('step.delete', {step: selectedItem, doLayout: true}, tr(this.text));
				app.clearSelected();
			},
		},
		{text: 'separator'},
		{
			text: 'action.step.prepend_blank_step.name',
			id: 'step_prepend_cmenu',
			enabled: enableIfUnlocked,  // TODO: disable this if previous step is in a different submodel
			cb(selectedItem: LookupItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.parent(step);
				if (dest.type === 'callout') {
					const opts = {
						callout: dest,
						doLayout: true,
						insertionIndex: dest.steps.indexOf(step.id),
					};
					undoStack.commit('callout.addStep', opts, tr(this.text));
				} else {
					const opts = {
						dest,
						stepNumber: step.number,
						doLayout: true,
						renumber: true,
						model: _.cloneDeep(step.model),
						insertionIndex: store.state.steps.indexOf(step),
						parentInsertionIndex: dest.steps.indexOf(step.id),
					};
					undoStack.commit('step.add', opts, tr(this.text));
				}
			},
		},
		{
			text: 'action.step.append_blank_step.name',
			id: 'step_append_cmenu',
			enabled: enableIfUnlocked,
			cb(selectedItem: LookupItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.parent(step);
				if (dest.type === 'callout') {
					const opts = {
						callout: dest,
						doLayout: true,
						insertionIndex: dest.steps.indexOf(step.id) + 1,
					};
					undoStack.commit('callout.addStep', opts, tr(this.text));
				} else {
					const opts = {
						dest,
						stepNumber: step.number + 1,
						doLayout: true,
						renumber: true,
						model: _.cloneDeep(step.model),
						insertionIndex: store.state.steps.indexOf(step) + 1,
						parentInsertionIndex: dest.steps.indexOf(step.id) + 1,
					};
					undoStack.commit('step.add', opts, tr(this.text));
				}
			},
		},
		{text: 'separator'},
		{
			text(selectedItem: LookupItem) {
				const step = store.get.lookupToItem(selectedItem);
				return step.rotateIconID == null ? 'action.rotate_icon.add.name'
					: 'action.rotate_icon.delete.name';
			},
			id: 'step_add_remove_rotate_cmenu',
			cb(selectedItem: LookupItem) {
				const step = store.get.step(selectedItem.id);
				undoStack.commit(
					'step.toggleRotateIcon',
					{step, display: step.rotateIconID == null, doLayout: true},
					tr(this.text(selectedItem))
				);
			},
		},
		annotationMenu,
	],
	numberLabel(selectedItem: LookupItem) {
		const parent = store.get.parent(selectedItem);
		switch (parent.type) {
			case 'page':
				return [
					{
						text: 'action.page_number.change_number.name',
						id: 'page_label_change_cmenu',
						cb() {},
					},
				];
			case 'step':
				return [
					{
						text: 'action.step_number.change_number.name',
						id: 'step_label_change_cmenu',
						cb() {},
					},
				];
		}
		return [];
	},
	csi: [
		{
			text: 'action.csi.rotate.name',
			id: 'csi_rotate_cmenu',
			children: [
				{
					text: 'action.csi.rotate.flip_upside_down.name',
					id: 'csi_rotate_up_cmenu',
					cb(selectedItem: LookupItem) {
						const csi = selectedItem;
						const rotation = [{axis: 'z', angle: 180}];
						const opts = {csi, rotation, addRotateIcon: true, doLayout: true};
						undoStack.commit(
							'csi.rotate',
							opts,
							tr('action.csi.rotate.flip_upside_down.undo'),
							[{type: 'csi', id: csi.id}]
						);
					},
				},
				{
					text: 'action.csi.rotate.rotate_front_to_back.name',
					id: 'csi_rotate_front_cmenu',
					cb(selectedItem: LookupItem) {
						const csi = selectedItem;
						const rotation = [{axis: 'y', angle: 180}];
						const opts = {csi, rotation, addRotateIcon: true, doLayout: true};
						undoStack.commit(
							'csi.rotate',
							opts,
							tr('action.csi.rotate.rotate_front_to_back.undo'),
							[{type: 'csi', id: csi.id}]
						);
					},
				},
				{
					text: 'action.csi.rotate.custom_rotation.name',
					id: 'csi_rotate_custom_cmenu',
					cb(selectedItem: LookupItem) {
						const csi = store.get.csi(selectedItem.id);
						const parent = store.get.lookupToItem(csi.parent);
						const originalRotation = _.cloneDeep(csi.rotation);
						let initialRotation = originalRotation;
						if (initialRotation == null) {
							initialRotation = store.get.templateForItem(selectedItem).rotation;
						}
						csi.rotation = initialRotation;

						app.clearSelected();
						DialogManager('rotatePartImageDialog', dialog => {
							dialog.$on('ok', newValues => {
								undoStack.commit(
									'csi.rotate',
									{csi, ..._.cloneDeep(newValues), doLayout: true},
									tr('action.csi.rotate.custom_rotation.undo'),
									[csi]
								);
							});
							dialog.$on('cancel', () => {
								csi.rotation = originalRotation;
								csi.isDirty = true;
								app.redrawUI(true);
							});
							dialog.$on('update', newValues => {
								csi.rotation = newValues.rotation;
								csi.isDirty = true;
								app.redrawUI(true);
							});
							dialog.title = tr('dialog.rotate_part_image.title_csi');
							dialog.rotation = initialRotation;
							if (isItemSpecificType(parent, 'step')) {
								dialog.addRotateIcon = parent.rotateIconID != null;
							}
						});
					},
				},
				{
					text: 'action.csi.rotate.remove_rotation.name',
					id: 'csi_rotate_remove_cmenu',
					shown(selectedItem: LookupItem) {
						const csi = store.get.csi(selectedItem.id);
						return csi.rotation != null;
					},
					cb(selectedItem: LookupItem) {
						const csi = selectedItem;
						const opts = {
							csi, rotation: null, addRotateIcon: false, doLayout: true,
						};
						undoStack.commit(
							'csi.rotate',
							opts,
							tr('action.csi.rotate.remove_rotation.undo'),
							[{type: 'csi', id: csi.id}]
						);
					},
				},
			],
		},
		{
			text: 'action.csi.copy_rotation_to_next_steps.name',
			id: 'csi_copy_rotation_cmenu',
			shown(selectedItem: LookupItem) {
				const csi = store.get.csi(selectedItem);
				return (csi?.rotation?.length ?? 0) > 0;
			},
			cb(selectedItem: LookupItem) {
				// TODO: this doesn't re-layout pages after applying changes. Must check all affected pages.
				// TODO: If next step spinner is spun up then back down, need to undo some rotations
				// TODO: If selected csi step has a rotate icon, add one to the last rotated csi too
				const selectedCSI = store.get.csi(selectedItem.id);
				const rotation = _.cloneDeep(selectedCSI.rotation);
				const step = store.get.step(selectedCSI.parent.id);
				const originalRotations: (Rotation[] | 'none')[] = [];

				app.clearSelected();
				app.redrawUI(true);

				DialogManager('numberChooserDialog', dialog => {
					dialog.$on('ok', newValue => {
						const csiList: ({type: 'csi', id: number})[] = originalRotations
							.filter(el => el != null)
							.map((unused, id) => {
								return {type: 'csi', id};
							});
						undoStack.commit(
							'step.copyRotation',
							{step, rotation, nextXSteps: newValue},
							tr('action.csi.copy_rotation_to_next_steps.undo'),
							csiList
						);
					});
					dialog.$on('cancel', () => {
						originalRotations.forEach((rot, csiID) => {
							const csi = store.get.csi(csiID);
							if (csi) {
								csi.rotation = (rot === 'none') ? null : rot;
								csi.isDirty = true;
							}
						});
						app.redrawUI(true);
					});
					dialog.$on('update', newValue => {
						let csi: CSI;
						let nextStep: Step | null = step;
						for (let i = 0; i < newValue; i++) {
							if (nextStep) {
								nextStep = store.get.nextStep(nextStep);
							}
							if (nextStep?.csiID) {
								csi = store.get.csi(nextStep.csiID);
								if (originalRotations[csi.id] == null) {
									originalRotations[csi.id] = (csi.rotation == null)
										? 'none'
										: csi.rotation;
								}
								csi.isDirty = true;
								csi.rotation = rotation;
							}
						}
						app.redrawUI(true);
					});
					dialog.title = tr('dialog.copy_csi_rotation.title');
					dialog.label = tr('dialog.copy_csi_rotation.label');
					dialog.min = dialog.value = 0;
				});
			},
		},
		{
			text: 'action.csi.scale.name',
			id: 'csi_scale_cmenu',
			cb(selectedItem: LookupItem) {
				const csi = store.get.csi(selectedItem.id);
				const originalScale = csi.scale;
				let initialScale = originalScale;
				if (initialScale == null) {
					if (csi.autoScale != null) {
						initialScale = csi.autoScale;
					} else {
						initialScale = store.get.templateForItem(selectedItem).scale;
					}
				}
				DialogManager('numberChooserDialog', dialog => {
					dialog.$on('update', newValue => {
						csi.scale = clampScale(newValue);
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.$on('ok', newValue => {
						undoStack.commit(
							'csi.scale',
							{csi, scale: newValue, doLayout: true},
							tr('action.csi.scale.undo'),
							[csi]
						);
					});
					dialog.$on('cancel', () => {
						csi.scale = originalScale;
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.title = tr('dialog.scale_csi.title');
					dialog.label = tr('dialog.scale_csi.label');
					dialog.min = 0;
					dialog.max = clampScale.max;
					dialog.step = 0.1;
					dialog.bodyText = '';
					dialog.value = initialScale;
				});
			},
		},
		{
			text: 'action.csi.remove_scale.name',
			id: 'csi_scale_remove_cmenu',
			shown(selectedItem: LookupItem) {
				const csi = store.get.csi(selectedItem.id);
				return csi.scale != null;
			},
			cb(selectedItem: LookupItem) {
				const csi = store.get.csi(selectedItem.id);
				undoStack.commit(
					'csi.scale',
					{csi, scale: null, doLayout: true},
					tr('action.csi.remove_scale.undo'),
					[csi]
				);
			},
		},
		{text: 'separator'},
		{
			text: 'action.csi.select_part.name',
			id: 'csi_select_part_cmenu',
			shown(selectedItem: LookupItem) {
				const step = store.get.parent(selectedItem);
				if (isItemSpecificType(step, 'step')) {
					return step?.parts.length > 0 && step.parts.length > 0;
				}
				return false;
			},
			children(selectedItem: LookupItem) {
				const step = store.get.parent(selectedItem);
				if (step != null && isItemSpecificType(step, 'step')) {
					return (step.parts || []).map(partID => {
						const part = LDParse.model.get.partFromID(partID, step.model.filename);
						const abstractPart = LDParse.partDictionary[part.filename];
						return {
							id: 'select_part_' + partID + '_cmenu',
							text: noTranslate(abstractPart.name),
							cb() {
								app.setSelected({type: 'part', id: partID, stepID: step.id});
							},
						};
					});
				}
				return [];
			},
		},
		{
			text: 'action.csi.add_new_part.name',
			id: 'csi_add_part_cmenu',
			cb: () => {},
		},
		annotationMenu,
	],
	pli: [],
	pliItem: [
		{
			text: 'action.pli_item.rotate_part_list_image.name',
			id: 'pli_rotate_cmenu',
			cb(selectedItem: LookupItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const filename = pliItem.filename;
				const originalRotation = store.get.pliTransform(filename).rotation;
				let initialRotation = originalRotation;
				if (initialRotation == null) {
					initialRotation = store.get.templateForItem(selectedItem).rotation;
				}

				app.clearSelected();
				DialogManager('rotatePartImageDialog', dialog => {
					dialog.$on('update', newValues => {
						store.mutations.pliTransform.rotate(filename, newValues.rotation);
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.$on('ok', () => {
						const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
						const changes = dirtyItems.map(item => {
							return {
								mutation: 'page.layout',
								opts: {page: store.get.pageForItem(item)},
							};
						});
						undoStack.commit(
							changes, null,
							tr('action.pli_item.rotate_part_list_image.undo'),
							dirtyItems
						);
					});
					dialog.$on('cancel', () => {
						store.mutations.pliTransform.rotate(filename, originalRotation);
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.title = tr('dialog.rotate_part_image.title_pli');
					dialog.showRotateIconCheckbox = false;
					dialog.rotation = initialRotation;
				});
			},
		},
		{
			text: 'action.pli_item.remove_part_list_image_rotate.name',
			id: 'pli_remove_rotation_cmenu',
			shown(selectedItem: LookupItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				return store.get.pliTransform(pliItem.filename).rotation != null;
			},
			cb(selectedItem: LookupItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const filename = pliItem.filename;
				store.mutations.pliTransform.rotate(filename, null);
				const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
				const changes = dirtyItems.map(item => {
					return {
						mutation: 'page.layout',
						opts: {page: store.get.pageForItem(item)},
					};
				});
				undoStack.commit(
					changes, null,
					tr('action.pli_item.remove_part_list_image_rotate.undo'),
					dirtyItems
				);
			},
		},
		{
			text: 'action.pli_item.scale_part_list_image.name',
			id: 'pli_scale_cmenu',
			cb(selectedItem: LookupItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const filename = pliItem.filename;
				const originalScale = store.get.pliTransform(filename).scale;

				DialogManager('numberChooserDialog', dialog => {
					dialog.$on('update', newValue => {
						const scale = clampScale(newValue);
						store.mutations.pliTransform.scale(filename, scale);
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.$on('ok', () => {
						const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
						const changes = dirtyItems.map(item => {
							return {
								mutation: 'page.layout',
								opts: {page: store.get.pageForItem(item)},
							};
						});
						undoStack.commit(
							changes, null,
							tr('action.pli_item.scale_part_list_image.undo'),
							dirtyItems
						);
					});
					dialog.$on('cancel', () => {
						store.mutations.pliTransform.scale(filename, originalScale);
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.title = tr('dialog.scale_pli.title');
					dialog.min = 0;
					dialog.max = clampScale.max;
					dialog.step = 0.1;
					dialog.bodyText = '';
					dialog.value = originalScale || 1;
				});
			},
		},
		{
			text: 'action.pli_item.remove_part_list_image_scale.name',
			id: 'pli_remove_scale_cmenu',
			shown(selectedItem: LookupItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				return store.get.pliTransform(pliItem.filename).scale != null;
			},
			cb(selectedItem: LookupItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const filename = pliItem.filename;
				store.mutations.pliTransform.scale(filename, null);
				const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
				const changes = dirtyItems.map(item => {
					return {
						mutation: 'page.layout',
						opts: {page: store.get.pageForItem(item)},
					};
				});
				undoStack.commit(
					changes, null,
					tr('action.pli_item.remove_part_list_image_scale.undo'),
					dirtyItems
				);
			},
		},
	],
	quantityLabel(selectedItem: LookupItem) {
		const page = store.get.pageForItem(selectedItem);
		switch (page.subtype) {
			case 'inventoryPage':
				return [
					// TODO: add 'Reset Count' menu entry to labels with modified counts
					{
						text: 'action.quantity_label.change_count.name',
						id: 'qtylabel_change_cmenu',
						cb(selItem) {
							const pliItem = store.get.parent(selItem);
							if (isItemSpecificType(pliItem, 'pliItem')) {
								DialogManager('numberChooserDialog', dialog => {
									dialog.$on('ok', newValue => {
										undoStack.commit(
											'pliItem.changeQuantity',
											{pliItem, quantity: newValue},
											tr('action.quantity_label.change_count.undo')
										);
									});
									dialog.title = tr('dialog.change_part_count.title');
									dialog.label = tr('dialog.change_part_count.label');
									dialog.value = pliItem.quantity;
								});
							}
						},
					},
				];
		}
		return [];
	},
	rotateIcon: [
		{
			text: 'action.rotate_icon.delete.name',
			id: 'rotate_icon_delete_cmenu',
			cb(selectedItem: LookupItem) {
				const rotateIcon = selectedItem;
				undoStack.commit('rotateIcon.delete', {rotateIcon}, tr(this.text));
			},
		},
	],
	annotation(selItem) {
		const deleteMenu = {
			text: 'action.annotation.delete.name',
			id: 'annotation_delete_cmenu',
			cb(selectedItem: LookupItem) {
				const annotation = selectedItem;
				undoStack.commit('annotation.delete', {annotation}, tr('action.annotation.delete.undo'));
				app.clearSelected();
			},
		};

		const setStyleMenu = {
			text: 'action.annotation.change_text_and_style.name',
			id: 'annotation_change_text_cmenu',
			shown(selectedItem: LookupItem) {
				const annotation = store.get.annotation(selectedItem);
				return annotation && annotation.annotationType === 'label';
			},
			cb(selectedItem: LookupItem) {
				const annotation = store.get.annotation(selectedItem);
				DialogManager('styleDialog', dialog => {
					dialog.$on('ok', newProperties => {
						const opts = {annotation, newProperties};
						undoStack.commit(
							'annotation.set',
							opts,
							tr('action.annotation.change_text_and_style.undo')
						);
					});
					dialog.title = tr('dialog.style_annotation.title');
					dialog.text = annotation.text;
					dialog.color = annotation.color;
					dialog.font = annotation.font;
					dialog.show();
				});
			},
		};

		const annotation = store.get.annotation(selItem);
		switch (annotation.annotationType) {
			case 'label':
				return [setStyleMenu, deleteMenu];
			case 'arrow':
				return [...contextMenu.calloutArrow, deleteMenu];
			case 'image':
				return [deleteMenu];
		}
		return [];
	},
	callout: [
		{
			text: 'action.callout.position.name',
			id: 'callout_position_cmenu',
			children: ['top', 'right', 'bottom', 'left'].map(position => {
				return {
					text: 'action.callout.position.' + position + '.name',
					id: 'callout_position' + position + '_cmenu',
					shown: (function(pos) {
						return function(selectedItem: LookupItem) {
							const callout = store.get.callout(selectedItem);
							return callout?.position !== pos;
						};
					})(position),
					cb: (function(pos) {
						return function(selectedItem: LookupItem) {
							const opts = {
								callout: selectedItem,
								position: pos,
								doLayout: true,
							};
							undoStack.commit(
								'callout.layout',
								opts,
								tr('action.callout.position.undo')
							);
						};
					})(position),
				};
			}),
		},
		{
			text: 'action.layout.name',
			id: 'callout_layout_cmenu',
			children: [
				{
					text: 'action.callout.layout.horizontal.name',
					id: 'callout_layout_h_cmenu',
					shown(selectedItem: LookupItem) {
						const callout = store.get.callout(selectedItem);
						return callout.layout !== 'horizontal';
					},
					cb(selectedItem: LookupItem) {
						const opts = {callout: selectedItem, layout: 'horizontal', doLayout: true};
						undoStack.commit('callout.layout', opts, tr('action.callout.layout.horizontal.undo'));
					},
				},
				{
					text: 'action.callout.layout.vertical.name',
					id: 'callout_layout_v_cmenu',
					shown(selectedItem: LookupItem) {
						const callout = store.get.callout(selectedItem);
						return callout.layout !== 'vertical';
					},
					cb(selectedItem: LookupItem) {
						const opts = {
							callout: selectedItem,
							layout: 'vertical',
							doLayout: true,
						};
						undoStack.commit(
							'callout.layout',
							opts, tr('action.callout.layout.vertical.undo')
						);
					},
				},
			],
		},
		{
			text: 'action.callout.add_step.name',
			id: 'callout_add_step_cmenu',
			cb(selectedItem: LookupItem) {
				undoStack.commit('callout.addStep', {callout: selectedItem, doLayout: true}, tr(this.text));
			},
		},
		{
			text: 'action.callout.delete_empty_callout.name',
			id: 'callout_delete_cmenu',
			shown(selectedItem: LookupItem) {
				const callout = store.get.callout(selectedItem);
				if (callout == null || callout.steps.length > 1) {
					return false;
				} else if (callout && callout.steps.length < 1) {
					return true;
				}
				const step = store.get.step(callout.steps[0]);
				return step.parts.length < 1;
			},
			cb(selectedItem: LookupItem) {
				app.clearSelected();
				undoStack.commit('callout.delete', {callout: selectedItem, doLayout: true}, tr(this.text));
			},
		},
	],
	calloutArrow: [
		{
			text: 'action.callout_arrow.select_point.name',
			id: 'arrow_select_point_cmenu',
			children(selectedItem: LookupItem) {
				const arrow = store.get.calloutArrow(selectedItem);
				return arrow.points.map((pointID, idx) => {
					return {
						text: (idx === 0)
							? 'action.callout_arrow.select_point.base.name'
							: (idx === arrow.points.length - 1)
								? 'action.callout_arrow.select_point.tip.name'
								: noTranslate(tr('action.callout_arrow.select_point.point.name_@mf', {idx})),
						id: 'arrow_select_point_' + pointID + '_cmenu',
						cb() {
							app.setSelected({type: 'point', id: pointID});
						},
					};
				});
			},
		},
		{
			text: 'action.callout_arrow.add_point.name',
			id: 'arrow_add_point_cmenu',
			cb(selectedItem: LookupItem) {
				const arrow = store.get.calloutArrow(selectedItem);
				const newPointIdx = Math.ceil(arrow.points.length / 2);
				undoStack.commit('calloutArrow.addPoint', {arrow}, tr(this.text));
				app.setSelected({type: 'point', id: arrow.points[newPointIdx]});
			},
		},
		{
			text: 'action.callout_arrow.add_tip.name',
			id: 'arrow_add_tip_cmenu',
			cb() {},
		},
		{
			text: 'action.callout_arrow.rotate_tip.name',
			id: 'arrow_rotate_tip_cmenu',
			children: arrowDirections.map(direction => {
				return {
					text: 'action.callout_arrow.rotate_tip.' + direction + '.name',
					id: 'arrow_rotate_tip_' + direction + '_cmenu',
					shown: arrowTipRotationVisible(direction),
					cb: rotateArrowTip(direction),
				};
			}),
		},
	],
	divider: [
		{
			text: 'action.divider.resize.name',
			id: 'divider_resize_cmenu',
			cb(selectedItem: LookupItem) {
				const divider = store.get.divider(selectedItem);
				const bbox = _.geom.bbox([divider.p1, divider.p2]);
				// TODO: store divider orientation in divider itself
				const originalSize = (bbox.height === 0) ? bbox.width : bbox.height;

				DialogManager('numberChooserDialog', dialog => {
					dialog.$on('update', newValue => {
						store.mutations.divider.setLength({divider, newLength: newValue});
						app.drawCurrentPage();
					});
					dialog.$on('ok', () => {
						undoStack.commit('', null, tr('action.divider.resize.undo'));
					});
					dialog.$on('cancel', () => {
						store.mutations.divider.setLength({divider, newLength: originalSize});
						app.drawCurrentPage();
					});
					dialog.title = tr('dialog.resize_page_divider.title');
					dialog.min = 1;
					dialog.max = 10000;
					dialog.step = 1;
					dialog.value = originalSize;
				});
			},
		},
		{
			text: 'action.divider.delete.name',
			id: 'divider_delete_cmenu',
			cb(selectedItem: LookupItem) {
				undoStack.commit('divider.delete', {divider: selectedItem}, tr('action.divider.delete.undo'));
				app.clearSelected();
			},
		},
	],
	point: [
		{
			text: 'action.callout_arrow.delete_point.name',
			id: 'arrow_delete_point_cmenu',
			shown(selectedItem: LookupItem) {
				const point = store.get.point(selectedItem);
				if (isItemSpecificType(point.parent, 'calloutArrow')) {
					const pts = store.get.calloutArrow(point).points;
					return pts[0] !== point.id && pts[pts.length - 1] !== point.id;
				}
				return true;
			},
			cb(selectedItem: LookupItem) {
				undoStack.commit(
					'item.delete',
					{item: selectedItem},
					tr('action.callout_arrow.delete_point.undo')
				);
				app.clearSelected();
			},
		},
	],
	submodel: [
		{
			text: 'action.submodel.convert_to_callout.name',
			id: 'submodel_convert_cmenu',
			shown(selectedItem: LookupItem) {
				// Only allow submodel -> callout conversion if submodel contains no submodels
				if (isItemSpecificType(selectedItem, 'submodel')) {
					const submodel = LDParse.model.get.abstractPart(selectedItem.filename);
					for (let i = 0; i < submodel.parts.length; i++) {
						if (LDParse.model.isSubmodel(submodel.parts[i].filename)) {
							return false;
						}
					}
				}
				return true;
			},
			cb(selectedItem: LookupItem) {
				if (isItemSpecificType(selectedItem, 'submodel')) {
					const step = store.get.step(selectedItem.stepID);
					const destStep = {type: 'step', id: step.model.parentStepID};
					const opts = {modelFilename: selectedItem.filename, destStep, doLayout: true};
					undoStack.commit('submodel.convertToCallout', opts, tr(this.text));
					app.clearSelected();
					app.setCurrentPage(store.get.pageForItem(destStep));
				}
			},
		},
	],
	part: [
		{
			text: 'action.part.displace_part.name',
			id: 'part_displace_cmenu',
			children: displaceDirections.map(direction => {
				return {
					text: direction == null
						? 'action.part.displace_part.none.name'
						: 'action.part.displace_part.' + direction + '.name',
					id: 'part_displace_' + direction + '_cmenu',
					shown: showDisplacement(direction),
					cb: displacePart(direction),
				};
			}),
		},
		{
			text: 'action.part.adjust_displacement.name',
			id: 'part_change_displace_cmenu',
			shown(selectedItem: LookupItem) {
				if (isItemSpecificType(selectedItem, 'part')) {
					const step = store.get.step(selectedItem.stepID);
					if (step.displacedParts) {
						return step.displacedParts.some(p => p.partID === selectedItem.id);
					}
				}
				return false;
			},
			cb(selectedItem: LookupItem) {
				if (!isItemSpecificType(selectedItem, 'part')) {
					return;
				}
				const step = store.get.step(selectedItem.stepID);
				if (step.csiID == null || step.displacedParts == null) {
					return;
				}
				const csi = store.get.csi(step.csiID);
				const match = step.displacedParts.find(p => p.partID === selectedItem.id);
				if (match == null) {
					return;
				}
				const displacement = {
					partDistance: match.partDistance || 0,
					arrowOffset: match.arrowOffset || 0,
					arrowLength: match.arrowLength || 0,
					arrowRotation: match.arrowRotation || 0,
				};
				const originalDisplacement = _.clone(displacement);

				app.clearSelected();
				DialogManager('displacePartDialog', dialog => {
					dialog.$on('ok', () => {
						undoStack.commit('part.displace', {step, ...displacement},
							tr('action.part.adjust_displacement.undo'));
					});
					dialog.$on('cancel', () => {
						Object.assign(match, originalDisplacement);
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.$on('update', newValues => {
						Object.assign(match, newValues);
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.values = {...displacement};
				});
			},
		},
		{
			text: 'action.part.remove_displacement.name',
			id: 'part_remove_displace_cmenu',
			shown: showDisplacement(null),
			cb: displacePart(null),
		},
		{
			text: 'action.part.move_part_to.name',
			id: 'part_move_cmenu',
			children: [
				{
					text: 'action.part.move_part_to.previous_step.name',
					id: 'part_move_prev_cmenu',
					shown(selectedItem: LookupItem) {
						if (isItemSpecificType(selectedItem, 'part')) {
							const step = store.get.step({type: 'step', id: selectedItem.stepID});
							return store.get.prevStep(step) != null;
						}
						return false;
					},
					cb(selectedItem: LookupItem) {
						if (!isItemSpecificType(selectedItem, 'part')) {
							return;
						}
						app.clearSelected();
						const srcStep = store.get.step(selectedItem.stepID);
						const destStep = store.get.prevStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: selectedItem.id, srcStep, destStep, doLayout: true},
							tr('action.part.move_part_to.previous_step.undo'),
							[
								{type: 'csi', id: srcStep?.csiID},
								{type: 'csi', id: destStep?.csiID},
							]
						);
					},
				},
				{
					text: 'action.part.move_part_to.next_step.name',
					id: 'part_move_next_cmenu',
					shown(selectedItem: LookupItem) {
						if (isItemSpecificType(selectedItem, 'part')) {
							const step = store.get.step(selectedItem.stepID);
							return store.get.nextStep(step) != null;
						}
						return false;
					},
					cb(selectedItem: LookupItem) {
						if (!isItemSpecificType(selectedItem, 'part')) {
							return;
						}
						app.clearSelected();
						const srcStep = store.get.step(selectedItem.stepID);
						const destStep = store.get.nextStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: selectedItem.id, srcStep, destStep, doLayout: true},
							tr('action.part.move_part_to.next_step.undo'),
							[
								{type: 'csi', id: srcStep?.csiID},
								{type: 'csi', id: destStep?.csiID},
							]
						);
					},
				},
			],
		},
		{
			text: 'action.part.add_part_to_callout.name',
			id: 'part_add_to_callout_cmenu',
			shown(selectedItem: LookupItem) {
				if (isItemSpecificType(selectedItem, 'part')) {
					const step = store.get.step(selectedItem.stepID);
					return step.callouts.length === 1;
				}
				return false;
			},
			cb(selectedItem: LookupItem) {
				if (!isItemSpecificType(selectedItem, 'part')) {
					return;
				}
				const step = store.get.step(selectedItem.stepID);
				const callout = store.get.callout(step.callouts[0]);
				const lastStep = _.last(callout.steps);
				const targetStep = lastStep ? store.get.step(lastStep) : null;
				undoStack.commit(
					'part.addToCallout',
					{partID: selectedItem.id, step, callout, doLayout: true},
					tr('action.part.add_part_to_callout.undo'),
					[{type: 'csi', id: targetStep?.csiID}]
				);
			},
		},
		{
			text: 'action.part.add_part_to_callout.name',
			id: 'part_add_to_one_callout_cmenu',
			shown(selectedItem: LookupItem) {
				if (isItemSpecificType(selectedItem, 'part')) {
					const step = store.get.step(selectedItem.stepID);
					return step.callouts.length > 1;
				}
				return false;
			},
			children(selectedItem: LookupItem) {
				if (!isItemSpecificType(selectedItem, 'part')) {
					return [];
				}
				const step = store.get.step(selectedItem.stepID);
				return step.callouts.map(calloutID => {
					const callout = store.get.callout(calloutID);
					const lastStep = _.last(callout.steps);
					const targetStep = lastStep ? store.get.step(lastStep) : null;
					return {
						text: 'action.callout.position.' + callout.position + '.name',
						id: 'part_add_to_callout_' + callout.position + '_cmenu',
						cb() {
							undoStack.commit(
								'part.addToCallout',
								{partID: selectedItem.id, step, callout, doLayout: true},
								tr('action.part.add_part_to_callout.undo'),
								[{type: 'csi', id: targetStep?.csiID}]
							);
						},
					};
				});
			},
		},
		{
			text: 'action.part.remove_part_from_callout.name',
			id: 'part_remove_from_callout_cmenu',
			shown(selectedItem: LookupItem) {
				if (isItemSpecificType(selectedItem, 'part')) {
					const step = store.get.step(selectedItem.stepID);
					return step.parent.type === 'callout';
				}
				return false;
			},
			cb(selectedItem: LookupItem) {
				if (isItemSpecificType(selectedItem, 'part')) {
					const step = store.get.step(selectedItem.stepID);
					app.clearSelected();
					undoStack.commit(
						'part.removeFromCallout',
						{partID: selectedItem.id, step},
						tr('action.part.remove_part_from_callout.undo')
					);
				}
			},
		},
		{
			text: 'action.part.remove_from_pli.name',
			id: 'part_remove_from_pli_cmenu',
			enabled() {return false;},
			cb() {},
		},
		{
			text: 'action.part.change_part.name',
			id: 'part_change_name_cmenu',
			children: [
				{
					text: 'action.part.change_part.position_and_rotation.name',
					id: 'part_change_pos_cmenu',
					cb(selectedItem: LookupItem) {
						if (!isItemSpecificType(selectedItem, 'part')) {
							return;
						}
						const step = store.get.step(selectedItem.stepID);
						if (step.csiID == null) {
							return;
						}
						const csi = store.get.csi(step.csiID);
						const part = LDParse.model.get.partFromID(selectedItem.id, step.model.filename);
						const originalMatrix = _.cloneDeep(part.matrix);
						const transform = LicGL.decomposeLDMatrix(part.matrix);
						DialogManager('transformPartDialog', dialog => {
							dialog.$on('update', newTransform => {
								part.matrix = LicGL.composeLDMatrix(newTransform);
								csi.isDirty = true;
								app.redrawUI(true);
							});
							dialog.$on('ok', newTransform => {
								part.matrix = originalMatrix;
								const matrix = LicGL.composeLDMatrix(newTransform);
								const action = LDParse.getAction.matrix({
									filename: step.model.filename,
									partID: selectedItem.id,
									matrix,
								});
								const page = store.get.pageForItem(step);
								const mutation = {mutation: 'page.layout', opts: {page}};
								undoStack.commit(
									[action, mutation],
									null,
									tr('action.part.change_part.position_and_rotation.undo'),
									['csi']
								);
							});
							dialog.$on('cancel', () => {
								part.matrix = originalMatrix;
								csi.isDirty = true;
								app.redrawUI(true);
							});
							dialog.rotation = transform.rotation;
							dialog.position = transform.position;
						});
					},
				},
				{
					text: 'action.part.change_part.color.name',
					id: 'part_change_color_cmenu',
					cb(selectedItem: LookupItem) {
						DialogManager('ldColorPickerDialog', dialog => {
							dialog.$on('ok', newColorCode => {
								if (!isItemSpecificType(selectedItem, 'part')) {
									return;
								}
								const step = store.get.step({type: 'step', id: selectedItem.stepID});
								const pli = {type: 'pli', id: step.pliID};
								const action = LDParse.getAction.partColor({
									filename: step.model.filename,
									partID: selectedItem.id,
									color: newColorCode,
								});
								const change = [
									action,
									{mutation: 'pli.syncContent', opts: {pli, doLayout: true}},
								];
								if (store.get.inventoryPages().length) {
									const part = store.get.part(selectedItem.id, step);
									change.push({mutation: 'inventoryPage.removePart', opts: {
										filename: part.filename,
										colorCode: part.colorCode,
										doLayout: false,
									}});
									change.push({mutation: 'inventoryPage.addPart', opts: {
										filename: part.filename,
										colorCode: newColorCode,
										doLayout: true,
									}});
								}
								undoStack.commit(
									change,
									null,
									tr('dialog.ld_color_picker.action'),
									['csi', 'pliItem']
								);
							});
						});
					},
				},
				{
					text: 'action.part.change_part.to_different_part.name',
					id: 'part_change_part_cmenu',
					cb(selectedItem: LookupItem) {
						if (!isItemSpecificType(selectedItem, 'part')) {
							return;
						}
						DialogManager('stringChooserDialog', dialog => {
							dialog.$on('ok', filename => {
								(LDParse.loadRemotePart(filename)).then((abstractPart: AbstractPart) => {
									if (!abstractPart) {
										return;
									}
									store.mutations.csi.markAllDirty();
									const step = store.get.step(selectedItem.stepID);
									const pli = {type: 'pli', id: step.pliID};
									const newFilename = abstractPart.filename;
									const change = [
										LDParse.getAction.filename({
											filename: step.model.filename,
											partID: selectedItem.id,
											newFilename,
										}),
										{mutation: 'pli.syncContent', opts: {pli, doLayout: true}},
									];
									undoStack.commit(
										change, null,
										tr('action.part.change_part.to_different_part.undo'),
										['csi']
									);
								});
							});
							dialog.title = tr('dialog.change_part.title');
							dialog.label = tr('dialog.change_part.label');
						});
					},
				},
				{
					text: 'action.part.change_part.duplicate.name',
					id: 'part_duplicate_cmenu',
					cb(selectedItem: LookupItem) {
						if (isItemSpecificType(selectedItem, 'part')) {
							const step = store.get.step(selectedItem.stepID);
							const filename = step.model.filename;
							const part = _.cloneDeep(store.get.part(selectedItem.id, step));
							const partID = LDParse.partDictionary[filename].parts.length;
							const changes = [
								LDParse.getAction.addPart({filename, part}),
								{mutation: 'step.addPart', opts: {step, partID}},
								{mutation: 'inventoryPage.addPart', opts: {part, doLayout: true}},
							];
							undoStack.commit(
								changes, null,
								tr('action.part.change_part.duplicate.undo'), ['csi']
							);
						}
					},
				},
				{
					text: 'action.part.change_part.delete.name',
					id: 'part_delete_cmenu',
					cb(selectedItem: LookupItem) {
						if (isItemSpecificType(selectedItem, 'part')) {
							const partID = selectedItem.id;
							const step = store.get.step(selectedItem.stepID);
							const action = LDParse.getAction.removePart({
								filename: step.model.filename,
								partID,
							});
							const opts = {step, partID, doLayout: true};
							const mutation = {mutation: 'part.delete', opts};
							undoStack.commit([mutation, action], null,
								tr('action.part.change_part.delete.undo'), ['csi']);
							app.clearSelected();
						}
					},
				},
			],
		},
	],
};

function arrowTipRotationVisible(direction: Direction) {
	return (selectedItem: LookupItem) => {
		if (isItemSpecificType(selectedItem, 'calloutArrow')) {
			const arrow = store.get.calloutArrow(selectedItem);
			return arrow?.direction !== direction;
		}
		return false;
	};
}

function rotateArrowTip(direction: Direction) {
	return (selectedItem: LookupItem) => {
		const arrow = store.get.lookupToItem(selectedItem);
		undoStack.commit(
			'calloutArrow.rotateTip',
			{arrow, direction},
			tr('action.callout_arrow.rotate_tip.undo')
		);
	};
}

function showDisplacement(direction: DisplaceDirection) {
	return (selectedItem: LookupItem) => {
		if (isItemSpecificType(selectedItem, 'part')) {
			const step = store.get.step(selectedItem.stepID);
			if (step.displacedParts) {
				if (direction == null) {
					return step.displacedParts.some(p => p.partID === selectedItem.id);
				}
				return step.displacedParts.every(p => {
					return p.partID !== selectedItem.id || p.direction !== direction;
				});
			}
			return direction != null;
		}
		return false;
	};
}

function displacePart(direction: DisplaceDirection) {
	return (selectedItem: LookupItem) => {
		if (isItemSpecificType(selectedItem, 'part')) {
			const step = store.get.step(selectedItem.stepID);
			if (step.csiID != null) {
				const dirTr = direction == null
					? 'action.part.displace_part.none.name'
					: `action.part.displace_part.${direction}.name`;
				const directionName = tr(dirTr);
				undoStack.commit(
					'part.displace',
					{partID: selectedItem.id, step, direction},
					tr('action.part.displace_part.undo_@mf', {direction: directionName}),
					[{type: 'csi', id: step.csiID}]
				);
			}
		}
	};
}

function filterMenu(
	menu: (ContextMenuEntryInterface | ContextMenuSeparator)[],
	selectedItem: LookupItem
) {
	// Filter out invisible menu entries here so that if menu ends up empty, we don't draw anything in the UI
	// Removing some entries might leave extraneous separators; remove them too
	for (let i = 0; i < menu.length; i++) {
		const entry = menu[i];
		let deleteIndex = false;
		if (!isSeparator(entry)) {
			if (entry.shown && !entry.shown(selectedItem)) {
				deleteIndex = true;
			} else if (entry.children) {
				const children = (typeof entry.children === 'function')
					? entry.children(selectedItem)
					: entry.children;
				filterMenu(children, selectedItem);
				if (!children.length) {
					deleteIndex = true;
				}
			}
		} else {
			if (i === 0 || i === menu.length - 1 || (menu[i + 1] || {}).text === 'separator') {
				deleteIndex = true;
			}
		}
		if (deleteIndex) {
			_.pullAt(menu, i);
			i = -1;
		}
	}
}

// TODO: should just grey out / disable menu entries that don't work because page is locked. I think.
// TODO: Then eventually show a tooltip explaining why they're greyed out.
function enableIfUnlocked(selectedItem: LookupItem) {
	return !(store.get.pageForItem(selectedItem) || {}).locked;
}

export default function ContextMenu(selectedItem: LookupItem, localApp: any) {

	app = localApp;

	let subtype;
	if (selectedItem.type === 'page') {
		subtype = store.get.page(selectedItem).subtype;
	}

	let menu = contextMenu[subtype || selectedItem.type];
	menu = (typeof menu === 'function') ? menu(selectedItem) : menu;

	if (!Array.isArray(menu)) {
		return null;
	}

	const fullMenu = menu.map(menuEntry => {  // Super cheap clone of menu, so we don't destroy the original
		if (!isSeparator(menuEntry) && menuEntry.children) {
			const res = _.clone(menuEntry);
			if (!isSeparator(res)) {
				res.children = (typeof menuEntry.children === 'function')
					? menuEntry.children(selectedItem)
					: menuEntry.children;
				res.children = [...res.children];
			}
			return res;
		}
		return menuEntry;
	});

	filterMenu(fullMenu, selectedItem);

	if (fullMenu && fullMenu.length) {
		// Copy item type to each menu entry; saves typing them all out everywhere above
		menu.forEach(menuEntry => {
			if (!isSeparator(menuEntry)) {
				menuEntry.selectedItem = selectedItem;  // TODO: Is this necessary
			}
		});
		return menu;
	}
	return null;
}
