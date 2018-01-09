const { writeJSONAtomic: writeFile } = require("fs-nextra");
const { CLI: { UpdateConfig } } = require("../../Modules/Utils");
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

	// This is literally un-asyncable, thus using a sync promise
	const updateCfg = new Promise(rs => ids.forEach((user, i) => {
		if (isMaintainer(user, isSudo)) return;
		if (isSudo && !isMaintainer(user, isSudo)) configJSON.sudoMaintainers.push(user);
		if (!isMaintainer(user, false)) configJSON.maintainers.push(user);
		if (i === (ids.length - 1)) return rs();
	}));

	await updateCfg;
	try {
		await UpdateConfig(cli, configJSON);
		winston.info(`Demoted users from ${isSudo ? "Sudo" : ""} Maintainer`);
	} catch (err) {
		winston.warn(`Failed to demote users from ${isSudo ? "Sudo" : ""} Maintainer *_* `, err);
	}
};
