const reload = require("require-reload")(require);
const ManageCommands = reload("../../Modules/ManageCommands");

module.exports = async (main, documents, msg, commandData) => {
	const disableCommand = new ManageCommands(main, documents, msg, commandData);
	if (!msg.suffix) {
		await disableCommand.listDisabled();
	} else if (disableCommand.parse("DISABLE")) {
		await disableCommand.executeDisable();
	} else {
		await disableCommand.listDisabled();
	}
};
