/* global __dirname: false */

const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');

require('babel-polyfill');

module.exports = {
	entry: ['babel-polyfill', './src/ui.js'],
	output: {
		filename: 'bundle.js',
		chunkFilename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist'),
		publicPath: 'dist/'
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
				test: /\.(js|vue)$/,
				exclude: [/node_modules/, /dialog\.js/],
				loader: 'eslint-loader',
				options: {
					failOnWarning: false,
					failOnError: true
				}
			},
			{
				test: /\.glsl$/,
				loader: 'webpack-glsl-loader'
			}
		]
	},
	plugins: [
		new VueLoaderPlugin()
	]
};
