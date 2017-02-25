const moment = require("moment");
const channelTypes = {
	"text": 0,
	"voice": 2
};

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const roomDocument = serverDocument.config.room_data.id(msg.channel.id);
	if(roomDocument) {
		msg.channel.createMessage(`This room was created ${moment(roomDocument.created_timestamp).fromNow()}. Would you like to delete it?`).then(() => {
			bot.awaitMessage(msg.channel.id, msg.author.id, message => {
				if(config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1) {
					msg.channel.delete().then(() => {
						roomDocument.remove();
						serverDocument.save(err => {
							if(err) {
								winston.error("Failed to save server data for room deletion", {svrid: msg.channel.guild.id}, err);
							}
						});
					}).catch(err => {
						winston.error(`Failed to delete room '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id}, err);
						msg.channel.createMessage("Discord won't let me delete this room, so you're going to have to ask a mod to do it instead...");
					});
				} else {
					msg.channel.createMessage("Whew 😅 Do you want to add any members to this channel?").then(() => {
						bot.awaitMessage(msg.channel.id, msg.author.id, message => {
							if(config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1) {
								msg.channel.createMessage("Please enter the names of the members you'd like to add, separated by `|`:").then(() => {
									bot.awaitMessage(msg.channel.id, msg.author.id, message => {
										message.content.split("|").forEach(membername => {
											const member = bot.memberSearch(membername, msg.channel.guild);
											if(member) {
												msg.channel.editPermission(member.id, 3072, null, "member").then().catch(err => {
													if(err) {
														winston.error(`Failed to add member '${member.user.username}' to room '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: member.id}, err);
													}
												});
											}
										});
										msg.channel.createMessage("Welcome, new people! 😘");
									});
								});
							}
						});
					});
				}
			});
		});
	} else if(suffix && ["text", "voice"].indexOf(suffix.split(" ")[0].toLowerCase())>-1) {
		const type = channelTypes[suffix.split(" ")[0].toLowerCase()];
		suffix = suffix.substring(suffix.indexOf(" ")+1);
		const members = [bot.user, msg.author];
		suffix.split("|").forEach(membername => {
			const member = bot.memberSearch(membername, msg.channel.guild);
			if(member) {
				members.push(member);
			}
		});

		msg.channel.guild.createChannel(`awesomebot-room-${Date.now()}`, type).then(ch => {
			msg.channel.createMessage(`The ${suffix.split(" ")[0].toLowerCase()} room ${ch.mention} is now available! 😎`);

			let permissionConstant = 3145728;
			if(ch.type==0) {
				permissionConstant = 3072;
				ch.createMessage(`**First!** 🐬 Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name}\` to delete this room or add members.`);
			}

			serverDocument.config.room_data.push({_id: ch.id});
			serverDocument.save(err => {
				if(err) {
					winston.error("Failed to save server data for room creation", {svrid: msg.channel.guild.id}, err);
				}

				ch.editPermission(msg.channel.guild.id, null, permissionConstant, "role").then(() => {
					members.forEach(member => {
						ch.editPermission(member.id, permissionConstant, null, "member").then().catch(err => {
							winston.error(`Failed to add member '${member.user.username}' to room '${ch.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: ch.id, usrid: member.id}, err);
						});
					});
				}).catch(err => {
					winston.error(`Failed to edit @everyone permissions for room '${ch.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: ch.id}, err);
				});
			});
		}).catch(err => {
			winston.error(`Failed to create ${suffix.split(" ")[0].toLowerCase()} room on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id}, err);
			msg.channel.createMessage("I wasn't able to create a room. Please make sure I have permission to manage channels and roles on this server. kthx.");
		});
	} else {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} I didn't get that. Please use the syntax \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\` to create a room!`);
	}
};
