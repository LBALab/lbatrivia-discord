const path = require('path');

module.exports = {
	target: 'node',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'lbatrivia-discord.js'
	},
	optimization: {
		minimize: false
	}
};
