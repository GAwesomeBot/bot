const { Error } = require("../Internals/Errors/");
const { get } = require("snekfetch");

const CAT = `https://aws.random.cat/meow`;
const DOG = `https://random.dog/woof`;

module.exports = class RandomAnimals {
	constructor () {
		throw new Error("STATIC_CLASS", {}, this.constructor.name);
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

	static async dog () {
		let res;
		try {
			res = await get(DOG);
		} catch (err) {
			throw err;
		}
		if (res.raw.toString().includes(".mp4")) {
			return RandomAnimals.dog();
		} else {
			return `https://random.dog/${res.raw.toString()}`;
		}
	}
};
