const unirest = require("unirest");
const S = require("string");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
    if (suffix) {
        unirest.get(`http://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(suffix.toLowerCase())}`).header("Accept", "application/json").end(res => {
            if (res.status == 200 && res.body) {
                let embed_fields = [];
                embed_fields.push({
                    name: "**Capture Rate**",
                    value: `${res.body.capture_rate} of 255 (higher is better)`,
                    inline: true
                });
                embed_fields.push({
                    name: "**Base Happiness**",
                    value: res.body.base_happiness,
                    inline: true
                });
                embed_fields.push({
                    name: "**Base Steps To Hatch**",
                    value: res.body.hatch_counter * 255 + 1,
                    inline: true
                });
                embed_fields.push({
                    name: "**Growth Rate**",
                    value: S(res.body.growth_rate.name).capitalize().s,
                    inline: true
                });
                embed_fields.push({
                    name: "**Color / Shape**",
                    value: `${S(res.body.color.name).capitalize().s} ${S(res.body.shape.name).capitalize().s}`,
                    inline: true
                });
                embed_fields.push({
                    name: "**Habitat**",
                    value: res.body.habitat ? S(res.body.habitat.name).capitalize().s : "None",
                    inline: true
                });
                msg.channel.createMessage({
                    embed: {
                        author: {
                            name: res.body.names[0].name
                        },
                        color: 0x00FF00,
                        footer: {
                            text: res.body.gender_rate === -1 ? `${res.body.names[0].name} is a genderless Pokémon.` : `${(res.body.gender_rate / 8) * 100}% Female and ${((8 - res.body.gender_rate) / 8) * 100}% Male`
                        },
                        thumbnail: {
                            url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${res.body.id}.png`
                        },
                        description: `First Seen In Generation: **${res.body.generation.name.substring(res.body.generation.name.indexOf("-") + 1).toUpperCase()}**`,
                        fields: embed_fields
                    }
                });
            } else {
                winston.warn(`No Pokédex data found for \`${suffix}\``, {
                    svrid: msg.channel.guild.id,
                    chid: msg.channel.id,
                    usrid: msg.author.id
                });
                msg.channel.createMessage({
                    embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
                        description: "Something happened...RIP in pieces."
                    }
                });
            }
        });
    } else {
        winston.warn(`Parameters not provided for '${commandData.name}' command`, {
            svrid: msg.channel.guild.id,
            chid: msg.channel.id,
            usrid: msg.author.id
        });
        msg.channel.createMessage({
            embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
                description: `:speak_no_evil: :writing_hand: :1234:`
            }
        });
    }
};
