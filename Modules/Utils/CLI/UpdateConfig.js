const { writeJSONAtomic: writeFile } = require("fs-nextra");

/**
 * Updates the config.json
 * @argument {CLI} cli CLI class instance. Can be polyfilled with { sharder }
 * @argument {Object} configJSON config.json object
 * @returns {Promise<Boolean|Error>}
 */
module.exports = async (cli, configJSON) => {
	try {
		await writeFile(`${__dirname}/../../../Configurations/config.json`, configJSON, {
			spaces: 2,
		});
		const arr = await cli.sharder.broadcast("updateConfig");
		arr.map(({ error }, index) => ({
			message: `${error ? `Couldn't update` : `Updated`} the config.json file on shard ${index}`,
			error,
		})).forEach(({ error, message }) => {
			winston[error ? "error" : "silly"](message);
		});
		return true;
	} catch (err) {
		winston.error(`Failed to update config.json *_* `, err);
		throw err;
	}
};
