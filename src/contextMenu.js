/* global Vue: false, util: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
ContextMenu = (function() {
'use strict';

let undoStack, app, store;

const contextMenu = {
	page: [
		{text: 'Auto Layout (NYI)', cb: () => {}},
		{
			text: 'Use Vertical Layout',
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'page') {
					const page = store.get.lookupToItem(app.selectedItemLookup);
					return page.layout !== 'vertical';
				}
				return false;
			},
			cb() {
				const page = app.selectedItemLookup;
				undoStack.commit('layoutPage', {page, layout: 'vertical'}, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Use Horizontal Layout',
			shown() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'page') {
					const page = store.get.lookupToItem(app.selectedItemLookup);
					return page.layout !== 'horizontal';
				}
				return false;
			},
			cb() {
				const page = app.selectedItemLookup;
				undoStack.commit('layoutPage', {page, layout: 'horizontal'}, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Layout By Row and Column (NYI)',
			cb() {
				const page = app.selectedItemLookup;
				undoStack.commit('layoutPage', {page, layout: {rows: 5, cols: 2, direction: 'vertical'}}, this.text);
				app.redrawUI(true);
			}
		},
		{text: 'separator'},
		{text: 'Prepend Blank Page (NYI)', cb: () => {}},
		{
			text: 'Append Blank Page',
			cb() {
				const prevPage = app.selectedItemLookup;
				undoStack.commit('appendPage', {prevPage}, this.text);
				app.redrawUI(true);
			}
		},
		{text: 'separator'},
		{text: 'Hide Step Separators (NYI)', cb: () => {}},
		{text: 'Add Blank Step (NYI)', cb: () => {}},
		{text: 'Add Annotation (NYI)', cb: () => {}},
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
				undoStack.commit('deletePage', page, 'Delete Page');
				Vue.nextTick(() => {
					app.setCurrentPage(nextPage);
				});
			}
		}
	],
	pageNumber: [
		{text: 'Change Page Number (NYI)', cb() {}}
	],
	step: [
		{
			text: 'Add Callout',
			cb() {
				undoStack.commit('addCalloutToStep', {step: app.selectedItemLookup}, this.text);
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
			text: 'Move Step to...',
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
						undoStack.commit('moveStepToPreviousPage', app.selectedItemLookup, this.text);
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
						undoStack.commit('moveStepToNextPage', app.selectedItemLookup, this.text);
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
						const sourceStepID = app.selectedItemLookup.id;
						const destStepID = store.get.prevStep(app.selectedItemLookup).id;
						undoStack.commit('mergeSteps', {sourceStepID, destStepID}, this.text);
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
						const sourceStepID = app.selectedItemLookup.id;
						const destStepID = store.get.nextStep(app.selectedItemLookup).id;
						undoStack.commit('mergeSteps', {sourceStepID, destStepID}, this.text);
						app.redrawUI(true);
					}
				}
			]
		}
	],
	stepNumber: [
		{text: 'Change Step Number (NYI)', cb: () => {}}
	],
	csi: [
		{text: 'Rotate CSI (NYI)', cb: () => {}},
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
	label: [
		{
			text: 'Set...',
			children: [
				{text: 'Text (NYI)', cb: () => {}},
				{text: 'Font (NYI)', cb: () => {}},
				{text: 'Color (NYI)', cb: () => {}}
			]
		}
	],
	callout: [
		{
			text: 'Add Step',
			cb() {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'callout') {
					const callout = app.selectedItemLookup;
					undoStack.commit('addStepToCallout', {callout, doLayout: true}, this.text);
					app.redrawUI(true);
				}
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
					undoStack.commit('addPointToCalloutArrow', {calloutArrow}, this.text);
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
				const displacement = step.displacedParts.find(p => p.partID === app.selectedItemLookup.id);
				const originalDisplacement = util.clone(displacement);

				app.currentDialog = 'partDisplacementDialog';
				app.clearSelected();

				Vue.nextTick(() => {
					const dialog = app.$refs.currentDialog;
					dialog.$on('ok', () => {
						undoStack.commit( 'part.displace', {step, ...displacement}, 'Adjust Displaced Part');
						app.redrawUI(true);
					});
					dialog.$on('cancel', () => {
						displacement.distance = originalDisplacement.distance;
						displacement.arrowOffset = originalDisplacement.arrowOffset;
						app.redrawUI(true);
					});
					dialog.$on('update', (newValues) => {
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
							{partID: app.selectedItemLookup.id, srcStep, destStep},
							'Move Part to Previous Step'
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
							{partID: app.selectedItemLookup.id, srcStep, destStep},
							'Move Part to Next Step'
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
			undoStack.commit('rotateCalloutArrowTip', {calloutArrow, direction}, 'Rotate Callout Arrow Tip');
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
		const step = {type: 'step', id: app.selectedItemLookup.stepID};
		undoStack.commit(
			'part.displace',
			{partID: app.selectedItemLookup.id, step, direction},
			`Displace Part ${util.titleCase(direction || 'None')}`
		);
		app.redrawUI();
	};
}

return function(menuEntry, localApp, localStore, localUndoStack) {
	app = localApp;
	store = localStore;
	undoStack = localUndoStack;
	return contextMenu[menuEntry];
};

})();
