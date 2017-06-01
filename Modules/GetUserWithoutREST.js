/*
 * Gets a Eris User through REST without the rest option
 * Credits to TTtie
 */
 /* eslint-disable indent */
 /* eslint-disable arrow-body-style */
 const Endpoints = require("eris/lib/rest/Endpoints");
 const User = require("eris").User;

 module.exports = (bot, usrid) => {
   return bot.requestHandler.request("GET", Endpoints.USER(usrid), true).then(user => new User(user, bot));
 };
