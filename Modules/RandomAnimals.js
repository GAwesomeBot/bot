const { Error } = require("../Internals/Errors/");
const { get } = require("snekfetch");

const CAT = `https://random.cat/meow`;
const DOG = `https://random.dom/woof`;

module.exports = class RandomAnimals {
	constructor () {
		throw new Error("STATIC_CLASS", this.constructor.name);
	}

	static async cat () {
		let res;
		try {
			res = await get(CAT);
		} catch (err) {
			throw err;
		}
		return res.body.file;
	}
};
