module.exports = {
	ClearServerStats: require("./ClearServerStats.js"),
	FilterChecker: require("./FilterChecker.js"),
	GetFlagForRegion: region => {
		if (!region) {
			return ":x:";
		}
		if (region.startsWith("vip-")) {
			region = region.substring(4);
		}
		switch (region) {
			case "amsterdam":
				return ":flag_nl:";
			case "brazil":
				return ":flag_br:";
			case "frankfurt":
				return ":flag_de:";
			case "hongkong":
				return ":flag_hk:";
			case "japan":
				return ":flag_jp:";
			case "london":
				return ":flag_gb:";
			case "russia":
				return ":flag_ru:";
			case "singapore":
				return ":flag_sg:";
			case "sydney":
				return ":flag_au:";
		}
		if (region.startsWith("eu-")) {
			return ":flag_eu:";
		}
		if (region.startsWith("us-")) {
			return ":flag_us:";
		}
		return ":interrobang:";
	},
	GetValue: require("./GetValue.js"),
	Gist: require("./GitHubGist.js"),
	GlobalDefines: require("./GlobalDefines.js"),
	IsURL: url => {
		const pattern = [
			`^(https?:\\/\\/)`,
			`((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|`,
			`((\\d{1,3}\\.){3}\\d{1,3}))`,
			`(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*`,
			`(\\?[;&a-z\\d%_.~+=-]*)?`,
			`(\\#[-a-z\\d_]*)?$`,
		].join("");
		return new RegExp(pattern, "i").test(url);
	},
	MessageOfTheDay: require("./MessageOfTheDay.js"),
	ObjectDefines: require("./ObjectDefines.js"),
	PromiseWait: waitFor => new Promise(resolve => setTimeout(resolve, waitFor)),
	RankScoreCalculator: (messages, voice) => messages + voice,
	RegExpMaker: require("./RegExpMaker.js"),
	RSS: require("./RSS.js"),
	SearchiTunes: require("./SearchiTunes.js"),
	SetCountdown: require("./SetCountdown.js"),
	SetReminder: require("./SetReminder.js"),
	Stopwatch: require("./Stopwatch"),
	StreamChecker: require("./StreamChecker.js"),
	StreamerUtils: require("./StreamerUtils.js"),
	StreamingRSS: require("./StreamingRSS.js"),
	StructureExtender: require("./StructureExtender.js"),
};
