const Extension = require("./Extension.js");
const Bot = require("./InternalBot.js");
const Guild = require("./Guild");
const GuildChannel = require("./GuildChannel");
const Message = require("./Message");

const auth = require("./../../Configuration/auth.json");
const getGIF = require("./../GiphySearch.js");
const giSearch = require("./../GoogleImageSearch.js");
const getRSS = require("./../RSS.js");

const util = require("util");
const unirest = require("unirest");
const xmlparser = require("xml-parser");
const imgur = require("imgur-node-api");
const moment = require("moment");
imgur.setClientID(auth.tokens.imgur_client_id);

// Base set of extensionDocument parameters
module.exports = (bot, db, winston, extensionDocument, svr, serverDocument, ch, msg, suffix, keywordMatch) => {
	const params = {
		extension: new Extension(winston, extensionDocument, svr, serverDocument),
		unirest,
		xmlparser,
		imgur,
		gif: (query, rating, callback) => {
			if(!callback) {
				callback = rating;
				rating = "pg-13";
				if(!serverDocument.config.moderation.isEnabled || !serverDocument.config.moderation.filters.nsfw_filter.isEnabled || serverDocument.config.moderation.filters.nsfw_filter.enabled_channel_ids.indexOf(ch.id)==-1) {
					rating = "r";
				}
			}
			getGIF(query, rating, callback);
		},
		image: (query, safe, num, callback) => {
			if(!callback && num!=null) {
				callback = num;
				if(typeof(safe)=="boolean") {
					num = 0;
				} else {
					num = safe;
					safe = serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.enabled_channel_ids.indexOf(ch.id)>-1;
				}
			} else if(!callback && num==null) {
				callback = safe;
				safe = serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.enabled_channel_ids.indexOf(ch.id)>-1;
				num = 0;
			}
			giSearch(serverDocument, query, safe, num, callback);
		},
		rss: (url, num, callback) => {
			getRSS(winston, url, num, callback);
		},
		bot: new Bot(bot, db, winston, svr, serverDocument),
		moment,
		JSON,
		Math,
		isNaN,
		isFinite,
		Date,
		RegExp,
		Array,
		Number,
		Object,
		setTimeout,
		encodeURI,
		encodeURIComponent,
		decodeURI,
		decodeURIComponent,
		parseInt,
		parseFloat,
		util,
		logMsg: (level, message) => {
			if(!message) {
				message = level;
				level = "info";
			}
			if(["info", "warn", "error"].indexOf(level.toLowerCase())>-1) {
				winston.log(level.toLowerCase(), `Extension '${extensionDocument._id}' log: ${message}`, {svrid: svr.id, chid: ch.id, extid: extensionDocument._id.toString()});
			}
		}
	};

	if(msg && ["keyword", "command"].indexOf(extensionDocument.type)>-1) {
		params.message = new Message(msg);
		params.guild = new Guild(msg.channel.guild);
		params.channel = new GuildChannel(msg.channel);
	} else {
		params.guild = new Guild(svr);
		params.channel = new GuildChannel(ch);
	}
	if(extensionDocument.type=="keyword" && keywordMatch) {
		params.keywordMatch = keywordMatch;
	}
	if(extensionDocument.type=="command") {
		params.commandSuffix = suffix.trim();
		params.commandPrefix = bot.getCommandPrefix(msg.channel.guild, serverDocument);
		params.commandKey = extensionDocument.key;
	}
	return params;
};
