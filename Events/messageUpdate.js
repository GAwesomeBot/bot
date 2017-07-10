let runExtension = require("./../Modules/ExtensionRunner.js"), checkFiltered = require("./../Modules/FilterChecker.js");

/*
 * Message edited by author
 */
 module.exports = (bot, db, winston, msg, oldMsg) => {
   if(msg && oldMsg && msg.channel.guild && msg.author.id != bot.user.id && !msg.author.bot) {
     // Obtain server data
     db.servers.findOne({_id: msg.channel.guild.id}, (err, serverDocument) => {
       if(!err && serverDocument) {
         //Check if clean content changed *hopefully*
         if(msg.cleanContent && oldMsg.content && msg.cleanContent != oldMsg.content) {
           let memberBotAdmin = bot.getUserBotAdmin(msg.channel.guild, serverDocument, msg.member);
           //Send message_edited_message if necessary
           if(serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.status_messages.message_edited_message.isEnabled && serverDocument.config.moderation.status_messages.message_edited_message.enabled_channel_ids.includes(msg.channel.id)) {
             winston.info(`Message by member '${msg.author.username}' on server '${msg.channel.guild.name}' edited`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
             // Send message in different channel
             if(serverDocument.config.moderation.status_messages.message_edited_message.type == "single" && serverDocument.config.moderation.status_messages.message_edited_message.channel_id) {
               let ch = msg.channel.guild.channels.get(serverDocument.config.moderation.status_messages.message_edited_message.channel_id);
               if(ch) {
                 let targetChannelDocument = serverDocument.channels.id(ch.id);
                 if(!targetChannelDocument || targetChannelDocument.bot_enabled) {
                   ch.createMessage(`Message by **@${bot.getName(msg.channel.guild, serverDocument, msg.member)}** in #${msg.channel.name} edited. Original:\n\`\`\`${oldMsg.content}\`\`\`Updated:\n\`\`\`${msg.cleanContent}\`\`\``, {disable_everyone: true});
                 }
               }
             } else if(serverDocument.config.moderation.status_messages.message_edited_message.type == "msg") {
               let channelDocument = serverDocument.channels.id(msg.channel.id);
               if(!channelDocument || channelDocument.bot_enabled) {
                 msg.channel.createMessage(`Message by **@${bot.getName(msg.channel.guild, serverDocument, msg.member)}** edited. Original:\n\`\`\`${oldMsg.content}\`\`\`Updated:\n\`\`\`${msg.cleanContent}\`\`\``, {disable_everyone: true});
               }
             }
           }
           // Check if the new message has a filtered word
           if(checkFiltered(serverDocument, msg.channel, msg.cleanContent, false, true)) {
             // Get member data for this server
             let memberDocument = serverDocument.members.id(msg.author.id);
             // Create member data if not found
             if(!memberDocument) {
               serverDocument.members.push({_id: msg.author.id});
               memberDocument = serverDocument.members.id(msg.author.id);
             }
             //Delete offending message if necessary
             if(serverDocument.config.moderation.filters.custom_filter.delete_message) {
               msg.delete().catch(err => {
                 winston.error(`Failed to delete filtered message from member '${msg.author.username}' in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
               })
             }
             //Get user data
             db.users.findOrCreate({_id: msg.author.id}, (err, userDocument) => {
               if(!err && userDocument) {
                 // Handle this as a violation
                 bot.handleViolation(winston, msg.channel.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You used a filtered word in #${msg.channel.name} on ${msg.channel.guild.name}`, `**@${bot.getName(msg.channel.guild, serverDocument, msg.member, true)}** used a filtered word (edited: \`${msg.cleanContent}\`) in #${msg.channel.name} on ${msg.channel.guild.name}`, `Word filter violation (edited: "${msg.cleanContent}") in #{msg.channel.name}`, serverDocument.config.moderation.filters.custom_filter.action, serverDocument.config.moderation.filters.custom_filter.violator_role_id);
               } else {
                 winston.error("Failed to find or create user data for message edit filter violation", {usrid: msg.author.id}, err);
               }
             });
           }
           // Apply keyword extension again
           for(let i=0; i<serverDocument.extensions.length; i++) {
 						if(serverDocument.extensions[i].type == "keyword" && memberBotAdmin >= serverDocument.extensions[i].admin_level && serverDocument.extensions[i].enabled_channel_ids.includes(msg.channel.id)) {
 							const keywordMatch = msg.content.containsArray(serverDocument.extensions[i].keywords, serverDocument.extensions[i].case_sensitive);
 							if(((serverDocument.extensions[i].keywords.length>1 || serverDocument.extensions[i].keywords[0]!="*") && keywordMatch.selectedKeyword>-1) || (serverDocument.extensions[i].keywords.length==1 && serverDocument.extensions[i].keywords[0]=="*")) {
 								winston.info(`Treating '${msg.cleanContent}' as a trigger for keyword extension '${serverDocument.extensions[i].name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
                runExtension(bot, db, winston, msg.channel.guild, serverDocument, msg.channel, serverDocument.extensions[i], msg, null, keywordMatch);
              }
            }
          }
         }
       } else {
         winston.error("Failed to find server data for message", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
       }
     });
   }
 };

 // Check if string contains at least one element in an array
 Object.assign(String.prototype, {
   containsArray(arr, isCaseSensitive) {
     let selectedKeyword = -1, keywordIndex = -1;
     for(let i = 0; i < arr.length; i++) {
       if(isCaseSensitive && this.includes(arr[i])) {
         selectedKeyword = i;
         keywordIndex = this.indexOf(arr[i]);
         break;
       } else if(!isCaseSensitive && this.toLowerCase().includes(arr[i].toLowerCase())) {
         selectedKeyword = i;
         keywordIndex = this.toLowerCase().indexOf(arr[i].toLowerCase());
         break;
       }
     }
     return {
       selectedKeyword,
       keywordIndex
     };
   }
 });
