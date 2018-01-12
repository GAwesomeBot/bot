/**
 * Script to migrate 4.0 GAB databases to 4.1
 */
const Driver = require("../Database/Driver");
const { databaseURL } = require("../Configurations/config");
const winston = new (require("./Console"))("MIGRATION");
const { public } = require("../Configurations/commands");

module.exports = () => {
	winston.info(`Preparing to migrate "${databaseURL}" to GAB 4.1`);

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

	const AddBanGif = async () => {
		let serverDocuments = await Servers.find({ "config.ban_gif": { $exists: false } });
		for (const serverDocument of serverDocuments) {
			serverDocument.config.ban_gif = "https://i.imgur.com/3QPLumg.gif";
			await serverDocument.save().catch(err => {
				winston.warn(`Failed to save migration for server ${serverDocument._id}'s chatterbot configuration:`, err);
			}).then(() => {
				winston.debug(`Successfully migrated ${serverDocument._id} ban gif configuration.`);
			});
		}
	};
	/* eslint-disable no-unused-vars */
	const MigrateCommands = async () => {
		let serverDocuments = await Servers.find({});
		for (const serverDocument of serverDocuments) {
			let allCommandsKey = Object.keys(public);
			const serverDocCommandKeys = Object.keys(serverDocument.config.commands.toJSON());

			for (const key of serverDocCommandKeys) {
				if (!allCommandsKey.includes(key)) delete serverDocument.config.commands[key];
			}

			if (serverDocument._id === "WHO CARES MUM") {
				console.log(serverDocument.config.commands.emoji);
			}

			for (const cmd of allCommandsKey.filter(c => !serverDocCommandKeys.includes(c))) {
				serverDocument._id === "WHO CARES MUM" && console.log(cmd);
			}

			// let defaultCommandObject = (adminLevel, isEnabled) => ({ isEnabled, admin_level: adminLevel, disabled_channel_ids: [] });
			// for (const cmd of Object.keys(public)) {
			// 	if (serverCommands[cmd]) {
			// 		serverDocument._id === "237315945498935296" && console.log("m8", cmd, serverCommands[cmd]);
			// 		continue;
			// 	}
			// 	const newCommand = defaultCommandObject(public[cmd].defaults.adminLevel, public[cmd].defaults.isEnabled);
			// 	console.log(cmd, newCommand);
			// }
		}
	};
	/* eslint-enable no-unused-vars */

	winston.info(`Updating data...`);

	Driver.initialize(databaseURL).catch(err => {
		winston.error(`Failed to connect to the database!\n`, err);
		process.exit(-1);
	}).then(() => {
		Promise.all([MigrateChatterBot(), AddBanGif()]).then(() => {
			winston.info(`Successfully migrated ${databaseURL} to 4.1`);
			process.exit(0);
		});
	});
};
