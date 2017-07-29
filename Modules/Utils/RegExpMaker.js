module.exports = class RegExpMaker {
	constructor(array) {
		if (typeof array !== "string") {
			this.array = array;
		} else {
			this.array = array.split(" ");
		}
	}
	make(type = "g") {
		return new RegExp(`${this.array.join("|")}`, type);
	}
};
