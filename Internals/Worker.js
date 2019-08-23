/* eslint-disable callback-return */

const process = require("process");
global.logger = new (require("./Logger"))(`Shard ${Number(process.env.SHARDS)} Worker`);

require("../Modules/Utils/ObjectDefines")();

const { WorkerCommands: { MATHJS: MathJSCommands } } = require("./Constants");
const configJS = require("../Configurations/config.js");
const auth = require("../Configurations/auth.js");
const Emoji = require("../Modules/Emoji/Emoji");
const ExtensionManager = require("./Extensions");

const mathjs = require("mathjs");
const safeEval = mathjs.eval;

const math = mathjs.create(mathjs.all);

math.import({
	import: () => { throw new Error(`Function "import" is disabled inside calculations!`); },
	createUnit: () => { throw new Error(`Function "createUnit" is disabled inside calculations!`); },
	eval: () => { throw new Error(`Function "eval" is disabled inside calculations!`); },
	parse: () => { throw new Error(`Function "parse" is disabled inside calculations!`); },
	simplify: () => { throw new Error(`Function "simplify" is disabled inside calculations!`); },
	derivative: () => { throw new Error(`Function "derivative" is disabled inside calculations!`); },
}, { override: true });

const Process = require("process-as-promised");
const p = new Process();

const extensionManager = new ExtensionManager({
	database: configJS.database,
	shards: parseInt(process.env.SHARDS),
	totalShardCount: parseInt(process.env.SHARD_COUNT),
});

// #region Math
p.on("runMathCommand", (data, callback) => {
	logger.silly(`Received data from master shard for calculating...`, data);
	const retData = { error: null, result: null };
	switch (data.command) {
		case MathJSCommands.EVAL: {
			try {
				const result = safeEval(data.info);
				retData.result = `${result}`;
			} catch (err) {
				retData.error = `${err}`;
			}
			callback(retData);
			break;
		}
		case MathJSCommands.HELP: {
			try {
				const result = math.help(data.info);
				retData.result = `${result}`;
			} catch (err) {
				retData.error = err;
			}
			callback(retData);
			break;
		}
	}
	logger.silly(`Processed math equation and returned the results!`);
});
// #endregion Math

// #region Emoji
p.on("jumboEmoji", async ({ input }, callback) => {
	const { buffer, animated } = await Emoji(input);
	callback({ buffer: buffer.toString("base64"), animated });
});
// #endregion Emoji

// #region Extensions
p.on("runExtension", async (data, callback) => {
	if (!extensionManager.ready) return;

	const guild = extensionManager.guilds.get(data.guild);
	if (!guild) return callback(false);
	const channel = guild.channels.get(data.ch);
	if (!channel) return callback(false);
	const msg = await channel.messages.fetch(data.msg);
	if (!msg) return callback(false);
	msg.suffix = data.suffix;

	const serverDocument = await Servers.findOne(guild.id);
	if (!serverDocument) return callback(false);
	const extensionDocument = await Gallery.findOneByObjectID(data.ext);
	if (!extensionDocument) return callback(false);
	const versionDocument = await extensionDocument.versions.id(data.extv);
	if (!versionDocument) return callback(false);

	try {
		callback(await extensionManager.runExtension(extensionDocument, versionDocument, serverDocument, serverDocument.extensions.id(data.ext), { msg, guild }));
	} catch (err) {
		callback(false);
	}
});

process.on("unhandledRejection", err => {
	logger.debug(`An extension failed to handle a Promise rejection`, {}, err);
});

(async () => {
	await extensionManager.initialize();
	await extensionManager.login(auth.discord.clientToken);
	await p.send("ready", { shard: process.env.SHARDS });
})();
