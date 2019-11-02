/* eslint-disable max-len, no-unreachable */

describe('Test Callouts', () => {

	beforeEach(cy.reloadLicPage);

	it('Custom Rotation on CSI, with correct Rotate Icon', () => {
		cy.importAlligator(true);

		cy.get('#pageCanvas_page_1').click(200, 350).rightclick();
		cy.queryLic(lic => {
			assert.deepEqual(lic.app.selectedItemLookup, {id: 3, type: 'step'});
		});
		cy.get('#step_add_callout_cmenu').click();
		cy.get('#pageCanvas_page_1').click(500, 400).rightclick();
		cy.get('#csi_select_part_cmenu').click();
		cy.get('#select_part_0_cmenu').click();
		cy.get('#pageCanvas_page_1').rightclick();
		cy.get('#part_add_to_callout_cmenu').click();
		cy.get('#pageCanvas_page_1').click(40, 415);
		cy.queryLic(lic => {
			assert.deepEqual(lic.app.selectedItemLookup, {id: 44, type: 'step'});
		});
		cy.get('#pageCanvas_page_1').rightclick();
		cy.get('#step_prepend_cmenu').click();
		cy.queryLic(lic => {
			assert.equal(lic.store.state.callouts.length, 2);
			const callout = lic.store.state.callouts[1];
			assert.deepEqual(callout.steps, [45, 44]);
			const steps = callout.steps.map(lic.store.get.step);
			assert.deepEqual(steps.map(s => s.number), [1, 2]);
			assert.deepEqual(steps.map(s => s.numberLabelID), [87, 88]);
			assert.deepEqual(steps.map(s => s.numberLabelID), [87, 88]);
			assert.deepEqual(steps[0].model, {filename: '20015 - Alligator.mpd', parentStepID: null});
			assert.deepEqual(steps[1].model, {filename: '20015 - Alligator.mpd', parentStepID: null});
			assert.deepEqual(steps[0].parts, []);
			assert.deepEqual(steps[1].parts, [0]);
		});

		cy.get('#pageCanvas_page_1').click(40, 415);
		cy.queryLic(lic => {
			assert.deepEqual(lic.app.selectedItemLookup, {id: 45, type: 'step'});
		});
		cy.get('#pageCanvas_page_1').rightclick();
		cy.get('#step_append_cmenu').click();
		cy.queryLic(lic => {
			assert.equal(lic.store.state.callouts.length, 2);
			const callout = lic.store.state.callouts[1];
			assert.deepEqual(callout.steps, [45, 46, 44]);
			const steps = callout.steps.map(lic.store.get.step);
			assert.deepEqual(steps.map(s => s.number), [1, 2, 3]);
			assert.deepEqual(steps.map(s => s.numberLabelID), [87, 89, 88]);
			assert.deepEqual(steps[0].model, {filename: '20015 - Alligator.mpd', parentStepID: null});
			assert.deepEqual(steps[1].model, {filename: '20015 - Alligator.mpd', parentStepID: null});
			assert.deepEqual(steps[2].model, {filename: '20015 - Alligator.mpd', parentStepID: null});
			assert.deepEqual(steps[0].parts, []);
			assert.deepEqual(steps[1].parts, []);
			assert.deepEqual(steps[2].parts, [0]);
		});

		cy.get('#pageCanvas_page_1').click(140, 415);
		cy.queryLic(lic => {
			assert.deepEqual(lic.app.selectedItemLookup, {id: 48, type: 'csi'});
		});
		cy.get('#pageCanvas_page_1').rightclick();
		cy.get('#csi_select_part_cmenu').click();
		cy.get('#select_part_0_cmenu').click();
		cy.queryLic(lic => {
			assert.deepEqual(lic.app.selectedItemLookup, {id: 0, stepID: 44, type: 'part'});
		});
		cy.get('#pageCanvas_page_1').rightclick();
		cy.get('#part_move_cmenu').click();
		cy.get('#part_move_prev_cmenu').click();
		cy.queryLic(lic => {
			assert.equal(lic.store.state.callouts.length, 2);
			const callout = lic.store.state.callouts[1];
			assert.deepEqual(callout.steps, [45, 46, 44]);
			const steps = callout.steps.map(lic.store.get.step);
			assert.deepEqual(steps[0].parts, []);
			assert.deepEqual(steps[1].parts, [0]);
			assert.deepEqual(steps[2].parts, []);
		});
	});
});
