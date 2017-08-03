module.exports = (bot, val, merge, func) => {
  try {
    let code = `this.${val}`
    if (func) {
      code = `${func}(this.${val})`
    }
    return new Promise((resolve, reject) => {
      const listener = message => {
        if (!message || message._SEval !== code) return;
        process.removeListener('message', listener);
        if (!message._error) resolve(message._result); else reject(Util.makeError(message._error));
      };
      process.on('message', listener);

      process.send({ _SEval: code }, err => {
        if (err) {
          process.removeListener('message', listener);
          reject(err);
        }
      });
    }).then(res => {
      switch(merge) {
        case "int":
          return res.reduce((prev, val) => prev + val, 0);
          break;
        case "obj":
          return res.reduce((prev, val) => Object.assign(prev, val), {});
          break;
        case "arr":
          return res.reduce((prev, val) => prev.concat(val), []);
          break;
        case "map":
          return res.map((val) => new Map(val))
          break;
        default:
          return res;
          break;
      }
    }).catch(err => {
      winston.warn("An error occurred while fetching shard data! u.u\n", err)
    })
  } catch (err) {
    winston.warn("An error occurred while fetching shard data! u.u\n", err)
  }
}