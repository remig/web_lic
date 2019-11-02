/* eslint-disable max-len, no-unreachable */

describe('Test rotate things ', () => {

	beforeEach(cy.reloadLicPage);

	it('Custom Rotation on CSI, with correct Rotate Icon', () => {
		cy.importAlligator(true);

		cy.get('#pageCanvas_page_1').click(450, 400).rightclick();
		cy.get('#csi_rotate_cmenu').click();
		cy.get('#csi_rotate_custom_cmenu').click();

		// Add 90 degree rotation about X, with rotate icon
		cy.get('.rotationListBox button').click();
		cy.getByTestId('rotate-angle-input').type('{backspace}90');
		cy.getByTestId('rotate-add-icon', ' input').should('not.be.checked');
		cy.getByTestId('rotate-add-icon').click();
		cy.getByTestId('rotate-ok').click();
		cy.queryLic(lic => {
			assert.deepEqual(lic.store.get.csi(4).rotation, [{axis: 'x', angle: 90}]);
			assert.equal(lic.store.get.step(3).rotateIconID, 1);
		});

		// Remove rotate icon; rotation should remain
		cy.get('#pageCanvas_page_1').click(450, 400).rightclick();
		cy.get('#csi_rotate_cmenu').click();
		cy.get('#csi_rotate_custom_cmenu').click();
		cy.getByTestId('rotate-add-icon', ' input').should('be.checked');
		cy.getByTestId('rotate-add-icon').click();
		cy.getByTestId('rotate-ok').click();
		cy.queryLic(lic => {
			assert.deepEqual(lic.store.get.csi(4).rotation, [{axis: 'x', angle: 90}]);
			assert.isNull(lic.store.get.step(3).rotateIconID);
		});
	});
});
