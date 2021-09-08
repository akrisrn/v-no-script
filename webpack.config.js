const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const context = path.join(__dirname, 'src');

module.exports = {
  target: 'node',
  externals: [nodeExternals()],
  node: false,
  context,
  entry: {
    'prerender-queue': './prerender-queue.ts',
    'prerender-recur': './prerender-recur.ts',
    'web-server': './web-server.ts',
    'ws-client': './ws-client.ts',
    'clean-html': './clean-html.ts',
    'update-cache-key': './update-cache-key.ts',
    'update-date': './update-date.ts',
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
  module: {
    rules: [
      {
        test: /ws-client\.ts$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      }, {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@': context,
    },
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
  },
};
