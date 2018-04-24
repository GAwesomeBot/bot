const moment = require("moment");
const { get } = require("snekfetch");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { Colors, Text, APIs, EmptySpace } }, { serverDocument }, msg, commandData) => {
	let subreddit = msg.suffix;
	if (!subreddit) {
		subreddit = "all";
	} else {
		subreddit = subreddit.replace(/^\/?r\//, "");
	}
	const { body, status, statusText, headers } = await get(APIs.REDDIT(subreddit), { followRedirects: false }).catch(e => e);
	if (body) {
		if (!body.data) {
			let description;
			switch (body.reason) {
				case "banned":
					description = "This subreddit has been banned by the reddit Admins 🚫";
					break;
				case "private":
					description = "This subreddit has been set to private by its moderators 🤐";
					break;
				default:
					if (body.message === "Forbidden" && body.error === 403) {
						description = "This subreddit has been quarantined by the reddit Admins 😱";
					} else if (status === 302) {
						description = "This subreddit does not seem to exist.";
					} else {
						winston.debug(`Failed to fetch reddit results`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, status, err: statusText });
						description = "There was an unknown error while fetching your results.";
					}
					break;
			}
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: "What's that? 🤔",
					description,
				},
			});
		} else if (!body.data.children.length) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: "Nothing to see here!",
					description: "There are no posts in this subreddit yet.",
				},
			});
		}

		const descriptions = [];
		const fields = [];
		const thumbnails = [];
		let nsfwFiltered = 0;
		body.data.children.forEach(s => {
			s = s.data;
			if (!msg.channel.nsfw && s.over_18) {
				nsfwFiltered++;
				return;
			}
			let description = `**__${s.title}__**${s.gilded ? ` ⭐**${s.gilded}**` : ""}${s.stickied ? " 📌" : ""}\n\n${s.selftext || s.url}`;
			descriptions.push(description.length > 2040 ? `${description.substring(0, 2040)}...` : description);
			thumbnails.push(!["default", "self"].includes(s.thumbnail) ? s.thumbnail : null);
			const meta = [
				`Submitted ${moment.unix(s.created_utc).fromNow()} by [${s.author}](https://www.reddit.com/user/${s.author})${s.subreddit !== subreddit ? ` to [r/${s.subreddit}](https://www.reddit.com/r/${s.subreddit})` : ""}`,
				`With ${s.num_comments} comments and ${s.score} points so far`,
				`[**permalink**](https://www.reddit.com${s.permalink})`,
			];
			fields.push([{
				name: EmptySpace,
				value: meta.join("\n"),
				inline: false,
			}]);
		});

		if (!descriptions.length) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: "Hold on a second! 🛑",
					description: "All results were filtered for being marked NSFW. If you want to see them go to an NSFW channel or ask an Admin to make this channel NSFW.",
				},
			});
		}
		const menu = new PaginatedEmbed(msg, descriptions, {
			color: Colors.RESPONSE,
			title: `Submission {current description} out of {total descriptions} in r/${subreddit}`,
			footer: nsfwFiltered ? `${nsfwFiltered} post${nsfwFiltered > 1 ? "s were" : " was"} filtered for being marked NSFW as this channel is not marked as such.` : "",
		}, [], fields, thumbnails);
		await menu.init();
	} else {
		winston.debug(`Failed to fetch reddit results`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, status, err: statusText });
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: Text.COMMAND_ERR(),
				description: `I was unable to fetch results from reddit!`,
			},
		});
	}
};
