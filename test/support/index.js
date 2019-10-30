Cypress.Commands.add('getByTestId', (selector, extraSelectors = '') => {
	return cy.get(`[data-testid="${selector}"]${extraSelectors}`);
});

Cypress.Commands.add('queryLic', cb => {
	cy.window().its('__lic').then(cb);
});

Cypress.Commands.add('importAlligator', excludeTitlePage => {
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
});

Cypress.Commands.add('reloadLicPage', () => {
	cy.clearLocalStorage();
	cy.visit('http://localhost:8080');
	cy.get('#whats_new_dialog .el-button').click();
	cy.get('#locale_chooser_dialog .el-button').click();
	cy.queryLic(lic => {
		lic.app.disableLocalStorage = true;
	});
});

