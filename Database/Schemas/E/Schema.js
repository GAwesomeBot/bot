/* eslint-disable max-len*/
const { Error: GABError } = require("../../../Internals/Errors");

/**
 * A Definition Type
 * @typedef {{ bland: boolean, validator: function(*) }} Type
 */


const Types = {
	string: {
		bland: true,
		validator: val => typeof val === "string",
	},
	date: {
		bland: true,
	},
};

class ValidationError {
	constructor (err) {
		// TODO: Implement ValidationError
		return this;
	}
}

class Definition {
	/**
	 * Represents a parsed definition in a Schema
	 * @param {Object|string} raw A user-defined definition for a Document value
	 * @param {string} [raw.type] A string documenting the type of this Document value
	 * @param {*} [raw.default] The value that should be assigned to this key on the Document if none was given on Document creation. This value is prioritized over raw.required, and if supplied, the Definition will never be required
	 * @param {boolean} [raw.required] A boolean indicating if this value should be required on Document creation
	 * @param {string} key The key this value is assigned to in the Document
	 * @constructor
	 */
	constructor (raw, key) {
		/**
		 * A reference to the original user-defined definition
		 * @type {{type?: string, default?: *, required?: boolean}|string}
		 * @private
		 */
		this._raw = raw;
		/**
		 * The key this value is assigned to in the Document
		 * @type {string}
		 */
		this.key = key;

		// Defaults

		/**
		 * The parsed Type of this Definition
		 * @type {Type|null}
		 */
		this.type = null;
		/**
		 * The default value or function to use when none was given
		 * @type {*}
		 * @private
		 */
		this._default = null;
		/**
		 * A boolean indicating if the value is required or not
		 * @type {boolean}
		 * @private
		 */
		this._required = false;
		/**
		 * If applicable, the subSchema this Definition is describing
		 * @type {Schema|null}
		 */
		this.subSchema = null;
		/**
		 * An array of validation functions to pass before the value is set
		 * @type {Array}
		 * @private
		 */
		this._validations = [];
		/**
		 * A boolean indicating if this Definition is invalid or not. Invalid Definitions should be ignored or raise an error
		 * @type {boolean}
		 */
		this.invalid = false;

		if (typeof raw === "string") {
			this.type = Types[raw];
			if (!this.type) throw new GABError("GADRIVER_ERROR", "Your schema is not configured correctly.");
		} else if (raw.constructor === Object) {
			this.type = Types[raw.type];
			if (!this.type) throw new GABError("GADRIVER_ERROR", "Your schema is not configured correctly.");

			this._default = raw.default || null;
			this._required = Boolean(raw.required);
			// TODO: Parse validations such as min/max enum
		} else if (raw.constructor === Array) {
			this.subSchema = new module.exports(raw[0]);
			this._default = [];
			this.type = Types.array;
		} else if (raw.constructor === module.exports) {
			this.subSchema = new module.exports(raw);
			this.type = Types.object;
		} else {
			this.type = null;
			this.invalid = true;
		}
	}

	get default () {
		let val = this._default;
		if (typeof this._default === "function") val = this._default();

		if (this.validate(val)) return val;
		else throw GABError("GADRIVER_ERROR", "Your schema is not configured correctly");
	}

	get required () {
		return this._default ? false : this._required;
	}

	/**
	 * Validate a value against this definition's requirements
	 * @param {*} value The value to be validated
	 * @returns {true|ValidationError}
	 */
	validate (value) {
		const results = this._validations.map(func => func(value));
		if (results.some(val => val !== true)) {
			return new ValidationError(results.filter(val => val !== true));
		} else {
			if (!this.type.validator(value)) return new ValidationError({ type: "TypeError" });
			return true;
		}
	}
}

module.exports = class Schema {
	constructor (schema) {
		this._schema = schema;

		this._definitions = {};
		Object.keys(this._schema).forEach(key => {
			const val = this._schema[key];
			this._definitions[key] = new Definition(val, key);
		});
	}

	build (raw) {
		const defaultDoc = this._defaultDocument;
	}

	validate (doc) {
		// TODO: Finish manual validation of doc
		const obj = doc.toObject();
	}

	get _defaultDocument () {
		const ret = {};

		for (const key in this._schema) {
			const definition = this._definitions[key];
			const defaultValue = definition.default;
			if (defaultValue) ret[key] = defaultValue;
		}

		return ret;
	}
};
