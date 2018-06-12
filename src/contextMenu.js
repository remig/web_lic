/* global Vue: false */
'use strict';

const _ = require('./util');
const LDParse = require('./LDParse');
const store = require('./store');
const undoStack = require('./undoStack');
const openFileHandler = require('./fileUploader');

let app;

const contextMenu = {
	page: [
		{
			// TODO: concatenate parent -> child text so it comes out 'Layout Vertical' and not 'Vertical'
			text: 'Layout',
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
				app.setCurrentPage(nextPage);
			}
		}
	],
	step: [
		{
			text: 'Layout',
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
					}
				}
			]
		},
		{
			// TODO: If step being merged contains a submodel, must reorder all steps in that submodel too
			text: 'Merge Step with...',
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
					}
				}
			]
		},
		{
			text: 'Delete Empty Step',
			shown(selectedItem) {
				return _.isEmpty(store.get.step(selectedItem).parts);
			},
			cb(selectedItem) {
				undoStack.commit('step.delete', {step: selectedItem, doLayout: true}, this.text);
			}
		},
		{text: 'separator'},
		{
			text: 'Prepend Blank Step',
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.parent(step);
				const opts = {
					dest, stepNumber: step.number, doLayout: true, renumber: true,
					insertionIndex: store.state.steps.indexOf(step),
					parentInsertionIndex: dest.steps.indexOf(step.id)
				};
				undoStack.commit('step.add', opts, this.text);
			}
		},
		{
			text: 'Append Blank Step',
			cb(selectedItem) {
				const step = store.get.step(selectedItem.id);
				const dest = store.get.parent(step);
				const opts = {
					dest, stepNumber: step.number + 1, doLayout: true, renumber: true,
					insertionIndex: store.state.steps.indexOf(step) + 1,
					parentInsertionIndex: dest.steps.indexOf(step.id) + 1
				};
				undoStack.commit('step.add', opts, this.text);
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
						csi.rotation = csi.rotation || {x: 0, y: 0, z: 0};

						app.currentDialog = 'rotateCSIDialog';
						app.clearSelected();

						Vue.nextTick(() => {
							const dialog = app.$refs.currentDialog;
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
							dialog.rotation = csi.rotation;
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
				const csi = store.get.csi(selectedItem.id);
				const rotation = _.clone(csi.rotation);
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
			text: 'Delete Empty Callout',
			shown(selectedItem) {
				const callout = store.get.callout(selectedItem);
				if (callout.steps.length < 1) {
					return true;
				} else if (callout.steps.length > 1) {
					return false;
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
	divider: [],
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

				app.currentDialog = 'partDisplacementDialog';
				app.clearSelected();

				Vue.nextTick(() => {
					const dialog = app.$refs.currentDialog;
					dialog.$off();
					dialog.$on('ok', () => {
						undoStack.commit( 'part.displace', {step, ...displacement}, 'Adjust Displaced Part');
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
						const srcStep = {type: 'step', id: selectedItem.stepID};
						const destStep = store.get.prevStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: selectedItem.id, srcStep, destStep, doLayout: true},
							'Move Part to Previous Step',
							[{type: 'csi', id: destStep.csiID}]
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
						const srcStep = {type: 'step', id: selectedItem.stepID};
						const destStep = store.get.nextStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: selectedItem.id, srcStep, destStep, doLayout: true},
							'Move Part to Next Step',
							[{type: 'csi', id: destStep.csiID}]
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
				const callout = {id: step.callouts[0], type: 'callout'};
				undoStack.commit(
					'part.addToCallout',
					{partID: selectedItem.id, step, callout, doLayout: true},
					this.text
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
				undoStack.commit(
					'part.removeFromCallout',
					{partID: selectedItem.id, step},
					this.text
				);
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

module.exports = function ContextMenu(entry, localApp) {

	function shown(menu) {
		return menu.shown ? menu.shown(entry) : true;
	}

	app = localApp;
	let menu = contextMenu[entry.type];
	menu = (typeof menu === 'function') ? menu(entry) : menu;

	// Filter out invisible menu entries here so that if menu ends up empty, we don't draw anything in the UI
	menu = (menu || []).filter(shown);
	menu = menu.map(menuEntry => {
		if (menuEntry.children) {
			let children = menuEntry.children;
			children = (typeof children === 'function') ? children(entry) : children;
			return {
				text: menuEntry.text,
				children: children.filter(shown)
			};
		}
		return menuEntry;
	});
	if (menu) {
		menu.forEach(m => (m.type = entry.type));  // Copy entry type to each meny entry; saves typing them all out everywhere above
		return menu;
	}
};
