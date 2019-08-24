module.exports = {
	extends: "../../../.eslintrc.js",
	env: {
		browser: true,
		jquery: true,
	},
	globals: {
		GAwesomeUtil: true,
		GAwesomeData: true,
		GAwesomePaths: true,
		Turbolinks: true,
		cm: true,
		CodeMirror: true,
		AutoComplete: true,
		NProgress: true,
		io: true,
		bulma: true,
		md5: true,
		saveAs: true,
		swal: true,
		showdown: true,
		SimpleMDE: true,
	},
	rules: {
		"no-console": "off",
		"no-invalid-this": "off",
	}
};
