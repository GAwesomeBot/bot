const Discord = require("discord.js");
const ProcessAsPromised = require("process-as-promised");
const IPC = new ProcessAsPromised();

module.exports = (bot, val, merge, func) => {
	try {
		let code = `this.${val}`;
		if (func) {
			code = `${func}(this.${val})`;
		}
		return new Promise((resolve, reject) => {
			IPC.send("eval", code).then(msg => {
				resolve(msg);
			}).catch(err => reject(err));
		}).then(res => {
			switch (merge) {
				case "int":
					return res.reduce((prev, value) => prev + value, 0);
				case "obj":
					return res.reduce((prev, value) => Object.assign(prev, value), {});
				case "arr":
					return res.reduce((prev, value) => prev.concat(value), []);
				case "map": {
					let ress = res.map(value => new Discord.Collection(value));
					return ress.reduce((prev, value) => prev.concat(value), new Discord.Collection());
				}
				default:
					return res;
			}
		}).catch(err => {
			winston.warn("An error occurred while fetching shard data! u.u\n", err);
		});
	} catch (err) {
		winston.warn("An error occurred while fetching shard data! u.u\n", err);
	}
};
