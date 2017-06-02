const os = require("os");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	let embed_fields = [
		{
			name: "System info:",
			value: `${process.platform}-${process.arch} with ${process.release.name} version ${process.version.slice(1)}`,
			inline: true
		},
		{
			name: "Process info: PID",
			value: `${process.pid}`,
			inline: true
		},
		{
			name: "Process memory usage:",
			value: `${Math.ceil(process.memoryUsage().heapTotal / 1000000)} MB`,
			inline: true
		},
		{
			name: "System memory usage:",
			value: `${Math.ceil((os.totalmem() - os.freemem()) / 1000000)} of ${Math.ceil(os.totalmem() / 1000000)} MB`,
			inline: true
		},
		{
			name: "Bot info:",
			value: `:id: ${bot.user.id} :hash:${bot.user.discriminator}`,
			inline: true
		}
	];
	msg.channel.createMessage({
		embed: {
            author: {
                name: bot.user.username,
                icon_url: bot.user.avatarURL,
                url: "https://github.com/GilbertGobbels/GAwesomeBot"
            },
            color: 0x00FF00,
			fields: embed_fields
		}
	});
};
