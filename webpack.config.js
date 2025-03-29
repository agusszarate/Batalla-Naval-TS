const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

// Crear dos configuraciones separadas para cliente y servidor
const clientConfig = {
    mode: 'development',
    entry: './src/client/index.ts',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'client/client.js',
        path: path.resolve(__dirname, 'dist'),
    },
    target: 'web',
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: 'src/client/public', to: 'client' }],
        }),
    ],
}

const serverConfig = {
    mode: 'development',
    entry: './src/server/server.ts',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'server/server.js',
        path: path.resolve(__dirname, 'dist'),
    },
    target: 'node',
}

// Exportamos un array con ambas configuraciones
module.exports = [clientConfig, serverConfig]
