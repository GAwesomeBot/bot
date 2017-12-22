const { inspect } = require("util");
module.exports = async ({ cli }, cmdData, args) => {
	let evalOutput;
	try {
		evalOutput = await eval(`(async () => {\n${args}\n})()`);
	} catch (err) {
		evalOutput = err;
	}
	winston.info("Evaluated: ");
	winston.info(inspect(evalOutput));
};
