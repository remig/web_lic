/* eslint-disable max-len, no-unreachable */

describe('Test Callouts', () => {

	beforeEach(cy.reloadLicPage);

	it('Verify single page, side by side and scrolling page views', () => {
		cy.importAlligator({use1Step: true});
		cy.get('#rightSubPane canvas')
			.should('have.length', 1)
			.first().should('have.id', 'pageCanvas_page_42');
		cy.get('#rightSubPane .pageLockIcon')
			.should('have.length', 1)
			.first().should('have.class', 'fa-lock-open');

		// Click show one page, should not change anything
		cy.get('#view_menu').click();
		cy.get('#show_pages_menu').click();
		cy.get('#show_one_page_menu').click();
		cy.get('#rightSubPane canvas')
			.should('have.length', 1)
			.first().should('have.id', 'pageCanvas_page_42');
		cy.get('#rightSubPane .pageLockIcon')
			.should('have.length', 1)
			.first().should('have.class', 'fa-lock-open');

		// Two pages side by side
		cy.get('#view_menu').click();
		cy.get('#show_pages_menu').click();
		cy.get('#show_two_pages_menu').click();
		cy.get('#rightSubPane canvas')
			.should('have.length', 2)
			.first().should('have.id', '');
		cy.get('#rightSubPane canvas')
			.last().should('have.id', 'pageCanvas_page_42');

		cy.get('#rightSubPane').trigger('keyup', {key: 'PageDown'});
		cy.get('#rightSubPane canvas')
			.should('have.length', 2)
			.first().should('have.id', 'pageCanvas_page_1');
		cy.get('#rightSubPane canvas')
			.last().should('have.id', 'pageCanvas_page_2');

		// One page scrolling
		cy.get('#view_menu').click();
		cy.get('#show_pages_menu').click();
		cy.get('#show_one_scroll_menu').click();
		cy.get('#rightSubPane canvas')
			.should('have.length', 43);

		// Facing pages scrolling
		cy.get('#view_menu').click();
		cy.get('#show_pages_menu').click();
		cy.get('#show_two_scroll_menu').click();
		cy.get('#rightSubPane canvas')
			.should('have.length', 44);
	});
});
