const { tokens: { openExchangeRatesKey } } = require("../Configurations/auth");
const fsn = require("fs-nextra");
const request = require("snekfetch");

const convertUnits = require("convert-units");
const money = require("money");

class ConversionHandler {
	constructor (client) {
		this.client = client;

		this.canConvertMoney = false;
		this.moneyTimer = null;
		this.lastUpdated = null;

		this.init();
	}

	async init () {
		if (await fsn.stat("./Temp/currency.json")) {
			const res = await fsn.readJSON("./Temp/currency.json", { encoding: "utf8" });
			money.rates = res.rates;
			money.base = res.base;
			this.lastUpdated = res.date;
			this.canConvertMoney = true;
			if (openExchangeRatesKey) this.initTimer();
		} else if (openExchangeRatesKey) {
			try {
				let res = await request.get(`https://openexchangerates.org/api/latest.json?app_id=${openExchangeRatesKey}&prettyprint=false&show_alternative=false`);
				if (res.body && res.body.rates && res.body.base) {
					money.rates = res.body.rates;
					money.base = res.body.base;
					this.lastUpdated = Date.now();
					await fsn.writeJSON("./Temp/currency.json", { rates: res.body.rates, base: res.body.base, date: `${this.lastUpdated}` });
				} else {
					throw new Error();
				}
				this.initTimer();
			} catch (_) {
				clearInterval(this.moneyTimer);
				this.moneyTimer = null;
				this.canConvertMoney = false;
			}
		}
	}

	initTimer () {
		this.moneyTimer = this.client.setInterval(async () => {
			try {
				let res = await request.get(`https://openexchangerates.org/api/latest.json?app_id=${openExchangeRatesKey}&prettyprint=false&show_alternative=false`);
				if (res.body && res.body.rates && res.body.base) {
					money.rates = res.body.rates;
					money.base = res.body.base;
					this.lastUpdated = Date.now();
					await fsn.writeJSON("./Temp/currency.json", { rates: res.body.rates, base: res.body.base, date: `${this.lastUpdated}` });
				} else {
					clearInterval(this.moneyTimer);
					this.moneyTimer = null;
					this.canConvertMoney = false;
					this.lastUpdated = null;
				}
			} catch (_) {
				clearInterval(this.moneyTimer);
				this.moneyTimer = null;
				this.canConvertMoney = false;
			}
		}, 3600000);
	}

	destroy () {
		this.client.clearInterval(this.moneyTimer);
		this.canConvertMoney = false;
		this.lastUpdated = null;
	}

	async convert ({ from, to, content } = {}) {
		let retData = { error: null, result: null, type: null };
		try {
			const converted = Math.round(convertUnits(content).from(from).to(to) * 1000) / 1000;
			retData.result = converted;
			retData.type = "unit";
		} catch (e1) {
			if (this.canConvertMoney) {
				try {
					const converted2 = money(content).from(from.toUpperCase()).to(to.toUpperCase());
					retData.result = converted2;
					retData.type = "money";
				} catch (e2) {
					retData.error = "FAILED_TO_CONVERT_CURRENCY_OR_UNITS";
				}
			} else {
				retData.error = "FAILED_TO_CONVERT_UNITS";
			}
		}
		if (retData.error) throw retData.error;
		else return retData;
	}
}

module.exports = ConversionHandler;
