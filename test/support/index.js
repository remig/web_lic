Cypress.Commands.add('getByTestId', (selector, extraSelectors = '') => {
	return cy.get(`[data-testid="${selector}"]${extraSelectors}`);
});

Cypress.Commands.add('queryLic', cb => {
	cy.window().its('__lic').then(cb);
});

function importModel(name, excludeTitlePage, useMaxSteps, includePartList) {
	cy.getByTestId(`import-${name}`).click();
	cy.getByTestId('import-use-max-steps').find('input').should('be.checked');
	if (!useMaxSteps) {
		cy.getByTestId('import-use-max-steps').click();
	}
	if (excludeTitlePage || !includePartList) {
		cy.getByTestId('import-include-dropdown').click();
	}
	if (excludeTitlePage) {
		cy.getByTestId('include-titlePage').find('i').should('exist');
		cy.getByTestId('include-titlePage').click();
	}
	if (!includePartList) {
		cy.getByTestId('include-partListPage').find('i').should('exist');
		cy.getByTestId('include-partListPage').click();
	}
	cy.getByTestId('import-ok').click();
}

Cypress.Commands.add('importTrivial', importModel.bind(null, 'trivial'));
Cypress.Commands.add('importAlligator', importModel.bind(null, 'alligator'));
Cypress.Commands.add('importXWing', importModel.bind(null, 'xwing'));

Cypress.Commands.add('reloadLicPage', () => {
	cy.clearLocalStorage();
	cy.visit('http://localhost:8080');
	cy.get('#whats_new_dialog .el-button').click();
	cy.get('#locale_chooser_dialog .el-button').click();
	cy.queryLic(lic => {
		lic.app.disableLocalStorage = true;
	});
});

