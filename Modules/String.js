const escapeChars = {
	lt: "<",
	gt: ">",
	quot: `"`,
	apos: "'",
	amp: "&",
};

const reversedEscapeChars = {};
for (const key in escapeChars) reversedEscapeChars[escapeChars[key]] = key;

class StringJS {
	constructor (string) {
		if (string != null) { // eslint-disable-line eqeqeq
			if (typeof string === "string") {
				this.s = string;
			} else {
				this.s = string.toString();
			}
		} else {
			this.s = string;
		}
		this.original = string;
	}

	get length () {
		if (this.s != null) { // eslint-disable-line eqeqeq
			return this.s.length;
		} else {
			return -1;
		}
	}

	between (left, right) {
		const { s } = this;
		const startPos = s.indexOf(left), endPos = s.indexOf(right, startPos + left.length);
		if (endPos === -1 && right !== null) {
			return new StringJS("");
		} else if (endPos === -1 && right === null) {
			return new StringJS(s.substring(startPos + left.length));
		} else {
			return new StringJS(s.slice(startPos + left.length, endPos));
		}
	}

	camelize () {
		const s = this.trim().s.replace(/(-|_|\s)+(.)?/g, (matchc, sep, c) => c ? c.toUpperCase() : "");
		return new StringJS(s);
	}

	capitalize () {
		return new StringJS(this.s.substr(0, 1).toUpperCase() + this.s.substring(1).toLowerCase());
	}

	charAt (index) {
		return this.s.charAt(index);
	}

	chompLeft (prefix) {
		let { s } = this;
		if (s.startsWith(prefix)) {
			s = s.slice(prefix.length);
			return new StringJS(s);
		} else {
			return this;
		}
	}

	chompRight (suffix) {
		if (this.endsWith(suffix)) {
			let { s } = this;
			s = s.slice(0, s.length - suffix.length);
			return new StringJS(s);
		} else {
			return this;
		}
	}

	collapseWhitespace () {
		const s = this.s.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "");
		return new StringJS(s);
	}

	contains (s) {
		return this.s.indexOf(s) > -1;
	}

	count (s) {
		let count = 0;
		let pos = this.s.indexOf(s);

		while (pos >= 0) {
			count += 1;
			pos = this.s.indexOf(s, pos + 1);
		}

		return count;
	}

	dasherize () {
		const s = this.trim().s.replace(/[_\s]+/g, "-").replace(/([A-Z])/g, "-$1").replace(/-+/g, "-")
			.toLowerCase();
		return new StringJS(s);
	}

	equalsIgnoredCase (string) {
		const { s } = this;
		return s.toLowerCase() === string.toLowerCase();
	}

	endsWith (...args) {
		const suffixes = Array.prototype.slice.call(args, 0);
		for (let i = 0; i < suffixes.length; i++) {
			const l = this.s.length - suffixes[i].length;
			if (l >= 0 && this.s.indexOf(suffixes[i], l) === l) return true;
		}
		return false;
	}

	escapeHTML () {
		return new StringJS(this.s.replace(/[&<>"']/g, m => `&${reversedEscapeChars[m]};`));
	}

	ensureLeft (prefix) {
		const { s } = this;
		if (s.startsWith(prefix)) {
			return this;
		} else {
			return new StringJS(`${prefix}${s}`);
		}
	}

	ensureRight (suffix) {
		const { s } = this;
		if (this.endsWith(suffix)) {
			return this;
		} else {
			return new StringJS(`${s}${suffix}`);
		}
	}

	humanize () {
		if (this.s === null || this.s === undefined) return new StringJS("");
		const s = this.underscore().replace(/_id$/, "").replace(/_/g, " ")
			.trim()
			.capitalize();
		return new StringJS(s);
	}

	isAlpha () {
		return !/[^a-z\xDF-\xFF]|^$/.test(this.s.toLowerCase());
	}

	isAlphaNumeric () {
		return !/[^0-9a-z\xDF-\xFF]/.test(this.s.toLowerCase());
	}

	isEmpty () {
		return this.s === null || this.s === undefined ? true : /^[\s\xa0]*$/.test(this.s);
	}

	isLower () {
		return this.isAlpha() && this.s.toLowerCase() === this.s;
	}

	isNumeric () {
		return !/[^0-9]/.test(this.s);
	}

	isUpper () {
		return this.isAlpha() && this.s.toUpperCase() === this.s;
	}

	left (N) {
		if (N >= 0) {
			const s = this.s.substr(0, N);
			return new StringJS(s);
		} else {
			return this.right(-N);
		}
	}

	lines () {
		return this.replaceAll("\r\n", "\n").s.split("\n");
	}

	replaceAll (string, replace) {
		const s = this.s.split(string).join(replace);
		return new StringJS(s);
	}

	strip (...args) {
		let string = this.s;
		for (let i = 0, n = args.length; i < n; i++) {
			string = string.split(args[i]).join("");
		}
		return new StringJS(string);
	}

	startsWith (...args) {
		const prefixes = Array.prototype.slice.call(args, 0);
		for (let i = 0; i < prefixes.length; ++i) {
			if (this.s.lastIndexOf(prefixes[i], 0) === 0) return true;
		}
		return false;
	}

	stripPunctuation () {
		return new StringJS(this.s.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " "));
	}

	times (n) {
		return new StringJS(new Array(n + 1).join(this.s));
	}

	titleCase () {
		let { s } = this;
		if (s) {
			s = s.replace(/(^[a-z]| [a-z]|-[a-z]|_[a-z])/g,	$1 => $1.toUpperCase());
		}
		return new StringJS(s);
	}

	toBoolean () {
		if (typeof this.orig === "string") {
			const s = this.s.toLowerCase();
			return s === "true" || s === "yes" || s === "on" || s === "1";
		} else {
			return this.orig === true || this.orig === 1;
		}
	}

	toFloat (precision) {
		const num = parseFloat(this.s);
		if (precision) return parseFloat(num.toFixed(precision));
		else return num;
	}

	toInt () {
		return /^\s*-?0x/i.test(this.s) ? parseInt(this.s, 16) : parseInt(this.s, 10);
	}

	trim () {
		const s = this.s.trim();
		return new StringJS(s);
	}

	trimLeft () {
		const s = this.s.trimLeft();
		return new StringJS(s);
	}

	trimRight () {
		const s = this.s.trimRight();
		return new StringJS(s);
	}

	toString () {
		return this.s;
	}

	underscore () {
		const s = this.trim().s.replace(/([a-z\d])([A-Z]+)/g, "$1_$2").replace(/([A-Z\d]+)([A-Z][a-z])/g, "$1_$2").replace(/[-\s]+/g, "_")
			.toLowerCase();
		return new StringJS(s);
	}

	valueOf () {
		return this.s.valueOf();
	}
}

module.exports = s => new StringJS(s);
