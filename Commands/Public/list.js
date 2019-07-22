const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async ({ Constants: { Colors, Text }, client }, { serverDocument, serverQueryDocument }, msg, commandData) => {
	const sendList = () => {
		const fields = serverDocument.config.list_data.map(listDocument => ({
			name: `${listDocument.isCompleted ? "✅" : "📝"} **${listDocument._id}:**`,
			value: `${listDocument.content}`,
			inline: true,
		}));
		if (fields.length) {
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					title: "Here is the current to-do list for this guild:",
					fields,
				},
			});
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `❎ The to-do list is empty! Use \`${msg.guild.commandPrefix}${commandData.name} <content>\` to add an item.`,
				},
			});
		}
	};

	if (msg.suffix) {
		let [inputID, ...action] = ArgParser.parseQuoteArgs(msg.suffix, msg.suffix.includes("|") ? "|" : " ");
		action = action.join(" ");

		if (inputID && isNaN(inputID.trim())) {
			const generateID = (offset = 1) => {
				if (!serverDocument.config.list_data || serverDocument.config.list_data.length === 0) return 1;
				const ID = serverDocument.config.list_data[serverDocument.config.list_data.length - 1]._id + offset;
				if (serverDocument.config.list_data.id(ID)) return generateID(offset + 1);
				else return ID;
			};
			const ID = generateID();
			serverQueryDocument.push("config.list_data", { _id: ID, content: msg.suffix });
			await msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: `Added item \`${msg.suffix}\` to the server to-do list 🚀`,
					footer: {
						text: `Item has ID ${ID} | Mark as done using ${msg.guild.commandPrefix}${commandData.name} ${ID} "done" | View the full list using ${msg.guild.commandPrefix}${commandData.name}`,
					},
				},
			}).then(sendList);
		} else if (serverDocument.config.list_data.id(parseInt(inputID))) {
			switch (action) {
				case "":
					if (!msg.suffix.includes("|")) return msg.sendInvalidUsage(commandData);
					// Fallthrough
				case ".":
					serverQueryDocument.clone.id("config.list_data", parseInt(inputID)).remove();
					await msg.send({
						embed: {
							color: Colors.SUCCESS,
							description: `Removed item **${inputID}** from the to-do list. ❌`,
						},
					}).then(sendList);
					return;
				case "done":
				case "complete":
					serverQueryDocument.clone.id("config.list_data", parseInt(inputID)).set(`isCompleted`, !serverDocument.config.list_data.id(parseInt(inputID)).isCompleted);
					await msg.send({
						embed: {
							color: Colors.SUCCESS,
							description: `Marked **${inputID}** as ${serverDocument.config.list_data.id(parseInt(inputID)).isCompleted ? "" : "not "}done!`,
						},
					}).then(sendList);
					return;
				default:
					serverQueryDocument.clone.id("config.list_data", parseInt(inputID)).set(`content`, action);
					break;
			}
			await msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: `Gotcha, list item **${inputID}** has been updated 👑`,
				},
			}).then(sendList);
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `There is no to-do list item with ID **${inputID}**!`,
				},
			});
		}
	} else {
		sendList();
	}
};
