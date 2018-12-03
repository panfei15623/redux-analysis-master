const path = require('path');
const htmlWebpackPlugin = require('html-webpack-plugin');
const cleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: {
    index: path.resolve(__dirname, './src/test/index.js')
  },
  output: {
    filename: '[name]_[hash].js',
    path: path.resolve(__dirname, './dist/')
  },
  devtool: 'inline-source-map',
  devServer: {
    port: 8889,
    open: true,
    contentBase: path.resolve(__dirname, './dist/')
  },
  plugins: [
    new htmlWebpackPlugin({
      inject: true,
      template: path.resolve(__dirname, './index.html')
    }),
    new cleanWebpackPlugin(['dist'])
  ]
};