const { writeJSONAtomic: writeFile } = require("fs-nextra");

/**
 * Updates the config.json
 * @argument {CLI} cli CLI class instance. Can be polyfilled with { sharder }
 * @argument {Object} configJSON config.json object
 * @returns {Promise}
 */
module.exports = function UpdateConfig (cli, configJSON) {
	return new Promise((rs, rj) => {
		writeFile(`${__dirname}/../../../Configurations/config.json`, configJSON, {
			spaces: 2,
		}).then(() => {
			cli.sharder.broadcast("updateConfigJSON").then(arr => {
				arr.map(({ error }, index) => ({
					message: `${error ? `Couldn't update` : `Updated`} the config.json file on shard ${index}`,
					error,
				})).forEach(({ error, message }) => {
					winston[error ? "error" : "silly"](message);
				});
				rs();
			});
		}).catch(err => {
			winston.error(`Failed to update config.json *_* `, err);
			rj(err);
		});
	});
};
