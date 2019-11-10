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
		test: /\.tsx?$/,
		loader: 'ts-loader',
		exclude: /node_modules/,
		options: {
			appendTsSuffixTo: [/\.vue$/]
		}
	},
	{
		test: /\.css$/,
		loader: [
			'vue-style-loader',
			'css-loader'
		]
	},
	{
		test: /\.(js|vue)$/,
		exclude: [/node_modules/],
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
	entry: './src/app.js',
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
	resolve: {
		extensions: ['.ts', '.js', '.vue']
	}
}, {
	name: 'prod',
	entry: './src/app.js',
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
	],
	resolve: {
		extensions: ['.ts', '.js', '.vue']
	}
}];
