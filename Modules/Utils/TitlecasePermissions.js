module.exports = str => str.replace(/\w+(_\w+)*/g, match => match.split("_").map(v => `${v.charAt(0)}${v.substr(1).toLowerCase()}`).join(" "));
