const path = require("path");
const fs = require("fs");

class TemporaryStorage {
	constructor () {
		this._temporaryStorage = path.join(__dirname, "../Temp");
		this._metadataLocation = "metadata.json";
	}

	async create (data) {
		await this.createStorage();
		const prefix = data.prefix || data.type.charAt(0).toLowerCase();
		const tempPath = await fs.promises.mkdtemp(path.join(this._temporaryStorage, `${prefix}-`));
		if (!data.prefix) data.prefix = prefix;
		data.id = tempPath.substring(tempPath.length - 6);
		await this._createMetadataEntry(data);
		return tempPath;
	}

	async _createMetadataEntry (data) {
		const metadata = await this._getMetadata();
		metadata.entries = metadata.entries || [];
		metadata.entries.push({
			prefix: data.prefix,
			type: data.type,
			id: data.id,
			persistent: !!data.persistent,
		});
		await fs.promises.writeFile(path.join(this._temporaryStorage, this._metadataLocation), JSON.stringify(metadata));
		return metadata;
	}

	async _getMetadata () {
		return JSON.parse(await fs.promises.readFile(path.join(this._temporaryStorage, this._metadataLocation)));
	}

	async createStorage () {
		const storageExists = await fs.promises.access(this._temporaryStorage).then(() => true).catch(() => false);
		if (!storageExists) {
			await fs.promises.mkdir(this._temporaryStorage);
			await fs.promises.writeFile(path.join(this._temporaryStorage, this._metadataLocation), "{}");
		}
	}
}

module.exports = TemporaryStorage;
