/**
 * Copyright 2020 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const JavaScriptObfuscator = require('webpack-obfuscator')

module.exports = env => {
  const dist = env && env.prod
  const config = {
    mode: dist ? 'production' : 'development',
    performance: { hints: false },
    entry: { build: ['@babel/polyfill', './src/main.js'] },
    plugins: [
      new CopyWebpackPlugin([
        {from: 'src/assets', to: 'assets'}
      ]),
      new HtmlWebpackPlugin({
        title: 'LMU Munich CG1 SS2020',
        meta: {
          viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1.0, user-scalable=no'
        }
      }),
      new JavaScriptObfuscator({
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        selfDefending: true,
      })
    ],
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'build')
    },
    module: {
      rules: [{
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {},
      }, {
        test: /\.js$/,
        use: { loader: 'babel-loader',
          options: { compact: false, presets: [['@babel/preset-env']] }
        }
      }]
    }
  }
  if (!dist) { config.devtool = '#source-map' }
  return config
}
