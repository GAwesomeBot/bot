// Manages server modlog entries
const getUserText = usr => {
    return `${usr.username}#${usr.discriminator} <${usr.id}>`;
};

const getEntryText = (id, type, affected_user_str, creator_str, reason) => {
    let fields = [
        {
            name: `🔨 **Case ${id}**:`,
            value: `${type}`,
            inline: true
        }
    ];
    if(affected_user_str) {
        fields.push({
            name: `👤 **User**:`,
            value: `${affected_user_str}`,
            inline: true
        });
    }
    if(creator_str) {
        fields.push({
            name: `🐬 **Moderator**:`,
            value: `${creator_str}`,
            inline: true
        });
    }
    if(reason) {
        fields.push({
            name: `❓ **Reason**:`,
            value: `${reason}`,
            inline: true
        });
    }
    return fields;
};

module.exports = {
    create: (svr, serverDocument, type, member, creator, reason, callback) => {
        if(serverDocument.modlog.isEnabled && serverDocument.modlog.channel_id) {
            const ch = svr.channels.get(serverDocument.modlog.channel_id);
            if(ch && ch.type==0) {
                let affected_user_str;
                if(member) {
                    affected_user_str = getUserText(member.user);
                }
                let creator_str;
                if(creator) {
                    creator_str = getUserText(creator.user);
                }
                ch.createMessage({
                    embed: {
                        fields: getEntryText(++serverDocument.modlog.current_id, type, affected_user_str, creator_str, reason),
                        color: 0x9ECDF2
                    },
                    disableEveryone: true
                }).then(message => {
                    serverDocument.modlog.entries.push({
                        _id: serverDocument.modlog.current_id,
                        type,
                        affected_user: affected_user_str,
                        creator: creator_str,
                        message_id: message.id,
                        reason
                    });
                    serverDocument.save(err => {
                        if(callback) {
                            callback(err, serverDocument.modlog.current_id);
                        }
                    });
                }).catch(callback);
            } else {
                if(callback) {
                    callback(new Error("Invalid modlog channel"));
                }
            }
        } else {
            if(callback) {
                callback(new Error("Modlog is not enabled"));
            }
        }
    },
    update: (svr, serverDocument, id, data, callback) => {
        if(serverDocument.modlog.isEnabled && serverDocument.modlog.channel_id) {
            const modlogEntryDocument = serverDocument.modlog.entries.id(id);
            if(modlogEntryDocument) {
                if(data.creator!=null) {
                    modlogEntryDocument.creator = getUserText(data.creator.user);
                }
                if(data.reason!=null) {
                    modlogEntryDocument.reason = data.reason;
                }
                const ch = svr.channels.get(serverDocument.modlog.channel_id);
                if(ch && ch.type==0) {
                    ch.getMessage(modlogEntryDocument.message_id).then(message => {
                        message.edit({
                            embed: {
                                fields: getEntryText(modlogEntryDocument._id, modlogEntryDocument.type, modlogEntryDocument.affected_user, modlogEntryDocument.creator, modlogEntryDocument.reason),
                                color: 0x9ECDF2
                            }
                        }, true).then(() => {
                            serverDocument.save(err => {
                                if(callback) {
                                    callback(err);
                                }
                            });
                        }).catch(callback);
                    }).catch(callback);
                } else {
                    if(callback) {
                        callback(new Error("Invalid modlog channel"));
                    }
                }
            } else {
                if(callback) {
                    callback(new Error(`Modlog entry with case ID ${id} not found`));
                }
            }
        } else {
            if(callback) {
                callback(new Error("Modlog is not enabled"));
            }
        }
    },
    delete: (svr, serverDocument, id, callback) => {
        if(serverDocument.modlog.isEnabled && serverDocument.modlog.channel_id) {
            const modlogEntryDocument = serverDocument.modlog.entries.id(id);
            if(modlogEntryDocument) {
                const ch = svr.channels.get(serverDocument.modlog.channel_id);
                if(ch && ch.type==0) {
                    ch.getMessage(modlogEntryDocument.message_id).then(message => {
                        message.delete().then(() => {
                            modlogEntryDocument.remove();
                            serverDocument.save(err => {
                                if(callback) {
                                    callback(err);
                                }
                            });
                        }).catch(callback);
                    }).catch(callback);
                } else {
                    if(callback) {
                        callback(new Error("Invalid modlog channel"));
                    }
                }
            } else {
                if(callback) {
                    callback(new Error(`Modlog entry with case ID ${id} not found`));
                }
            }
        } else {
            if(callback) {
                callback(new Error("Modlog is not enabled"));
            }
        }
    }
};
