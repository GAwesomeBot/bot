const { writeJSONAtomic: writeFile } = require("fs-nextra");
const { CLI: { UpdateConfig } } = require("../../Modules/Utils");
const configJSON = require("../../Configurations/config.json");

module.exports = async ({ cli }, cmdData, args) => {
	args = args.trim();
	const [action, ...ids] = args.toLowerCase().split(" ");
	if (action !== "add" || action !== "remove") {
		winston.warn("Invalid action.");
		return;
	}
	let isSudo = false;
	if (ids[0].toLowerCase() === "sudo") {
		isSudo = true;
		ids.shift();
	}

	if (!ids.length) {
		winston.warn(`I need the IDs of the maintainers.`);
		return;
	}
	const isMaintainer = (user, sudo) => sudo ? configJSON.sudoMaintainers.includes(user) : configJSON.maintainers.includes(user);
	const getMaintainerObject = sudo => sudo ? configJSON.sudoMaintainers : configJSON.maintainers;
	const add = (user, sudo) => {
		getMaintainerObject(sudo).push(user);
	};
	const remove = (user, sudo) => {
		getMaintainerObject(sudo).splice(getMaintainerObject(sudo).indexOf(user), 1);
	};
	const updateCfg = new Promise(rs => ids.forEach((user, i) => {
		if (action === "add") {
			if (isMaintainer(user, isSudo)) {
				winston.warn(`${user} is a maintainer already.`);
				return;
			}
			if (isSudo && !isMaintainer(user, isSudo)) add(user, isSudo);
			if (!isMaintainer(user, false)) add(user, false);
		} else if (action === "remove") {
			if (!isMaintainer(user, isSudo)) {
				winston.warn(`${user} is not a maintainer.`);
				return;
			}
			if (isSudo && isMaintainer(user, isSudo)) remove(user, isSudo);
			if (isMaintainer(user, false)) remove(user, false);
		}
		if (i === (ids.length - 1)) return rs();
	}));

	await updateCfg;
	try {
		await UpdateConfig(cli, configJSON);
		winston.info(`${action === "add" ? "Promoted" : "Demoted"} users to/from ${isSudo ? "Sudo" : ""} Maintainer`);
	} catch (err) {
		winston.warn(`Failed to ${action === "add" ? "promote" : "demote"} users to/from ${isSudo ? "Sudo" : ""} Maintainer *_* `, err);
	}
};
