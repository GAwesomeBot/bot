const GetValue = require("./GetValue.js");

/* eslint-disable max-len */
module.exports = client => {
	const properties = 10;
	/**
	 * Removes null objects from an array
	 * @returns {Array} The array without the null objects
	 */
	Object.assign(Array.prototype, {
		spliceNullElements () {
			for (let i = 0; i < this.length; i++) {
				if (this[i] === null) {
					this.splice(i, 1);
					i--;
				}
			}
			return this;
		},
	});

	Object.assign(Array.prototype, {
		id (id) {
			return this.find(a => a._id === id || a.id === id);
		},
	});

	/**
	 * Trims all whitespaces from each element in the array
	 */
	Object.assign(Array.prototype, {
		trimAll () {
			const copy = [];
			for (const elem of this) {
				copy.push(typeof elem === "string" ? elem.trim() : elem);
			}
			return copy;
		},
		toLowerCaseAll () {
			const copy = [];
			for (const elem of this) {
				copy.push(typeof elem === "string" ? elem.toLowerCase() : elem);
			}
			return copy;
		},
	});

	/**
	 * Randomised output from an array
	 * @returns {*} Random output from the array
	 * @readonly
	 */
	Object.defineProperty(Array.prototype, "random", {
		get: function get () {
			return this[Math.floor(Math.random() * this.length)];
		},
	});

	/**
	 * Check if a string contains at least one element from an array
	 * @param {Array} arr The array containing the elements
	 * @param {Boolean} isCaseSensitive Should case sensitivity be ignored
	 * @returns {Object}
	 */
	Object.assign(String.prototype, {
		containsArray (arr, isCaseSensitive) {
			let selectedKeyword = -1, keywordIndex = -1;
			for (let i = 0; i < arr.length; i++) {
				if (isCaseSensitive && this.includes(arr[i])) {
					selectedKeyword = i;
					keywordIndex = this.indexOf(arr[i]);
					break;
				} else if (!isCaseSensitive && this.toLowerCase().includes(arr[i].toLowerCase())) {
					selectedKeyword = i;
					keywordIndex = this.toLowerCase().indexOf(arr[i].toLowerCase());
					break;
				}
			}
			return {
				selectedKeyword,
				keywordIndex,
			};
		},
	});

	/**
	 * Replaces every occurence of a string with a string
	 * @param {?String} target The string to look for
	 * @param {?String} replacement What should target get replaced with
	 * @returns {?String} The new string
	 */
	Object.assign(String.prototype, {
		replaceAll (target, replacement) {
			return this.replace(new RegExp(`${target}`, "g"), replacement);
		},
	});

	/**
	 * Chunks an array to the specified number, returning smaller arrays
	 * @param {Number} number The number of elements in the splitted arrays
	 * @returns {Array} The new array, with mini arrays in it, chunked at number elements per mini array
	 */
	Object.assign(Array.prototype, {
		chunk (number) {
			return Array.from(Array(Math.ceil(this.length / number)), (_, i) => this.slice(i * number, (i * number) + number));
		},
	});

	/**
	 * Escapes all possible RegExp variables from the string
	 * @returns {String} The escaped String
	 */
	Object.assign(String.prototype, {
		escapeRegex () {
			const matchOperators = /[|\\{}()[\]^$+*?.]/g;
			return this.replace(matchOperators, "\\$&");
		},
	});

	/**
	 * Formats a string based on the information given
	 * @param {String[]|Array|Object} arguments the arguments
	 * @example
	 * // You can add as many as you want
	 * "{0} {1}...".format(1, "strings", ...);
	 * @example
	 * // Or use arrays
	 * "{0} {1}...".format([1, "strings too!"]);
	 * @example
	 * // With an object
	 * "{var} {var with spaces}".format({ var: 123, "var with spaces": "this works too!" })
	 */
	String.prototype.format = function format () {
		let original = this.toString();
		if (!arguments.length) return original;
		// eslint-disable-next-line prefer-rest-params
		const type = typeof arguments[0], options = type === "string" || type === "number" ? Array.prototype.slice.call(arguments) : arguments[0];
		for (const text in options) original = original.replace(new RegExp(`\\{${text}\\}`, "gi"), options[text]);
		return original;
	};

	if (client) {
		/**
		 * Total count of users or guilds across all shards.
		 * @returns {Number}
		 */
		Object.defineProperty(client.guilds, "totalCount", {
			get: async function get () {
				return GetValue(client, "guilds.size", "int");
			},
		});

		Object.defineProperty(client.users, "totalCount", {
			get: async function get () {
				return GetValue(client, "users.size", "int");
			},
		});
	}

	logger.silly(`Loaded ${properties} Object.assigns.`);
};
