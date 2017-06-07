const Eris = require("eris"); //eslint-disable-line

module.exports = winston => {
  /* eslint-disable */ // (╯°□°）╯︵ ┻━┻
  let property_count = 4;
  winston.info(`Initializing Object.defineProperties`, {property_count: property_count});

  Object.assign(Array.prototype, {
  	spliceNullElements() {
  		for(let i = 0; i < this.length; i++) {
  			if(this[i] == null) {
  				this.splice(i, 1);
  				i--;
  			}
  		}
  	}
  });

  /*
   * Randomised output from an array.
   */
  Object.assign(Array.prototype, {
    random() {
      return this[Math.floor(Math.random() * this.length)];
    }
  });

  /*
   * Replaces every occurences of an string in the string
   * @param {String} target What should be replaced
   * @param {String} replacement What should target get replaced with
   * Think of using RegExp for /string/g, although we recommend using that
   */
  Object.assign(String.prototype, {
  	replaceAll(target, replacement) {
  		return this.split(target).join(replacement);
  	}
  });

  /*
   * Check if a string contains at least one element in an array
   * @param {Array} arr The array containing elements
   * @param {Boolean} isCaseSensitive If case sensitivity matters
   * @returns {?Object}
   */
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

};
