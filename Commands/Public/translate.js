const ArgParser = require("./../../Modules/MessageUtils/Parser");
const mstranslate = require("./../../Modules/MicrosoftTranslate");

module.exports = ({ Constants: { Colors, Text }, client }, { serverDocument }, msg, commandData) => {
	const args = ArgParser.parseQuoteArgs(msg.suffix || "", " ");
	if (args.length < 3) {
		return msg.sendInvalidUsage(commandData);
	}

	let source, target, text;
	// <source> to <target> <text>
	if (args[1] === "to") {
		[source, , target] = args;
		text = args.splice(3).join(" ").trim();
	// <source> <target> <text>
	} else {
		[source, target] = args;
		text = args.splice(2).join(" ").trim();
	}

	const sendTranslation = (from, to, res) => msg.send({
		embed: {
			color: Colors.RESPONSE,
			title: `Your ${from} text in ${to}:`,
			description: `\`\`\`${res}\`\`\``,
			footer: {
				text: `Translated using Microsoft Translator. The translated text might not be 100% accurate!`,
			},
		},
	});
	const onFail = (err, src) => {
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: `Something went wrong while trying to ${src === null ? "detect your text's langauge" : `translate your ${src} text`}! 😵`,
			},
		});
		if (err) winston.debug(`Failed to ${src === null ? "auto-detect language" : "translate text"} for ${commandData.name} command.`, { svrid: msg.guild.id, chid: msg.channel.id, msgid: msg.id, err });
	};

	if (source === "?") {
		mstranslate.detect({ text }, (err, res) => {
			if (err || !res || res === "") {
				onFail(err, null);
			} else {
				mstranslate.translate({ from: res, to: target, text }, (err2, res2) => {
					if (err2 || !res2) {
						onFail(err2, res);
					} else {
						sendTranslation(res, target, res2);
					}
				});
			}
		});
	} else {
		mstranslate.translate({ text, from: source, to: target }, (err, res) => {
			if (err || !res) {
				onFail(err, source);
			} else {
				sendTranslation(source, target, res);
			}
		});
	}
};
