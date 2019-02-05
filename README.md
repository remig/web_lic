# Web Lic

Web Lic is a web browser based application for creating and editing LEGO instruction books. Lic imports 3D models, organizes them into submodels, pages & steps, and exports the end result as images or PDF.

[Try Web Lic out here](http://bugeyedmonkeys.com/alpha/web_lic/)

##### Highlights

- A rich, WYSIWYG UI editor, which provides a fully interactive preview window along side a simple navigation tree, to help organize and layout your instructions.
- Automatically divide your model into steps. Add a list of parts needed for each step, and auto-layout multiple steps per page for a best fit. Auto-generate a title page and part list pages.
 
Web Lic can import any LDraw model, but its dynamic importer makes it easy to add an importer for any 3D file type, and create instructions for that model.

When you're done, Web Lic can export a final instruction book as a series of images or as a high resolution PDF.

Web Lic is currently in a late alpha stage.

Web Lic is intended to be a complete replacement for the aging and no longer maintained desktop version of [Lic](https://github.com/remig/lic).  This time around, it's architected in a much more simple and maintainable way.  And it has unit tests.

Web Lic is built using [Vue.js](https://vuejs.org/).  Models and parts are rendered with [Three.js](https://threejs.org/).  This is a purely client side application; there is *no* server side anything - beyond a web server to serve the initial content, of course.

##### Running Lic Locally

Lic is built using Node.js, which you'll need to run Lic on your machine and to play with the code or contribute to the project.  You will also need a copy of the LDraw parts library. If you're not familiar with Node, it's pretty easy:

- Install [Node.js](https://nodejs.org/en/)
- Check out a copy of Lic from GitHub.  Place it in a directory that's sibling to your LDraw directory, eg:
```
 root
   - LDraw
      - parts, p
   - web_lic
       - index.html, src, dist, etc
```
- From the command line, in the checked out web_lic directory, run `npm install`.  This will download a copy of all the 3rd party packages Lic depends on into a local `node_modules` directory.
- Run `npm run start` to compile Lic and start up a simple development HTTP server. This should also open a new browser window running Lic.  If you change Lic's code, this window should automatically refresh with the latest changes.

If you run into any problems, please [let me know](mailto:remigagne@gmail.com).

[LEGO®](http://lego.com/) is a registered trademark of the LEGO Group, which does not sponsor, endorse, or authorize this software project.

