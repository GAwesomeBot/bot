const { cli: commands } = require("../../Configurations/commands");

module.exports = async () => {
	const str = Object.keys(commands).map(c => {
		const cmd = commands[c];
		return `${c}${cmd.usage ? ` ${cmd.usage}` : ""}${cmd.description ? ` - ${cmd.description}` : ""}`;
	});
	winston.info(" ======================== COMMAND LIST ========================");
	str.forEach(s => winston.info(s));
};
