const fs = require("fs");

module.exports = filePath => fs.promises.access(filePath).then(() => true).catch(() => false);
