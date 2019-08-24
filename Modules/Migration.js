/**
 * Module that is used in the migration of GAB 4.0 databases to GAB 4.1
 */
const Driver = require("../Database/Driver");
const { database } = require("../Configurations/config");
const logger = new (require("../Internals").Logger)("MIGRATION");
const { public: publicCommands } = require("../Configurations/commands");

module.exports = async () => {
	logger.info(`Preparing to migrate database "${database.db}" on "${database.url}" to GADriver standards...`);
	logger.warn("THIS OPERATION MIGHT RESET VARIOUS PIECES OF DATA. DO NOT CLOSE THIS SCRIPT UNTIL AFTER IT IS FINISHED.");

	const MigrateChatterBot = async () => {
		const serverDocuments = await Servers.find({ "config.chatterbot": { $in: [true, false] } }).exec();
		for (const serverDocument of serverDocuments) {
			const oldChatterBot = serverDocument.config.chatterbot;
			serverDocument.query.set("config.chatterbot", {
				isEnabled: oldChatterBot,
				disabled_channel_ids: [],
			});
			await serverDocument.save().catch(err => {
				logger.warn(`Failed to save migration for server "${serverDocument._id}"'s chatterbot configuration: `, {}, err);
			}).then(() => {
				logger.debug(`Successfully migrated "${serverDocument._id}" chatterbot configuration.`);
			});
		}
	};

	const AddBanGif = async () => {
		const serverDocuments = await Servers.find({ "config.ban_gif": { $exists: false } }).exec();
		for (const serverDocument of serverDocuments) {
			serverDocument.query.set("config.ban_gif", "https://i.imgur.com/3QPLumg.gif");
			await serverDocument.save().catch(err => {
				logger.warn(`Failed to save migration for server "${serverDocument._id}"'s ban gif configuration: `, {}, err);
			}).then(() => {
				logger.debug(`Successfully migrated "${serverDocument._id}" ban gif configuration.`);
			});
		}
	};

	const MigrateDocumentsAndCommands = async () => {
		const serverDocuments = await Servers.find({}).exec();
		const allCommandsKey = Object.keys(publicCommands);
		const defaultCommandObject = (adminLevel, isEnabled) => ({ isEnabled, admin_level: adminLevel, disabled_channel_ids: [] });

		for (const serverDocument of serverDocuments) {
			if (!Array.isArray(serverDocument.logs)) serverDocument.query.set("logs", []);

			const oldCommands = Array.from(
				Object.keys(serverDocument.config.commands)
					.filter(c => !allCommandsKey.includes(c))
			);

			if (oldCommands.length) for (const cmd of oldCommands) serverDocument.query.remove(`config.commands.${cmd}`);

			for (const cmd of allCommandsKey) {
				if (serverDocument.config.commands[cmd]) continue;
				const newCommand = defaultCommandObject(publicCommands[cmd].defaults.adminLevel, publicCommands[cmd].defaults.isEnabled);
				serverDocument.query.set(`config.commands${cmd}`, newCommand);
			}

			await Servers.delete({ _id: serverDocument._id });
			const newDocument = Servers.new(serverDocument.toObject());
			await newDocument.save().catch(err => {
				logger.warn(`Failed to save migration for server "${newDocument._id}"'s configuration: `, {}, err);
			}).then(() => {
				logger.debug(`Successfully migrated "${newDocument._id}" configuration(s).`);
			});
		}
	};

	const migrateChannelsAndMembers = async () => {
		await Servers.update({}, { $set: { members: {}, channels: {} } });
	};

	logger.info("Connecting to database...");
	await Driver.initialize(database)
		.then(async () => {
			try {
				logger.info("Updating data... [1/3]");
				await MigrateChatterBot();
				await AddBanGif();
				logger.info("Updating data... [2/3]");
				await MigrateDocumentsAndCommands();
				logger.info("Updating data... [3/3]");
				await migrateChannelsAndMembers();
				logger.info(`Successfully migrated "${database.db}"! You may now launch GAwesomeBot without the "--migrate" flag.`);
				process.exit(0);
				// eslint-disable-next-line
			} catch (_) {}
		})
		.catch(err => {
			logger.error(`Failed to connect to the database!`, {}, err);
			process.exit(-1);
		});
};
