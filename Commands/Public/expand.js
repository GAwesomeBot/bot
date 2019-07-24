const { get } = require("snekfetch");
const { IsURL } = require("../../Modules/Utils/index");

const rawReasonToUserFriendly = {
	MALWARE_OR_VIRUS: `Malware or viruses`,
	POOR_CUSTOMER_EXPERIENCE: `Poor customer experience`,
	PHISHING: `Phishing`,
	SCAM: `Scamming`,
	POTENTIALLY_ILLEGAL: `Potentially illegal`,
	MISLEADING_CLAIMS_OR_UNETHICAL: `Misleading claims or unethical`,
	PRIVACY_RISKS: `Privacy risks`,
	SUSPICIOUS: `Suspicious`,
	HATE_DISCRIMINTATION: `Hate, discrimination`,
	SPAM: `Spam`,
	PUP: `Potentially unwanted programs`,
	ADS_POPUPS: `Ads / pop-ups`,
	ONLINE_TRACKING: `Online tracking`,
	ALTERNATIVE_OR_CONTROVERSIAL_NATURE: `Alternative or controversial medicine`,
	OPINIONS_RELIGION_POLITICS: `Opinions, religion, politics`,
	OTHER: `Other`,
	ADULT_CONTENT: `Adult content`,
	INCIDENTAL_NUDITY: `Incidental nudity`,
	GRUESOM_OR_SHOCKING: `Gruesome or shocking`,
	UNSAFE_LINK: `Unsafe Link`,
	REDIRECT_COUNT: `Too many redirects`,
	PHISHTANK: `Phishtank`,
};

module.exports = async ({ Constants: { Colors, Text, APIs } }, documents, msg, commandData) => {
	if (msg.suffix) {
		if (IsURL(msg.suffix)) {
			await msg.send({
				embed: {
					description: `We're checking the redirects for the provided URL`,
					color: Colors.INFO,
				},
			});
			let res;
			try {
				res = await get(APIs.SPOOPYLINK(msg.suffix));
				if (res.body && res.body.chain.length) {
					let color = Colors.GREEN;
					if (!res.body.safe) color = Colors.RED;
					const description = [];
					for (const chain of res.body.chain) {
						const tempString = [
							`» **<${chain.url}>**`,
							`\tSafe: ${chain.safe ? "Yes" : "No"}`,
						];
						if (!chain.safe) tempString.push(`\tReason: ${chain.reasons.map(r => rawReasonToUserFriendly[r] || r).join(", ")}`);
						description.push(tempString.join("\n"));
					}
					msg.send({
						embed: {
							color,
							author: {
								name: `Results provided by spoopy.link`,
								url: `https://spoopy.link`,
							},
							thumbnail: {
								url: `https://raw.githubusercontent.com/spoopy-link/site/master/logo.png`,
							},
							description: `Here is the redirect path for \`${msg.suffix}\`\n\n${description.join("\n\n")}`,
							footer: {
								text: res.body.safe ? "" : `We don't recommend clicking on any of the URLs that aren't marked as "Safe". They can be malicious!`,
							},
						},
					});
				}
			} catch (err) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: Text.ERROR_TITLE(),
						description: `Here is the error I got: \`\`\`js\n${err.body.error}\`\`\``,
					},
				});
			}
		} else {
			logger.verbose(`Invalid parameter received for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.sendInvalidUsage(commandData, "That doesn't seem right to me. 🤔");
		}
	} else {
		logger.verbose(`URL not provided for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.sendInvalidUsage(commandData, "What URL would you want to expand today?");
	}
};
