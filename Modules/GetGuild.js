const getGuild = (bot, guildID, settings) => {
  return new Promise((resolve, reject) => {
    const listener = msg => {
      if (!msg || msg.guild !== guildID || msg.settings !== settings) return;
      if (msg.err) reject(msg.err);
      bot.IPC.removeListener("getGuildRes", listener);
      resolve(msg.result);
    }
    bot.IPC.on("getGuildRes", listener)
    
    bot.IPC.send("getGuild", { guild: guildID, settings: settings }).catch(err => {
      bot.IPC.removeListener("getGuildRes", listener);
      reject(err);
    });
  })
}

const generateGuild = (guild, settings) => {
  let gguild = JSON.parse(JSON.stringify(guild));
  if (settings.resolve && settings.resolve instanceof Array) {
    for (let getter of settings.resolve) {
      gguild[getter] = guild[getter];
    }
  }
  if (settings.roles && settings.roles instanceof Array) {
    gguild.roles = {};
    guild.roles.forEach((val, key) => {
      gguild.roles[key] = JSON.parse(JSON.stringify(val));
      for (let getter of settings.roles) {
        gguild.roles[key][getter] = val[getter];
      }
    });
  }
  if (settings.channels && settings.channels instanceof Array) {
    gguild.channels = {};
    guild.channels.forEach((val, key) => {
      gguild.channels[key] = JSON.parse(JSON.stringify(val));
      for (let getter of settings.channels) {
        gguild.channels[key][getter] = val[getter];
      }
    });
  }
  if (settings.members && settings.members instanceof Array) {
    gguild.members = {};
    guild.members.forEach((val, key) => {
      gguild.members[key] = JSON.parse(JSON.stringify(val));
      for (let getter of settings.members) {
        gguild.members[key][getter] = val[getter];
      }
    });
  }
  return gguild;
};

module.exports = {
  getGuild: getGuild,
  generateGuild: generateGuild,
};

