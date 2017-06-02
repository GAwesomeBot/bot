module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		let createCount = async name => {
			let m = await msg.channel.createMessage({
				embed: {
					color: 0x9ECDF2,
					description: `I can't find a count called \`${name}\`..`,
					footer: {
						text: `Would you like to create it?`,
					},
				},
			});
			bot.awaitMessage(msg.channel.id, msg.author.id, message => {
				if (config.yes_strings.includes(message.content.toLowerCase().trim())) {
					serverDocument.config.count_data.push({ _id: name });
					serverDocument.save(err => {
						if (err) { //eslint-disable-next-line
							winston.error("Failed to save server data for creating count", { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err.message);
							m.edit({
								embed: {
									color: 0xFF0000,
									description: `An error occured! Thats all I know!`,
									footer: {
										text: `Blame Mongo...`,
									},
								},
							});
						} else {
							m.edit({
								embed: {
									color: 0x00FF00,
									description: `Initialized count**${name}** with value \`0\``,
									footer: { //eslint-disable-next-line
										text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${name}|+1" to increment it or "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${name}|." to remove it.`,
									},
								},
							});
						}
					});
				}
			});
		};
		if (suffix.indexOf("|") > -1) {
			let args = suffix.split("|");
			if (args.length === 2 && args[0].trim() && (!args[1].trim() || [".", "+1", "-1"].includes(args[1].trim()))) {
				let countDocument = serverDocument.config.count_data.id(args[0].toLowerCase().trim());
				/* eslint-disable indent */
				/* eslint-disable max-len */
				/* eslint-disable max-depth */
				if (countDocument) {
					switch (args[1].trim()) {
						case "":
						case ".":
							countDocument.remove();
							msg.channel.createMessage({
								embed: {
									color: 0x00FF00,
									description: `*Poof!* 💨 \`${countDocument._id}\` is gone!`,
									footer: {
										text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${args[0].toLowerCase()}" to remake it!`,
									},
								},
							});
							return;
						case "+1":
							countDocument.value++;
							break;
						case "-1":
							if (countDocument.value > 0) {
								countDocument.value--;
								break;
							} else {
								msg.channel.createMessage({
									embed: {
										color: 0xFF0000,
										description: `I wasn't teached how to subtract 1 from 0! *I should tell my creators to teach me* 😰`,
									},
								});
								return;
							}
					}
					msg.channel.createMessage({
						embed: {
							color: 0x00FF00,
							description: `\`${countDocument._id}\` is now at **${countDocument.value}** 🧀`,
							footer: {
								text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${countDocument._id}|+1" to increment it or "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${countDocument._id}|-1" to subtract from it.`,
							},
						},
					});
				} else {
					createCount(args[0].toLowerCase().trim());
				}
			} else {
				winston.warn(`Invalid parameters "${suffix}" provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `Me = confused 🕵...`,
						footer: {
							text: `Did you mean to add or remove from a count? Did you forget to add the "|"? You should try again!`,
						},
					},
				});
			}
		} else {
			let countDocument = serverDocument.config.count_data.id(suffix.toLowerCase());
			if (countDocument) {
				msg.channel.createMessage({
					embed: {
						color: 0x9ECDF2,
						description: `**${countDocument._id}** is at \`${countDocument.value}\` value!`,
						footer: {
							text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${countDocument._id}|+1" to increment it or "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${countDocument._id}|-1" to subtract from it.`,
						},
					},
				});
			} else {
				createCount(suffix.toLowerCase());
			}
		}
	} else {
		// eslint-disable-next-line
		const info = serverDocument.config.count_data.map(countDocument => {
			return `${countDocument._id} has the value \`${countDocument.value}\``;
		}).sort();
		if (info.length > 0) {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					title: `${info.length} count${info.length === 1 ? "" : "s"} on this server: 🔢`,
					description: info.join("\n"),
				},
			});
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `No one on this server is counting anything.`,
					footer: {
						text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <name>" to start tallying something. 🐶`,
					},
				},
			});
		}
	}
};
