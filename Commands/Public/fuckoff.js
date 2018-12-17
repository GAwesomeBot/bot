const { create: CreateModLog } = require("../../Modules/ModLog");
const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async (
  { client, Constants: { Colors, Text }, configJS },
  { serverDocument },
  msg,
  commandData
) => {
  if (msg.suffix) {
    let [inputMember, ...reason] = ArgParser.parseQuoteArgs(
      msg.suffix,
      msg.suffix.includes(" ")
    );
    const isJustUserID = /^\d+$/.test(inputMember);
    let isGuildMember = false,
      hasReason = true,
      member = null;
    if (isJustUserID) {
      if (msg.guild.members.has(inputMember)) {
        member = msg.guild.member(inputMember);
        isGuildMember = true;
      } else {
        member = await client.users.fetch(inputMember, true);
      }
    } else {
      member = await client
        .memberSearch(inputMember, msg.guild)
        .catch(() => null);
      if (!member) {
        member = await client
          .memberSearch(`${inputMember} ${reason.join(" ")}`.trim(), msg.guild)
          .catch(() => null);
        hasReason = false;
        if (!member) {
          member = null;
          isGuildMember = false;
        } else {
          isGuildMember = true;
        }
      } else {
        isGuildMember = true;
      }
    }
    reason = "Fuckoff";
    const { canClientBan, memberAboveAffected } = client.canDoActionOnMember(
      msg.guild,
      msg.member,
      (isGuildMember && member) || null,
      "ban"
    );
    if (!canClientBan) {
      return msg.send({
        embed: {
          color: Colors.RED,
          title: `I'm sorry, but I can't do that... 😔`,
          description: `I'm missing permissions to ban that user!\nEither they are above me or I don't have the **Ban Members** permission.`
        }
      });
    }
    if (!memberAboveAffected) {
      return msg.send({
        embed: {
          color: Colors.RED,
          title: `I'm sorry, but I cannot let you do that! 😶`,
          description: `You cannot ban someone who's above you! That's dumb!`
        }
      });
    }
    const banned = async () =>
      msg.send(
        `Congratulations, @${
          isGuildMember ? client.getName(serverDocument, member) : member.tag
        }, you're banned. Now fuck off. https://giphy.com/gifs/explosion-gif-P1GfCFddEo1Wg`
      );
    if (member) {
      if (isGuildMember) {
        member.ban({
          days: 1,
          reason: `${reason} | Command issued by @${msg.author.tag}`
        });
      } else {
        msg.guild.members.ban(member.id, {
          days: 1,
          reason: `${reason} | Command issued by @${msg.author.tag}`
        });
      }
      await dmBanned(member.id);
      await banned();
      await CreateModLog(msg.guild, "Ban", member, msg.author, reason);
      return `${member} has been banned`;
    } else {
      msg.send({
        embed: {
          color: Colors.SOFT_ERR,
          description: `I couldn't find a matching member on this server...`,
          footer: {
            text: `If you have a user ID you can run "${
              msg.guild.commandPrefix
            }${commandData.name} ID" to ban them!`
          }
        }
      });
    }
  } else {
    msg.sendInvalidUsage(commandData, "Do you want me to ban you? 😮");
    const collector = msg.channel.createMessageCollector(
      m => m.author.id === msg.author.id,
      { time: 60000 }
    );
    collector.on("collect", async message => {
      if (message.editedAt) {
        collector.stop();
        return null;
      }
      if (message.content) {
        collector.stop();
        if (
          configJS.yesStrings.includes(message.content.toLowerCase().trim())
        ) {
          try {
            await message.delete();
          } catch (_) {
            // Meh
          }
          msg.send({
            embed: {
              color: Colors.SOFT_ERR,
              description: `Ok! Bye-Bye!`,
              footer: {
                text: `Just kidding! I'd never ban you. ❤️`
              }
            }
          });
        }
      }
    });
  }
};
