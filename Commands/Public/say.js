module.exports = async ({ Constants: { Colors } }, documents, msg) => {
	msg.send({
		embed: {
			color: Colors.SUCCESS,
			description: `${msg.suffix && msg.suffix !== "" ? msg.suffix : "🙊"}`,
		},
		disableEveryone: true,
	});
};
