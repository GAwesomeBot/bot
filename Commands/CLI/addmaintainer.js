const { writeJSONAtomic: writeFile } = require("fs-nextra");
const configJSON = require("../../Configurations/config.json");

module.exports = async ({ cli }, cmdData, args) => {
	args = args.trim();
	const ids = args.split(" ");
	let isSudo = false;
	if (ids[0].toLowerCase() === "sudo") {
		isSudo = true;
		ids.shift();
	}
	// Modules/Boot.js sudo function but made for the CLI

	if (ids.length === 0) {
		winston.warn(`I need the IDs of the maintainers.`);
		return;
	}
	function isMaintainer (user, sudo) {
		if (sudo) {
			return configJSON.sudoMaintainers.includes(user);
		} else {
			return configJSON.maintainers.includes(user);
		}
	}
	ids.forEach(user => {
		if (isMaintainer(user, isSudo)) return;
		if (isSudo && !isMaintainer(user, isSudo)) configJSON.sudoMaintainers.push(user);
		if (!isMaintainer(user, false)) configJSON.maintainers.push(user);
		writeFile(`${__dirname}/../../Configurations/config.json`, configJSON, {
			spaces: 4,
		}).then(() => {
			winston.info(`Promoted user with ID ${user} to ${isSudo ? "Sudo" : ""} Maintainer`);
			cli.sharder.broadcast("updateConfigJSON").then(arr => {
				arr.map(({ error }, index) => ({
					message: `${error ? `Couldn't update` : `Updated`} the config.json file on shard ${index}`,
					error,
				})).forEach(({ error, message }) => {
					winston[error ? "error" : "info"](message);
				});
			});
		}).catch(err => {
			winston.warn(`Failed to promote user with ID ${user} to ${isSudo ? "Sudo" : ""} Maintainer *_* `, err);
		});
	});
};
