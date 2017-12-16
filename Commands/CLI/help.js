const { cli: commands } = require("../../Configurations/commands");

module.exports = async () => {
	const str = Object.keys(commands).map(c => {
		const cmd = commands[c];
		return `${cmd.isMultiline ? "*" : ""}${c}${cmd.usage ? ` ${cmd.usage}` : ""}${cmd.description ? ` - ${cmd.description}` : ""}`;
	});
	winston.info(" ======================== COMMAND LIST ========================");
	str.forEach(s => winston.info(s));
	winston.info("All commands prepended with * are multiline. To run them, you have to make a next line that ends with CTRL+G and pressing enter. Note: To use only single line on these commands, you still have to make a new line and press CTRL+G and enter.");
	winston.info("Correct: multilinecommand yeye nono\n(CTRL+G)(Enter)");
	winston.info("Bad: multilinecommand yeye nono(CTRL+G)(Enter)");
};
