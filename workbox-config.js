module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{json,dist,css,gz,ttf,svg,png,txt,jpg}'
	],
	swDest: 'dist/sw.js',
  swSrc: "sw-runner.js"
};