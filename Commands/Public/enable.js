const ManageCommands = require("../../Modules/ManageCommands");

module.exports = async (main, documents, msg, commandData) => {
	const enableCommand = new ManageCommands(main, documents, msg, commandData);
	if (!msg.suffix) {
		await enableCommand.listEnabled();
	} else if (enableCommand.parse("ENABLE")) {
		await enableCommand.executeEnable();
	} else {
		await enableCommand.listEnabled();
	}
};
