const {
	Errors: {
		Error: GABError,
	},
} = require("../../../index");

module.exports = class ScopeManager {
	/**
	 * Checks if the extension has sufficient scopes to execute a function.
	 * @param {Array<String>} scopes - The scopes an extension has
	 * @param {String} scope - The scope to check
	 * @returns {Boolean} True if the extension can successfully execute any functions that requires the given scope
	 */
	static check (scopes, scope) {
		if (!scopes.includes(scope)) throw new GABError("MISSING_SCOPES");
		return true;
	}

	/**
	 * Sets a value protected by scopes on the target object
	 * @param {Object} object - The target object receiving the protected value
	 * @param {String} key - The key the value is assigned to on the target object
	 * @param {*} value - The value to protect and set on the target object
	 * @param {Array<String>} scopes - A list of scopes the extension has access to
	 * @param {String} scope - The scope required to access the protected value
	 */
	static setProtectedValue (object, key, value, scopes, scope) {
		Object.defineProperty(object, key, {
			get: () => {
				ScopeManager.check(scopes, scope);
				return value;
			},
		});
	}
};
