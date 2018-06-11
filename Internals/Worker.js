/* eslint-disable callback-return */

const process = require("process");
global.winston = new (require("../Internals/Console"))(`Worker -- Shard ${Number(process.env.SHARD_ID)}`);

const { WorkerCommands: { MATHJS: MathJSCommands } } = require("./Constants");
const Emoji = require("../Modules/Emoji/Emoji");

const mathjs = require("mathjs");
const safeEval = mathjs.eval;

mathjs.import({
	import: () => { throw new Error(`Function "import" is disabled inside calculations!`); },
	createUnit: () => { throw new Error(`Function "createUnit" is disabled inside calculations!`); },
	eval: () => { throw new Error(`Function "eval" is disabled inside calculations!`); },
	parse: () => { throw new Error(`Function "parse" is disabled inside calculations!`); },
	simplify: () => { throw new Error(`Function "simplify" is disabled inside calculations!`); },
	derivative: () => { throw new Error(`Function "derivative" is disabled inside calculations!`); },
}, { override: true });

const Process = require("process-as-promised");
const p = new Process();

// #region Math
p.on("runMathCommand", (data, callback) => {
	winston.silly(`Received data from master shard for calculating...`, data);
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
				const result = mathjs.help(data.info);
				retData.result = `${result}`;
			} catch (err) {
				retData.error = err;
			}
			callback(retData);
			break;
		}
	}
	winston.silly(`Processed math equation and returned the results!`);
});
// #endregion Math

// #region Emoji
p.on("jumboEmoji", async ({ input }, callback) => {
	const { buffer, animated } = await Emoji(input);
	callback({ buffer: buffer.toString("base64"), animated });
});
// #endregion Emoji

(async () => {
	await p.send("ready", { shard: process.env.SHARD_ID });
})();
