/* global Vue: false */
'use strict';

const util = require('./util');
const LDParse = require('./LDParse');
const store = require('./store');
const undoStack = require('./undoStack');

const colorPicker = require('vue-color/dist/vue-color');
Vue.component('color-picker', colorPicker.Chrome);

let app;

const contextMenu = {
	templatePage: {
		templatePage: [
			{text: 'Set Border...', cb: setBorder('page')},
			{text: 'Set Fill...', cb: setColor('page')},
			{
				text: 'Set Page Size...',
				cb() {
					const originalPageSize = {
						width: store.state.template.page.width,
						height: store.state.template.page.height
					};
					const aspectRatio = originalPageSize.width / originalPageSize.height;
					let prevValues = {
						maintainAspectRatio: true,
						...originalPageSize
					};
					app.currentDialog = 'pageSizeDialog';
					app.clearSelected();

					Vue.nextTick(() => {
						const dialog = app.$refs.currentDialog;
						dialog.$off();
						dialog.$on('ok', newValues => {
							undoStack.commit(
								'templatePage.setPageSize',
								{...newValues},
								'Set Page Size'
							);
							app.redrawUI(true);
						});
						dialog.$on('update', newValues => {
							if (newValues.maintainAspectRatio !== prevValues.maintainAspectRatio) {
								dialog.height = Math.floor(newValues.width / aspectRatio);
							} else if (newValues.maintainAspectRatio) {
								if (newValues.width !== prevValues.width) {
									dialog.height = Math.floor(newValues.width / aspectRatio);
								} else if (newValues.height !== prevValues.height) {
									dialog.width = Math.floor(newValues.height * aspectRatio);
								}
							}
							prevValues = util.clone(newValues);
						});
						dialog.width = originalPageSize.width;
						dialog.height = originalPageSize.height;
						dialog.maintainAspectRatio = true;
						dialog.show({x: 400, y: 150});
					});
					app.redrawUI(true);
				}
			}
		],
		step: [
		],
		numberLabel(selectedItem) {
			const parent = store.get.parent(selectedItem);
			switch (parent.type) {
				case 'templatePage':
					return [
						{text: 'Set Color...', cb: setColor('page', 'numberLabel')}
					];
				case 'step':
					switch (store.get.parent(parent).type) {
						case 'templatePage':
							return [
								{text: 'Set Color...', cb: setColor('step', 'numberLabel')}
							];
						case 'callout':
							return [
								{text: 'Set Color...', cb: setColor('callout.step', 'numberLabel')}
							];
					}
			}
			return [];
		},
		submodelImage: [
			// TODO: need to be able to select the CSI inside submodel image
			{text: 'Set Border...', cb: setBorder('submodelImage')},
			{text: 'Set Fill...', cb: setColor('submodelImage')}
		],
		csi: [
			{
				text: 'Change Default Rotation... (NYI)',
				cb() {}
			},
			{
				text: 'Change Default Scale... (NYI)',
				cb() {}
			}
		],
		pli: [
			{text: 'Set Border...', cb: setBorder('pli')},
			{text: 'Set Fill...', cb: setColor('pli')}
		],
		pliItem: [],
		quantityLabel(selectedItem) {
			const parent = store.get.parent(selectedItem);
			switch (parent.type) {
				case 'submodelImage':
					return [
						{text: 'Set Font... (NYI)', cb() {}},
						{text: 'Set Color...', cb: setColor('submodelImage', 'quantityLabel')}
					];
				case 'pliItem':
					return [
						{text: 'Set Font... (NYI)', cb() {}},
						{text: 'Set Color...', cb: setColor('pliItem', 'quantityLabel')}
					];
			}
			return [];
		},
		callout: [
			{text: 'Set Border...', cb: setBorder('callout')},
			{text: 'Set Fill...', cb: setColor('callout')}
		],
		calloutArrow: [
			{text: 'Set Line Style...', cb: setBorder('callout.arrow')}
		],
		rotateIcon: [
			{text: 'Set Border...', cb: setBorder('rotateIcon')},
			{text: 'Set Fill...', cb: setColor('rotateIcon')},
			{text: 'Set Arrow Style...', cb: setBorder('rotateIcon.arrow')}
		],
		divider: [
			{text: 'Set Line Style...', cb: setBorder('page.divider')}
		]
	},
	page: [
		{
			// TODO: concatenate parent -> child text so it comes out 'Layout Vertical' and not 'Vertical'
			text: 'Layout',
			children: [
				{
					text: 'Redo Layout',
					cb(selectedItem) {
						undoStack.commit('page.layout', {page: selectedItem}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'Vertical',
					shown(selectedItem) {
						const page = store.get.lookupToItem(selectedItem);
						return page.layout !== 'vertical';
					},
					cb(selectedItem) {
						const page = selectedItem;
						undoStack.commit('page.layout', {page, layout: 'vertical'}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'Horizontal',
					shown(selectedItem) {
						const page = store.get.lookupToItem(selectedItem);
						return page.layout !== 'horizontal';
					},
					cb(selectedItem) {
						const page = selectedItem;
						undoStack.commit('page.layout', {page, layout: 'horizontal'}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'By Row and Column...',
					cb(selectedItem) {
						const page = store.get.page(selectedItem);
						const originalLayout = util.clone(page.layout);

						app.currentDialog = 'pageRowColLayoutDialog';
						app.clearSelected();

						Vue.nextTick(() => {
							const dialog = app.$refs.currentDialog;
							dialog.$off();  // TODO: initialize these event listeners just once... somewhere, somehow.  This code smells.
							dialog.$on('ok', newValues => {
								undoStack.commit(
									'page.layout',
									{page, layout: newValues},
									'Layout Page by Row and Column'
								);
								app.redrawUI(true);
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
				app.redrawUI(true);
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
				app.redrawUI(true);
			}
		},
		{text: 'separator'},
		{text: 'Hide Step Separators (NYI)', cb: () => {}},
		{
			text: 'Add Blank Step',
			cb(selectedItem) {
				const dest = store.get.page(selectedItem.id);
				const lastStep = store.get.step(dest.steps[dest.steps.length - 1]);
				const stepNumber = lastStep.number + 1;
				undoStack.commit(
					'step.add',
					{
						dest, stepNumber, doLayout: true, renumber: true,
						insertionIndex: store.state.steps.indexOf(lastStep) + 1
					},
					this.text
				);
				app.redrawUI(true);
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
						app.redrawUI(true);
					}
				},
				{
					text: 'Line (NYI)',
					cb() {}
				},
				{
					text: 'Image',
					cb(selectedItem) {
						const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
						app.openFileChooser('.png', e => {
							const reader = new FileReader();
							reader.onload = e => {
								const opts = {
									annotationType: 'image',
									properties: {src: e.target.result, ...clickPos},
									parent: selectedItem
								};
								undoStack.commit('annotation.add', opts, 'Add Image');
								app.redrawUI(true);
							};
							reader.readAsDataURL(e.target.files[0]);
							e.target.value = '';
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
				Vue.nextTick(() => {
					app.setCurrentPage(nextPage);
				});
			}
		}
	],
	step: [
		{
			text: 'Add Callout',
			cb(selectedItem) {
				undoStack.commit('step.addCallout', {step: selectedItem}, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Convert to Callout (NYI)',
			shown(selectedItem) {
				const step = store.get.lookupToItem(selectedItem);
				return !util.isEmpty(step.submodel);
			},
			cb() {
				// const step = store.get.lookupToItem(selectedItem);
				// undoStack.commit('convertSubmodelToCallout', step, 'Convert to Callout');
			}
		},
		{
			text: 'Move Step to',
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
					cb(selectedItem) {
						undoStack.commit('step.moveToPreviousPage', {step: selectedItem}, this.text);
						app.redrawUI(true);
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
					cb(selectedItem) {
						undoStack.commit('step.moveToNextPage', {step: selectedItem}, this.text);
						app.redrawUI(true);
					}
				}
			]
		},
		{
			text: 'Merge Step with...',
			children: [
				{
					text: 'Previous Step',
					shown(selectedItem) {
						return store.get.prevStep(selectedItem, true) != null;
					},
					cb(selectedItem) {
						const srcStep = selectedItem;
						const destStep = store.get.prevStep(selectedItem);
						undoStack.commit('step.mergeWithStep', {srcStep, destStep}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'Next Step',
					shown(selectedItem) {
						return store.get.nextStep(selectedItem, true) != null;
					},
					cb(selectedItem) {
						const srcStep = selectedItem;
						const destStep = store.get.nextStep(selectedItem);
						undoStack.commit('step.mergeWithStep', {srcStep, destStep}, this.text);
						app.redrawUI(true);
					}
				}
			]
		},
		{
			text: 'Delete Empty Step',
			shown(selectedItem) {
				return util.isEmpty(store.get.step(selectedItem).parts);
			},
			cb(selectedItem) {
				undoStack.commit('step.delete', {step: selectedItem}, this.text);
				app.redrawUI(true);
			}
		},
		{text: 'separator'},
		{
			text: 'Prepend Blank Step',
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.pageForItem(step);
				const opts = {
					dest, stepNumber: step.number, doLayout: true, renumber: true,
					insertionIndex: store.state.steps.indexOf(step),
					parentInsertionIndex: dest.steps.indexOf(step.id)
				};
				undoStack.commit('step.add', opts, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Append Blank Step',
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.pageForItem(step);
				const opts = {
					dest, stepNumber: step.number + 1, doLayout: true, renumber: true,
					insertionIndex: store.state.steps.indexOf(step) + 1,
					parentInsertionIndex: dest.steps.indexOf(step.id) + 1
				};
				undoStack.commit('step.add', opts, this.text);
				app.redrawUI(true);
			}
		}
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
						app.redrawUI(true);
					}
				},
				{
					text: 'Rotate Front to Back',
					cb(selectedItem) {
						const csi = selectedItem;
						const opts = {csi, rotation: {x: 0, y: 180, z: 0}, addRotateIcon: true};
						undoStack.commit('csi.rotate', opts, 'Rotate Step Image', [csi]);
						app.redrawUI(true);
					}
				},
				{
					text: 'Custom Rotation...',
					cb(selectedItem) {
						const csi = store.get.csi(selectedItem.id);
						const originalRotation = util.clone(csi.rotation);
						csi.rotation = csi.rotation || {x: 0, y: 0, z: 0};

						app.currentDialog = 'rotateCSIDialog';
						app.clearSelected();

						Vue.nextTick(() => {
							const dialog = app.$refs.currentDialog;
							dialog.$off();
							dialog.$on('ok', newValues => {
								undoStack.commit(
									'csi.rotate',
									{csi, ...util.clone(newValues)},
									'Rotate Step Image',
									[csi]
								);
								app.redrawUI(true);
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
							dialog.rotation = csi.rotation;
							dialog.show({x: 400, y: 150});
						});
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
				const csi = store.get.csi(selectedItem.id);
				const rotation = util.clone(csi.rotation);
				const step = store.get.step(csi.parent.id);
				const originalRotations = [];

				app.currentDialog = 'copyRotationDialog';
				app.clearSelected();

				Vue.nextTick(() => {
					const dialog = app.$refs.currentDialog;
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
						app.redrawUI(true);
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
		{text: 'Scale CSI (NYI)', cb: () => {}},
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
					const part = LDParse.model.get.partFromID(partID, store.model, step.submodel);
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
		{text: 'Rotate PLI Part (NYI)', cb: () => {}},
		{text: 'Scale PLI Part (NYI)', cb: () => {}}
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

						app.currentDialog = 'stringDialog';
						app.clearSelected();

						Vue.nextTick(() => {
							const dialog = app.$refs.currentDialog;
							dialog.$off();
							dialog.$on('ok', newValues => {
								const page = store.get.pageForItem(annotation);
								const opts = {
									annotation,
									newProperties: {text: newValues.string},
									doLayout: store.get.isTitlePage(page)
								};
								undoStack.commit('annotation.set', opts, 'Set Label Text');
								app.redrawUI(true);
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
				app.redrawUI(true);
			}
		}
	],
	callout: [
		{
			text: 'Add Step',
			cb(selectedItem) {
				undoStack.commit('callout.addStep', {callout: selectedItem, doLayout: true}, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Delete Empty Callout',
			shown(selectedItem) {
				const callout = store.get.callout(selectedItem);
				return util.isEmpty(callout.steps);
			},
			cb(selectedItem) {
				undoStack.commit('callout.delete', {callout: selectedItem}, this.text);
				app.redrawUI(true);
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
				app.redrawUI(true);
				Vue.nextTick(() => {
					app.setSelected({type: 'point', id: calloutArrow.points[newPointIdx]});
				});
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
					text: util.titleCase(direction),
					shown: calloutTipRotationVisible(direction),
					cb: rotateCalloutTip(direction)
				};
			})
		}
	],
	divider: [],
	part: [
		{
			text: 'Displace Part...',
			children: ['up', 'down', 'left', 'right', 'forward', 'backward', null].map(direction => {
				return {
					text: util.titleCase(direction || 'None'),
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
				const originalDisplacement = util.clone(displacement);

				app.currentDialog = 'partDisplacementDialog';
				app.clearSelected();

				Vue.nextTick(() => {
					const dialog = app.$refs.currentDialog;
					dialog.$off();
					dialog.$on('ok', () => {
						undoStack.commit( 'part.displace', {step, ...displacement}, 'Adjust Displaced Part');
						app.redrawUI(true);
					});
					dialog.$on('cancel', () => {
						csi.isDirty = true;
						displacement.distance = originalDisplacement.distance;
						displacement.arrowOffset = originalDisplacement.arrowOffset;
						app.redrawUI(true);
					});
					dialog.$on('update', newValues => {
						csi.isDirty = true;
						displacement.distance = newValues.partDistance;
						displacement.arrowOffset = newValues.arrowOffset;
						app.redrawUI(true);
					});
					dialog.arrowOffset = displacement.arrowOffset;
					dialog.partDistance = displacement.distance;
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
						const srcStep = {type: 'step', id: selectedItem.stepID};
						const destStep = store.get.prevStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: selectedItem.id, srcStep, destStep, doLayout: true},
							'Move Part to Previous Step',
							[{type: 'csi', id: destStep.csiID}]
						);
						app.redrawUI(true);
					}
				},
				{
					text: 'Next Step',
					shown(selectedItem) {
						const step = store.get.step({type: 'step', id: selectedItem.stepID});
						return store.get.nextStep(step) != null;
					},
					cb(selectedItem) {
						const srcStep = {type: 'step', id: selectedItem.stepID};
						const destStep = store.get.nextStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: selectedItem.id, srcStep, destStep, doLayout: true},
							'Move Part to Next Step',
							[{type: 'csi', id: destStep.csiID}]
						);
						app.redrawUI(true);
					}
				}
			]
		},
		{
			text: 'Add Part to Callout',
			shown(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				return !util.isEmpty(step.callouts);
			},
			cb(selectedItem) {
				const step = store.get.step({type: 'step', id: selectedItem.stepID});
				const callout = {id: step.callouts[0], type: 'callout'};
				undoStack.commit(
					'part.addToCallout',
					{partID: selectedItem.id, step, callout, doLayout: true},
					this.text
				);
				app.redrawUI(true);
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
				undoStack.commit(
					'part.removeFromCallout',
					{partID: selectedItem.id, step},
					this.text
				);
				app.redrawUI(true);
			}
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
		app.redrawUI();
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
			`Displace Part ${util.titleCase(direction || 'None')}`,
			[{type: 'csi', id: step.csiID}]
		);
		app.redrawUI();
	};
}

function rgbaToString(c) {
	if (typeof c === 'string') {
		return c;
	}
	c = c.rgba;
	return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

function setColor(templateEntry, colorType = 'fill') {
	return function() {
		const fill = util.get(templateEntry, store.state.template)[colorType];
		const originalColor = util.clone(fill.color);

		app.currentDialog = 'colorDialog';
		app.clearSelected();

		Vue.nextTick(() => {
			const dialog = app.$refs.currentDialog;
			dialog.$off();
			dialog.$on('ok', newValues => {
				const entry = `${templateEntry}.${colorType}`;
				undoStack.commit(
					'templatePage.set',
					{entry, value: {color: rgbaToString(newValues.color)}},
					'Set Template Fill'
				);
				app.redrawUI(true);
			});
			dialog.$on('cancel', () => {
				fill.color = originalColor;
				app.redrawUI(true);
			});
			dialog.$on('update', newValues => {
				fill.color = rgbaToString(newValues.color);
				app.redrawUI(true);
			});
			dialog.color = originalColor || 'black';
			dialog.show({x: 400, y: 150});
		});
	};
}

function setBorder(templateEntry) {
	return function() {
		const border = util.get(templateEntry, store.state.template).border;
		const originalBorder = util.clone(border);
		const ignoreCornerRadius = !border.hasOwnProperty('cornerRadius');

		app.currentDialog = 'borderDialog';
		app.clearSelected();

		Vue.nextTick(() => {
			const dialog = app.$refs.currentDialog;
			dialog.$off();
			dialog.$on('ok', newValues => {
				const entry = templateEntry + '.border';
				newValues.color = rgbaToString(newValues.color);
				undoStack.commit(
					'templatePage.set',
					{entry, value: newValues},
					'Set Template Border'
				);
				app.redrawUI(true);
			});
			dialog.$on('cancel', () => {
				util.copy(border, originalBorder);
				app.redrawUI(true);
			});
			dialog.$on('update', newValues => {
				newValues.color = rgbaToString(newValues.color);
				util.copy(border, newValues);
				app.redrawUI(true);
			});
			util.copy(dialog, originalBorder);
			if (ignoreCornerRadius) {
				dialog.cornerRadius = null;
			}
			dialog.show({x: 400, y: 150});
		});
	};
}

module.exports = function ContextMenu(entry, localApp) {
	app = localApp;
	let menu = contextMenu[entry.type];
	const page = store.get.pageForItem(app.selectedItemLookup);
	if (store.get.isTemplatePage(page)) {  // Special case: template page items should use template page item menus
		menu = contextMenu.templatePage[entry.type];
	}
	menu = (typeof menu === 'function') ? menu(entry) : menu;
	menu.forEach(m => (m.type = entry.type));  // Copy entry type to each meny entry; saves typing them all out everywhere above
	return menu;
};
