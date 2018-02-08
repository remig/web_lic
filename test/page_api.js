/* global module: false */
// To run tests, cd to lic_w/test folder then 'npm test'
// To debug tests, add 'browser.debug()' anywhere in the test code

'use strict';

module.exports = browser => {

	const page = {
		ids: {
			status_bar: '#statusBar',
			left_pane: '#leftPane',
			tree: '#tree',
			right_pane: '#rightPane',
			page_canvas: '#pageCanvas',
			highlight: '#highlight',
			file_uploader_button: '#uploadModelChooser',
			menu: {
				file: '#file_menu',
				edit: '#edit_menu',
				view: '#view_menu',
				export: '#export_menu'
			},
			sub_menu: {
				file: {
					open: '#open_menu',
					open_recent: '#open_recent_menu',
					close: '#close_menu',
					save: '#save_menu',
					save_as: '#save_as_menu',
					import_model: '#import_custom_model_menu',
					save_template: '#save_template_menu',
					save_template_as: '#save_template_as_menu',
					load_template: '#load_template_menu',
					reset_template: '#reset_template_menu'
				},
				edit: {
					undo: '#undo_menu',
					redo: '#redo_menu',
					snap_to: '#snap_to_menu',
					brick_colors: '#brick_colors_menu'
				},
				view: {
					add_horizontal_guide: '#add_horizontal_guide_menu'
				},
				export: {
					generate_pdf: '#generate_pdf_menu',
					generate_png_images: '#generate_png_images_menu'
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
			bbox() {
				return {
					x: parseFloat(browser.getCss2(page.ids.highlight, 'left')),
					y: parseFloat(browser.getCss2(page.ids.highlight, 'top')),
					width: parseFloat(browser.getCss2(page.ids.highlight, 'width')),
					height: parseFloat(browser.getCss2(page.ids.highlight, 'height'))
				};
			},
			isValid(x, y, width, height) {
				if (!page.highlight.isVisible()) {
					return false;
				}
				const highlightBox = page.highlight.bbox();
				if (highlightBox.x < x || highlightBox.y < y) {
					return false;
				}
				if (highlightBox.width !== width || highlightBox.height !== height) {
					return false;
				}
				return true;
			}
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
