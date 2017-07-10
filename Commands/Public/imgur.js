const auth = require("./../../Configuration/auth.json");
const imgur = require("imgur-node-api");
imgur.setClientID(auth.tokens.imgur_client_id);

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(msg.attachments.length > 0 || (suffix && (/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/).test(suffix))) {
		let url = suffix;
		if(msg.attachments.length>0) {
			url = msg.attachments[0].url;
		}
		try {
			imgur.upload(url, (err, res) => {
				if(err) {
					throw err;
				} else {
					msg.channel.createMessage(`<${res.data.link}>`);
				}
			});
		} catch(err) {
			winston.error(`Failed to upload image '${url}' to Imgur`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage("Imgur is probably down, __**again**__. *Sigh* 🙄");
		}
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} Please attach an image or include an image URL next time 🌅`);
	}
};
