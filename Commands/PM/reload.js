const commands = require("./../../Configuration/commands.json");

module.exports = (bot, db, config, winston, userDocument, msg) => {
    // Maintainers only
	if(!~config.maintainers.indexOf(msg.author.id)) {
		return;
	}
	const params = msg.content.split(/\s+/);
	params.shift();
	if(!params.length) {
		msg.channel.createMessage("No commands to reload.");
		return;
	}
	params.forEach(command => {
		const command_args = command.split(".");
        // assume public command by default
		let type = "public";
		let command_hook = command_args[0];
		if(command_args.length > 1) {
			type = command_hook;
			command_hook = command_args[1];
		}
        // check if command exists
		if(commands.hasOwnProperty(type)) {
            // wildcard reload?
			if(command_hook == "*") {
				switch(type) {
					case "pm":
						bot.reloadAllPrivateCommands();
						break;
					case "public":
						bot.reloadAllPublicCommands();
						break;
				}

				winston.info(`Reloaded all ${type} commands`, { usrid: msg.author.id });
				msg.channel.createMessage(`Reloaded all ${type} commands`);
				return;
			}
			let failure = false;
			switch(type) {
				case "pm":
					failure = bot.reloadPrivateCommand(command_hook);
					break;
				case "public":
					if(!commands.public.hasOwnProperty(command_hook)) {
						winston.info(`Unable to reload ${type} command \`${command_hook}\` because no command data found in commands.json`, { usrid: msg.author.id });
						msg.channel.createMessage(`Unable to reload ${type} command \`${command_hook}\` because no command data found in commands.json`);
						return;
					}
					failure = bot.reloadPublicCommand(command_hook);
					break;
				default:
					msg.channel.createMessage(`Unable to find command \`${command_hook}\` of type \`${type}\`.`);
					return;
			}
			if(!failure) {
				winston.info(`Reloaded ${type} command \`${command_hook}\``, { usrid: msg.author.id });
				msg.channel.createMessage(`Reloaded ${type} command \`${command_hook}\``);
			}
			else {
				winston.info(`Failed to reload ${type} command \`${command_hook}\``, { usrid: msg.author.id }, failure);
				msg.channel.createMessage(`Failed to reload ${type} command \`${command_hook}\` \`\`\`${failure.stack}\`\`\``);
			}
		}
		else {
			winston.error(`Invalid command type or command not in commands.json - \`${command_hook}\``, { usrid: msg.author.id });
			msg.channel.createMessage(`Invalid command type or command not in commands.json - \`${command_hook}\``);
		}
	});
};
