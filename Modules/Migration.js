/**
 * Script to migrate 4.0 GAB databases to 4.1
 */
const Driver = require("../Database/Driver");
const { databaseURL } = require("../Configurations/config");
const winston = new (require("./Console"))("MIGRATION");

winston.info(`Preparing to migrate ${databaseURL} to GAB 4.1`);

Driver.initialize(databaseURL).catch(err => {
	winston.error(`Failed to connect to the database!\n`, err);
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
			winston.warn(`Failed to save migration for server ${serverDocument._id}'s chatterbot configuration:`, err);
		}).then(() => {
			winston.debug(`Successfully migrated ${serverDocument._id} chatterbot configuration.`);
		});
	}
};

winston.info(`Updating configurations...`);

Promise.all([MigrateChatterBot]).then(() => {
	winston.info(`Successfully migrated ${databaseURL} to 4.1`);
	process.exit(0);
});
