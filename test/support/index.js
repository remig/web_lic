import './commands';

Cypress.LocalStorage.clear = function() {};

Cypress.Commands.add('getByTestId', selector => {
	return cy.get(`[data-testid="${selector}"]`);
});
