/* eslint-disable callback-return, spaced-comment */

const process = require("process");
global.winston = new (require("../Modules/Console"))(`Worker -- Shard ${Number(process.env.SHARD_ID)}`);

const { WorkerCommands: { MATHJS: MathJSCommands } } = require("./Constants");
const { tokens: { openExchangeRatesKey } } = require("../Configurations/auth");

const request = require("snekfetch");
const fs = require("fs");
const fsn = require("fs-nextra");

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

const convertUnits = require("convert-units");
const money = require("money");
let moneyTimer = null;
let canConvertMoney = false;

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

//#region CurrencyConversion
p.on("convertData", (d, callback) => {
	winston.silly(`Received data from master for converting...`, d);
	let retData = { error: null, result: null, type: null };
	const { content, to: convertTo, from: convertFrom } = d;
	try {
		const converted = Math.round(convertUnits(content).from(convertFrom).to(convertTo) * 1000) / 1000;
		retData.result = converted;
		retData.type = "unit";
	} catch (e1) {
		if (canConvertMoney) {
			try {
				const converted2 = money(content).from(convertFrom.toUpperCase()).to(convertTo.toUpperCase());
				retData.result = converted2;
				retData.type = "money";
			} catch (e2) {
				retData.error = "FAILED_TO_CONVERT_CURRENCY_OR_UNITS";
			}
		} else {
			retData.error = "FAILED_TO_CONVERT_UNITS";
		}
	}
	winston.silly(`Processed conversion and returned the results!`, retData);
	return callback(retData);
});
//#endregion CurrencyConversion

if (openExchangeRatesKey) {
	let f;
	try {
		f = fs.statSync("./Temp/currency.json");
	} catch (_) {
		f = null;
	}
	if (f) {
		const res = JSON.parse(fs.readFileSync("./Temp/currency.json", "utf8"));
		money.rates = res.rates;
		money.base = res.base;
		moneyTimer = setInterval(async () => {
			try {
				let newRes = await request.get(`https://openexchangerates.org/api/latest.json?app_id=${openExchangeRatesKey}&prettyprint=false&show_alternative=false`);
				if (newRes.body && newRes.body.rates && newRes.body.base) {
					money.rates = res.body.rates;
					money.base = res.body.base;
					await fsn.writeJSON("./Temp/currency.json", { rates: res.body.rates, base: res.body.base });
				} else {
					clearInterval(moneyTimer);
					moneyTimer = null;
					canConvertMoney = false;
				}
			} catch (_) {
				clearInterval(moneyTimer);
				moneyTimer = null;
				canConvertMoney = false;
			}
		}, 3600000);
		canConvertMoney = true;
	} else {
		request.get(`https://openexchangerates.org/api/latest.json?app_id=${openExchangeRatesKey}&prettyprint=false&show_alternative=false`)
		.then(async res => {
			if (res && res.body && res.body.rates && res.body.base) {
				money.rates = res.body.rates;
				money.base = res.body.base;
				await fsn.writeJSON("./Temp/currency.json", { rates: res.body.rates, base: res.body.base });
				moneyTimer = setInterval(async () => {
					try {
						let newRes = await request.get(`https://openexchangerates.org/api/latest.json?app_id=${openExchangeRatesKey}&prettyprint=false&show_alternative=false`);
						if (newRes.body && newRes.body.rates && newRes.body.base) {
							money.rates = res.body.rates;
							money.base = res.body.base;
							await fsn.writeJSON("./Temp/currency.json", { rates: res.body.rates, base: res.body.base });
						} else {
							clearInterval(moneyTimer);
							moneyTimer = null;
							canConvertMoney = false;
						}
					} catch (_) {
						clearInterval(moneyTimer);
						moneyTimer = null;
						canConvertMoney = false;
					}
				}, 3600000);
				canConvertMoney = true;
			} else {
				throw new Error();
			}
		})
		.catch(() => {
			moneyTimer = null;
			canConvertMoney = false;
		});
	}
}

(async () => {
	await p.send("ready", { shard: process.env.SHARD_ID });
})();
