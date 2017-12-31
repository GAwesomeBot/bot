const writeFile = require("write-file-atomic");
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
		if (sudo === true) {
			return configJSON.sudoMaintainers.includes(user);
		} else {
			return configJSON.maintainers.includes(user);
		}
	}
	ids.forEach(user => {
		if (isMaintainer(user, isSudo)) return;
		if (isSudo === true && !isMaintainer(user, isSudo)) configJSON.sudoMaintainers.push(user);
		if (!isMaintainer(user, false)) configJSON.maintainers.push(user);
		writeFile(`${__dirname}/../../Configurations/config.json`, JSON.stringify(configJSON, null, 4), err => {
			if (err) winston.warn(`Failed to promote user with ID ${user} to ${isSudo ? "Sudo" : ""} Maintainer *_* `, err);
			else winston.info(`Promoted user with ID ${user} to ${isSudo ? "Sudo" : ""} Maintainer`);
		});
	});
};
