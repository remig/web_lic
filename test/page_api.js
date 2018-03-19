/* global module: false, __Web_lic_testScope: false */
// To run tests, cd to lic_w/test folder then 'npm test'
// To debug tests, add 'browser.debug()' anywhere in the test code
'use strict';

// TODO: run unit tests directly in mocha, not in webdriver for faster test runs.

const trivial_model = require('./trivial_model.json').model;

module.exports = browser => {

	const page = {
		ids: {
			rootContainer: '#container',
			statusBar: '#statusBar',
			leftPane: '#leftPane',
			tree: '#tree',
			rightPane: '#rightPane',
			pageCanvas: '#pageCanvas',
			splitter: '.gutter',
			highlight: '#highlight',
			contextMenuContainer: '#contextMenu',
			contextMenu: {
				step: {
					addCallout: '#add_callout_menu',
					moveStep: '#move_step_to_menu',
					mergeStep: '#merge_step_with_menu'
				}
			},
			fileUploaderButton: '#uploadModelChooser',
			menuContainer: '.navbar',
			menu: {
				file: '#file_menu',
				edit: '#edit_menu',
				view: '#view_menu',
				export: '#export_menu'
			},
			filenameContainer: '#filename',
			subMenu: {
				file: {
					open: '#open_menu',
					openRecent: '#open_recent_menu',
					close: '#close_menu',
					save: '#save_menu',
					importModel: '#import_custom_model_menu',
					saveTemplate: '#save_template_menu',
					saveTemplateAs: '#save_template_as_menu',
					loadTemplate: '#load_template_menu',
					resetTemplate: '#reset_template_menu'
				},
				edit: {
					undo: '#undo_menu',
					redo: '#redo_menu',
					snapTo: '#snap_to_menu',
					brickColors: '#brick_colors_menu'
				},
				view: {
					addHorizontalGuide: '#add_horizontal_guide_menu'
				},
				export: {
					generatePdf: '#generate_pdf_menu',
					generatePngImages: '#generate_png_images_menu'
				}
			}
		},
		classes: {
			menu: {
				closed: 'dropdown',
				open: 'dropdown open',
				enabled: '',
				disabled: 'disabled'
			},
			tree: {
				parentRow: {
					closed: 'treeIcon treeIconClosed',
					open: 'treeIcon'
				},
				childRow: {
					highlighted: 'clickable treeText selected',
					unhighlighted: 'clickable treeText'
				},
				subMenu: {
					hidden: 'treeChildren indent hidden',
					visible: 'treeChildren indent'
				}
			}
		},
		selectors: {
			contextMenu: {
				content: '#contextMenu > ul',
				entries: '#contextMenu > ul > li',
				parentRow(row) {
					const selector = `#contextMenu > ul > :nth-child(${row + 1})`;
					return {
						selector,
						subMenu: selector + ' > ul'
					};
				}
			},
			tree: {
				arrowIcons: '#tree .treeIcon',
				topLevelRows: '#tree > ul > li',
				childRows: '#tree .treeChildren',
				textContainers: '#tree .treeText',
				parentRow(type, n) {
					if (n == null) {
						return 'div[id^=treeParent_page_]';
					}
					const selector = `#treeParent_${type}_${n}`;
					return {
						selector,
						arrow: selector + ' > i',
						text: selector + ' > span',
						subMenu: selector + ' > ul'
					};
				},
				childRow(type, n) {
					return `#treeRow_${type}_${n}`;
				}
			}
		},
		highlight: {
			isVisible() {
				return browser.getCss2(page.ids.highlight, 'display') === 'block';
			},
			isValid(x, y, width, height) {
				if (!page.highlight.isVisible()) {
					return false;
				}
				const box = browser.getBBox2(page.ids.highlight);
				if (box.x < x || box.y < y) {
					return false;
				}
				if (box.width !== width || box.height !== height) {
					return false;
				}
				return true;
			}
		},
		getCurrentPage() {
			return browser.execute(() => {
				if (__Web_lic_testScope.app.currentPageLookup == null) {
					return null;
				}
				return {
					pageID: __Web_lic_testScope.app.currentPageLookup.id,
					type: __Web_lic_testScope.app.currentPageLookup.type
				};
			}).value;
		},
		getSelectedItem() {
			return browser.execute(() => {
				if (__Web_lic_testScope.app.selectedItemLookup == null) {
					return null;
				}
				return {
					id: __Web_lic_testScope.app.selectedItemLookup.id,
					type: __Web_lic_testScope.app.selectedItemLookup.type
				};
			}).value;
		},
		getStoreState(prop) {
			return browser.execute(prop => {
				return __Web_lic_testScope.util.get(prop, __Web_lic_testScope.store.state);
			}, prop).value;
		},
		importTrivialModel() {
			browser.url('http://192.168.1.101:9977/web_lic/index.html');
			browser.execute(function(model, fn) {
				__Web_lic_testScope.app.importLocalModel(model, fn);
			}, trivial_model, 'trivial_model.ldr');
			browser.waitForText(page.ids.statusBar, 9000);
		},
		isPageCanvasBlank() {
			return browser.execute(() => {
				const canvas = document.getElementById('pageCanvas');
				const ctx = canvas.getContext('2d');
				const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
				for (var i = 0; i < data.length; i++) {
					if (data[i] !== 0 && data[i] !== 255) {
						return false;
					}
				}
				return true;
			}).value;
		}
	};
	return page;
};
