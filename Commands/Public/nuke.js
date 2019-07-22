module.exports = async ({ Constants: { Colors, Text }, client }, documents, msg, commandData) => {
	if (msg.suffix) {
		let num, query;
		if (msg.suffix.trim().includes(" ")) {
			num = msg.suffix.substring(0, msg.suffix.indexOf(" ")).trim();
			query = msg.suffix.substring(msg.suffix.indexOf(" ") + 1).trim();
		} else {
			num = msg.suffix;
		}

		if (!num || isNaN(num) || (num !== -1 && num < 1) || num > 100) {
			return msg.sendInvalidUsage(commandData);
		}

		num = parseInt(num);
		let filter = () => true;
		let before, after;

		if (query) {
			if (query.startsWith(":") && query.length > 1) {
				filter = message => message.content.toLowerCase().includes(query.slice(1).toLowerCase());
			} else if (query.startsWith(">") && query.length > 1 && !isNaN(query.slice(1))) {
				after = query.slice(1);
			} else if (query.startsWith("<") && query.length > 1 && !isNaN(query.slice(1))) {
				before = query.slice(1);
			} else {
				let member;
				if (query.startsWith("<@") && query.includes(">")) {
					member = await client.memberSearch(query, msg.guild);
				}
				if (member) {
					filter = message => message.author.id === member.user.id;
				} else {
					filter = message => message.content.toLowerCase() === query.toLowerCase();
				}
			}
		}

		const messages = await msg.channel.messages.fetch({ limit: 100, before: before || msg.id, after }).then(msgs => msgs.filter(filter).array().slice(0, num));
		msg.channel.bulkDelete(messages, true).then(({ size }) => {
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: `Deleted ${size} message${size === 1 ? "" : "s"} in this channel 🗑🔥`,
				},
			});
		}).catch(err => {
			logger.debug(`Failed to ${commandData.name} in channel '${msg.channel.name}' on server '${msg.guild.name}'`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "Uh oh, I failed to delete all those messages. Try a smaller number, and make sure I have sufficient permissions to nuke in this channel! 💣",
				},
			});
		});
	} else {
		msg.sendInvalidUsage(commandData);
	}
};
