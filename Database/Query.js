const { Error: GABError } = require("../Internals/Errors");
const Schema = require("./Schemas/E/Schema");

const mpath = require("mpath");

module.exports = class Query {
	/**
	 * An object with methods to interact with a Document
	 * @constructor
	 * @param {Document} doc The Document this Query object interacts with
	 */
	constructor (doc) {
		/**
		 * The Document this Query object interacts with
		 * @type {Document}
		 * @private
		 */
		this._doc = doc;
		/**
		 * The mpath string pointing to the current selected object
		 * @type {string}
		 */
		this.parsed = "";
		/**
		 * The current value being interacted with
		 * @type {Document.Object|Object}
		 */
		this._current = this._doc._doc;
		this._definition = this._doc._model.schema;
	}

	/**
	 * Change the current selection to a property of said selected value
	 * @param {string} path The path of the property to select
	 * @returns {module.Query}
	 */
	prop (path) {
		try {
			if (this._definition.isMap) return this.id(path);

			if (path === "..") {
				const index = this.parsed.lastIndexOf(".");
				this.parsed = this.parsed.substring(0, index);
				this._current = this.parsed === "" ? this._doc._doc : mpath.get(this.parsed, this._doc._doc);

				this._shiftSchema(this.parsed, true);

				return this;
			}

			this.parsed += this._parseForString(path);
			this._current = mpath.get(this.parsed, this._doc._doc);
			this._shiftSchema(path);
			return this;
		} catch (err) {
			throw new GABError("GADRIVER_ERROR", "Could not parse Query.");
		}
	}

	/**
	 * Get a (nested) property from the current selection using an mpath string
	 * @param {string} key The mpath string pointing to the current value, using template variable labels in the form of "$label"
	 * @param {object|array} [data] An Object or Array mapping variable labels to strings or ID's. All strings are ran through Query._findById first to check for ID matches.
	 * @returns {*}
	 */
	get (key, data) {
		try {
			let found = true;
			if (!data || (data.constructor !== Object && data.constructor !== Array)) return mpath.get(this.parsed + this._parseForString(key), this._doc._doc);
			const splitted = key.split(".");
			let parsed = "";
			splitted.forEach(piece => {
				const val = data[piece.replace("$", "")];
				if (!val || !piece.startsWith("$")) {
					parsed += this._parseForString(piece, parsed);
				} else {
					const index = this._findById(val, mpath.get(this.parsed + this._parseForString(parsed), this._doc._doc));
					if (index === null) found = false;
					parsed += this._parseForString(String(index || val), parsed);
				}
			});
			return found ? mpath.get(this.parsed + this._parseForString(parsed), this._doc._doc) : undefined;
		} catch (err) {
			throw new GABError("GADRIVER_ERROR", "Could not parse Query.");
		}
	}

	/**
	 * Selects a subdocument of the current array or map by _id
	 * @param {string} id The _id value of the subdocument to select
	 * @returns {module.Query}
	 */
	id (id) {
		try {
			if (!this._canId()) return this.prop(id);
			const index = this._definition.isMap ? id : this._findById(id);
			this.parsed += this._parseForString(index);
			this._current = mpath.get(this.parsed, this._doc._doc);
			return this;
		} catch (err) {
			throw new GABError("GADRIVER_ERROR", "Could not parse Query.");
		}
	}

	/**
	 * Set the value of a path
	 * @param {string} path
	 * @param {*} value
	 * @returns {module.Query}
	 */
	set (path, value) {
		try {
			if (value !== undefined) {
				const parsed = this.parsed + this._parseForString(path);

				const definition = this._shiftSchema(path, false, false);
				const err = definition.validate(value, true);
				if (err && (!Array.isArray(err) || err.length)) {
					err.path = parsed;
					throw new Schema.ValidationError(err, this._doc);
				}

				this._writeValue(parsed, value);
			} else {
				const err = this._definition.validate(path, true);
				if (err && (!Array.isArray(err) || err.length)) {
					err.path = this.parsed;
					throw new Schema.ValidationError(err, this._doc);
				}

				this._writeValue(this.parsed, path);
			}
			return this;
		} catch (err) {
			if (err.constructor === Schema.ValidationError) throw err;
			throw new GABError("GADRIVER_ERROR", "Could not set atomics or parse Query.");
		}
	}

	/**
	 * Gets a subdocument of the current array by _id
	 * @param {string} id The _id value of the subdocument to get
	 * @returns {*}
	 */
	getById (id) {
		if (!this._canId()) return this.prop(id);
		return this.get("$0", [this._findById(id)]);
	}

	push (value) {
		// TODO: Write Query#push()
		if (!this._canId()) return this;

		if (this._definition.isMap && !value._id) return new Schema.ValidationError({ type: "required", value: value._id, path: `${this.parsed}._id`, definition: this._definition });

		if (!(this._definition.isArray ? this._findById(value._id) : this._current[value._id])) {
			return new Schema.ValidationError({ type: "duplicate", value: value._id, path: `${this.parsed}._id`, definition: this._definition });
		}

		const obj = this._definition.type.schema.build(value);

		const err = this._definition.validate(obj);
		if (err) {
			err.path = this.parsed;
			throw new Schema.ValidationError(err, this._doc);
		}
	}

	pull () {
		// TODO: Write Query#pull()
	}

	/**
	 * The current raw value this Query has selected
	 * @returns {*}
	 * @readonly
	 */
	get val () {
		return mpath.get(this.parsed, this._doc._doc);
	}

	/**
	 * Parse a mpath piece to be suffixed to the current mpath
	 * @param {string} str The piece to be parsed
	 * @param {string} [obj=module.Query.parsed] The mpath root the piece is to be suffixed onto
	 * @returns {string}
	 * @private
	 */
	_parseForString (str, obj = this.parsed) {
		return obj === "" ? str : `.${str}`;
	}

	/**
	 * Check if the current value or obj can be used to find a subdocument by ID
	 * @param {object} [obj=model.Query._current] The object to be checked
	 * @returns {boolean}
	 * @private
	 */
	_canId (obj = this._current) {
		return obj && obj.constructor === Array && (this._definition.isArray || this._definition.isMap);
	}

	/**
	 * Internal function to find an array value by its _id property, returns null if value is not found
	 * @param {string} id The ID to test the array values against
	 * @param {object} [obj=model.Query._current] The array that holds the value to be found
	 * @returns {*}
	 * @private
	 */
	_findById (id, obj = this._current) {
		if (this._canId(obj)) {
			const index = obj.findIndex(prop => prop._id === id);
			return index === -1 ? null : index;
		} else {
			return null;
		}
	}

	/**
	 * Internal function to write a value to a specified path at all locations necessary
	 * @param {string} path
	 * @param {*} val
	 * @private
	 */
	_writeValue (path, val) {
		mpath.set(path, val, this._doc._doc);
		mpath.set(path, val, this._doc);
		this._doc._setAtomic(path, val, "$set");
	}

	_push (path, val) {
		mpath.get(path, this._doc._doc).push(val);
		mpath.get(path, this._doc).push(val);
		this._doc._setAtomic(path, val, "$push");
	}

	/**
	 * Shift the currently selected Definition to the desired path
	 * @param {string} paths The mpath of the to-be selected Definition
	 * @param {boolean} absolute If set to true, the paths will be applied from the root schema
	 * @param {boolean} mutate If set to true, the current definition will be shifted
	 * @returns {Definition|null}
	 * @private
	 */
	_shiftSchema (paths, absolute, mutate = true) {
		let definition = this._definition;
		if (absolute) definition = this._doc._model._schema;

		const parsedArray = paths.split(".");
		parsedArray.forEach(path => {
			if (definition instanceof Schema) definition = definition._definitions.get(path);
			else if (definition && definition.type.key === "schema") definition = definition.type.schema._definitions.get(path);
			else definition = null;
		});

		if (mutate) this._definition = definition;
		return definition;
	}
};
