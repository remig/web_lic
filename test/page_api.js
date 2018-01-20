/* global require: false, module: false */
// To run tests, cd to lic_w folder then 'mocha', or mocha test/test_foo.js to run one test

'use strict';

const webdriver = require('selenium-webdriver');
const id = webdriver.By.id;

module.exports = driver => {
	return {
		status_bar: id('statusBar'),
		right_pane: id('rightPane'),
		page_canvas: id('pageCanvas'),
		highlight: id('highlight'),
		file_uploader_button: id('uploadModelChooser'),
		menu: {
			file: id('file_menu'),
			edit: id('edit_menu'),
			view: id('view_menu'),
			export: id('export_menu')
		},
		sub_menu: {
			file: {
				open: id('open_menu'),
				open_recent: id('open_recent_menu'),
				close: id('close_menu'),
				save: id('save_menu'),
				save_as: id('save_as_menu'),
				import_model: id('import_model_menu'),
				save_template: id('save_template_menu'),
				save_template_as: id('save_template_as_menu'),
				load_template: id('load_template_menu'),
				reset_template: id('reset_template_menu')
			},
			edit: {
				undo: id('undo_menu'),
				redo: id('redo_menu'),
				snap_to: id('snap_to_menu'),
				brick_colors: id('brick_colors_menu')
			},
			view: {
				add_horizontal_guide: id('add_horizontal_guide_menu')
			},
			export: {
				generate_pdf: id('generate_pdf_menu'),
				generate_png_images: id('generate_png_images_menu')
			}
		},
		get(element) {
			return driver.findElement(element);
		},
		getClass(element) {
			return driver.findElement(element).getAttribute('class');
		},
		getCss(element, cssProperty) {
			return driver.findElement(element).getCssValue(cssProperty);
		},
		getText(element) {
			return driver.findElement(element).getText();
		},
		click(element, offset) {
			if (offset) {
				return driver.actions()
					.mouseMove(driver.findElement(element), offset)
					.click()
					.perform();
			} else {
				return driver.findElement(element).click();
			}
		},
		isPageCanvasBlank() {
			return driver.executeScript(() => {
				const canvas = document.getElementById('pageCanvas');
				const ctx = canvas.getContext('2d');
				const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
				for (var i = 0; i < data.length; i++) {
					if (data[i] !== 0 && data[i] !== 255) {
						return false;
					}
				}
				return true;
			});
		}
	};
};
