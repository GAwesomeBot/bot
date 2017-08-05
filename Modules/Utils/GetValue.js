module.exports = (bot, val, merge, func) => {
	try {
		let code = `this.${val}`;
		if (func) {
			code = `${func}(this.${val})`;
		}
		return new Promise((resolve, reject) => {
			const listener = message => {
				if (!message || message._SEval !== code) return;
				process.removeListener("message", listener);
				if (!message._error) resolve(message._result); else reject(Util.makeError(message._error));
			};
			process.on("message", listener);

			process.send({ _SEval: code }, err => {
				if (err) {
					process.removeListener("message", listener);
					reject(err);
				}
			});
		}).then(res => {
			switch (merge) {
				case "int":
					return res.reduce((prev, value) => prev + value, 0);
				case "obj":
					return res.reduce((prev, value) => Object.assign(prev, value), {});
				case "arr":
					return res.reduce((prev, value) => prev.concat(value), []);
				case "map":
					return res.map(value => new Map(value));
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
