/* eslint-disable max-len*/
const { Error: GABError } = require("../../../Internals/Errors");

/**
 * A Definition Type
 * @typedef {{ key: string, validator: function(*) } | function(Schema)} Type
 */
const Types = {
	string: {
		validator: val => typeof val === "string",
		key: "string",
	},
	date: {
		validator: val => !isNaN(Date.parse(val)),
		key: "date",
	},
	array: {
		validator: Array.isArray,
		key: "array",
	},
	object: {
		validator: val => val instanceof Object,
		key: "object",
	},
	number: {
		validator: val => !isNaN(val),
		key: "number",
	},
	boolean: {
		validator: val => typeof val === "boolean",
		key: "boolean",
	},
	mixed: {
		validator: () => true,
		key: "mixed",
	},
	schema: schema => ({
		validator: schema.validate,
		key: "schema",
		schema: schema,
	}),
};

const Validators = {
	enum: def => Array.isArray(def) ? { key: "enum", validator: val => def.includes(val) } : null,
	max: def => !isNaN(def) ? { key: "max", validator: val => val < def + 1 } : null,
	min: def => !isNaN(def) ? { key: "min", validator: val => val > def - 1 } : null,
	maxlength: def => !isNaN(def) ? { key: "maxlength", validator: val => val.length < def + 1 } : null,
	minlength: def => !isNaN(def) ? { key: "minlength", validator: val => val.length > def - 1 } : null,
	lowercase: def => def === true ? { key: "lowercase", validator: val => val === val.toLowerCase() } : null,
};

/**
 * A error for a ValidationError
 * @typedef {{ type: string, value: *, path: string, definition: Definition }} ValidationErrorObject
 */

class ValidationError extends Error {
	constructor (errors, document) {
		super();
		/* { SINGLE_ERROR } */
		if (errors.constructor === Object) errors = [errors];
		/* ![{ ERROR }, { ERROR }, ...] */
		else if (!Array.isArray(errors)) throw GABError("GADRIVER_INVALID_PARAMS");

		this.message = `${document && document._id ? `Document with ID ${document._id}` : `A Document${document ? " without ID" : ""}`} contains illegal values:`;
		this.name = "ValidationError";

		this.errors = [];
		this.document = document;

		for (const error of errors) {
			if (error.constructor !== Object) continue;
			const obj = {};
			const { definition } = error;

			obj.validator = error.type === "undefined" ? "schema" : error.type;
			obj.path = error.path;
			obj.value = error.value;

			switch (error.type) {
				case "undefined":
					obj.deviancy = "not defined in schema";
					obj.correct = "undefined";
					break;
				case "required":
					obj.deviancy = "required";
					obj.correct = "defined";
					break;
				case "enum":
					obj.deviancy = "not allowed";
					obj.correct = `one of ${definition.enum}`;
					break;
				case "min":
					obj.deviancy = "too low";
					obj.correct = `higher than ${definition.min - 1}`;
					break;
				case "max":
					obj.deviancy = "too high";
					obj.correct = `lower than ${definition.max + 1}`;
					break;
				case "minlength":
					obj.deviancy = "too short";
					obj.correct = `longer than ${definition.minlength - 1}`;
					break;
				case "maxlength":
					obj.deviancy = "too long";
					obj.correct = `shorter than ${definition.maxlength + 1}`;
					break;
				case "lowercase":
					obj.deviancy = "uppercase";
					obj.correct = "all lowercase";
					break;
				case "type":
					obj.deviancy = "not the right type";
					obj.correct = definition.type.key;
					break;
				case "array":
					obj.deviancy = "not the right type";
					obj.correct = "array";
					break;
				default:
					obj.deviancy = "illegal";
					obj.correct = "different";
			}

			obj.message = `Illegal value '${obj.value}' at path '${obj.path}' is ${obj.deviancy}. (Should be ${obj.correct})`;
			this.message += `\n${obj.message}`;

			this.errors.push(obj);
		}
	}
}

/** Represents a parsed definition in a Schema */
class Definition {
	/**
	 * Create a new Definition
	 * @param {Object} raw A user-defined definition for a Document value
	 * @param {string} [raw.type] A string documenting the type of this Document value
	 * @param {*} [raw.default] The value that should be assigned to this key on the Document if none was given on Document creation. This value is prioritized over raw.required, and if supplied, the Definition will never be required
	 * @param {boolean} [raw.required] A boolean indicating if this value should be required on Document creation
	 * @param {string} key The key this value is assigned to in the Document
	 * @constructor
	 */
	constructor (raw, key, schema) {
		/**
		 * A reference to the original user-defined definition
		 * @type {{type?: string, default?: *, required?: boolean}|string}
		 * @private
		 */
		this._raw = raw;
		this._schema = schema;
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
		 * The absolute value this definition should always have. Only works on object types
		 * @type {*}
		 * @private
		 */
		this._value = null;
		/**
		 * If this definition describes an array of values, this will be true
		 * @type {Boolean}
		 */
		this.isArray = false;
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

		if (TypeDefs.includes(raw)) {
			this.type = Types[raw.name.toLowerCase()];
			if (!this.type) throw new GABError("GADRIVER_ERROR", "Your schema is not configured correctly.");
		} else if (raw.constructor === Object) {
			try { this.type = Types[raw.type.name.toLowerCase()]; } catch (err) { console.log(this.key); throw err;}
			if (!this.type) throw new GABError("GADRIVER_ERROR", "Your schema is not configured correctly.");

			this._default = raw.default || null;
			this._required = Boolean(raw.required);
			this._parseValidations(raw);
		} else if (raw.constructor === module.exports || raw[0].constructor === module.exports) {
			if (Array.isArray(raw)) {
				this.type = Types.schema(raw[0]);
				this._default = [];
				this.isArray = true;
			} else {
				this.type = Types.schema(raw);
			}

			this.type.schema._parent = this;
		} else if (Array.isArray(raw)) {
			this.type = Types[raw[0].name.toLowerCase()];
			if (!this.type) throw new GABError("GADRIVER_ERROR", "Your schema is not configured correctly.");

			this._default = [];
			this.isArray = true;
		} else {
			this.type = null;
			this.invalid = true;
		}
	}

