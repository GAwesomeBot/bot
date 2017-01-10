module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const showList = () => {
		msg.channel.createMessage(serverDocument.config.list_data.map((listDocument, i) => {
			return `${listDocument.isCompleted ? "✅" : "📝"} **${++i}:** ${listDocument.content}`;
		}).join("\n") || (`❎ No to-do list items! Use \`${bot.getCommandPrefix(msg.guild, serverDocument)}${commandData.name} <content>\` to add one.`));
	};
	
	if(suffix) {
		if(suffix.indexOf("|")>-1) {
			const args = suffix.split("|");
			if(args[0].trim() && !isNaN(args[0].trim())) {
				const i = parseInt(args[0].trim()) - 1;
				const action = args[1].trim();

				if(i>=0 && i<serverDocument.config.list_data.length) {
					switch(action) {
						case "":
						case ".":
							serverDocument.config.list_data.splice(i, 1);
							msg.channel.createMessage(`Removed item ${i} from list. ❌`).then(showList);
							return;
						case "done":
						case "complete":
							serverDocument.config.list_data[i].isCompleted = !serverDocument.config.list_data[i].isCompleted;
							break;
						default:
							serverDocument.config.list_data[i].content = action;
							break;
					}
					msg.channel.createMessage("Gotcha 👑").then(showList);
				} else {
					msg.channel.createMessage(`That number needs to be between 1 and ${serverDocument.config.list_data.length} inclusive`);
				}
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage(`${msg.author.mention} I...didn't get that`);
			}
		} else {
			serverDocument.config.list_data.push({content: suffix});
			msg.channel.createMessage(`Added item \`${serverDocument.config.list_data.length}\` to the server to-do list 🚀`).then(showList);
		}
	} else {
		showList();
	}
};
