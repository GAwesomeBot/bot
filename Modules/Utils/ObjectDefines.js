const Discord = require("discord.js");

module.exports = bot => {
	const properties = 8;
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
		},
	});

	/**
	 * Randomised output from an array
	 * @returns {*} Random output from the array
	 */
	Object.assign(Array.prototype, {
		random () {
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
	 * Gets the "default channel" for the guild
	 * @returns {?TextChannel}
	 */
	Object.defineProperty(Discord.Guild.prototype, "defaultChannel", {
		get: function get () {
			if (this.channels.filter(c => c.type === 0).length === 0) return null;
			const defaultChannel = this.channels.filter(c => c.type === 0 && c.permissionsFor(this.me).has("READ_MESSAGES")).sort((a, b) => a.position - b.position)[0];
			if (!defaultChannel) return null;
			return this.channels.get(defaultChannel.id);
		},
	});

	/**
	 * 
	 */

	winston.debug(`Loaded ${properties} Object.assigns`);
};
