module.exports = class RegExpMaker {
	constructor (array) {
		if (typeof array !== "string") {
			this.array = array;
		} else {
			this.array = array.split(" ");
		}
	}
	make (type = "g") {
		for (let i = 0; i < this.array.length; i++) {
			if (this.array[i] === "") {
				this.array.splice(i, 1);
				i--;
			} else if (this.array[i] !== "") {
				this.array[i] = this.array[i].escapeRegex();
			}
		}
		return new RegExp(`${this.array.join("|")}`, type);
	}
};
