const bootArgs = new Map();

const build = () => {
	winston.warn("Travis build launched. Process will exit after successfully starting.");
};

const migrate = () => require("./Migration.js")();

const db = (val, configJS) => {
	if (typeof val !== "string") {
		winston.warn(`Argument --db requires a parameter.`);
		return;
	}
	configJS.databaseURL = val;
};

const token = (val, configJS, configJSON, auth) => {
	if (typeof val !== "string" && typeof val !== "number") {
		winston.warn(`Argument --token requires a parameter.`);
		return;
	}
	auth.discord.clientToken = val;
};

const sudo = (val, configJS, configJSON) => {
	const { writeJSONAtomic } = require("fs-nextra");
	if (typeof val !== "string" && typeof val !== "number") {
		winston.warn(`Argument --sudo requires a parameter.`);
		return;
	}
	if (typeof val !== "string") val = val.toString();
	if (configJSON.sudoMaintainers.includes(val)) return;
	configJSON.sudoMaintainers.push(val);
	configJSON.maintainers.push(val);
	writeJSONAtomic(`${__dirname}/../Configurations/config.json`, configJSON, { spaces: 2 })
		.then(() => winston.info(`Promoted user with ID ${val} to Sudo Maintainer`))
		.catch(err => winston.warn(`Failed to promote user with ID ${val} to Sudo Maintainer *_* `, { err }));
};

const host = (val, configJS, configJSON) => {
	if (typeof val !== "string" && typeof val !== "number") {
		winston.warn(`Argument --host requires a parameter.`);
		return;
	}
	if (typeof val !== "string") val = val.toString();

	process.env.GAB_HOST = val;
	sudo(val, configJS, configJSON);
	winston.info(`User with Discord ID ${val} is The Host for the current GAB session.`);
};

bootArgs.set("build", build);
bootArgs.set("b", "build");
bootArgs.set("migrate", migrate);
bootArgs.set("m", "migrate");
bootArgs.set("db", db);
bootArgs.set("token", token);
bootArgs.set("sudo", sudo);
bootArgs.set("host", host);

module.exports = bootArgs;
