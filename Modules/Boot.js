const bootArgs = new Map();

const build = () => {
	winston.warn("Travis build launched. Process will exit after successfully starting.");
};

const migrate = () => require("./Migration.js")();

const db = configJS => {
	if (!process.argv[process.argv.indexOf("--db") + 1]) {
		winston.warn(`Argument --db requires a parameter.`);
		return;
	}
	configJS.databaseURL = process.argv[process.argv.indexOf("--db") + 1];
};

const token = (configJS, configJSON, auth) => {
	if (!process.argv[process.argv.indexOf("--token") + 1]) {
		winston.warn(`Argument --token requires a parameter.`);
		return;
	}
	auth.discord.clientToken = process.argv[process.argv.indexOf("--token") + 1];
};

const sudo = (configJS, configJSON, auth, user) => {
	const writeFile = require("write-file-atomic");
	if (!process.argv[process.argv.indexOf("--sudo") + 1] || process.argv[process.argv.indexOf("--sudo") + 1].startsWith("-")) {
		winston.warn(`Argument --sudo requires a parameter.`);
		return;
	}
	if (configJSON.sudoMaintainers.includes(user ? user : process.argv[process.argv.indexOf("--sudo") + 1])) return;
	configJSON.sudoMaintainers.push(user ? user : process.argv[process.argv.indexOf("--sudo") + 1]);
	configJSON.maintainers.push(user ? user : process.argv[process.argv.indexOf("--sudo") + 1]);
	writeFile(`${__dirname}/../Configurations/config.json`, JSON.stringify(configJSON, null, 4), err => {
		if (err) winston.warn(`Failed to promote user with ID ${user ? user : process.argv[process.argv.indexOf("--sudo") + 1]} to Sudo Maintainer *_* `, err);
		else winston.info(`Promoted user with ID ${user ? user : process.argv[process.argv.indexOf("--sudo") + 1]} to Sudo Maintainer`);
	});
};

const host = (configJS, configJSON, auth, user) => {
	if (!process.argv[process.argv.indexOf("--host") + 1] || process.argv[process.argv.indexOf("--host") + 1].startsWith("-")) {
		winston.warn(`Argument --host requires a parameter.`);
		return;
	}

	process.env.GAB_HOST = user ? user : process.argv[process.argv.indexOf("--host") + 1];
	sudo(configJS, configJSON, auth, user ? user : process.argv[process.argv.indexOf("--host") + 1]);
	winston.info(`User with Discord ID ${user ? user : process.argv[process.argv.indexOf("--host") + 1]} is The Host for the current GAB session.`);
};

bootArgs.set("--build", build);
bootArgs.set("-b", "--build");
bootArgs.set("--migrate", migrate);
bootArgs.set("-m", "--migrate");
bootArgs.set("--db", db);
bootArgs.set("--token", token);
bootArgs.set("--sudo", sudo);
bootArgs.set("--host", host);

module.exports = bootArgs;
