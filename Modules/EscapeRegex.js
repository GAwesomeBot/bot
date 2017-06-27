/*
 * Small module to escape things that can be interpreted as a RegExp expression.
 */
/* eslint-disable indent */
const matchOperators = /[|\\{}()[\]^$+*?.]/g;

module.exports = string => {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a string, but received ${typeof string}`);
  }
  return string.replace(matchOperators, "\\$&");
};
