/* global Vue: false */
'use strict';

import _ from './util';
import LDParse from './LDParse';
import store from './store';
import undoStack from './undoStack';
import openFileHandler from './fileUploader';
import uiState from './uiState';
import DialogManager from './dialog';

let app;

const contextMenu = {
	page: [
		{
			// TODO: concatenate parent -> child text so it comes out 'Layout Vertical' and not 'Vertical'
			text: 'Layout',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'Redo Layout',
					cb(selectedItem) {
						undoStack.commit('page.layout', {page: selectedItem}, this.text);
					}
				},
				{
					text: 'Vertical',
					shown(selectedItem) {
						const page = store.get.lookupToItem(selectedItem);
						return page.layout !== 'vertical';
					},
					cb(selectedItem) {
						undoStack.commit('page.layout', {page: selectedItem, layout: 'vertical'}, this.text);
					}
				},
				{
					text: 'Horizontal',
					shown(selectedItem) {
						const page = store.get.lookupToItem(selectedItem);
						return page.layout !== 'horizontal';
					},
					cb(selectedItem) {
						undoStack.commit('page.layout', {page: selectedItem, layout: 'horizontal'}, this.text);
					}
				},
				{
					text: 'By Row and Column...',
					cb(selectedItem) {
						const page = store.get.page(selectedItem);
						const originalLayout = _.clone(page.layout);

						DialogManager.setDialog('pageRowColLayoutDialog');
						app.clearSelected();

						Vue.nextTick(() => {
							const dialog = DialogManager.getDialog();
							dialog.$off();  // TODO: initialize these event listeners just once... somewhere, somehow.  This code smells.
							dialog.$on('ok', newValues => {
								undoStack.commit(
									'page.layout',
									{page, layout: newValues},
									'Layout Page by Row and Column'
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

						app.redrawUI(true);
					}
				}
			]
		},
		{text: 'separator'},
		{
			text: 'Prepend Blank Page',
			cb(selectedItem) {
				const nextPage = store.get.lookupToItem(selectedItem);
				undoStack.commit('page.add', {
					pageNumber: nextPage.number,
					insertionIndex: store.state.pages.indexOf(nextPage)
				}, this.text);
			}
		},
		{
			text: 'Append Blank Page',
			cb(selectedItem) {
				const prevPage = store.get.lookupToItem(selectedItem);
				undoStack.commit('page.add', {
					pageNumber: prevPage.number + 1,
					insertionIndex: store.state.pages.indexOf(prevPage) + 1
				}, this.text);
			}
		},
		{text: 'separator'},
		{text: 'Hide Step Separators (NYI)', cb: () => {}},
		{
			text: 'Add Blank Step',
			enabled: enableIfUnlocked,
			cb(selectedItem) {
				const dest = store.get.page(selectedItem.id);
				let prevStep = store.get.step(_.last(dest.steps));
				if (prevStep == null) {
					let prevPage = dest;
					while (prevPage && prevPage.type === 'page' && !prevPage.steps.length) {
						prevPage = store.get.prevPage(prevPage);
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
					model: _.clone(prevStep.model),
					insertionIndex: store.state.steps.indexOf(prevStep) + 1
				};
				undoStack.commit('step.add', opts, this.text);
			}
		},
		{
			text: 'Add Annotation',
			children: [
				{
					text: 'Label',
					cb(selectedItem) {
						const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
						const opts = {
							annotationType: 'label',
							properties: {text: 'New Label', ...clickPos},
							parent: selectedItem
						};
						undoStack.commit('annotation.add', opts, 'Add Label');
					}
				},
				{
					text: 'Line (NYI)',
					cb() {}
				},
				{
					text: 'Circle (NYI)',
					cb() {}
				},
				{
					text: 'Image',
					cb(selectedItem) {
						const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
						openFileHandler('.png', 'dataURL', src => {
							const opts = {
								annotationType: 'image',
								properties: {src, ...clickPos},
								parent: selectedItem
							};
							undoStack.commit('annotation.add', opts, 'Add Image');
						});
					}
				}
			]
		},
		{
			text: 'Delete This Blank Page',
			shown(selectedItem) {
				const page = store.get.lookupToItem(selectedItem);
				return page.steps.length < 1;
			},
			cb(selectedItem) {
				const page = store.get.lookupToItem(selectedItem);
				const nextPage = store.get.isLastPage(page) ? store.get.prevPage(page, true) : store.get.nextPage(page);
				undoStack.commit('page.delete', {page}, 'Delete Page');
				app.clearSelected();
				app.setCurrentPage(nextPage);
			}
		}
	],
	step: [
		{
			text: 'Layout',
			enabled: enableIfUnlocked,
			shown(selectedItem) {
				const step = store.get.lookupToItem(selectedItem);
				return step.steps.length > 0;
			},
			children: [
				{
					text: 'Vertical',
					shown(selectedItem) {
						const step = store.get.lookupToItem(selectedItem);
						return step.subStepLayout !== 'vertical';
					},
					cb(selectedItem) {
						const opts = {step: selectedItem, layout: 'vertical', doLayout: true};
						undoStack.commit('step.setSubStepLayout', opts, this.text);
					}
				},
				{
					text: 'Horizontal',
					shown(selectedItem) {
						const step = store.get.lookupToItem(selectedItem);
						return step.subStepLayout !== 'horizontal';
					},
					cb(selectedItem) {
						const opts = {step: selectedItem, layout: 'horizontal', doLayout: true};
						undoStack.commit('step.setSubStepLayout', opts, this.text);
					}
				},
				{
					text: 'By Row and Column... (NYI)',
					cb(selectedItem) {
						return;
						const page = store.get.page(selectedItem);
						const originalLayout = _.clone(page.layout);

						DialogManager.setDialog('pageRowColLayoutDialog');
						app.clearSelected();

						Vue.nextTick(() => {
							const dialog = DialogManager.getDialog();
							dialog.$off();  // TODO: initialize these event listeners just once... somewhere, somehow.  This code smells.
							dialog.$on('ok', newValues => {
								undoStack.commit(
									'page.layout',
									{page, layout: newValues},
									'Layout Page by Row and Column'
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

						app.redrawUI(true);
					}
				}
			]
		},
		{
			text: 'Add Callout',
			shown(selectedItem) {
				const step = store.get.step(selectedItem.id);
				return !step.steps.length;
			},
			cb(selectedItem) {
				undoStack.commit('step.addCallout', {step: selectedItem}, this.text);
			}
		},
		{
			text: 'Divide into Sub-Steps',
			shown(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const parent = store.get.parent(selectedItem);
				if (parent.type === 'page' && !step.callouts.length && !step.steps.length) {
					return true;
				}
				return false;
			},
			cb(selectedItem) {
				undoStack.commit('step.addSubStep', {step: selectedItem, doLayout: true}, this.text);
			}
		},
		{
			text: 'Move Step to',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'Previous Page',
					shown(selectedItem) {
						const page = store.get.pageForItem(selectedItem);
						if (store.get.isFirstPage(page) || store.get.isTitlePage(page)) {
							return false;  // Previous page doesn't exist
						} else if (page.steps.indexOf(selectedItem.id) !== 0) {
							return false;  // Can only move first step on a page to the previous page
						}
						return true;
					},
					enabled(selectedItem) {
						return !(store.get.prevPage(selectedItem) || {}).locked;
					},
					cb(selectedItem) {
						undoStack.commit('step.moveToPreviousPage', {step: selectedItem}, this.text);
					}
				},
				{
					text: 'Next Page',
					shown(selectedItem) {
						const page = store.get.pageForItem(selectedItem);
						if (store.get.isLastPage(page)) {
							return false;  // Previous page doesn't exist
						} else if (page.steps.indexOf(selectedItem.id) !== page.steps.length - 1) {
							return false;  // Can only move last step on a page to the next page
						}
						return true;
					},
					enabled(selectedItem) {
						return !(store.get.nextPage(selectedItem) || {}).locked;
					},
					cb(selectedItem) {
						undoStack.commit('step.moveToNextPage', {step: selectedItem}, this.text);
					}
				}
			]
		},
		{
			// TODO: If step being merged contains a submodel, must reorder all steps in that submodel too
			text: 'Merge Step with...',
			enabled: enableIfUnlocked,
			children: [
				{
					text: 'Previous Step',
					shown(selectedItem) {
						return store.get.prevStep(selectedItem, true) != null;
					},
					cb(selectedItem) {
						const srcStep = selectedItem;
						const destStep = store.get.prevStep(selectedItem, true);
						undoStack.commit('step.mergeWithStep', {srcStep, destStep}, this.text);
						app.clearSelected();
					}
				},
				{
					text: 'Next Step',
					shown(selectedItem) {
						return store.get.nextStep(selectedItem, true) != null;
					},
					cb(selectedItem) {
						const srcStep = selectedItem;
						const destStep = store.get.nextStep(selectedItem, true);
						undoStack.commit('step.mergeWithStep', {srcStep, destStep}, this.text);
						app.clearSelected();
					}
				}
			]
		},
		{
			text: 'Delete Empty Step',
			enabled: enableIfUnlocked,
			shown(selectedItem) {
				const step = store.get.step(selectedItem);
				if (step.parent.type === 'callout' && store.get.parent(step).steps.length < 2) {
					return false;  // Can't delete first step in a callout
				}
				return _.isEmpty(step.parts);
			},
			cb(selectedItem) {
				undoStack.commit('step.delete', {step: selectedItem, doLayout: true}, this.text);
				app.clearSelected();
			}
		},
		{text: 'separator'},
		{
			text: 'Prepend Blank Step',
			enabled: enableIfUnlocked,
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.parent(step);
				const opts = {
					dest, stepNumber: step.number,
					doLayout: true, renumber: true,
					model: _.clone(step.model),
					insertionIndex: store.state.steps.indexOf(step),
					parentInsertionIndex: dest.steps.indexOf(step.id)
				};
				undoStack.commit('step.add', opts, this.text);
			}
		},
		{
			text: 'Append Blank Step',
			enabled: enableIfUnlocked,
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.parent(step);
				const opts = {
					dest, stepNumber: step.number + 1,
					doLayout: true, renumber: true,
					model: _.clone(step.model),
					insertionIndex: store.state.steps.indexOf(step) + 1,
					parentInsertionIndex: dest.steps.indexOf(step.id) + 1
				};
				undoStack.commit('step.add', opts, this.text);
			}
		},
		{text: 'Add Rotate Icon (NYI)', enabled() { return false; }}
	],
	numberLabel(selectedItem) {
		const parent = store.get.parent(selectedItem);
		switch (parent.type) {
			case 'page':
				return [
					{text: 'Change Page Number (NYI)', cb() {}}
				];
			case 'step':
				return [
					{text: 'Change Step Number (NYI)', cb() {}}
				];
		}
		return [];
	},
	csi: [
		{
			text: 'Rotate CSI',
			children: [
				{
					text: 'Flip Upside Down',
					cb(selectedItem) {
						const csi = selectedItem;
						const opts = {csi, rotation: {x: 0, y: 0, z: 180}, addRotateIcon: true, doLayout: true};
						undoStack.commit('csi.rotate', opts, 'Flip Step Image', [csi]);
					}
				},
				{
					text: 'Rotate Front to Back',
					cb(selectedItem) {
						const csi = selectedItem;
						const opts = {csi, rotation: {x: 0, y: 180, z: 0}, addRotateIcon: true, doLayout: true};
						undoStack.commit('csi.rotate', opts, 'Rotate Step Image', [csi]);
					}
				},
				{
					text: 'Custom Rotation...',
					cb(selectedItem) {
						const csi = store.get.csi(selectedItem.id);
						const originalRotation = _.clone(csi.rotation);
						let initialRotation = originalRotation;
						if (initialRotation == null) {
							initialRotation = store.get.templateForItem(selectedItem).rotation;
						}
						csi.rotation = initialRotation;

						DialogManager.setDialog('rotateCSIDialog');
						app.clearSelected();

						Vue.nextTick(() => {
							const dialog = DialogManager.getDialog();
							dialog.$off();
							dialog.$on('ok', newValues => {
								undoStack.commit(
									'csi.rotate',
									{csi, ..._.clone(newValues), doLayout: true},
									'Rotate Step Image',
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
							dialog.title = 'Rotate CSI';
							dialog.rotation = _.clone(initialRotation);
							dialog.show({x: 400, y: 150});
						});
					}
				},
				{
					text: 'None',
					shown(selectedItem) {
						const csi = store.get.csi(selectedItem.id);
						return csi.rotation != null;
					},
					cb(selectedItem) {
						const csi = selectedItem;
						const opts = {csi, rotation: null, addRotateIcon: false, doLayout: true};
						undoStack.commit('csi.rotate', opts, 'Remove Step Image Rotation', [csi]);
					}
				}
			]
		},
		{
			text: 'Copy Rotation to next Steps...',
			shown(selectedItem) {
				const csi = store.get.csi(selectedItem);
				const rotation = csi.rotation;
				return rotation && (rotation.x || rotation.y || rotation.z);
			},
			cb(selectedItem) {
				// TODO: rewrite this to use simple number picker dialog
				// TODO: this doesn't adjust page layouts after applying changes.  Need to check all affected pages.
				const csi = store.get.csi(selectedItem.id);
				const rotation = _.clone(csi.rotation);
				const step = store.get.step(csi.parent.id);
				const originalRotations = [];

				DialogManager.setDialog('copyRotationDialog');
				app.clearSelected();

				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$off();
					dialog.$on('ok', newValues => {
						const csiList = originalRotations
							.map((rotation, id) => ({type: 'csi', id})).filter(el => el);
						undoStack.commit(
							'step.copyRotation',
							{step, rotation, ...newValues},
							'Copy CSI Rotations',
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
						for (let i = 0; i < newValues.nextXSteps; i++) {
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
					dialog.nextXSteps = 0;
					dialog.show({x: 400, y: 150});
				});

				app.redrawUI(true);
			}
		},
		{
			text: 'Scale CSI',
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
				DialogManager.setDialog('numberChooserDialog');
				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$off();
					dialog.$on('update', newValues => {
						csi.scale = _.bound(newValues.value || 0, 0.001, 5);  // Scaling right to zero hits all kinds of divide by zero problems. Scaling beyond 5 runs out of memory fast
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.$on('ok', newValues => {
						undoStack.commit(
							'csi.scale',
							{csi, scale: newValues.value, doLayout: true},
							'Scale Step Image',
							[csi]
						);
					});
					dialog.$on('cancel', () => {
						csi.scale = originalScale;
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.visible = true;
					dialog.title = 'Scale CSI';
					dialog.min = 0;
					dialog.max = 10;
					dialog.step = 0.1;
					dialog.bodyText = '';
					dialog.value = initialScale;
				});
			}
		},
		{
			text: 'Remove Scale',
			shown(selectedItem) {
				const csi = store.get.csi(selectedItem.id);
				return (csi.scale != null);
			},
			cb(selectedItem) {
				const csi = store.get.csi(selectedItem.id);
				undoStack.commit(
					'csi.scale',
					{csi, scale: null, doLayout: true},
					'Clear Step Image Scale',
					[csi]
				);
			}
		},
		{text: 'separator'},
		{
			text: 'Select Part',
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
		{text: 'Add New Part (NYI)', cb: () => {}}
	],
	pli: [],
	pliItem: [
		{
			text: 'Rotate Part List Image',
			cb(selectedItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const filename = pliItem.filename;
				const pliTransforms = uiState.get('pliTransforms');
				const originalTransform = _.clone(pliTransforms[filename]);
				const page = store.get.pageForItem(pliItem);
				pliTransforms[filename] = pliTransforms[filename] || {};

				DialogManager.setDialog('rotateCSIDialog');
				app.clearSelected();

				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$off();
					dialog.$on('update', newValues => {
						pliTransforms[filename].rotation = {...newValues.rotation};
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.$on('ok', newValues => {
						const path = `/${filename}/rotation`, root = pliTransforms;
						const change = {
							mutations: ['page.layout'],
							action: {
								redo: [{root, op: 'replace', path, value: {...newValues.rotation}}],
								undo: [{root, op: 'replace', path, value: (originalTransform || {}).rotation || null}]
							}
						};
						const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
						undoStack.commit(change, {page}, 'Rotate Part List Image', dirtyItems);
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
					dialog.title = 'Rotate Part List Image';
					dialog.showRotateIconCheckbox = false;
					dialog.rotation = (originalTransform || {}).rotation || {x: 0, y: 0, z: 0};
					dialog.show({x: 400, y: 150});
				});
			}
		},
		{
			text: 'Scale Part List Image',
			cb(selectedItem) {
				const pliItem = store.get.pliItem(selectedItem.id);
				const filename = pliItem.filename;
				const pliTransforms = uiState.get('pliTransforms');
				const originalTransform = _.clone(pliTransforms[filename]);
				const page = store.get.pageForItem(pliItem);
				pliTransforms[filename] = pliTransforms[filename] || {};

				DialogManager.setDialog('numberChooserDialog');
				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$off();
					dialog.$on('update', newValues => {
						pliTransforms[filename].scale = _.bound(newValues.value || 0, 0.001, 5);  // Scaling right to zero hits all kinds of divide by zero problems. Scaling beyond 5 runs out of memory fast
						store.mutations.pliItem.markAllDirty(filename);
						app.redrawUI(true);
					});
					dialog.$on('ok', newValues => {
						const value = _.bound(newValues.value || 0, 0.001, 5);  // Scaling right to zero hits all kinds of divide by zero problems. Scaling beyond 5 runs out of memory fast
						const path = `/${filename}/scale`, root = pliTransforms;
						const change = {
							mutations: ['page.layout'],
							action: {
								redo: [{root, op: 'replace', path, value}],
								undo: [{root, op: 'replace', path, value: (originalTransform || {}).scale || null}]
							}
						};
						const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
						undoStack.commit(change, {page}, 'Scale Part List Image', dirtyItems);
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
					dialog.visible = true;
					dialog.title = 'Scale Part List Image';
					dialog.min = 0;
					dialog.max = 10;
					dialog.step = 0.1;
					dialog.bodyText = '';
					dialog.value = (originalTransform || {}).scale || 1;
				});
			}
		},
		{
			text: 'Remove Scale',
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
				const change = {  // TODO: undo always performs mutations before actions.  But we need the opposite.  Change undo to take a single mixed array of mutations + actions, and perform them in order.
					mutations: ['page.layout'],
					action: {
						redo: [{root, op: 'remove', path}],
						undo: [{root, op: 'add', path, value: originalScale}]
					}
				};
				const dirtyItems = store.state.pliItems.filter(item => item.filename === filename);
				undoStack.commit(change, {page}, 'Remove Part List Image Scale', dirtyItems);
			}
		}
	],
	quantityLabel: [],
	annotation: [
		{
			text: 'Set',
			children: [
				{
					text: 'Text...',
					shown(selectedItem) {
						const annotation = store.get.annotation(selectedItem);
						return annotation && annotation.annotationType === 'label';
					},
					cb(selectedItem) {
						const annotation = store.get.annotation(selectedItem);
						const originalText = annotation.text;

						DialogManager.setDialog('stringDialog');
						app.clearSelected();

						Vue.nextTick(() => {
							const dialog = DialogManager.getDialog();
							dialog.$off();
							dialog.$on('ok', newValues => {
								const page = store.get.pageForItem(annotation);
								const opts = {
									annotation,
									newProperties: {text: newValues.string},
									doLayout: store.get.isTitlePage(page)
								};
								undoStack.commit('annotation.set', opts, 'Set Label Text');
							});
							dialog.$on('cancel', () => {
								annotation.text = originalText;
								app.redrawUI(true);
							});
							dialog.$on('update', newValues => {
								annotation.text = newValues.string;
								app.redrawUI(true);
							});
							dialog.title = 'Set Label Text';
							dialog.labelText = 'New Text';
							dialog.string = annotation.text;
							dialog.show({x: 400, y: 150});
						});
					}
				},
				{
					text: 'Font (NYI)',
					shown(selectedItem) {
						const annotation = store.get.annotation(selectedItem);
						return annotation && annotation.annotationType !== 'image';
					},
					cb() {}
				},
				{
					text: 'Color (NYI)',
					shown(selectedItem) {
						const annotation = store.get.annotation(selectedItem);
						return annotation && annotation.annotationType !== 'image';
					},
					cb() {}
				}
			]
		},
		{
			text: 'Delete',
			cb(selectedItem) {
				const annotation = selectedItem;
				undoStack.commit('annotation.delete', {annotation}, this.text);
			}
		}
	],
	callout: [
		{
			text: 'Add Step',
			cb(selectedItem) {
				undoStack.commit('callout.addStep', {callout: selectedItem, doLayout: true}, this.text);
			}
		},
		{
			text: 'Position (NYI)',
			children: [
				{text: 'Top (NYI)', enabled() { return false; }},
				{text: 'Right (NYI)', enabled() { return false; }},
				{text: 'Bottom (NYI)', enabled() { return false; }},
				{text: 'Left (NYI)', enabled() { return false; }}
			]
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
				undoStack.commit('callout.delete', {callout: selectedItem}, this.text);
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
				const calloutArrow = store.get.calloutArrow(selectedItem);
				const newPointIdx = Math.ceil(calloutArrow.points.length / 2);
				undoStack.commit('calloutArrow.addPoint', {calloutArrow}, this.text);
				app.setSelected({type: 'point', id: calloutArrow.points[newPointIdx]});
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
					text: _.titleCase(direction),
					shown: calloutTipRotationVisible(direction),
					cb: rotateCalloutTip(direction)
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
				const originalSize = (bbox.height === 0) ? bbox.width : bbox.height;  // TODO: store divider orientation in divider itself

				DialogManager.setDialog('numberChooserDialog');
				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$off();
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
					dialog.visible = true;
					dialog.title = 'Resize Page Divider';
					dialog.bodyText = '';
					dialog.min = 1;
					dialog.max = 10000;
					dialog.step = 1;
					dialog.value = originalSize;
				});
			}
		},
		{
			text: 'Remove',
			cb(selectedItem) {
				undoStack.commit('divider.delete', {divider: selectedItem}, 'Remove Divider');
			}
		}
	],
	submodel: [
		{
			text: 'Convert to Callout',
			shown(selectedItem) {
				// Only allow submodel -> callout conversion if submodel contains no submodels
				const submodel = LDParse.model.get.part(selectedItem.filename);
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
		{
			text: 'Displace Part...',
			children: ['up', 'down', 'left', 'right', 'forward', 'backward', null].map(direction => {
				return {
					text: _.titleCase(direction || 'None'),
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
				const originalDisplacement = _.clone(displacement);

				DialogManager.setDialog('partDisplacementDialog');
				app.clearSelected();

				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$off();
					dialog.$on('ok', () => {
						undoStack.commit('part.displace', {step, ...displacement}, 'Adjust Displaced Part');
					});
					dialog.$on('cancel', () => {
						displacement.distance = originalDisplacement.distance;
						displacement.arrowOffset = originalDisplacement.arrowOffset;
						displacement.arrowLength = originalDisplacement.arrowLength;
						displacement.arrowRotation = originalDisplacement.arrowRotation;
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.$on('update', newValues => {
						displacement.distance = newValues.partDistance;
						displacement.arrowOffset = newValues.arrowOffset;
						displacement.arrowLength = newValues.arrowLength;
						displacement.arrowRotation = newValues.arrowRotation;
						csi.isDirty = true;
						app.redrawUI(true);
					});
					dialog.partDistance = displacement.distance;
					dialog.arrowOffset = displacement.arrowOffset;
					dialog.arrowLength = displacement.arrowLength;
					dialog.arrowRotation = displacement.arrowRotation;
					dialog.show({x: 400, y: 150});
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
				return !_.isEmpty(step.callouts);
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
			text: 'Change Part (NYI)',
			children: [
				{text: 'Change Color (NYI)', enabled: () => false},
				{text: 'Change to Different Part (NYI)', enabled: () => false},
				{text: 'Change Position and Rotation (NYI)', enabled: () => false},
				{text: 'Duplicate (NYI)', enabled: () => false},
				{text: 'Delete (NYI)', enabled: () => false}
			]
		}
	]
};

function calloutTipRotationVisible(direction) {
	return (selectedItem) => {
		const calloutArrow = store.get.calloutArrow(selectedItem);
		return calloutArrow.direction !== direction;
	};
}

function rotateCalloutTip(direction) {
	return (selectedItem) => {
		const calloutArrow = store.get.calloutArrow(selectedItem);
		undoStack.commit('calloutArrow.rotateTip', {calloutArrow, direction}, 'Rotate Callout Arrow Tip');
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
			`Displace Part ${_.titleCase(direction || 'None')}`,
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
			_.removeIndex(menu, i);
			i = -1;
		}
	}
}

function enableIfUnlocked(selectedItem) {
	return !(store.get.pageForItem(selectedItem) || {}).locked;
}

export default function ContextMenu(selectedItem, localApp) {

	app = localApp;

	let menu = contextMenu[selectedItem.type];
	menu = (typeof menu === 'function') ? menu(selectedItem) : menu;

	menu = menu.map(menuEntry => {  // Super cheap clone of menu, so we don't destroy the original
		if (menuEntry.children) {
			const res = {};
			_.forEach(menuEntry, (k, v) => {
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
		menu.forEach(menuEntry => (menuEntry.selectedItem = selectedItem));  // Copy item type to each meny entry; saves typing them all out everywhere above
		return menu;
	}
}
