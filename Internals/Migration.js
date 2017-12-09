/**
 * Simple script to migrate database schema changes!
 * !! YOU WILL NEED TO RUN THIS !!
 * Note to devs:
 * Add more async functions depending on the migration required
 * Note to Gilbert: DO NOT DELETE THIS.
 * This will be needed for extensions later on
 */
const Driver = require("../Database/Driver");
const { databaseURL } = require("../Configurations/config");
const winston = new (require("../Modules/Console"))("MIGRATION");

winston.warn(`Starting Migration progress. This may take a while!`);

Driver.initialize(databaseURL).catch(err => {
	winston.error(`Failed to connect to the database!`, err);
	process.exit(-1);
});

const MigrateChatterBot = async () => {
	let serverDocuments = await Servers.find({ "config.chatterbot": { $in: [true, false] } });
	for (const serverDocument of serverDocuments) {
		let oldChatterBot = serverDocument.config.chatterbot;
		serverDocument.config.chatterbot = {
			isEnabled: oldChatterBot,
			disabled_channel_ids: [],
		};
		await serverDocument.save().catch(err => {
			winston.warn(`Failed to save migration for ChatterBot for server ${serverDocument._id}`, err);
		}).then(() => {
			winston.debug(`Successfully migrated ${serverDocument._id} for chatterbot changes`);
		});
	}
};

Promise.all([MigrateChatterBot]).then(() => {
	winston.info(`Migration complete! Have fun!`);
	process.exit(0);
});
