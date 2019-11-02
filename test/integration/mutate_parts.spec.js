/* eslint-disable max-len, no-unreachable */

describe('Test rotate things ', () => {

	beforeEach(cy.reloadLicPage);

	it('Delete the last part in a step', () => {
		cy.importTrivial(true, true, true);

		cy.get('#pageCanvas_page_1').click(220, 250).rightclick();
		cy.get('#csi_select_part_cmenu').click();
		cy.get('#select_part_0_cmenu').click();
		cy.get('#pageCanvas_page_1').rightclick();
		cy.get('#part_change_name_cmenu').click();
		cy.get('#part_delete_cmenu').click();
		cy.queryLic(lic => {
			assert.equal(lic.store.model.parts.length, 2);
			assert.equal(lic.store.state.pliItems.length, 6);
			assert.equal(lic.store.state.pages[2].pliItems.length, 2);  // inventory page
			assert.equal(lic.store.state.steps[3].parts.length, 0);
			assert.equal(lic.store.state.plis[1].pliItems.length, 0);

		});
	});
});
