const { Error: GABError } = require("../Internals/Errors");
const Schema = require("./Schema");

const mpath = require("mpath");

module.exports = class Query {
	/**
	 * An object with methods to interact with a Document
	 * @constructor
	 * @param {Document} doc The Document this Query object interacts with
	 */
	constructor (doc, path) {
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
		this.parsed = path || "";
		/**
		 * The current value being interacted with
		 * @type {Document.Object|Object}
		 */
		this._current = path ? mpath.get(path, this._doc._doc) : this._doc._doc;
		this._definition = this._doc._model.schema;
		if (path) this._shiftSchema(path, true, true);
	}

	/**
	 * Change the current selection to a property of said selected value
	 * @param {string} path The path of the property to select
	 * @returns {module.Query}
	 */
	prop (path) {
		try {
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
			throw new GABError("GADRIVER_ERROR", { err }, `Could not parse Query: ${err.message}`);
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
			throw new GABError("GADRIVER_ERROR", { err }, `Could not parse Query: ${err.message}`);
		}
	}

	/**
	 * Selects a subdocument of the current array or map by _id
	 * @param {string} path
	 * @param {string} id The _id value of the subdocument to select
	 * @returns {module.Query}
	 */
	id (path, id) {
		try {
			if (id !== undefined) this.prop(path);
			else id = path;

			if (!this._canId()) return this.prop(id);
			const index = this._definition.isMap ? id : this._findById(id);
			this.parsed += this._parseForString(index);
			this._current = index === null ? undefined : mpath.get(this.parsed, this._doc._doc);
			return this;
		} catch (err) {
			throw new GABError("GADRIVER_ERROR", { err }, `Could not parse Query: ${err.message}`);
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
				this._validate(definition, parsed, value);

				this._writeValue(parsed, definition.cast(value));
			} else {
				this._validate(this._definition, this.parsed, path, !this._definition.isArray || isNaN(this.parsed.substring(this.parsed.lastIndexOf(".") + 1)));

				this._writeValue(this.parsed, this._definition.cast(path));
			}
			return this;
		} catch (err) {
			if (err.constructor === Schema.ValidationError) throw err;
			throw new GABError("GADRIVER_ERROR", { err }, `Could not set atomics or parse Query: ${err.message}`);
		}
	}

	/**
	 * Gets a subdocument of the currently selected array by _id
	 * @param {string} id The _id value of the subdocument to get
	 * @returns {*}
	 */
	getById (id) {
		if (!this._canId()) return this.prop(id);
		return this.get("$0", [this._findById(id)]);
	}

	/**
	 * Pushes a value to the currently selected array or map
	 * @param {string|*} path The path of the array to be pushed to, or the value if the selected array should be used
	 * @param {*} value The value to be pushed to the currently selected array or map
	 * @returns {module.Query}
	 */
	push (path, value) {
		let parsedPath = this.parsed;
		let definition = this._definition;
		if (value === undefined) {
			value = path;
		} else {
			parsedPath = this.parsed + this._parseForString(path);
			definition = this._shiftSchema(path, false, false);
		}

		const targetObject = mpath.get(parsedPath, this._doc._doc);

		if (!this._canId(targetObject)) return this;

		if (definition.isMap && value && !value._id) throw new Schema.ValidationError({ type: "required", value: value._id, path: `${parsedPath}._id`, definition });

		if (value && (definition.isArray ? this._findById(value._id, targetObject) : targetObject[value._id])) {
			throw new Schema.ValidationError({ type: "duplicate", value: value._id, path: `${parsedPath}._id`, definition });
		}

		const obj = definition.type.key === "schema" ? definition.type.schema.build(value) : value;

		this._validate(definition, parsedPath, obj, false);

		if (definition.isMap) {
			const ID = obj._id;

			this._writeValue(`${parsedPath}${this._parseForString(ID, parsedPath)}`, obj);
		} else if (definition.isArray) {
			this._push(parsedPath, obj);
		}

		return this;
	}

	/**
	 * Pulls a value from an array or map
	 * @param {string} path
	 * @param {string|number|object} idOrObject
	 * @returns {module.Query}
	 */
	pull (path, idOrObject) {
		let parsedPath = this.parsed;
		let definition = this._definition;
		if (idOrObject === undefined) {
			idOrObject = path;
		} else {
			parsedPath = this.parsed + this._parseForString(path);
			definition = this._shiftSchema(path, false, false);
		}

		if (idOrObject === undefined || idOrObject === null) return this;

		const targetObject = mpath.get(parsedPath, this._doc._doc);

		if (!this._canId(targetObject)) return this;

		switch (definition.type.key) {
			case "string":
			case "number": {
				this._pullAll(parsedPath, idOrObject);
				break;
			}
			case "schema":
			case "object":
				if (idOrObject._id !== undefined) idOrObject = idOrObject._id;

				if (definition.isArray) {
					this._pull(parsedPath, idOrObject);
				} else if (definition.isMap) {
					this._unset(parsedPath + this._parseForString(String(idOrObject), parsedPath));
				}
				break;
			default:
				this._unset(parsedPath + this._parseForString(String(idOrObject), parsedPath));
		}

		return this;
	}

	/**
	 * Removes a value from the document
	 * @param {string} [path]
	 * @returns {module.Query}
	 */
	remove (path) {
		let parsedPath = this.parsed;
		if (path !== undefined) parsedPath = this.parsed + this._parseForString(path);

		const parent = mpath.get(parsedPath.substring(0, parsedPath.lastIndexOf(".")), this._doc._doc);
		if (path === undefined && Array.isArray(parent)) {
			this._pull(parsedPath.substring(0, parsedPath.lastIndexOf(".")), this.val._id);
		} else {
			this._unset(parsedPath);
		}

		return this;
	}

	/**
	 * Increments the value at the given path by a given amount
	 * @param {string|number} path
	 * @param {number} [amount]
	 * @returns {module.Query}
	 */
	inc (path, amount) {
		if (amount === undefined && typeof path === "string") amount = 1;
		if (path === undefined && amount === undefined) path = 1;

		if (amount !== undefined) {
			const parsed = this.parsed + this._parseForString(path);
			const value = mpath.get(parsed, this._doc) + amount;
			if (isNaN(value)) return this;

			const definition = this._shiftSchema(path, false, false);
			this._validate(definition, parsed, value);

			this._inc(parsed, amount);
		} else {
			const value = mpath.get(this.parsed, this._doc) + path;
			if (isNaN(value)) return this;

			this._validate(this._definition, this.parsed, value);

			this._inc(this.parsed, path);
		}
		return this;
	}

	get clone () {
		return new Query(this._doc, this.parsed);
	}

	/**
	 * The current raw value this Query has selected
	 * @returns {*}
	 * @readonly
	 */
	get val () {
		return this._current === undefined ? undefined : mpath.get(this.parsed, this._doc._doc);
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
		return obj && (Array.isArray(obj) || obj.constructor === Object);
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
	 * Internal function to write a value to a specified path
	 * @param {string} path The mpath string of the value to be set
	 * @param {*} val The value to be set
	 * @private
	 */
	_writeValue (path, val) {
		val = this._definition.cast ? this._definition.cast(val) : val;
		mpath.set(path, val, this._doc._doc);
		mpath.set(path, val, this._doc);
		this._doc._setAtomic(path, val, "$set");
	}

	/**
	 * Internal function to push a value to an array at the specified path
	 * @param {string} path The mpath string of the array the value is to be pushed to
	 * @param {*} val The value to push to the array
	 * @private
	 */
	_push (path, val) {
		val = this._definition.cast ? this._definition.cast(val) : val;
		mpath.get(path, this._doc._doc).push(val);
		this._doc._setAtomic(path, val, "$push");
	}

	/**
	 * Internal function to pull a value with a specified ID from an array at the specified path
	 * @param {string} path The mpath string of the array to pull the value from
	 * @param {string} id The ID of the value to pull from the array
	 * @private
	 */
	_pull (path, id) {
		const array = mpath.get(path, this._doc._doc);
		const indexOfID = array.findIndex(a => a._id === id);
		if (indexOfID === -1) return;
		array.splice(indexOfID, 1);
		this._doc._setAtomic(path, id, "$pull");
	}

	_pullAll (path, value) {
		const array = mpath.get(path, this._doc._doc);
		if (!Array.isArray(array)) return;
		const indexOfValue = array.indexOf(value);
		if (indexOfValue === -1) return;
		array.splice(indexOfValue, 1);
		this._doc._setAtomic(path, value, "$pullAll");
	}

	/**
	 * Internal function to remove a value from an object
	 * @param {string} path
	 * @private
	 */
	_unset (path) {
		const childPathSeparatorIndex = path.lastIndexOf(".");
		const parentPath = path.substring(0, childPathSeparatorIndex);
		const childPath = path.substring(childPathSeparatorIndex + 1);
		const parent = mpath.get(parentPath, this._doc._doc);
		if (Array.isArray(parent)) {
			parent.splice(childPath, 1);
			this._doc._setAtomic(path, "", "$unset");
		} else {
			delete parent[childPath];
			delete mpath.get(parentPath, this._doc)[childPath];
			this._doc._setAtomic(path, "", "$unset");
		}
	}

	/**
	 * Internal function to increment a value at the specified path
	 * @param {string} path
	 * @param {number} amount
	 * @private
	 */
	_inc (path, amount) {
		const value = mpath.get(path, this._doc._doc);
		mpath.set(path, value + amount, this._doc._doc);
		mpath.set(path, value + amount, this._doc._doc);
		this._doc._setAtomic(path, amount, "$inc");
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
		let outofscope = false;
		if (absolute) definition = this._doc._model.schema;

		const parsedArray = paths.split(".");
		parsedArray.forEach(path => {
			if (definition && definition.type && (definition.type.key === "object" || definition.type.key === "mixed")) {
				outofscope = true;
				return;
			}
			if (definition instanceof Schema) definition = definition._definitions.get(path);
			else if (definition && definition.type.key === "schema" && definition.type.schema._definitions.has(path)) definition = definition.type.schema._definitions.get(path);
			else if (!definition || (!definition.isMap && !definition.isArray)) definition = null;
		});

		if (mutate) this._definition = definition;
		if (outofscope) definition.outofscopeflag = true;
		return definition;
	}

	/**
	 * Validates a value against a given definition, prepares the ValidationError (if created) to be thrown, returns null otherwise
	 * @param {Definition} definition
	 * @param {string} path
	 * @param {*} value
	 * @param {boolean} [absolute=true]
	 * @returns {null}
	 * @private
	 */
	_validate (definition, path, value, absolute = true) {
		if (definition.outofscopeflag) return;
		const error = definition.validate(value, absolute);

		if (error && (!Array.isArray(error) || error.length)) {
			error.path = path;
			throw new Schema.ValidationError(error, this._doc);
		} else {
			return null;
		}
	}
};
