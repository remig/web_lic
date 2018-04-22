/* global Vue: false */
'use strict';

const util = require('./util');
const LDParse = require('./LDParse');
const store = require('./store');
const undoStack = require('./undoStack');

let app;

const contextMenu = {
	page: [
		{
			text: 'Layout',
			children: [
				{
					text: 'Redo Layout',
					cb() {
						undoStack.commit('page.layout', {page: app.selectedItemLookup}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'Vertical',
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'page') {
							const page = store.get.lookupToItem(app.selectedItemLookup);
							return page.layout !== 'vertical';
						}
						return false;
					},
					cb() {
						const page = app.selectedItemLookup;
						undoStack.commit('page.layout', {page, layout: 'vertical'}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'Horizontal',
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'page') {
							const page = store.get.lookupToItem(app.selectedItemLookup);
							return page.layout !== 'horizontal';
						}
						return false;
					},
					cb() {
						const page = app.selectedItemLookup;
						undoStack.commit('page.layout', {page, layout: 'horizontal'}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'By Row and Column',
					cb() {
						const page = store.get.page(app.selectedItemLookup);
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
			cb() {
				const nextPage = store.get.lookupToItem(app.selectedItemLookup);
				undoStack.commit('page.add', {
					pageNumber: nextPage.number,
					insertionIndex: store.state.pages.indexOf(nextPage)
				}, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Append Blank Page',
			cb() {
				const prevPage = store.get.lookupToItem(app.selectedItemLookup);
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
			cb() {
				const dest = store.get.page(app.selectedItemLookup.id);
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
					cb() {
						const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
						const opts = {
							annotationType: 'label',
							properties: {text: 'New Label', ...clickPos},
							parent: app.selectedItemLookup
						};
						undoStack.commit('annotation.add', opts, 'Add Label');
						app.redrawUI(true);
					}
				},
				{
					text: 'Line (NYI)',
					cb() {
					}
				},
				{
					text: 'Image',
					cb() {
						const clickPos = app.pageCoordsToCanvasCoords(app.lastRightClickPos);
						app.openFileChooser('.png', e => {
							const reader = new FileReader();
							reader.onload = e => {
								const opts = {
									annotationType: 'image',
									properties: {src: e.target.result, ...clickPos},
									parent: app.selectedItemLookup
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
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'page') {
					const page = store.get.lookupToItem(app.selectedItemLookup);
					return page.steps.length < 1;
				}
				return false;
			},
			cb() {
				const page = store.get.lookupToItem(app.selectedItemLookup);
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
			cb() {
				undoStack.commit('step.addCallout', {step: app.selectedItemLookup}, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Convert to Callout (NYI)',
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
					const step = store.get.lookupToItem(app.selectedItemLookup);
					return !util.isEmpty(step.submodel);
				}
				return false;
			},
			cb() {
				// const step = store.get.lookupToItem(app.selectedItemLookup);
				// undoStack.commit('convertSubmodelToCallout', step, 'Convert to Callout');
			}
		},
		{
			text: 'Move Step to',
			children: [
				{
					text: 'Previous Page',
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
							const page = store.get.pageForItem(app.selectedItemLookup);
							if (store.get.isFirstPage(page) || store.get.isTitlePage(page)) {
								return false;  // Previous page doesn't exist
							} else if (page.steps.indexOf(app.selectedItemLookup.id) !== 0) {
								return false;  // Can only move first step on a page to the previous page
							}
							return true;
						}
						return false;
					},
					cb() {
						undoStack.commit('step.moveToPreviousPage', {step: app.selectedItemLookup}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'Next Page',
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
							const page = store.get.pageForItem(app.selectedItemLookup);
							if (store.get.isLastPage(page)) {
								return false;  // Previous page doesn't exist
							} else if (page.steps.indexOf(app.selectedItemLookup.id) !== page.steps.length - 1) {
								return false;  // Can only move last step on a page to the next page
							}
							return true;
						}
						return false;
					},
					cb() {
						undoStack.commit('step.moveToNextPage', {step: app.selectedItemLookup}, this.text);
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
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
							return store.get.prevStep(app.selectedItemLookup, true) != null;
						}
						return false;
					},
					cb() {
						const srcStep = app.selectedItemLookup;
						const destStep = store.get.prevStep(app.selectedItemLookup);
						undoStack.commit('step.mergeWithStep', {srcStep, destStep}, this.text);
						app.redrawUI(true);
					}
				},
				{
					text: 'Next Step',
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
							return store.get.nextStep(app.selectedItemLookup, true) != null;
						}
						return false;
					},
					cb() {
						const srcStep = app.selectedItemLookup;
						const destStep = store.get.nextStep(app.selectedItemLookup);
						undoStack.commit('step.mergeWithStep', {srcStep, destStep}, this.text);
						app.redrawUI(true);
					}
				}
			]
		},
		{
			text: 'Delete Empty Step',
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
					return util.isEmpty(store.get.step(app.selectedItemLookup).parts);
				}
				return false;
			},
			cb() {
				undoStack.commit('step.delete', {step: app.selectedItemLookup}, this.text);
				app.redrawUI(true);
			}
		},
		{text: 'separator'},
		{
			text: 'Prepend Blank Step',
			cb() {
				const step = store.get.step(app.selectedItemLookup.id);
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
			cb() {
				const step = store.get.step(app.selectedItemLookup.id);
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
	numberLabel: [
		// TODO: differentiate these two based on parent
		{text: 'Change Step Number (NYI)', cb() {}},
		{text: 'Change Page Number (NYI)', cb() {}}
	],
	csi: [
		{
			text: 'Rotate Step Image',
			children: [
				{
					text: 'Flip Upside Down',
					cb() {
						const csi = app.selectedItemLookup;
						const opts = {csi, rotation: {x: 0, y: 0, z: 180}, addRotateIcon: true};
						undoStack.commit('csi.rotate', opts, 'Flip Step Image', [csi]);
						app.redrawUI(true);
					}
				},
				{
					text: 'Rotate Front to Back',
					cb() {
						const csi = app.selectedItemLookup;
						const opts = {csi, rotation: {x: 0, y: 180, z: 0}, addRotateIcon: true};
						undoStack.commit('csi.rotate', opts, 'Rotate Step Image', [csi]);
						app.redrawUI(true);
					}
				},
				{
					text: 'Custom Rotation...',
					cb() {
						const csi = store.get.csi(app.selectedItemLookup.id);
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
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'csi') {
					const csi = store.get.csi(app.selectedItemLookup);
					const rotation = csi.rotation;
					return rotation && (rotation.x || rotation.y || rotation.z);
				}
				return false;
			},
			cb() {
				const csi = store.get.csi(app.selectedItemLookup.id);
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
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'csi') {
					const step = store.get.parent(app.selectedItemLookup);
					return step && step.parts && step.parts.length;
				}
				return false;
			},
			children() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'csi') {
					const step = store.get.parent(app.selectedItemLookup);
					return step.parts.map(partID => {
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
				return null;
			}
		},
		{text: 'Add New Part (NYI)', cb: () => {}}
	],
	pli: [],
	pliItem: [
		{text: 'Rotate PLI Part (NYI)', cb: () => {}},
		{text: 'Scale PLI Part (NYI)', cb: () => {}}
	],
	annotation: [
		{
			text: 'Set',
			children: [
				{
					text: 'Text...',
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'annotation') {
							const annotation = store.get.annotation(app.selectedItemLookup);
							return annotation && annotation.annotationType === 'label';
						}
						return false;
					},
					cb() {
						const annotation = store.get.annotation(app.selectedItemLookup);
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
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'annotation') {
							const annotation = store.get.annotation(app.selectedItemLookup);
							return annotation && annotation.annotationType !== 'image';
						}
						return false;
					},
					cb() {}
				},
				{
					text: 'Color (NYI)',
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'annotation') {
							const annotation = store.get.annotation(app.selectedItemLookup);
							return annotation && annotation.annotationType !== 'image';
						}
						return false;
					},
					cb() {}
				}
			]
		},
		{
			text: 'Delete',
			cb() {
				const annotation = app.selectedItemLookup;
				undoStack.commit('annotation.delete', {annotation}, this.text);
				app.redrawUI(true);
			}
		}
	],
	callout: [
		{
			text: 'Add Step',
			cb() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'callout') {
					const callout = app.selectedItemLookup;
					undoStack.commit('callout.addStep', {callout, doLayout: true}, this.text);
					app.redrawUI(true);
				}
			}
		},
		{
			text: 'Delete Empty Callout',
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'callout') {
					const callout = store.get.callout(app.selectedItemLookup);
					return util.isEmpty(callout.steps);
				}
				return false;
			},
			cb() {
				undoStack.commit('callout.delete', {callout: app.selectedItemLookup}, this.text);
				app.redrawUI(true);
			}
		}
	],
	calloutArrow: [
		{
			text: 'Select Point...',
			children() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'calloutArrow') {
					const arrow = store.get.calloutArrow(app.selectedItemLookup);
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
				return null;
			}
		},
		{
			text: 'Add Point',
			cb() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'calloutArrow') {
					const calloutArrow = store.get.calloutArrow(app.selectedItemLookup);
					const newPointIdx = Math.ceil(calloutArrow.points.length / 2);
					undoStack.commit('calloutArrow.addPoint', {calloutArrow}, this.text);
					app.redrawUI(true);
					Vue.nextTick(() => {
						app.setSelected({type: 'point', id: calloutArrow.points[newPointIdx]});
					});
				}
			}
		},
		{
			text: 'Add Tip (NYI)',
			cb() {
			}
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
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'part') {
					const step = store.get.step({type: 'step', id: app.selectedItemLookup.stepID});
					if (step.displacedParts) {
						return step.displacedParts.some(p => p.partID === app.selectedItemLookup.id);
					}
				}
				return false;
			},
			cb() {
				const step = store.get.step(app.selectedItemLookup.stepID);
				const csi = store.get.csi(step.csiID);
				const displacement = step.displacedParts.find(p => p.partID === app.selectedItemLookup.id);
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
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'part') {
							const step = store.get.step({type: 'step', id: app.selectedItemLookup.stepID});
							return store.get.prevStep(step) != null;
						}
						return false;
					},
					cb() {
						const srcStep = {type: 'step', id: app.selectedItemLookup.stepID};
						const destStep = store.get.prevStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: app.selectedItemLookup.id, srcStep, destStep, doLayout: true},
							'Move Part to Previous Step',
							[{type: 'csi', id: destStep.csiID}]
						);
						app.redrawUI(true);
					}
				},
				{
					text: 'Next Step',
					shown() {
						if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'part') {
							const step = store.get.step({type: 'step', id: app.selectedItemLookup.stepID});
							return store.get.nextStep(step) != null;
						}
						return false;
					},
					cb() {
						const srcStep = {type: 'step', id: app.selectedItemLookup.stepID};
						const destStep = store.get.nextStep(srcStep);
						undoStack.commit(
							'part.moveToStep',
							{partID: app.selectedItemLookup.id, srcStep, destStep, doLayout: true},
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
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'part') {
					const step = store.get.step({type: 'step', id: app.selectedItemLookup.stepID});
					return !util.isEmpty(step.callouts);
				}
				return false;
			},
			cb() {
				const step = store.get.step({type: 'step', id: app.selectedItemLookup.stepID});
				const callout = {id: step.callouts[0], type: 'callout'};
				undoStack.commit(
					'part.addToCallout',
					{partID: app.selectedItemLookup.id, step, callout},
					this.text
				);
				app.redrawUI(true);
			}
		},
		{
			text: 'Remove Part from Callout',
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'part') {
					const step = store.get.step({type: 'step', id: app.selectedItemLookup.stepID});
					return step.parent.type === 'callout';
				}
				return false;
			},
			cb() {
				const step = store.get.step({type: 'step', id: app.selectedItemLookup.stepID});
				undoStack.commit(
					'part.removeFromCallout',
					{partID: app.selectedItemLookup.id, step},
					this.text
				);
				app.redrawUI(true);
			}
		}
	]
};

