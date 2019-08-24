/* eslint-disable no-unused-vars */
const specVersion = "1.0";

const { EventEmitter } = require("events");
const fs = require("fs");
const https = require("https");
const path = require("path");
const fetch = require("chainfetch");
const Unzip = require("adm-zip");
const { Console, Constants, Errors: { Error: GABError } } = require("../Internals");
const { FileExists, PromiseWait } = require("./Utils");

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
		this._branch = null;
		this.endpoint = Constants.CENTRAL.VERSIONING;
	}

	branch (branch) {
		this._branch = branch;
		return this;
	}

	async get (version) {
		const res = await this._get(`${this._branch}/${version}`);
		if (res.ok && res.body && !res.body.err) {
			return new Version(res.body.data, true, this);
		} else if (res.status === 404 && res.body) {
			return new Version({ tag: version, branch: res.body.err === "Branch not found" ? null : this._branch }, false, this);
		} else {
			throw new GABError("CENTRAL_ERROR", { status: res.status }, res.status, res.body && res.body.err);
		}
	}

	async _get (URL) {
		let res;
		try {
			res = await fetch.get(`${this.endpoint}${URL}`).set("User-Agent", Constants.UserAgent);
		} catch (err) {
			return err;
		}
		if (res.body && res.body.apiVersion) validateSpecVersion(res.body);
		return res;
	}
}

class Version extends EventEmitter {
	constructor (remoteVersion, valid, API) {
		super();
		this._v = remoteVersion;
		this.valid = valid;
		this.versionAPI = API;
	}

	async check () {
		if (!this.valid) return { utd: false, current: null };
		const res = await this.versionAPI._get(`${this.branch}/check?v=${this.tag}`);
		if (!res.ok && res.status !== 404) throw new GABError("CENTRAL_ERROR", { status: res.status }, res.status, res.body && res.body.err);
		else if (!res.ok && res.status === 404) return { utd: false, current: null };
		return res.body.data;
	}

	async download (onChunk) {
		const { path: tempFolder } = await this.versionAPI.client.bot.tempStorage.create({ type: "version", persistent: true, id: this.tag });
		return new Promise((resolve, reject) => {
			const fileStream = fs.createWriteStream(path.join(tempFolder, `${this.tag}.zip`));
			https.get(`${Constants.CENTRAL.CODEBASE}${this.sha}`, res => {
				const { statusCode } = res;
				if (statusCode !== 200) reject(new GABError("CENTRAL_DOWNLOAD_ERROR", {}, statusCode));

				res.on("data", chunk => {
					if (onChunk) onChunk(chunk);
				});

				res.on("end", () => {
					this._downloadPath = tempFolder;
					resolve(tempFolder);
				});

				res.pipe(fileStream);
			}).on("error", reject);
		});
	}

	async checkDownload (id = this.tag) {
		const entry = await this.versionAPI.client.bot.tempStorage.get("version", id);
		if (entry) this._downloadPath = entry.path;
		return !!entry;
	}

	async install () {
		await this.checkDownload();
		const downloadedVersionPath = path.join(this._downloadPath, `${this.tag}.zip`);
		if (!await FileExists(downloadedVersionPath)) throw new GABError("CENTRAL_VERSION_NOT_DOWNLOADED");

		try {
			this._log("unpack", "Unpacking patch files...");
			await this._unpackVersion(downloadedVersionPath);
			this._log("unpack", "Unpacked patch files.", "success");
		} catch (err) {
			this._log("unpack", `An error occurred while unpacking files. ${err.message}`, "error");
			throw err;
		}
		this._downloadPath = path.join(this._downloadPath, `GAwesomeBot-${this.sha}`);

		let fileList, configFileList;

		try {
			this._log("patching", "Preparing files for patching...");
			[fileList, configFileList] = await this._generateFileList();
			await this._checkForConflicts();
			await PromiseWait(50);
			const fileTotal = await this._patchFiles(fileList, downloadedVersionPath);
			this._log("patching", `Successfully patched ${fileTotal} files.`, "success");
		} catch (err) {
			this._log("patching", `A fatal error occurred while patching update files! ${err.message}`, "error");
			throw err;
		}

		try {
			this._log("patchingc", "Preparing configuration files for patching...");
			await PromiseWait(50);
			const cFileTotal = await this._patchConfigurationFiles(configFileList, downloadedVersionPath);
			this._log("patchingc", `Successfully patched ${cFileTotal} configuration files.`, "success");
		} catch (err) {
			this._log("patchingc", `A fatal error occurred while patching configuration files! ${err.message}`, "error");
		}

		try {
			this._log("verify", "Verifying installation...");
			await PromiseWait(50);
			await this._verifyInstall([...fileList, ...configFileList]);
			this._log("verify", "Installation verified.", "success");
		} catch (err) {
			this._log("verify", `Failed to verify installation. Please fix the following error and try again: ${err.message}`, "error");
			throw err;
		}

		try {
			this._log("cleanup", "Cleaning up update...");
			await PromiseWait(50);
			await this._cleanUpInstall();
			this._log("cleanup", `Finished updating GAB to version ${this.metadata.name}.`, "success");
		} catch (err) {
			this._log("cleanup", `Failed to clean up installation. This is not a fatal exception. ${err.message}`, "warn");
		}
		this.emit("installFinish");
	}

