/* global __dirname: false */

const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');
const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const rules = [
	{
		test: /\.vue$/,
		loader: 'vue-loader',
		options: {hotReload: false}
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
];

module.exports = [{
	name: 'local',
	entry: './src/ui.js',
	output: {
		filename: 'bundle.js',
		chunkFilename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist'),
		publicPath: 'dist/'
	},
	mode: 'development',
	module: {rules},
	plugins: [new VueLoaderPlugin()],
	devtool: 'source-map',
	watch: true,
	devServer: {contentBase: './'}
}, {
	name: 'prod',
	entry: './src/ui.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist'),
		publicPath: 'dist/'
	},
	mode: 'production',
	module: {rules},
	plugins: [
		new VueLoaderPlugin(),
		new UglifyJSPlugin({sourceMap: false}),
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('production')
		})
	]
}];
