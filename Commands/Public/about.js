module.exports = async ({ bot, configJS }, documents, msg, commandData) => {
	const description = [
		`Hello! I'm **${bot.user.username}**, a self-host of **GAwesomeBot**, the best Discord Bot! 🐬`,
		`Created by GG142 and [the team](${configJS.hostingURL}#team)! ❤️`,
		`Built using [Node.JS](https://nodejs.org/en/) and [Discord.js](https://discord.js.org/#/)`,
	].join("\n");
	const fields = [
		{
			name: `Version`,
			value: `**${configJSON.version}** on branch\n**${configJSON.branch}**`,
			inline: true,
		},
	];
	configJS.hostingURL && fields.push({
		name: `Want to learn more?`,
		value: `Click [here](${configJS.hostingURL})`,
		inline: true,
	});
	configJS.discordLink && fields.push({
		name: `Need some help?`,
		value: `Join our\n[Discord Server](${configJS.discordLink})`,
		inline: true,
	});
	msg.channel.send({
		embed: {
			color: 0x43B581,
			fields,
			description,
			footer: {
				text: `Use "${msg.guild.commandPrefix}help" to list all commands that you can use in this server`,
			},
		},
	});
};
