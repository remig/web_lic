/* global __dirname: false */

const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');

module.exports = {
	entry: './src/ui.js',
	output: {
		filename: 'bundle.js',
		chunkFilename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist'),
		publicPath: 'dist/'
	},
	mode: 'development',
	devtool: 'source-map',
	devServer: {
		contentBase: './'
	},
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
				test: /\.(js|vue)$/,
				exclude: [/node_modules/, /dialog\.js/],
				loader: 'eslint-loader',
				options: {
					failOnWarning: false,
					failOnError: true
				}
			}
		]
	},
	plugins: [
		new VueLoaderPlugin()
	]
};
