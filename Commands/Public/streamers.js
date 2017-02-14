const isStreaming = require("./../../Modules/StreamerUtils.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	if(serverDocument.config.streamers_data.length > 0) {
		const checkStreamer = (i, info, callback) => {
			if(i >= serverDocument.config.streamers_data.length) {
				callback(info);
			} else {
				isStreaming(serverDocument.config.streamers_data[i].type, serverDocument.config.streamers_data[i]._id, data => {
					if(data) {
						info.push(`🎮 **${data.name}** is live on ${data.type}: ${data.game}\n${data.url}`);
					}
					checkStreamer(++i, info, callback);
				});
			}
		};
		checkStreamer(0, [], info => {
			if(info.length > 0) {
				bot.sendArray(msg.channel, info);
			} else {
				if(serverDocument.config.streamers_data.length === 1) {
					msg.channel.createMessage("The 1 streamer added to this server isn't live right now. 😞");
				} else {
					msg.channel.createMessage(`None of the ${serverDocument.config.streamers_data.length} streamers added to this server are live right now. 😞`);
				}
			}
		});
	} else {
		msg.channel.createMessage("I'm not tracking any Twitch or YouTube Gaming streams for this server. You can add them online in the admin console. 🌐");
	}
};