function calloutTipRotationVisible(direction) {
	return () => {
		if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'calloutArrow') {
			const calloutArrow = store.get.calloutArrow(app.selectedItemLookup);
			return calloutArrow.direction !== direction;
		}
		return false;
	};
}

function rotateCalloutTip(direction) {
	return () => {
		if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'calloutArrow') {
			const calloutArrow = store.get.calloutArrow(app.selectedItemLookup);
			undoStack.commit('calloutArrow.rotateTip', {calloutArrow, direction}, 'Rotate Callout Arrow Tip');
			app.redrawUI();
		}
	};
}

function showDisplacement(direction) {
	return () => {
		if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'part') {
			const step = store.get.step({type: 'step', id: app.selectedItemLookup.stepID});
			if (step.displacedParts) {
				if (direction == null) {
					return step.displacedParts.some(p => p.partID === app.selectedItemLookup.id);
				} else {
					return step.displacedParts.every(p => {
						return p.partID !== app.selectedItemLookup.id || p.direction !== direction;
					});
				}
			}
			return direction != null;
		}
		return false;
	};
}

function displacePart(direction) {
	return () => {
		const step = store.get.step(app.selectedItemLookup.stepID);
		undoStack.commit(
			'part.displace',
			{partID: app.selectedItemLookup.id, step, direction},
			`Displace Part ${util.titleCase(direction || 'None')}`,
			[{type: 'csi', id: step.csiID}]
		);
		app.redrawUI();
	};
}

module.exports = function ContextMenu(menuEntry, localApp) {
	app = localApp;
	return contextMenu[menuEntry];
};
