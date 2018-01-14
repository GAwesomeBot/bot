/* eslint-disable callback-return, spaced-comment */

const process = require("process");
global.winston = new (require("../Modules/Console"))(`Worker -- Shard ${Number(process.env.SHARD_ID)}`);

const { WorkerCommands: { MATHJS: MathJSCommands } } = require("./Constants");

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

//#region Math
p.on("runMathCommand", (data, callback) => {
	winston.silly(`Received data from master shard for calculating...`, data);
	let retData = { error: null, result: null };
	switch (data.command) {
		case MathJSCommands.EVAL: {
			try {
				let result = safeEval(data.info);
				retData.result = `${result}`;
			} catch (err) {
				retData.error = `${err}`;
			}
			callback(retData);
			break;
		}
		case MathJSCommands.HELP: {
			try {
				let result = mathjs.help(data.info);
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
//#endregion Math

//#region Users
p.on("ensureUsers", async (d, callback) => {
	const { users } = d;
	const ret = { users: 0 };
	users.forEach(async user => {
		try {
			let find = await Users.findOne({ _id: user });
			if (!find) {
				await Users.create(new Users({ _id: user }));
				ret.users++;
			}
		} catch (_) {
			// 3 bad
		}
	});
	callback(ret);
});
//#endregion Users

(async () => {
	await p.send("ready", { shard: process.env.SHARD_ID });
})();
