const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async (client, serverDocument, msg, commandData) => {
  let inputMember = ArgParser.parseQuoteArgs(
    msg.suffix,
    msg.suffix.includes(" ")
  );
  msg.send(`Initiating DDoS attack on ${inputMember}, please wait...`);
  msg.send(
    `Malicious UDP packets were sent to their IP address, they should be offline now. :)`
  );
};
