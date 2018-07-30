import page from '../page_api';

function isMenuClosed(id) {
	cy.get(id)
		.should('have.class', page.classes.menu.dropdown)
		.should('not.have.class', page.classes.menu.open);
}

function isMenuOpen(id) {
	cy.get(id)
		.should('have.class', page.classes.menu.dropdown)
		.should('have.class', page.classes.menu.open);
}

describe('Launch initial empty page', () => {

	before(() => {
		cy.clearLocalStorage().then(() => {
			localStorage.clear();  // Need this because we overwrote cy.clearLocalStorage() to do nothing
		});
		cy.visit('http://192.168.1.101:9977/web_lic');
	});

	it('Load basic page', () => {
		cy.get('body').then(body => {
			expect(body.width()).to.be.closeTo(1500, 1);
			expect(body.height()).to.be.closeTo(900, 1);
		});
	});

	it('Local Storage should be initialized with default UI settings', () => { 
		cy.get('body').then(() => {
			expect(localStorage.getItem('custom_fonts')).to.eq('[]');
			expect(localStorage.getItem('ui_defaults')).to.have.string('dialog');
			const ui = JSON.parse(localStorage.getItem('ui_defaults'));
			expect(ui).to.have.property('guides').and.to.be.empty;
			expect(ui).to.have.any.keys('dialog', 'grid', 'guideStyle', 'navTree', 'pageView', 'splitter');
			expect(ui.splitter).to.equal(20);
			expect(localStorage.getItem('model')).to.be.null;
		});
	});

	it('Whats New dialog should show up with top & bottom inside the window', () => {

		// Make sure whats new shows up with top and bottom inside the window
		cy.get(page.ids.dialog.whatsNew).should('be.visible')
			.contains("What's New").then(el => {
				expect(el.position().top).to.be.closeTo(22, 3);
			});
		cy.get('.' + page.classes.dialog.body).contains('Version');
		cy.get('.' + page.classes.dialog.footer).then(el => {
			expect(el.position().top + el.outerHeight(true)).to.be.below(900);
		});
		cy.get(page.ids.dialog.whatsNew + ' .el-button').click().should('not.be.visible');
	});

	it('General page layout is right', () => {
		cy.get(page.ids.navbar).then(el => {
			expect(el.outerWidth()).to.be.closeTo(1500, 2);
			expect(el.outerHeight()).to.be.closeTo(38, 2);
		});
		cy.get(page.ids.leftPane).then(el => {
			expect(el.outerWidth()).to.be.closeTo(300, 10);
			expect(el.outerHeight()).to.be.closeTo(837, 10);
		});
		cy.get(page.ids.rightPane).then(el => {
			expect(el.outerWidth()).to.be.closeTo(1200, 10);
			expect(el.outerHeight()).to.be.closeTo(837, 10);
		});
		cy.get(page.ids.statusBar).then(el => {
			expect(el.outerWidth()).to.be.closeTo(1500, 10);
			expect(el.outerHeight()).to.be.closeTo(25, 2);
		});
	});

	it('Menus should exist and be clickable, with appropriately enabled / disabled content', () => {

		cy.get(page.ids.filenameContainer).should('not.exist');
		isMenuClosed(page.ids.menu.file);
		isMenuClosed(page.ids.menu.edit);
		isMenuClosed(page.ids.menu.view);
		isMenuClosed(page.ids.menu.export);

		cy.get(page.ids.menu.file).click();
		isMenuOpen(page.ids.menu.file);
		isMenuClosed(page.ids.menu.edit);
		isMenuClosed(page.ids.menu.view);
		isMenuClosed(page.ids.menu.export);

		cy.get(page.ids.subMenu.file.open).should('have.class', page.classes.menu.enabled);
		cy.get(page.ids.subMenu.file.close).should('have.class', page.classes.menu.disabled);

		cy.get(page.ids.menu.edit).click();
		isMenuClosed(page.ids.menu.file);
		isMenuOpen(page.ids.menu.edit);

		cy.get(page.ids.menu.edit).click(1000, 0);
		isMenuClosed(page.ids.menu.edit);

		cy.get(page.ids.menu.file).click();
		cy.get(page.ids.subMenu.file.clearCache).click();
		cy.get(page.ids.subMenu.file.clearCacheModel)
			.should('be.visible')
			.should('have.class', page.classes.menu.enabled);
	});
});
