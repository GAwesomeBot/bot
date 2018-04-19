const removeMd = require("remove-markdown");

module.exports = str => {
	str = removeMd(str)
		.replace(/_/g, "\\_")
		.replace(/\*/g, "\\*")
		.replace(/`/g, "\\`")
		.replace(/@everyone/g, "@\u200beveryone")
		.replace(/@here/g, "@\u200bhere")
		.replace(/<@/g, "<@\u200b");
	if (str.startsWith("everyone") || str.startsWith("here")) {
		str = `\u200b${str}`;
	}
	return str;
};
