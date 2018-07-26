import page from '../page_api';

function isMenuClosed(id) {
	cy.get(id)
		.should('have.class', page.classes.menu.closed)
		.should('not.have.class', page.classes.menu.open);
}

describe('Launch initial empty page', function() {
	it('Load Web Lic', function() {
		cy.visit('http://192.168.1.101:9977/web_lic');
		cy.get('body').then(body => {
			expect(body.width()).to.be.closeTo(1500, 1);
			expect(body.height()).to.be.closeTo(900, 1);
		});
		cy.get(page.ids.dialog.whatsNew).should('be.visible').contains("What's New");
		cy.get(page.ids.dialog.whatsNew + ' .el-button').click();
		cy.get('body').should(() => {
			expect(localStorage.getItem('custom_fonts')).to.eq('[]');
			expect(localStorage.getItem('ui_defaults')).to.have.string('dialog');
			const ui = JSON.parse(localStorage.getItem('ui_defaults'));
			expect(ui).to.have.property('guides').and.to.be.empty;
			expect(ui).to.have.any.keys('dialog', 'grid', 'guideStyle', 'navTree', 'pageView', 'splitter');
			expect(ui.splitter).to.equal(20);
			expect(localStorage.getItem('model')).to.be.null;
		});
		cy.get(page.ids.leftPane).then(el => {
			expect(el.width()).to.be.closeTo(300, 10);
		});
		cy.get(page.ids.rightPane).then(el => {
			expect(el.width()).to.be.closeTo(1200, 10);
		});
		cy.get(page.ids.filenameContainer).should('not.exist');
		isMenuClosed(page.ids.menu.file);
		isMenuClosed(page.ids.menu.edit);
		isMenuClosed(page.ids.menu.view);
		isMenuClosed(page.ids.menu.export);
	});
});
