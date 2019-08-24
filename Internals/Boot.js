// Optional Boot Functions

const bootFunctions = new Map();
const shardBootFunctions = new Map();

const build = () => {
	logger.warn("Travis build launched. Process will exit after successfully starting.");
};

const migrate = async (val, configJS, configJSON, auth, scope) => {
	scope.migrating = true;
	await require("../Modules/Migration.js")();
};

const db = (val, configJS) => {
	if (typeof val !== "string") {
		logger.error(`Argument --db requires a parameter.`);
		return;
	}
	const [url, dbname] = val.split(db.lastIndexOf("/"));
	configJS.database.URL = url;
	configJS.database.db = dbname;
};

const token = (val, configJS, configJSON, auth) => {
	if (typeof val !== "string") {
		logger.error(`Argument --token requires a parameter.`);
		return;
	}
	auth.discord.clientToken = val;
};

const sudo = (val, configJS, configJSON) => {
	const { writeJSONAtomic } = require("fs-nextra");
	if (typeof val !== "string" && typeof val !== "number") {
		logger.error(`Argument --sudo requires a parameter.`);
		return;
	}
	if (typeof val !== "string") val = val.toString();
	if (configJSON.sudoMaintainers.includes(val)) return;
	configJSON.sudoMaintainers.push(val);
	configJSON.maintainers.push(val);
	writeJSONAtomic(`${__dirname}/../Configurations/config.json`, configJSON, { spaces: 2 })
		.then(() => logger.info(`Promoted user with ID ${val} to Sudo Maintainer.`, { usrid: val }))
		.catch(err => logger.error(`Failed to promote user with ID ${val} to Sudo Maintainer.`, { usrid: val }, err));
};

const host = (val, configJS, configJSON) => {
	if (typeof val !== "string" && typeof val !== "number") {
		logger.error(`Argument --host requires a parameter.`);
		return;
	}
	if (typeof val !== "string") val = val.toString();

	process.env.GAB_HOST = val;
	sudo(val, configJS, configJSON);
	logger.info(`User with Discord ID ${val} is The Host for the current GAB session.`, { usrid: val });
};

const safeModeAnnouncement = (val, configJS, configJSON, auth, scope) => {
	logger.warn("--- SAFE --- GAwesomeBot is now in SAFE MODE. --- SAFE ---");
	scope.safeMode = true;
};

const safeMode = async (val, configJS, configJSON, auth, scope) => {
	// In Safe Mode, only GawesomeBot Internals are loaded to avoid errors and exceptions.
	// Because WebServer is not loaded, the primary way to interact with GAwesomeBot is through hooking into the Node.JS runtime with for example the Chrome Debugger.
	logger.warn("--- SAFE --- Connecting to Database --- SAFE ---");
	const database = require("../Database/Driver.js");
	await database.initialize(configJS.database).catch(err => {
		logger.error("--- SAFE --- Connection to Database failed --- SAFE ---", err);
	}).then(() => {
		logger.info("--- SAFE --- Successfully connected to Database --- SAFE ---");
	});

	scope.safeMode = true;
};

const noMessages = (val, configJS, configJSON, auth, scope) => {
	scope.disabledEvents.push("MESSAGE_CREATE");
};

bootFunctions.set("build", build);
bootFunctions.set("b", "build");
shardBootFunctions.set("build", noMessages);
shardBootFunctions.set("b", "build");

shardBootFunctions.set("nm", noMessages);

bootFunctions.set("migrate", migrate);
bootFunctions.set("m", "migrate");

bootFunctions.set("db", db);
bootFunctions.set("token", token);
bootFunctions.set("sudo", sudo);
bootFunctions.set("host", host);

bootFunctions.set("safe", safeModeAnnouncement);
shardBootFunctions.set("safe", safeMode);

// Mandatory Boot Functions

const initializeConsole = () => {
	const { Logger } = require("../Internals");
	global.logger = new Logger("master");
	logger.info(`Logging to ${require("path").join(process.cwd(), `logs/master-gawesomebot.log`)}.`);
};

const initializeShardConsole = () => {
	const { Logger } = require("../Internals");
	global.logger = new Logger(`Shard ${process.env.SHARDS}`);
};

const { StructureExtender } = require("../Modules/Utils");

const setMaxListeners = () => process.setMaxListeners(0);

// Boot Module Functions
const { Gag } = require("../Modules/Utils");
const { isMaster } = require("cluster");

const Boot = async (configs, scope) => {
	// Run pre Boot Stack functions
	await Boot.runPreStack();
	// Prepare Boot Stack
	Boot.populateStack();
	// Run Boot Stack
	await Boot.runStack(configs, scope);
};

Boot.preStack = [initializeConsole];
Boot.preShardStack = [initializeShardConsole];

Boot.runPreStack = async () => {
	await Promise.all(Boot[isMaster ? "preStack" : "preShardStack"].map(func => func()));
};

Boot.bootStack = [{ func: setMaxListeners, val: null }];
if (!isMaster) Boot.bootStack.push({ func: StructureExtender });

Boot.populateStack = () => {
	const parsedArgs = Gag(process.argv.slice(2));

	const functions = isMaster ? bootFunctions : shardBootFunctions;

	Object.keys(parsedArgs).forEach(arg => {
		let func;
		if (functions.has(arg)) func = functions.get(arg);
		if (typeof func === "string") func = functions.get(func);
		if (func) Boot.bootStack.push({ func, val: parsedArgs[arg] });
	});
};

Boot.runStack = async ({ configJS, configJSON, auth }, scope) => {
	await Promise.all(Boot.bootStack.map(stackItem => stackItem.func(stackItem.val, configJS, configJSON, auth, scope)));
};

module.exports = Boot;
