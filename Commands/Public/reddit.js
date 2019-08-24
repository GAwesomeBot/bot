const moment = require("moment");
const { get } = require("snekfetch");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { Colors, Text, APIs, EmptySpace } }, documents, msg, commandData) => {
	let subreddit = msg.suffix;
	if (!subreddit) {
		subreddit = "all";
	} else {
		subreddit = subreddit.replace(/^\/?r\//, "");
	}
	const { body, statusCode, statusText, headers } = await get(APIs.REDDIT(subreddit), { followRedirects: false }).catch(e => e);
	if (body) {
		if (!body.data) {
			let description;
			switch (body.reason) {
				case "banned":
					description = "This subreddit has been banned by the Reddit Admins 🚫";
					break;
				case "private":
					description = "This subreddit has been set to private by its moderators 🤐";
					break;
				default:
					if (body.message === "Forbidden" && body.error === 403) {
						description = "This subreddit has been quarantined by the Reddit Admins 😱";
					} else if (statusCode === 302) {
						description = "This subreddit does not seem to exist.";
					} else {
						logger.debug(`Failed to fetch Reddit results`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, statusCode, err: statusText });
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
		body.data.children.forEach(({ data }) => {
			if (!msg.channel.nsfw && data.over_18) {
				nsfwFiltered++;
				return;
			}
			const description = `**__${data.title}__**${data.gilded ? ` ⭐**${data.gilded}**` : ""}${data.stickied ? " 📌" : ""}\n\n${data.selftext || data.url}`;
			descriptions.push(description.length > 2040 ? `${description.substring(0, 2040)}...` : description);
			thumbnails.push(!["default", "self"].includes(data.thumbnail) ? data.thumbnail : null);
			const meta = [
				`Submitted ${moment.unix(data.created_utc).fromNow()} by [${data.author}](https://www.reddit.com/user/${data.author})${data.subreddit !== subreddit ? ` to [r/${data.subreddit}](https://www.reddit.com/r/${data.subreddit})` : ""}`,
				`With ${data.num_comments} comments and ${data.score} points so far`,
				`[**permalink**](https://www.reddit.com${data.permalink})`,
			];
			fields.push([
				{
					name: EmptySpace,
					value: meta.join("\n"),
					inline: false,
				},
			]);
		});

		if (!descriptions.length) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: "Hold on a second! 🛑",
					description: "All results were filtered for being marked NSFW. If you want to see them go to a NSFW channel or ask an Admin to make this channel NSFW.",
				},
			});
		}
		await new PaginatedEmbed(msg, {
			color: Colors.RESPONSE,
			title: `Submission {currentPage} out of {totalPages} in r/${subreddit}`,
			footer: nsfwFiltered ? `${nsfwFiltered} post${nsfwFiltered > 1 ? "s were" : " was"} filtered for being marked NSFW as this channel is not marked as such.` : "",
		}, {
			descriptions,
			fields,
			thumbnails,
		}).init();
	} else {
		logger.debug(`Failed to fetch Reddit results`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, statusCode, err: statusText });
		msg.send({
			embed: {
				color: Colors.ERROR,
				title: Text.ERROR_TITLE(),
				description: `I was unable to fetch results from Reddit!`,
			},
		});
	}
};
