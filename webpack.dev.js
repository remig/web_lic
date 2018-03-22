const path = require('path');

module.exports = {
	entry: './src/ui.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist')
	},
	mode: 'development',
	devtool: 'source-map',
	watch: true
};
