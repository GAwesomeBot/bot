module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		let num, query;
		if(suffix.indexOf(" ")>-1) {
			num = suffix.substring(0, suffix.indexOf(" ")).trim();
			query = suffix.substring(suffix.indexOf(" ")+1).trim();
		} else {
			num = suffix;
		}

		if(!num || isNaN(num) || (num!=-1 && num<2)) {
			winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage(`${msg.author.mention} I need a valid 🔢 of messages to delete`);
		} else {
			num = parseInt(num);

			let filter = () => {
				return true;
			};
			let before, after;
			if(query) {
				query = query.trim();
				if(query.startsWith(":") && query.length>1) {
					filter = message => {
						return message.content.toLowerCase().indexOf(query.slice(1).toLowerCase());
					};
				} else if(query.startsWith(">") && query.length>1 && !isNaN(query.slice(1))) {
					after = query.slice(1);
				} else if(query.startsWith("<") && query.length>1 && !isNaN(query.slice(1))) {
					before = query.slice(1);
				} else {
					let member;
					if(query.startsWith("<@") && query.indexOf(">")>-1) {
						member = bot.memberSearch(query, msg.guild);
					}
					if(member) {
						filter = message => {
							return message.author.id==member.id;
						};
					} else {
						filter = message => {
							return message.content.toLowerCase()==query.toLowerCase();
						};
					}
				}
			}

			msg.channel.purge(num, filter, before, after).then(deleted => {
				msg.channel.createMessage(`🗑🔥 Deleted ${deleted} message${deleted==1 ? "" : "s"} in this channel`);
			}).catch(err => {
				winston.error(`Failed to ${commandData.name} in channel '${msg.channel.name}' on server '${msg.guild.name}'`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
				msg.channel.createMessage("Uh oh, I couldn't delete all those messages. Try a smaller number...or maybe I just don't have permissions to nuke this channel 💣");
			});
		}
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} hmmm? \`${bot.getCommandPrefix(msg.guild, serverDocument)}${commandData.name} ${commandData.usage}\``);
	}
};
