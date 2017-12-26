/* eslint-disable callback-return */

const winston = new (require("../../Modules/Console"))(`MathJS`);
const { ChildProcessCommands: { MATHJS: MathJSCommands } } = require("../Constants");

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
const process = require("process");

p.on("runCommand", (data, callback) => {
	winston.silly(`Received data from master shard...`, data);
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
	winston.silly(`My job is done! Goodnight Europe...!`);
	process.exit(0);
});
