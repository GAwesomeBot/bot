// utility functions

module.exports = {
	getObjectType: val => {
		return new Object().toString.call(val).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
	},

	isFunction: val => {
		return module.exports.getObjectType(val) == "function";
	},

	isString: val => {
		return module.exports.getObjectType(val) == "string";
	}
};
