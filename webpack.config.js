const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const context = path.resolve(__dirname, 'src');

module.exports = {
  target: 'node',
  externals: [nodeExternals()],
  node: false,
  context,
  entry: {
    'prerender-queue': './prerender-queue.ts',
    'prerender-recur': './prerender-recur.ts',
    'web-server': './web-server.ts',
    'clean-html': './clean-html.ts',
    'update-cache-key': './update-cache-key.ts',
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
    alias: {
      '@': context,
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
};
