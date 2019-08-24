const removeMd = require("remove-markdown");

module.exports = str => {
	str = removeMd(str)
		.replace(/_/g, "\\_")
		.replace(/\*/g, "\\*")
		.replace(/`/g, "\\`")
		.replace(/@(everyone|here|\d{17,18}>)/g, "@\u200b$1");
	if (str.startsWith("everyone") || str.startsWith("here")) {
		str = `\u200b${str}`;
	}
	return str;
};
