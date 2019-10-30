/* eslint-disable max-len, no-unreachable */

describe('Test rotate things ', () => {

	function importAlligator(excludeTitlePage) {
		cy.getByTestId('import-alligator').click();
		cy.getByTestId('import-use-max-steps').find('input').should('be.checked');
		cy.getByTestId('import-use-max-steps').click();
		if (excludeTitlePage) {
			cy.getByTestId('import-include-dropdown').click();
			cy.getByTestId('include-titlePage').find('i').should('exist');
			cy.getByTestId('include-titlePage').click();
		}
		cy.getByTestId('import-ok').click();
		cy.spy();
	}

	beforeEach(() => {
		cy.clearLocalStorage();
		cy.visit('http://localhost:8080');
		cy.get('#whats_new_dialog .el-button').click();
		cy.get('#locale_chooser_dialog .el-button').click();
		cy.window().then(win => {
			win.__lic.app.disableLocalStorage = true;
		});
	});

	it.only('Custom Rotation on CSI, with correct Rotate Icon', () => {
		importAlligator(true);

		cy.get('#pageCanvas_page_1').click(450, 400).rightclick();
		cy.get('#csi_rotate_cmenu').click();
		cy.get('#csi_rotate_custom_cmenu').click();

		// Add 90 degree rotation about X, with rotate icon
		cy.get('.rotationListBox button').click();
		cy.getByTestId('rotate-angle-input').type('{backspace}90');
		cy.getByTestId('rotate-add-icon', ' input').should('not.be.checked');
		cy.getByTestId('rotate-add-icon').click();
		cy.getByTestId('rotate-ok').click();
		cy.window().its('__lic').then(lic => {
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
		cy.window().its('__lic').then(lic => {
			assert.deepEqual(lic.store.get.csi(4).rotation, [{axis: 'x', angle: 90}]);
			assert.isNull(lic.store.get.step(3).rotateIconID);
		});
	});
});