	get default () {
		if (this.type.key === "schema" && !this.isArray) return this.type.schema._defaultDocument;
		if (this.required) return null;

		let val = this._default;
		if (typeof this._default === "function") val = this._default();

		return val;
	}

	get required () {
		return this._default ? false : this._required;
	}

	/**
	 * Validate a value against this definition's requirements
	 * @param {*} value The value to be validated
	 * @param {Boolean|null} absolute If set to true, validation will enforce arrays
	 * @returns {ValidationErrorObject|null}
	 */
	validate (value, absolute) {
		const validate = val => {
			if (!this.required && (value === undefined || value === null)) return null;
			else if (this.required && (value === undefined || value === null)) return { type: "required", value: val, path: this.key, definition: this };

			if (this.type.key === "schema") return this.type.schema.validate(val);

			if (this.type && !this.type.validator(val)) return { type: "type", value: val, path: this.key, definition: this };
			else if (this.isArray && !Array.isArray(value) && absolute) return { type: "array", value: val, path: this.key, definition: this };

			const results = this._validations.map(validator => validator.validator(val) ? true : { type: validator.key, value: val, path: this.key, definition: this });
			if (results.some(res => res !== true)) return results.filter(res => res !== true);

			return null;
		};

		if (this.isArray && Array.isArray(value)) return value.map(val => validate(val));
		return validate(value);
	}

	_parseValidations (schema) {
		Object.keys(schema).forEach(key => {
			if (!Validators[key] || !Validators[key](schema[key])) return;
			this._validations.push(Validators[key](schema[key]));
			this[key] = schema[key];
		});
	}
}

/** A Schema that defines the structure of a collection's Documents */
class Schema {
	/**
	 * Create a new Schema
	 * @param {Object} schema The user-defined schema to construct
	 * @param {Object} options A set of user-defined options that modify the behavior of the Schema
	 * @constructor
	 */
	constructor (schema, options = {}) {
		this._schema = schema;
		this._options = options;
		this._parent = null;

		this._definitions = new Map();
		Object.keys(this._schema).forEach(key => {
			const val = this._schema[key];
			this._definitions.set(key, new Definition(val, key, this));
		});
	}

	build (raw = {}) {
		const doc = this._defaultDocument;

		Object.keys(raw).forEach(key => {
			const definition = this._definitions.get(key);

			if (definition && definition.type.key === "schema") {
				doc[key] = definition.isArray ? raw[key].map(val => definition.type.schema.build(val)) : definition.type.schema.build(raw[key]);
			} else if (definition) {
				const value = raw[key];
				const err = definition.validate(value, true);
				if (err && (!Array.isArray(err) || err.some(a => a))) throw new ValidationError(err, doc);
				doc[key] = value;
			} else if (key[0] !== "_") {
				throw new ValidationError({ type: "undefined", value: raw[key], path: key, definition }, doc);
			}
		});

		return doc;
	}

	validate (obj = {}, doc) {
		const unvalidated = Object.keys(obj);
		let errors = [];

		this._definitions.forEach(definition => {
			const error = definition.validate(obj[definition.key]);
			if (error && Array.isArray(error)) errors = errors.concat(error);
			else if (error) errors.push(error);

			if (unvalidated.includes(definition.key)) unvalidated.splice(unvalidated.indexOf(definition.key), 1);
		});

		unvalidated.forEach(val => val[0] !== "_" ? errors.push({ type: "undefined", val: obj[val], path: val, definition: undefined }) : null);

		if (errors.length) return new ValidationError(errors, doc || obj);
		else return null;
	}

	validateDoc (doc) {
		// TODO: Finish manual validation of doc
		const obj = doc.toObject();
		return this.validate(obj, doc);
	}

	/**
	 * The default raw data of this Schema if no overwrites are given
	 * @returns {Object}
	 * @private
	 */
	get _defaultDocument () {
		const ret = {};

		this._definitions.forEach((definition, key) => {
			const definitionDefault = definition.default;
			if (definitionDefault) ret[key] = definitionDefault;
			else if (definition.type.key === "schema") ret[key] = definition.type.schema._defaultDocument;
		});

		return ret;
	}

	static Mixed () {
		this.type = Types.Mixed;
	}
}

module.exports = Schema;

const TypeDefs = [String, Date, Array, Object, Number, Boolean, Schema.Mixed];
