/* Web Lic - Copyright (C) 2018 Remi Gagne */

'use strict';

import _ from './util';
import LDParse from './LDParse';
import LDRender from './LDRender';
import store from './store';
import undoStack from './undoStack';
import openFileHandler from './fileUploader';
import uiState from './uiState';
import DialogManager from './dialog';
import LocaleManager from './translate';

let app;
const tr = LocaleManager.translate;

const annotationMenu = {
	text: 'action.add_annotation.name',
	children: [
		{
			text: 'action.add_annotation.label.name',
			cb(selectedItem) {
				const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
				const pos = store.get.coords.pageToItem(clickPos, selectedItem);
				const opts = {
					annotationType: 'label',
					properties: {text: tr('action.add_annotation.label.initial_text')},
					parent: selectedItem,
					...pos
				};
				undoStack.commit('annotation.add', opts, tr('action.add_annotation.label.undo'));
			}
		},
		{
			text: 'action.add_annotation.line.name',
			cb() {}
		},
		{
			text: 'action.add_annotation.circle.name',
			cb() {}
		},
		{
			text: 'action.add_annotation.arrow.name',
			cb(selectedItem) {
				const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
				const pos = store.get.coords.pageToItem(clickPos, selectedItem);
				const opts = {
					annotationType: 'arrow',
					properties: {direction: 'right', border: {color: 'black', width: 2}},
					parent: selectedItem,
					...pos
				};
				undoStack.commit('annotation.add', opts, tr('action.add_annotation.arrow.undo'));
			}
		},
		{
			text: 'action.add_annotation.image.name',
			cb(selectedItem) {
				const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
				const pos = store.get.coords.pageToItem(clickPos, selectedItem);
				openFileHandler('.png', 'dataURL', src => {
					const opts = {
						annotationType: 'image',
						properties: {src},
						parent: selectedItem,
						...pos
					};
					undoStack.commit('annotation.add', opts, tr('action.add_annotation.image.undo'));
				});
			}
		}
	]
};

