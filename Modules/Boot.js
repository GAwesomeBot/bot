const bootArgs = new Map();

const build = () => {
	winston.warn("Travis build launched. Process will exit after successfully starting.");
};

const migrate = () => require("./Migration.js")();

const db = configJS => {
	if (!process.argv[process.argv.indexOf("--db") + 1]) {
		winston.warn(`Argument --sudo requires a parameter.`);
		return;
	}
	configJS.databaseURL = process.argv[process.argv.indexOf("--db") + 1];
};

const token = (configJS, configJSON, auth) => {
	if (!process.argv[process.argv.indexOf("--token") + 1]) {
		winston.warn(`Argument --sudo requires a parameter.`);
		return;
	}
	auth.discord.clientToken = process.argv[process.argv.indexOf("--token") + 1];
};

const sudo = (configJS, configJSON) => {
	const writeFile = require("write-file-atomic");
	if (!process.argv[process.argv.indexOf("--sudo") + 1]) {
		winston.warn(`Argument --sudo requires a parameter.`);
		return;
	}
	configJSON.sudoMaintainers.push(process.argv[process.argv.indexOf("--sudo") + 1]);
	configJSON.maintainers.push(process.argv[process.argv.indexOf("--sudo") + 1]);
	writeFile(`${__dirname}/../Configurations/config.json`, JSON.stringify(configJSON, null, 4), err => {
		if (err) winston.warn(`Failed to promote user with ID ${process.argv[process.argv.indexOf("--sudo") + 1]} to Sudo Maintainer *_* `, err);
		else winston.info(`Promoted user with ID ${process.argv[process.argv.indexOf("--sudo") + 1]} to Sudo Maintainer`);
	});
};

bootArgs.set("--build", build);
bootArgs.set("-b", "--build");
bootArgs.set("--migrate", migrate);
bootArgs.set("-m", "--migrate");
bootArgs.set("--db", db);
bootArgs.set("--token", token);
bootArgs.set("--sudo", sudo);

module.exports = bootArgs;
