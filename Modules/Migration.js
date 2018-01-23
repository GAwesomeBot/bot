/**
 * Module that is used in the migration of GAB 4.0 databases to GAB 4.1
 */
const Driver = require("../Database/Driver");
const { databaseURL } = require("../Configurations/config");
const winston = new (require("./Console"))("MIGRATION");
const { public } = require("../Configurations/commands");

module.exports = () => {
	winston.info(`Preparing to migrate "${databaseURL}" to GAB 4.1...`);

	const MigrateChatterBot = async () => {
		let serverDocuments = await Servers.find({ "config.chatterbot": { $in: [true, false] } });
		for (const serverDocument of serverDocuments) {
			let oldChatterBot = serverDocument.config.chatterbot;
			serverDocument.config.chatterbot = {
				isEnabled: oldChatterBot,
				disabled_channel_ids: [],
			};
			await serverDocument.save().catch(err => {
				winston.warn(`Failed to save migration for server "${serverDocument._id}"'s chatterbot configuration: `, err);
			}).then(() => {
				winston.debug(`Successfully migrated "${serverDocument._id}" chatterbot configuration.`);
			});
		}
	};

	const AddBanGif = async () => {
		let serverDocuments = await Servers.find({ "config.ban_gif": { $exists: false } });
		for (const serverDocument of serverDocuments) {
			serverDocument.config.ban_gif = "https://i.imgur.com/3QPLumg.gif";
			await serverDocument.save().catch(err => {
				winston.warn(`Failed to save migration for server "${serverDocument._id}"'s ban gif configuration: `, err);
			}).then(() => {
				winston.debug(`Successfully migrated "${serverDocument._id}" ban gif configuration.`);
			});
		}
	};

	const MigrateDocumentsAndCommands = async () => {
		let serverDocuments = await Servers.find({});
		for (const serverDocument of serverDocuments) {
			let allCommandsKey = Object.keys(public);
			let defaultCommandObject = (adminLevel, isEnabled) => ({ isEnabled, admin_level: adminLevel, disabled_channel_ids: [] });

			const objectServerDocument = await Servers.findOne({ _id: serverDocument._id }).lean();
			delete objectServerDocument.__v;
			if (!Array.isArray(objectServerDocument.logs)) objectServerDocument.logs = [];

			const oldCommands = Array.from(
				Object.keys(objectServerDocument.config.commands)
					.filter(c => !allCommandsKey.includes(c))
			);

			if (oldCommands.length) for (const cmd of oldCommands) delete objectServerDocument.config.commands[cmd];

			for (const cmd of allCommandsKey) {
				if (objectServerDocument.config.commands[cmd]) continue;
				const newCommand = defaultCommandObject(public[cmd].defaults.adminLevel, public[cmd].defaults.isEnabled);
				objectServerDocument.config.commands[cmd] = newCommand;
			}

			await Servers.deleteOne({ _id: serverDocument._id });
			const newDocument = new Servers(objectServerDocument);
			await newDocument.save().catch(err => {
				winston.warn(`Failed to save migration for server "${newDocument._id}"'s configuration: `, err);
			}).then(() => {
				winston.debug(`Successfully migrated "${newDocument._id}" configuration(s).`);
			});
		}
	};

	Driver.initialize(databaseURL).catch(err => {
		winston.error(`Failed to connect to the database!\n`, err);
		process.exit(-1);
	}).then(() => {
		winston.info(`Updating data...`);
		Promise.all([MigrateChatterBot(), AddBanGif(), MigrateDocumentsAndCommands()]).then(() => {
			winston.info(`Successfully migrated "${databaseURL}" to 4.1! You may now launch GAwesomeBot without the "--migrate" flag.`);
			process.exit(0);
		});
	});
};
