module.exports = {
	extends: "../../.eslintrc.js",
	rules: {
		"valid-jsdoc": ["error", {
			"requireReturn": false,
			"requireReturnDescription": false,
			"prefer": {
				"return": "returns",
				"arg": "param"
			},
			"preferType": {
				"string": "String",
				"number": "Number",
				"boolean": "Boolean",
				"symbol": "Symbol",
				"object": "Object",
				"function": "Function",
				"array": "Array",
				"date": "Date",
				"error": "Error",
				"null": "void"
			}
		}],
	},
};
