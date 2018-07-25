# Web Lic

Web Lic is a web browser based application for creating and editing LEGO instruction books. Lic imports 3D models, organizes them into submodels, pages & steps, and exports the end result as images or PDF.

[Try Web Lic out here](http://bugeyedmonkeys.com/alpha/web_lic/)

Highlights:

- A rich, WYSIWYG UI editor, which provides a fully interactive preview window along side a simple navigation tree, to help organize and layout your instructions.
- Automatically divide your model into steps. Add a list of parts needed for each step, and auto-layout multiple steps per page for a best fit. Auto-generate a title page and part list pages.
 
Web Lic can import any LDraw model, but its dynamic importer makes it easy to add an importer for any 3D file type, and create instructions for that model.

When you're done, Web Lic can export a final instruction book as a series of images or as a high resolution PDF.

Web Lic is currently in a very early alpha stage.

Web Lic is intended to be a complete replacement for the aging and no longer maintained desktop version of [Lic](https://github.com/remig/lic).  This time around, it's architected in a much more simple and maintainable way.  And it has unit tests.

Web Lic is built using [Vue.js](https://vuejs.org/).  Models and parts are rendered with [Three.js](https://threejs.org/).  This is a purely client side application; there is *no* server side anything - beyond a web server to serve the initial content, of course.

[LEGO®](http://lego.com/) is a registered trademark of the LEGO Group, which does not sponsor, endorse, or authorize this software project.
