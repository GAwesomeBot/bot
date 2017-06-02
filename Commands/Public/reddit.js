const checkFiltered = require("./../../Modules/FilterChecker.js");
const moment = require("moment");
const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix.startsWith("r/")) {
		suffix = suffix.slice(2);
	}
	if(suffix.startsWith("/r/")) {
		suffix = suffix.slice(3);
	}
	let query = "all";
	let num = serverDocument.config.command_fetch_properties.default_count;
	if(suffix) {
		if(!isNaN(suffix)) {
			num = parseInt(suffix);
		} else {
			query = suffix.substring(0, suffix.lastIndexOf(" "));
			num = suffix.substring(suffix.lastIndexOf(" ")+1);

			if(!query || isNaN(num)) {
				query = suffix;
				num = serverDocument.config.command_fetch_properties.default_count;
			}
			if(num < 1 || num > serverDocument.config.command_fetch_properties.max_count) {
				num = serverDocument.config.command_fetch_properties.default_count;
			} else {
				num = parseInt(num);
			}
		}
	}
	unirest.get(`https://www.reddit.com/r/${encodeURIComponent(query)}/.json`).header("Accept", "application/json").end(res => {
		if(res.status == 200 && res.body && res.body.data && res.body.data.children && res.body.data.children.length > 0) {
			const data = res.body.data.children;
			const info = [];
			for(let i = 0; i < Math.min(num, data.length); i++) {
				if(data && data[i].data) {
					if(data[i].data.over_18 && bot.getUserBotAdmin(msg.channel.guild, serverDocument, msg.member)<1 && checkFiltered(serverDocument, msg.channel, null, true, false, true)) {
						// Delete offending message if necessary
						if(serverDocument.config.moderation.filters.nsfw_filter.delete_message) {
							msg.delete().then().catch(err => {
								winston.error(`Failed to delete NSFW command message from member '${msg.author.username}' in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
							});
						}
						// Handle this as a violation
						bot.handleViolation(winston, msg.channel.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You tried to fetch NSFW content in #${msg.channel} on ${msg.channel.guild.name}`, `**@${bot.getName(msg.channel.guild, serverDocument, msg.member, true)}** is trying to fetch NSFW content (Reddit: /r/${query}) in #${msg.channel.name} on ${msg.channel.guild.name}`, `NSFW filter violation (Reddit: /r/${query}) in #${msg.channel.name}`, serverDocument.config.moderation.filters.nsfw_filter.action, serverDocument.config.moderation.filters.nsfw_filter.violator_role_id);
						return;
					} else if(!data[i].data.stickied) {
						info.push(`**${data[i].data.title}**\n${data[i].data.score} point${data[i].data.score==1 ? "" : "s"}\t${data[i].data.author}\t${query.toLowerCase()=="all" ? (`/r/${data[i].data.subreddit}\t`) : ""}${moment(data[i].data.created_utc*1000).fromNow()}\t${data[i].data.num_comments} comment${data[i].data.num_comments==1 ? "" : "s"}\n` + `<https://redd.it/${data[i].data.id}>`);
					}
				} else {
					data.splice(i, 1);
					i--;
				}
			}
			bot.sendArray(msg.channel, info);
		} else {
			winston.warn(`No Reddit data found for '${query}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage(`Surprisingly, I couldn't find anything in /r/${query} on Reddit 📛`);
		}
	});
};
