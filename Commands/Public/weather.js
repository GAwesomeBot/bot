const { get } = require("snekfetch");
const auth = require("../../Configurations/auth");

module.exports = async ({ Constants: { APIs, Colors, Text }, client }, documents, msg, commandData) => {
	if (!msg.suffix) {
		await msg.sendInvalidUsage(commandData, "It's always raining bytes in robot land 🌞", "You must supply a city to lookup!");
		return;
	}
	if (!auth.tokens.openWeatherMap) {
		await msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: "The weather command is not available on this bot. 🌧️",
			},
		});
	} else {
		const { body, statusCode } = await get(APIs.WEATHER(auth.tokens.openWeatherMap, msg.suffix)).catch(err => err);
		if (statusCode === 200) {
			const fields = [{
				name: "🌡️ Temperature",
				value: `🔺 Max: **${body.main.temp_max}C°**\n➖ Average: **${body.main.temp}C°**\n🔻 Min: **${body.main.temp_min}C°**`,
				inline: true,
			}, {
				name: "💧 Humidity",
				value: `**${body.main.humidity}%**`,
				inline: true,
			}];
			if (body.clouds) fields.push({ name: "☁️ Clouds", value: `**${body.clouds.all}%** cloudiness`, inline: true });
			if (body.rain) fields.push({ name: "🌧️ Rain", value: `**${body.rain["3h"] || body.rain["1h"] || 0}mm** in the last 3 hours`, inline: true });
			if (body.snow) fields.push({ name: "🌨️ Snow", value: `**${body.snow["3h"] || body.snow["1h"] || 0}mm** in the last 3 hours`, inline: true });
			if (body.wind && body.wind.speed) fields.push({ name: "💨 Wind", value: `**${body.wind.speed}** meters per second`, inline: true });
			const description = body.weather[0].description.split(" ").map(word => `${word.charAt(0).toUpperCase()}${word.substring(1)}`).join(" ");
			await msg.send({
				embed: {
					color: Colors.RESPONSE,
					title: `Current weather for ${body.name}, ${body.sys.country}`,
					description: `**${description}**`,
					fields,
					thumbnail: {
						url: `https://openweathermap.org/img/w/${body.weather[0].icon}.png`,
					},
				},
			});
		} else {
			await msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `There's a thunderstorm in the server room! ⛈️`,
				},
			});
		}
	}
};
