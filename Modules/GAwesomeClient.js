/* eslint-disable no-unused-vars */
const specVersion = "1.0";

const dgr = require("async-dl-github-repo");
const fs = require("fs-nextra");
const snekfetch = require("snekfetch");
const { Console, Constants, Errors: { Error: GABError } } = require("../Internals");

const validateSpecVersion = body => {
	const upstreamVersion = body.apiVersion;
	if (!upstreamVersion) return specVersion;
	const majorVersion = specVersion.split(".")[0];
	const majorUpstreamVersion = upstreamVersion.split(".")[0];
	if (majorVersion !== majorUpstreamVersion) throw GABError("OUTDATED_CENTRAL_SPEC_VERSION");
	else return upstreamVersion;
};

class GAwesomeClient {
	constructor (botClient) {
		this.bot = botClient;
		this._apis = {
			versions: new VersionAPI(this),
		};
	}

	API (api) {
		return this._apis[api];
	}
}

class VersionAPI {
	constructor (gClient) {
		this.client = gClient;
		this.endpoint = Constants.CENTRAL.VERSIONING;
	}

	async get (branch, version) {
		let res;
		try {
			res = await snekfetch.get(`${this.endpoint}${branch}/${version}`, { redirect: false });
		} catch (err) {
			res = {};
			res.statusCode = 404;
		}
		if (res) {
			if (res.statusCode !== 200) {
				return 404;
			}
			return res.body;
		}
	}

	async check () {
		let res;
		try {
			res = await snekfetch.get(`${Constants.APIs.VERSIONING}/api/versions/${configJSON.branch}/check?v=${configJSON.version}`, { redirect: false });
		} catch (err) {
			winston.warn(`Failed to check for new updates. ~.~\n`, err);
			throw err;
		}
		if (res) validateSpecVersion(res.body);
		return res && res.body;
	}
}

module.exports = GAwesomeClient;