const contextMenu = {
	titlePage: [
		{
			text: 'action.redo_layout.name',
			cb(selectedItem) {
				undoStack.commit('page.layout', {page: selectedItem}, tr(this.text));
			}
		},
		annotationMenu
	],
	inventoryPage: [
		// TODO: add way to add new parts to page and delete existing parts
		// TODO: add way to auto-recalculate part quantities (basically reset entire page)
		{
			text: 'action.redo_layout.name',
			cb(selectedItem) {
				undoStack.commit('page.layout', {page: selectedItem}, tr(this.text));
			}
		},
		annotationMenu
	],
	page: [
		{
			// TODO: concatenate parent -> child text so it comes out 'Layout Vertical' and not 'Vertical'
			text: 'action.layout.name',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'action.redo_layout.name',
					cb(selectedItem) {
						undoStack.commit('page.layout', {page: selectedItem}, tr(this.text));
					}
				},
				{
					text: 'action.layout.vertical.name',
					shown(selectedItem) {
						const page = store.get.lookupToItem(selectedItem);
						return page.layout !== 'vertical';
					},
					cb(selectedItem) {
						undoStack.commit('page.layout', {page: selectedItem, layout: 'vertical'},
							tr('action.layout.vertical.undo'));
					}
				},
				{
					text: 'action.layout.horizontal.name',
					shown(selectedItem) {
						const page = store.get.lookupToItem(selectedItem);
						return page.layout !== 'horizontal';
					},
					cb(selectedItem) {
						const opts = {page: selectedItem, layout: 'horizontal'};
						undoStack.commit('page.layout', opts, tr('action.layout.horizontal.undo'));
					}
				},
				{
					// TODO: don't allow insufficient row / col layouts that hide steps
					text: 'action.layout.by_row_and_column.name',
					cb(selectedItem) {
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
					}
				}
			]
		},
		{text: 'separator'},
		{
			text: 'action.prepend_blank_page.name',
			cb(selectedItem) {
				const nextPage = store.get.lookupToItem(selectedItem);
				undoStack.commit('page.add', {
					pageNumber: nextPage.number,
					insertionIndex: store.state.pages.indexOf(nextPage)
				}, tr(this.text));
			}
		},
		{
			text: 'action.append_blank_page.name',
			cb(selectedItem) {
				const prevPage = store.get.lookupToItem(selectedItem);
				undoStack.commit('page.add', {
					pageNumber: prevPage.number + 1,
					insertionIndex: store.state.pages.indexOf(prevPage) + 1
				}, tr(this.text));
			}
		},
		{text: 'separator'},
		{text: 'action.hide_step_separators.name', cb: () => {}},
		{
			text: 'action.add_blank_step.name',
			enabled: enableIfUnlocked,
			cb(selectedItem) {
				const dest = store.get.page(selectedItem.id);
				let prevStep = store.get.step(_.last(dest.steps));
				if (prevStep == null) {
					let prevPage = dest;
					while (prevPage && !prevPage.steps.length) {
						prevPage = store.get.prevBasicPage(prevPage);
					}
					if (prevPage && prevPage.type === 'page' && prevPage.steps.length) {
						prevStep = store.get.step(_.last(prevPage.steps));
					} else {
						prevStep = {number: 0};
					}
				}
				const opts = {
					dest,
					stepNumber: prevStep.number + 1,
					doLayout: true, renumber: true,
					model: _.cloneDeep(prevStep.model),
					insertionIndex: store.state.steps.indexOf(prevStep) + 1
				};
				undoStack.commit('step.add', opts, tr(this.text));
			}
		},
		annotationMenu,
		{
			text: 'action.delete_this_blank_page.name',
			shown(selectedItem) {
				const page = store.get.lookupToItem(selectedItem);
				return page.steps.length < 1;
			},
			cb(selectedItem) {
				const page = store.get.lookupToItem(selectedItem);
				const nextPage = store.get.isLastPage(page)
					? store.get.prevPage(page)
					: store.get.nextPage(page);
				undoStack.commit('page.delete', {page}, tr('action.delete_this_blank_page.undo'));
				app.clearSelected();
				app.setCurrentPage(nextPage);
			}
		}
	],
	step: [
		{
			text: 'action.layout.name',
			enabled: enableIfUnlocked,
			shown(selectedItem) {
				const step = store.get.lookupToItem(selectedItem);
				return step.steps.length > 0;
			},
			children: [
				{
					text: 'action.layout.vertical.name',
					shown(selectedItem) {
						const step = store.get.lookupToItem(selectedItem);
						return step.subStepLayout !== 'vertical';
					},
					cb(selectedItem) {
						const opts = {step: selectedItem, layout: 'vertical', doLayout: true};
						undoStack.commit('step.setSubStepLayout', opts, tr('action.layout.vertical.undo'));
					}
				},
				{
					text: 'action.layout.horizontal.name',
					shown(selectedItem) {
						const step = store.get.lookupToItem(selectedItem);
						return step.subStepLayout !== 'horizontal';
					},
					cb(selectedItem) {
						const opts = {step: selectedItem, layout: 'horizontal', doLayout: true};
						undoStack.commit('step.setSubStepLayout', opts, tr('action.layout.horizontal.undo'));
					}
				},
				{
					text: 'action.layout.by_row_and_column.name',
					cb(selectedItem) {
						const page = store.get.page(selectedItem);
						const originalLayout = _.cloneDeep(page.layout);

						app.clearSelected();
						app.redrawUI(true);

						DialogManager('pageRowColLayoutDialog', dialog => {
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
							dialog.rows = originalLayout.rows || 2;
							dialog.cols = originalLayout.cols || 2;
							dialog.direction = originalLayout.direction || 'vertical';
							dialog.show({x: 400, y: 150});
						});
					}
				}
			]
		},
		{
			text: 'action.add_callout.name',
			shown(selectedItem) {
				const step = store.get.step(selectedItem.id);
				return !step.steps.length;
			},
			cb(selectedItem) {
				undoStack.commit('step.addCallout', {step: selectedItem}, tr(this.text));
			}
		},
		{
			text: 'action.divide_into_sub_steps.name',
			shown(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const parent = store.get.parent(selectedItem);
				if (parent.type === 'page' && !step.callouts.length && !step.steps.length) {
					return true;
				}
				return false;
			},
			cb(selectedItem) {
				undoStack.commit('step.addSubStep', {step: selectedItem, doLayout: true}, tr(this.text));
			}
		},
		{
			text: 'action.stretch_step_to_next_page.name',
			enabled(selectedItem) {
				const step = store.get.lookupToItem(selectedItem);
				if (step.parent.type !== 'page') {
					return false;  // Only stretch basic page steps
				}
				const page = store.get.pageForItem(selectedItem);
				const nextPage = store.get.nextBasicPage(page);
				return nextPage && nextPage.steps.length < 1 && page.steps.length === 1;
			},
			cb(selectedItem) {
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
			}
		},
		{
			text: 'action.move_step_to.name',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'action.move_step_to.previous_page.name',
					shown(selectedItem) {
						const page = store.get.pageForItem(selectedItem);
						if (store.get.isFirstBasicPage(page) || store.get.isTitlePage(page)) {
							return false;  // Previous page doesn't exist
						} else if (page.steps.indexOf(selectedItem.id) !== 0) {
							return false;  // Can only move first step on a page to the previous page
						}
						return true;
					},
					enabled(selectedItem) {
						return !(store.get.prevBasicPage(selectedItem) || {}).locked;
					},
					cb(selectedItem) {
						undoStack.commit('step.moveToPreviousPage', {step: selectedItem},
							tr('action.move_step_to.previous_page.undo'));
					}
				},
				{
					text: 'action.move_step_to.next_page.name',
					shown(selectedItem) {
						const page = store.get.pageForItem(selectedItem);
						if (store.get.isLastBasicPage(page) || store.get.isTitlePage(page)) {
							return false;  // Next page doesn't exist
						} else if (page.steps.indexOf(selectedItem.id) !== page.steps.length - 1) {
							return false;  // Can only move last step on a page to the next page
						}
						return true;
					},
					enabled(selectedItem) {
						return !(store.get.nextBasicPage(selectedItem) || {}).locked;
					},
					cb(selectedItem) {
						undoStack.commit('step.moveToNextPage', {step: selectedItem},
							tr('action.move_step_to.next_page.undo'));
					}
				}
			]
		},
		{
			// TODO: If step being merged contains a submodel, must reorder all steps in that submodel too
			text: 'action.merge_step_with.name',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'action.merge_step_with.previous_step.name',
					shown(selectedItem) {
						return store.get.prevStep(selectedItem, true) != null;
					},
					cb(selectedItem) {
						const srcStep = selectedItem;
						const destStep = store.get.prevStep(selectedItem, true);
						undoStack.commit('step.mergeWithStep', {srcStep, destStep},
							tr('action.merge_step_with.previous_step.undo'));
						app.clearSelected();
					}
				},
				{
					text: 'action.merge_step_with.next_step.name',
					shown(selectedItem) {
						return store.get.nextStep(selectedItem, true) != null;
					},
					cb(selectedItem) {
						const srcStep = selectedItem;
						const destStep = store.get.nextStep(selectedItem, true);
						undoStack.commit('step.mergeWithStep', {srcStep, destStep},
							tr('action.merge_step_with.next_step.undo'));
						app.clearSelected();
					}
				}
			]
		},
		{
			text: 'action.delete_empty_step.name',
			enabled: enableIfUnlocked,
			shown(selectedItem) {
				const step = store.get.step(selectedItem);
				if (step.parent.type === 'callout' && store.get.parent(step).steps.length < 2) {
					return false;  // Can't delete first step in a callout
				}
				return _.isEmpty(step.parts);
			},
			cb(selectedItem) {
				undoStack.commit('step.delete', {step: selectedItem, doLayout: true}, tr(this.text));
				app.clearSelected();
			}
		},
		{text: 'separator'},
		{
			text: 'action.prepend_blank_step.name',
			enabled: enableIfUnlocked,  // TODO: disable this if previous step is in a different submodel
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.parent(step);
				const opts = {
					dest, stepNumber: step.number,
					doLayout: true, renumber: true,
					model: _.cloneDeep(step.model),
					insertionIndex: store.state.steps.indexOf(step),
					parentInsertionIndex: dest.steps.indexOf(step.id)
				};
				undoStack.commit('step.add', opts, tr(this.text));
			}
		},
		{
			text: 'action.append_blank_step.name',
			enabled: enableIfUnlocked,
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.parent(step);
				if (dest.type === 'callout') {
					const opts = {callout: dest, doLayout: true};
					undoStack.commit('callout.addStep', opts, tr(this.text));
				} else {
					const opts = {
						dest, stepNumber: step.number + 1,
						doLayout: true, renumber: true,
						model: _.cloneDeep(step.model),
						insertionIndex: store.state.steps.indexOf(step) + 1,
						parentInsertionIndex: dest.steps.indexOf(step.id) + 1
					};
					undoStack.commit('step.add', opts, tr(this.text));
				}
			}
		},
		{text: 'separator'},
		{
			text(selectedItem) {
				const step = store.get.lookupToItem(selectedItem);
				return step.rotateIconID == null ? 'action.add_rotate_icon.name'
					: 'action.delete_rotate_icon.name';
			},
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				undoStack.commit(
					'step.toggleRotateIcon',
					{step, display: step.rotateIconID == null, doLayout: true},
					tr(this.text(selectedItem))
				);
			}
		},
		annotationMenu
	],
	numberLabel(selectedItem) {
		const parent = store.get.parent(selectedItem);
		switch (parent.type) {
			case 'page':
				return [
					{text: 'action.change_page_number.name', cb() {}}
				];
			case 'step':
				return [
					{text: 'action.change_step_number.name', cb() {}}
				];
		}
		return [];
	},
	csi: [
		{
			text: 'action.rotate_csi.name',
			children: [
				{
					text: 'action.rotate_csi.flip_upside_down.name',
					cb(selectedItem) {
						const csi = selectedItem;
						const rotation = {x: 0, y: 0, z: 180};
						const opts = {csi, rotation, addRotateIcon: true, doLayout: true};
						undoStack.commit('csi.rotate', opts, tr('action.rotate_csi.flip_upside_down.undo'),
							[csi]);
					}
				},
				{
					text: 'action.rotate_csi.rotate_front_to_back.name',
					cb(selectedItem) {
						const csi = selectedItem;
						const rotation = {x: 0, y: 180, z: 0};
						const opts = {csi, rotation, addRotateIcon: true, doLayout: true};
						undoStack.commit('csi.rotate', opts,
							tr('action.rotate_csi.rotate_front_to_back.undo'), [csi]);
					}
				},
				{
					text: 'action.rotate_csi.custom_rotation.name',
					cb(selectedItem) {
						const csi = store.get.csi(selectedItem.id);
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
									tr('action.rotate_csi.custom_rotation.undo'),
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
							dialog.rotation = _.cloneDeep(initialRotation);
						});
					}
				},
				{
					text: 'action.rotate_csi.remove_rotation.name',
					shown(selectedItem) {
						const csi = store.get.csi(selectedItem.id);
						return csi.rotation != null;
					},
					cb(selectedItem) {
						const csi = selectedItem;
						const opts = {csi, rotation: null, addRotateIcon: false, doLayout: true};
						undoStack.commit('csi.rotate', opts, tr('action.rotate_csi.remove_rotation.undo'),
							[csi]);
					}
				}
			]
		},
		{
			text: 'action.copy_rotation_to_next_steps.name',
			shown(selectedItem) {
				const csi = store.get.csi(selectedItem);
				const rotation = csi.rotation;
				return rotation && (rotation.x || rotation.y || rotation.z);
			},
			cb(selectedItem) {
				// TODO: rewrite this to use simple number picker dialog
				// TODO: this doesn't re-layout pages after applying changes. Must check all affected pages.
				// TODO: If next step spinner is spun up then back down, need to undo some rotations
				const csi = store.get.csi(selectedItem.id);
				const rotation = _.cloneDeep(csi.rotation);
				const step = store.get.step(csi.parent.id);
				const originalRotations = [];

				app.clearSelected();
				app.redrawUI(true);

				DialogManager('numberChooserDialog', dialog => {
					dialog.$on('ok', newValues => {
						const csiList = originalRotations
							.map((rotation, id) => ({type: 'csi', id})).filter(el => el);
						undoStack.commit(
							'step.copyRotation',
							{step, rotation, nextXSteps: newValues.value},
							tr('action.copy_rotation_to_next_steps.undo'),
							csiList
						);
					});
					dialog.$on('cancel', () => {
						originalRotations.forEach((rotation, csiID) => {
							const csi = store.get.csi(csiID);
							if (csi) {
								csi.rotation = (rotation === 'none') ? null : rotation;
								csi.isDirty = true;
							}
						});
						app.redrawUI(true);
					});
					dialog.$on('update', newValues => {
						let csi, nextStep = step;
						for (let i = 0; i < newValues.value; i++) {
							if (nextStep) {
								nextStep = store.get.nextStep(nextStep);
							}
							if (nextStep) {
								csi = store.get.csi(nextStep.csiID);
								if (csi) {
									if (originalRotations[csi.id] == null) {
										originalRotations[csi.id] =
											(csi.rotation == null) ? 'none' : csi.rotation;
									}
									csi.isDirty = true;
									csi.rotation = rotation;
								}
							}
						}
						app.redrawUI(true);
					});
					dialog.title = tr('dialog.copy_csi_rotation.title');
					dialog.label = tr('dialog.copy_csi_rotation.label');
					dialog.labelWidth = '220px';
					dialog.min = dialog.value = 0;
				});
			}
		},
		{
			text: 'action.scale_csi.name',
			cb(selectedItem) {
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
					dialog.$on('update', newValues => {
						csi.scale = _.clamp(newValues.value || 0, 0.001, 5);
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.$on('ok', newValues => {
						undoStack.commit(
							'csi.scale',
							{csi, scale: newValues.value, doLayout: true},
							tr('action.scale_csi.undo'),
							[csi]
						);
					});
					dialog.$on('cancel', () => {
						csi.scale = originalScale;
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.title = tr('dialog.scale_csi.title');
					dialog.min = 0;
					dialog.max = 10;
					dialog.step = 0.1;
					dialog.bodyText = '';
					dialog.value = initialScale;
				});
			}
		},
		{
			text: 'action.remove_scale.name',
			shown(selectedItem) {
				const csi = store.get.csi(selectedItem.id);
				return (csi.scale != null);
			},
			cb(selectedItem) {
				const csi = store.get.csi(selectedItem.id);
				undoStack.commit(
					'csi.scale',
					{csi, scale: null, doLayout: true},
					tr('action.remove_scale.undo'),
					[csi]
				);
			}
		},
		{text: 'separator'},
		{
			text: 'action.select_part.name',
			shown(selectedItem) {
				const step = store.get.parent(selectedItem);
				return step && step.parts && step.parts.length;
			},
			children(selectedItem) {
				const step = store.get.parent(selectedItem);
				return (step.parts || []).map(partID => {
					const part = LDParse.model.get.partFromID(partID, step.model.filename);
					const abstractPart = LDParse.partDictionary[part.filename];
					return {
						text: abstractPart.name,
						cb() {
							app.setSelected({type: 'part', id: partID, stepID: step.id});
						}
					};
				});
			}
		},
		{text: 'action.add_new_part.name', cb: () => {}},
		annotationMenu
	],
	pli: [],
	pliItem: [
		{
			text: 'action.rotate_part_list_image.name',
			cb(selectedItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const filename = pliItem.filename;
				const pliTransforms = uiState.get('pliTransforms');
				const originalTransform = _.cloneDeep(pliTransforms[filename]);
				const page = store.get.pageForItem(pliItem);
				pliTransforms[filename] = pliTransforms[filename] || {};

				app.clearSelected();
				DialogManager('rotatePartImageDialog', dialog => {
					dialog.$on('update', newValues => {
						pliTransforms[filename].rotation = {...newValues.rotation};
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.$on('ok', newValues => {
						const path = `/${filename}/rotation`, root = pliTransforms;
						const op = 'replace';
						const change = [
							{
								redo: [{root, op, path, value: {...newValues.rotation}}],
								undo: [{root, op, path, value: (originalTransform || {}).rotation || null}]
							},
							{mutation: 'page.layout', opts: {page}}
						];
						const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
						undoStack.commit(change, null, tr('action.rotate_part_list_image.undo'), dirtyItems);
					});
					dialog.$on('cancel', () => {
						if (originalTransform == null) {
							delete pliTransforms[filename];
						} else {
							pliTransforms[filename] = originalTransform;
						}
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.title = tr('dialog.rotate_part_image.title_pli');
					dialog.showRotateIconCheckbox = false;
					dialog.rotation = (originalTransform || {}).rotation || {x: 0, y: 0, z: 0};
				});
			}
		},
		{
			text: 'action.scale_part_list_image.name',
			cb(selectedItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const filename = pliItem.filename;
				const pliTransforms = uiState.get('pliTransforms');
				const originalTransform = _.cloneDeep(pliTransforms[filename]);
				const page = store.get.pageForItem(pliItem);
				pliTransforms[filename] = pliTransforms[filename] || {};

				DialogManager('numberChooserDialog', dialog => {
					dialog.$on('update', newValues => {
						pliTransforms[filename].scale = _.clamp(newValues.value || 0, 0.001, 5);
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.$on('ok', newValues => {
						const value = _.clamp(newValues.value || 0, 0.001, 5);
						const path = `/${filename}/scale`, root = pliTransforms;
						const op = 'replace';
						const change = [
							{
								redo: [{root, op, path, value}],
								undo: [{root, op, path, value: (originalTransform || {}).scale || null}]
							},
							{mutation: 'page.layout', opts: {page}}
						];
						const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
						undoStack.commit(change, null, tr('action.scale_part_list_image.undo'), dirtyItems);
					});
					dialog.$on('cancel', () => {
						if (originalTransform == null) {
							delete pliTransforms[filename];
						} else {
							pliTransforms[filename] = originalTransform;
						}
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.title = tr('dialog.scale_pli.title');
					dialog.min = 0;
					dialog.max = 10;
					dialog.step = 0.1;
					dialog.bodyText = '';
					dialog.value = (originalTransform || {}).scale || 1;
				});
			}
		},
		{
			text: 'action.remove_part_list_image_scale.name',
			shown(selectedItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				return uiState.getPLITransform(pliItem.filename).scale != null;
			},
			cb(selectedItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const page = store.get.pageForItem(pliItem);
				const filename = pliItem.filename;
				const pliTransforms = uiState.get('pliTransforms');
				const originalScale = pliTransforms[filename].scale;
				const path = `/${filename}/scale`, root = pliTransforms;
				const change = [
					{
						redo: [{root, op: 'remove', path}],
						undo: [{root, op: 'add', path, value: originalScale}]
					},
					'clearCacheTargets',
					{mutation: 'page.layout', opts: {page}}
				];
				const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
				undoStack.commit(change, null, tr('action.remove_part_list_image_scale.undo'), dirtyItems);
			}
		}
	],
	quantityLabel(selectedItem) {
		const page = store.get.pageForItem(selectedItem);
		switch (page.type) {
			case 'inventoryPage':
				return [
					// TODO: add 'Reset Count' menu entry to labels with modified counts
					{
						text: 'action.change_count.name',
						cb(selectedItem) {
							const pliItem = store.get.parent(selectedItem);
							DialogManager('numberChooserDialog', dialog => {
								dialog.$on('ok', newValues => {
									undoStack.commit(
										'pliItem.changeQuantity',
										{pliItem, quantity: newValues.value},
										tr('action.change_count.undo')
									);
								});
								dialog.title = tr('dialog.change_part_count.title');
								dialog.label = tr('dialog.change_part_count.label');
								dialog.labelWidth = '120px';
								dialog.value = pliItem.quantity;
							});
						}
					}
				];
		}
		return [];
	},
	rotateIcon: [
		{
			text: 'action.delete_rotate_icon.name',
			cb(selectedItem) {
				const rotateIcon = selectedItem;
				undoStack.commit('rotateIcon.delete', {rotateIcon}, tr(this.text));
			}
		}
	],
	annotation(selectedItem) {
		const deleteMenu = {
			text: 'action.delete_annotation.name',
			cb(selectedItem) {
				const annotation = selectedItem;
				undoStack.commit('annotation.delete', {annotation}, tr('action.delete_annotation.undo'));
				app.clearSelected();
			}
		};

		const setStyleMenu = {
			text: 'action.change_annotation_text_and_style.name',
			shown(selectedItem) {
				const annotation = store.get.annotation(selectedItem);
				return annotation && annotation.annotationType === 'label';
			},
			cb(selectedItem) {
				const annotation = store.get.annotation(selectedItem);
				DialogManager('styleDialog', dialog => {
					dialog.$on('ok', newProperties => {
						const opts = {annotation, newProperties};
						undoStack.commit('annotation.set', opts,
							tr('action.change_annotation_text_and_style.undo'));
					});
					dialog.title = tr('dialog.style_annotation.title');
					dialog.text = annotation.text;
					dialog.color = annotation.color;
					dialog.font = annotation.font;
					dialog.show();
				});
			}
		};

		const annotation = store.get.annotation(selectedItem);
		switch (annotation.annotationType) {
			case 'label':
				return [setStyleMenu, deleteMenu];
			case 'arrow':
				return [...contextMenu.calloutArrow, deleteMenu];
			case 'image':
				return [deleteMenu];
		}
		return null;
	},
	callout: [
		{
			text: 'Position',
			children: ['top', 'right', 'bottom', 'left'].map(position => {
				return {
					text: _.startCase(position),
					shown: (function(position) {
						return function(selectedItem) {
							const callout = store.get.lookupToItem(selectedItem);
							return callout.position !== position;
						};
					})(position),
					cb: (function(position) {
						return function(selectedItem) {
							const opts = {callout: selectedItem, position, doLayout: true};
							undoStack.commit('callout.layout', opts, 'Set Callout Position');
						};
					})(position)
				};
			})
		},
		{
			text: 'Layout',
			children: [
				{
					text: 'Horizontal',
					shown(selectedItem) {
						const callout = store.get.lookupToItem(selectedItem);
						return callout.layout !== 'horizontal';
					},
					cb(selectedItem) {
						const opts = {callout: selectedItem, layout: 'horizontal', doLayout: true};
						undoStack.commit('callout.layout', opts, this.text);
					}
				},
				{
					text: 'Vertical',
					shown(selectedItem) {
						const callout = store.get.lookupToItem(selectedItem);
						return callout.layout !== 'vertical';
					},
					cb(selectedItem) {
						const opts = {callout: selectedItem, layout: 'vertical', doLayout: true};
						undoStack.commit('callout.layout', opts, this.text);
					}
				}
			]
		},
		{
			text: 'Add Step',
			cb(selectedItem) {
				undoStack.commit('callout.addStep', {callout: selectedItem, doLayout: true}, this.text);
			}
		},
		{
			text: 'Delete Empty Callout',
			shown(selectedItem) {
				const callout = store.get.callout(selectedItem);
				if (callout == null || callout.steps.length > 1) {
					return false;
				} else if (callout && callout.steps.length < 1) {
					return true;
				}
				const step = store.get.step(callout.steps[0]);
				return step.parts.length < 1;
			},
			cb(selectedItem) {
				app.clearSelected();
				undoStack.commit('callout.delete', {callout: selectedItem, doLayout: true}, this.text);
			}
		}
	],
	calloutArrow: [
		{
			text: 'Select Point...',
			children(selectedItem) {
				const arrow = store.get.calloutArrow(selectedItem);
				return arrow.points.map((pointID, idx) => {
					return {
						text: (idx === 0) ? 'Base' :
							(idx === arrow.points.length - 1) ? 'Tip' : `Point ${idx}`,
						cb() {
							app.setSelected({type: 'point', id: pointID});
						}
					};
				});
			}
		},
		{
			text: 'Add Point',
			cb(selectedItem) {
				const arrow = store.get.calloutArrow(selectedItem);
				const newPointIdx = Math.ceil(arrow.points.length / 2);
				undoStack.commit('calloutArrow.addPoint', {arrow}, this.text);
				app.setSelected({type: 'point', id: arrow.points[newPointIdx]});
			}
		},
		{
			text: 'Add Tip (NYI)',
			cb() {}
		},
		{
			text: 'Rotate Tip...',
			children: ['up', 'right', 'down', 'left'].map(direction => {
				return {
					text: _.startCase(direction),
					shown: arrowTipRotationVisible(direction),
					cb: rotateArrowTip(direction)
				};
			})
		}
	],
	divider: [
		{
			text: 'Resize',
			cb(selectedItem) {
				const divider = store.get.divider(selectedItem);
				const bbox = _.geom.bbox([divider.p1, divider.p2]);
				// TODO: store divider orientation in divider itself
				const originalSize = (bbox.height === 0) ? bbox.width : bbox.height;

				DialogManager('numberChooserDialog', dialog => {
					dialog.$on('update', newValues => {
						store.mutations.divider.setLength({divider, newLength: newValues.value});
						app.drawCurrentPage();
					});
					dialog.$on('ok', () => {
						undoStack.commit('', null, 'Set Divider Length');
					});
					dialog.$on('cancel', () => {
						store.mutations.divider.setLength({divider, newLength: originalSize});
						app.drawCurrentPage();
					});
					dialog.title = 'Resize Page Divider';
					dialog.min = 1;
					dialog.max = 10000;
					dialog.step = 1;
					dialog.value = originalSize;
				});
			}
		},
		{
			text: 'Delete',
			cb(selectedItem) {
				undoStack.commit('divider.delete', {divider: selectedItem}, 'Remove Divider');
				app.clearSelected();
			}
		}
	],
	point: [
		{
			text: 'Delete',
			shown(selectedItem) {
				const point = store.get.point(selectedItem);
				if (point.parent.type === 'calloutArrow') {
					const pts = store.get.parent(point).points;
					return pts[0] !== point.id && pts[pts.length - 1] !== point.id;
				}
				return true;
			},
			cb(selectedItem) {
				undoStack.commit('item.delete', {item: selectedItem}, 'Delete Point');
				app.clearSelected();
			}
		}
	],
	submodel: [
		{
			text: 'Convert to Callout',
			shown(selectedItem) {
				// Only allow submodel -> callout conversion if submodel contains no submodels
				const submodel = LDParse.model.get.abstractPart(selectedItem.filename);
				for (let i = 0; i < submodel.parts.length; i++) {
					if (LDParse.model.isSubmodel(submodel.parts[i].filename)) {
						return false;
					}
				}
				return true;
			},
			cb(selectedItem) {
				const step = store.get.step(selectedItem.stepID);
				const destStep = {type: 'step', id: step.model.parentStepID};
				const opts = {modelFilename: selectedItem.filename, destStep, doLayout: true};
				undoStack.commit('submodel.convertToCallout', opts, this.text);
				app.clearSelected();
				app.setCurrentPage(store.get.pageForItem(destStep));
			}
		}
	],
	part: [
		// TODO: first add support for multiple selection, then add support for merging two parts in a PLI,
		// like for antenna base and stick, or left / right hinge parts or 2x2 turntables
		{
			text: 'Displace Part...',
			children: ['up', 'down', 'left', 'right', 'forward', 'backward', null].map(direction => {
				return {
					text: _.startCase(direction || 'None'),
					shown: showDisplacement(direction),
					cb: displacePart(direction)
				};
			})
		},
		{
			text: 'Adjust Displacement',
			shown(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				if (step.displacedParts) {
					return step.displacedParts.some(p => p.partID === selectedItem.id);
				}
				return false;
			},
			cb(selectedItem) {
				const step = store.get.step(selectedItem.stepID);
				const csi = store.get.csi(step.csiID);
				const displacement = step.displacedParts.find(p => p.partID === selectedItem.id);
				const originalDisplacement = {
					partDistance: displacement.partDistance,
					arrowOffset: displacement.arrowOffset,
					arrowLength: displacement.arrowLength,
					arrowRotation: displacement.arrowRotation
				};

				app.clearSelected();
				DialogManager('displacePartDialog', dialog => {
					dialog.$on('ok', () => {
						undoStack.commit('part.displace', {step, ...displacement}, 'Adjust Displaced Part');
					});
					dialog.$on('cancel', () => {
						Object.assign(displacement, originalDisplacement);
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.$on('update', newValues => {
						Object.assign(displacement, newValues);
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.values = displacement;
				});
			}
		},
		{
			text: 'Remove Displacement',
			shown: showDisplacement(null),
			cb: displacePart(null)
		},
		{
			text: 'Move Part to...',
			children: [
				{
					text: 'Previous Step',
					shown(selectedItem) {
						const step = store.get.step({type: 'step', id: selectedItem.stepID});
						return store.get.prevStep(step) != null;
					},
					cb(selectedItem) {
						const srcStep = store.get.step(selectedItem.stepID);
						const destStep = store.get.prevStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: selectedItem.id, srcStep, destStep, doLayout: true},
							'Move Part to Previous Step',
							[{type: 'csi', id: srcStep.csiID}, {type: 'csi', id: destStep.csiID}]
						);
					}
				},
				{
					text: 'Next Step',
					shown(selectedItem) {
						const step = store.get.step({type: 'step', id: selectedItem.stepID});
						return store.get.nextStep(step) != null;
					},
					cb(selectedItem) {
						const srcStep = store.get.step(selectedItem.stepID);
						const destStep = store.get.nextStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: selectedItem.id, srcStep, destStep, doLayout: true},
							'Move Part to Next Step',
							[{type: 'csi', id: srcStep.csiID}, {type: 'csi', id: destStep.csiID}]
						);
					}
				}
			]
		},
		{
			text: 'Add Part to Callout',
			shown(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				return step.callouts.length === 1;
			},
			cb(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				const callout = store.get.callout(step.callouts[0]);
				const targetStep = store.get.step(_.last(callout.steps));
				undoStack.commit(
					'part.addToCallout',
					{partID: selectedItem.id, step, callout, doLayout: true},
					this.text,
					[{type: 'csi', id: targetStep.csiID}]
				);
			}
		},
		{
			text: 'Add Part to Callout',
			shown(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				return step.callouts.length > 1;
			},
			children(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				return step.callouts.map(calloutID => {
					const callout = store.get.callout(calloutID);
					const targetStep = store.get.step(_.last(callout.steps));
					return {
						text: _.startCase(callout.position),
						cb() {
							undoStack.commit(
								'part.addToCallout',
								{partID: selectedItem.id, step, callout, doLayout: true},
								'Add Part to Callout',
								[{type: 'csi', id: targetStep.csiID}]
							);
						}
					};
				});
			}
		},
		{
			text: 'Remove Part from Callout',
			shown(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				return step.parent.type === 'callout';
			},
			cb(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				app.clearSelected();
				undoStack.commit(
					'part.removeFromCallout',
					{partID: selectedItem.id, step},
					this.text
				);
			}
		},
		{
			text: 'Remove from PLI (NYI)',
			enabled() { return false;},
			cb() {}
		},
		{
			text: 'Change Part',
			children: [
				{
					text: 'Change Position and Rotation',
					cb(selectedItem) {
						const step = store.get.step({type: 'step', id: selectedItem.stepID});
						const csi = store.get.csi(step.csiID);
						const part = LDParse.model.get.partFromID(selectedItem.id, step.model.filename);
						const originalMatrix = _.cloneDeep(part.matrix);
						const transform = LDRender.LDMatrixToTransform(part.matrix);
						DialogManager('transformPartDialog', dialog => {
							dialog.$on('update', newTransform => {
								part.matrix = LDRender.TransformToLDMatrix(newTransform);
								csi.isDirty = true;
								app.redrawUI(true);
							});
							dialog.$on('ok', newTransform => {
								part.matrix = originalMatrix;
								const matrix = LDRender.TransformToLDMatrix(newTransform);
								const action = LDParse.getAction.matrix({
									filename: step.model.filename,
									partID: selectedItem.id,
									matrix
								});
								const page = store.get.pageForItem(step);
								const mutation = {mutation: 'page.layout', opts: {page}};
								undoStack.commit([action, mutation], null, 'Change Part Transform', ['csi']);
							});
							dialog.$on('cancel', () => {
								part.matrix = originalMatrix;
								csi.isDirty = true;
								app.redrawUI(true);
							});
							dialog.rotation = transform.rotation;
							dialog.position = transform.position;
						});
					}
				},
				{
					text: 'Change Color',
					cb(selectedItem) {
						DialogManager('ldColorPickerDialog', dialog => {
							dialog.$on('ok', newColorCode => {
								const step = store.get.step({type: 'step', id: selectedItem.stepID});
								const pli = {type: 'pli', id: step.pliID};
								const action = LDParse.getAction.partColor({
									filename: step.model.filename,
									partID: selectedItem.id,
									color: newColorCode
								});
								const mutation = {mutation: 'pli.syncContent', opts: {pli, doLayout: true}};
								undoStack.commit(
									[action, mutation],
									null,
									tr('dialog.ld_color_picker.action'),
									['csi']
								);
							});
						});
					}
				},
				{
					text: 'Change to Different Part',
					cb(selectedItem) {
						DialogManager('stringChooserDialog', dialog => {
							dialog.$on('ok', filename => {
								(LDParse.loadRemotePart(filename)).then(abstractPart => {
									const step = store.get.step({type: 'step', id: selectedItem.stepID});
									const pli = {type: 'pli', id: step.pliID};
									const newFilename = abstractPart.filename;
									const action = LDParse.getAction.filename({
										filename: step.model.filename,
										partID: selectedItem.id,
										newFilename
									});
									const mutation = {
										mutation: 'pli.syncContent', opts: {pli, doLayout: true}
									};
									undoStack.commit([action, mutation], null, 'Change Part Type', ['csi']);
								});
							});
							dialog.title = 'New Part Filename';
							dialog.label = 'Filename';
							dialog.labelWidth = '80px';
						});
					}
				},
				{
					text: 'Duplicate',
					cb(selectedItem) {
						const step = store.get.step({type: 'step', id: selectedItem.stepID});
						const filename = step.model.filename;
						const part = _.cloneDeep(store.get.part(selectedItem.id, step));
						const partID = LDParse.partDictionary[filename].parts.length;
						const action = LDParse.getAction.addPart({filename, part});
						const mutation = {mutation: 'step.addPart', opts: {step, partID}};
						undoStack.commit([action, mutation], null, 'Duplicate Part', ['csi']);
					}
				},
				{
					text: 'Delete',
					cb(selectedItem) {
						const partID = selectedItem.id;
						const step = store.get.step(selectedItem.stepID);
						const action = LDParse.getAction.removePart({
							filename: step.model.filename,
							partID
						});
						const opts = {step, partID, doLayout: true};
						const mutation = {mutation: 'part.delete', opts};
						undoStack.commit([mutation, action], null, 'Delete Part', ['csi']);
					}
				}
			]
		}
	]
};

function arrowTipRotationVisible(direction) {
	return (selectedItem) => {
		const arrow = store.get.lookupToItem(selectedItem);
		return arrow.direction !== direction;
	};
}

function rotateArrowTip(direction) {
	return (selectedItem) => {
		const arrow = store.get.lookupToItem(selectedItem);
		undoStack.commit('calloutArrow.rotateTip', {arrow, direction}, 'Rotate Arrow Tip');
	};
}

function showDisplacement(direction) {
	return (selectedItem) => {
		const step = store.get.step({type: 'step', id: selectedItem.stepID});
		if (step.displacedParts) {
			if (direction == null) {
				return step.displacedParts.some(p => p.partID === selectedItem.id);
			} else {
				return step.displacedParts.every(p => {
					return p.partID !== selectedItem.id || p.direction !== direction;
				});
			}
		}
		return direction != null;
	};
}

function displacePart(direction) {
	return (selectedItem) => {
		const step = store.get.step(selectedItem.stepID);
		undoStack.commit(
			'part.displace',
			{partID: selectedItem.id, step, direction},
			`Displace Part ${_.startCase(direction || 'None')}`,
			[{type: 'csi', id: step.csiID}]
		);
	};
}

function filterMenu(menu, selectedItem) {
	// Filter out invisible menu entries here so that if menu ends up empty, we don't draw anything in the UI
	// Removing some entries might leave extraneous separators; remove them too
	for (let i = 0; i < menu.length; i++) {
		const entry = menu[i];
		let deleteIndex = false;
		if (entry.text === 'separator') {
			if (i === 0 || i === menu.length - 1 || (menu[i + 1] || {}).text === 'separator') {
				deleteIndex = true;
			}
		} else if (entry.shown && !entry.shown(selectedItem)) {
			deleteIndex = true;
		} else if (entry.children) {
			filterMenu(entry.children, selectedItem);
			if (!entry.children.length) {
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
function enableIfUnlocked(selectedItem) {
	return !(store.get.pageForItem(selectedItem) || {}).locked;
}

export default function ContextMenu(selectedItem, localApp) {

	app = localApp;

	let menu = contextMenu[selectedItem.type];
	menu = (typeof menu === 'function') ? menu(selectedItem) : menu;

	if (!Array.isArray(menu)) {
		return null;
	}

	menu = menu.map(menuEntry => {  // Super cheap clone of menu, so we don't destroy the original
		if (menuEntry.children) {
			const res = {};
			_.forOwn(menuEntry, (v, k) => {
				res[k] = v;
			});
			res.children = (typeof menuEntry.children === 'function')
				? menuEntry.children(selectedItem)
				: menuEntry.children;
			res.children = [...res.children];
			return res;
		}
		return menuEntry;
	});

	filterMenu(menu, selectedItem);

	if (menu) {
		// Copy item type to each meny entry; saves typing them all out everywhere above
		menu.forEach(menuEntry => (menuEntry.selectedItem = selectedItem));
		return menu;
	}
}
