const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');

module.exports = {
	entry: './src/ui.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist')
	},
	mode: 'development',
	devtool: 'source-map',
	watch: true,
	module: {
		rules: [
			{
				test: /\.vue$/,
				loader: 'vue-loader',
				options: {
					hotReload: false
				}
			},
			{
				test: /\.css$/,
				use: [
					'vue-style-loader',
					'css-loader'
				]
			},
			{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: 'eslint-loader',
				options: {
					failOnWarning: false,
					failOnError:  true
				}
			}
		]
	},
	plugins: [
		new VueLoaderPlugin()
	]
};