	_log (id, msg, type = "info") {
		this.emit("installLog", { id, msg, type });
	}

	async _unpackVersion (DVP) {
		const versionArchive = new Unzip(DVP);
		await versionArchive.extractAllTo(this._downloadPath, true);
		return versionArchive;
	}

	async _generateFileList () {
		const allFiles = this.files;
		const configFiles = allFiles.filter(file => file.startsWith("Configurations/"));
		const files = allFiles.filter(file => !file.startsWith("Configurations/"));
		return [files, configFiles];
	}

	async _checkForConflicts () {
		// TODO: Implement this in a future version
		return true;
	}

	async _patchFiles (fileList) {
		for (const filePath of fileList) {
			await PromiseWait(50);
			await this._patchFile(filePath);
		}
		return fileList.length;
	}

	async _patchFile (filePath, configFile = false) {
		const patchLocation = path.join(this._downloadPath, filePath);
		const patchTarget = path.join(path.join(__dirname, `..`), filePath);

		if (!await FileExists(patchLocation) && await FileExists(patchTarget)) {
			this._log(configFile ? "patchingc" : "patching", `Unlinking removed file ${filePath}...`);
			await fs.promises.unlink(patchTarget);
		} else if (await FileExists(patchLocation)) {
			this._log(configFile ? "patchingc" : "patching", `Patching file ${filePath}...`);
			await fs.promises.copyFile(patchLocation, patchTarget);
		}
	}

	async _patchConfigurationFiles (fileList) {
		for (const filePath of fileList) {
			await PromiseWait(50);
			await this._patchFile(filePath, true);
		}
		return fileList.length;
	}

	async _verifyInstall (fileList) {
		let verifiedPatches = [];
		for (const filePath of fileList) {
			await PromiseWait(50);
			const fileValid = await this._verifyFile(filePath);
			if (fileValid) {
				verifiedPatches++;
				this._log("verify", `Verified ${verifiedPatches} patches out of ${fileList.length}...`);
			} else {
				throw new GABError("PATCH_CORRUPTED", {}, filePath);
			}
		}
		return true;
	}

	async _verifyFile (filePath) {
		const patchLocation = path.join(this._downloadPath, filePath);
		const patchTarget = path.join(path.join(__dirname, `..`), filePath);

		const patchBuffer = await FileExists(patchLocation) ? await fs.promises.readFile(patchLocation) : Buffer.alloc(0);
		const patchedBuffer = await FileExists(patchTarget) ? await fs.promises.readFile(patchTarget) : Buffer.alloc(0);

		return patchBuffer.equals(patchedBuffer);
	}

	async _cleanUpInstall () {
		await this.versionAPI.client.bot.tempStorage.delete("version", this.tag);
	}

	get tag () {
		return this._v.tag;
	}

	get branch () {
		return this._v.branch;
	}

	get sha () {
		return this._v.sha;
	}

	get files () {
		return this._v.files;
	}

	get metadata () {
		return this._v.metadata;
	}
}

module.exports = GAwesomeClient;
