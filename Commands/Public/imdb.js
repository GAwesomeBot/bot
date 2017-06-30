const unirest = require("unirest");
const S = require("string");
const auth = require("./../../Configuration/auth.json");

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let type = "";
	if (suffix.toLowerCase().indexOf("series ") === 0 || suffix.toLowerCase().indexOf("episode ") === 0 || suffix.toLowerCase().indexOf("movie ") === 0) {
		type = `&type=${suffix.substring(0, suffix.indexOf(" ")).toLowerCase()}`;
		suffix = suffix.substring(suffix.indexOf(" ") + 1);
	}
	const m = await msg.channel.createMessage({
		embed: {
			color: 0x9ECDF2,
			description: `Please stand by.. We're searching your requested movie on IMDB`,
			footer: {
				text: `If this doesn't update.. Its probably broken..`,
			},
		},
	});
	if (auth.tokens.omdb_api) {
		if (suffix) {
			const api = `http://www.omdbapi.com/?apikey=${auth.tokens.omdb_api}&t=${encodeURIComponent(suffix)}&r=json${type}`;
			unirest.get(api).header("Accept", "application/json").end(res => {
				if (res.status === 200 && res.body.Response === "True") {
					let fields = [
						{
							name: `Year:`,
							value: `${res.body.Year}`,
							inline: true,
						},
					];
					for (let i = 0; i < res.body.Ratings.length; i++) {
						fields.push({
							name: `"${res.body.Ratings[i].Source}":`,
							value: `Rated ${res.body.Ratings[i].Value}`,
							inline: true,
						});
					}
					fields.push(
						{
							name: `Runtime:`,
							value: `${res.body.Runtime}`,
							inline: true,
						},
						{
							name: `Actors:`,
							value: `\`\`\`css\n${res.body.Actors.replaceAll(", ", "\n")}\`\`\``,
							inline: true,
						},
						{
							name: `Director:`,
							value: `${res.body.Director}`,
							inline: true,
						},
						{
							name: `Writer:`,
							value: `\`\`\`css\n${res.body.Writer.replaceAll(", ", "\n")}\`\`\``,
							inline: true,
						},
						{
							name: `Genre(s):`,
							value: `\`\`\`css\n${res.body.Genre.replaceAll(", ", "\n")}\`\`\``,
							inline: true,
						},
						{
							name: `Awards:`,
							value: `${res.body.Awards}`,
							inline: true,
						},
						{
							name: `Country:`,
							value: `${res.body.Country}`,
							inline: true,
						}
					);
					return m.edit({
						embed: {
							color: 0x00FF00,
							author: {
								name: `${res.body.Title}${type ? "" : ` (${S(res.body.Type).capitalize().s})`}`,
								url: `http://www.imdb.com/title/${res.body.imdbID}/`,
							},
							description: `\`\`\`css\n${res.body.Plot}\`\`\``,
							footer: {
								text: `Rating: ${res.body.imdbRating} out of ${res.body.imdbVotes} votes`,
							},
							fields: fields,
							image: {
								url: res.body.Poster !== "N/A" ? res.body.Poster : "",
							},
						},
					});
				} else {
					winston.warn(`No IMDB entries found for "${suffix}"`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
					return m.edit({
						embed: {
							color: 0xFF0000,
							description: `Nothing found in IMDB.. 😶🚫`,
							footer: {
								text: `You can try again with a different movie title!`,
							},
						},
					});
				}
			});
		} else {
			return m.edit({
				embed: {
					color: 0xFF0000,
					description: `You need to tell me what movie I should look for!`,
					footer: {
						text: `Remember, the command usage is "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}"`,
					},
				},
			});
		}
	} else {
		return m.edit({
			embed: {
				color: 0xFF0000,
				description: `I'm sorry but I am not able to search your movie on IMDB...`,
				footer: {
					text: `Please tell the bot owner that the IMDB key is missing.. Without that, I cannot do my magic!`,
				},
			},
		});
	}
};
