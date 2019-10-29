import './commands';

Cypress.Commands.add('getByTestId', (selector, extraSelectors = '') => {
	return cy.get(`[data-testid="${selector}"]${extraSelectors}`);
});
