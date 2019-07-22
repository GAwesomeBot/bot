const { Error } = require("../../Internals/Errors/");

module.exports = class Parser {
	constructor () {
		throw new Error("STATIC_CLASS", {}, this.constructor.name);
	}

	/**
	 * Parses arguments and quoted arguments
	 * Heavily inspired from Klasa
	 * @param {String} content The message suffix
	 */
	static parseQuoteArgs (content, delim = " ") {
		if (delim === "") return [content];

		const args = [];
		let current = "";
		let open = false;

		for (let i = 0; i < content.length; i++) {
			if (!open && content.slice(i, i + delim.length) === delim) {
				if (current !== "") args.push(current);
				current = "";
				i += delim.length - 1;
				continue;
			}
			if (content[i] === '"' && content[i - 1] !== "\\") {
				open = !open;
				if (current !== "") args.push(current);
				current = "";
				continue;
			}
			current += content[i];
		}
		if (current !== "") args.push(current);

		return args.length === 1 && args[0] === "" ? [] : args.filter(a => a !== delim && a !== " ");
	}
};
