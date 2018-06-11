const LEFT = "l";
const RIGHT = "r";
const CENTER = "c";
const COLON = ":";
const DASH = "-";
const DOT = ".";
const NULL = "";

const ALLIGNMENT = [LEFT, RIGHT, CENTER, DOT, NULL];

const EXPRESSION_DOT = /\./;
const EXPRESSION_LAST_DOT = /\.[^.]*$/;

class MarkdownTable {
	constructor (array) {
		this.table = array;

		this.delimiter = " | ";
		this.start = "| ";
		this.end = " |";


		this.cellCount = 0;
		this.rowIndex = -1;
		this.MIN_CELL_SIZE = 3;
		this.rowLength = array.length;
		this.sizes = [];

		this.align = null;
		this.rule = null;
		this.rows = null;
		this.row = null;
		this.cells = null;
		this.index = null;
		this.position = null;
		this.size = null;
		this.value = null;
		this.spacing = null;
		this.before = null;
		this.after = null;

		this.alignment = "c".concat();
	}

	makeTable () {
		while (++this.rowIndex < this.rowLength) {
			this.row = this.table[this.rowIndex];
			this.index = -1;

			if (this.row.length > this.cellCount) this.cellCount = this.row.length;

			while (++this.index < this.cellCount) {
				this.position = this.row[this.index] ? this.dotindex(this.row[this.index]) : null;

				if (!this.sizes[this.index]) {
					this.sizes[this.index] = this.MIN_CELL_SIZE;
				}

				if (this.position > this.sizes[this.index]) {
					this.sizes[this.index] = this.position;
				}
			}

			if (typeof this.alignment === "string") this.alignment = this.pad(this.cellCount, this.alignment).split("");

			this.index = -1;

			while (++this.index < this.cellCount) {
				this.align = this.alignment[this.index];

				if (typeof this.align === "string") {
					this.align = this.align.charAt(0).toLowerCase();
				}

				if (!ALLIGNMENT.includes(this.align)) {
					this.align = null;
				}

				this.alignment[this.index] = this.align;
			}

			this.rowIndex = -1;
			this.rows = [];
			while (++this.rowIndex < this.rowLength) {
				this.row = this.table[this.rowIndex];

				this.index = -1;
				this.cells = [];

				while (++this.index < this.cellCount) {
					this.value = this.row[this.index];

					this.value = this.stringify(this.value);

					if (this.alignment[this.index] === DOT) {
						this.position = this.dotindex(this.value);

						this.size = this.sizes[this.index] +
							(EXPRESSION_DOT.test(this.value) ? 0 : 1) -
							(this.getStringLength(this.value) - this.position);
						this.cells[this.index] = this.value + this.pad(this.size - 1);
					} else {
						this.cells[this.index] = this.value;
					}
				}
				this.rows[this.rowIndex] = this.cells;
			}

			this.sizes = [];
			this.rowIndex = -1;

			while (++this.rowIndex < this.rowLength) {
				this.cells = this.rows[this.rowIndex];

				this.index = -1;

				while (++this.index < this.cellCount) {
					this.value = this.cells[this.index];

					if (!this.sizes[this.index]) {
						this.sizes[this.index] = this.MIN_CELL_SIZE;
					}

					this.size = this.getStringLength(this.value);

					if (this.size > this.sizes[this.index]) {
						this.sizes[this.index] = this.size;
					}
				}
			}

			this.rowIndex = -1;

			while (++this.rowIndex < this.rowLength) {
				this.cells = this.rows[this.rowIndex];

				this.index = -1;
				while (++this.index < this.cellCount) {
					this.value = this.cells[this.index];

					this.position = this.sizes[this.index] - (this.getStringLength(this.value) || 0);
					this.spacing = this.pad(this.position);

					if (this.alignment[this.index] === RIGHT || this.alignment[this.index] === DOT) {
						this.value = this.spacing + this.value;
					} else if (this.alignment[this.index] === CENTER) {
						this.position /= 2;

						if (this.position % 1 === 0) {
							this.before = this.position;
							this.after = this.position;
						} else {
							this.before = this.position + 0.5;
							this.after = this.position - 0.5;
						}

						this.value = this.pad(this.before) + this.value + this.pad(this.after);
					} else {
						this.value += this.spacing;
					}

					this.cells[this.index] = this.value;
				}


				this.rows[this.rowIndex] = this.cells.join(this.delimiter);
			}
		}
		this.index = -1;
		this.rule = [];

		while (++this.index < this.cellCount) {
			this.value = this.table[0][this.index];
			this.spacing = this.getStringLength(this.stringify(this.value));
			this.spacing = this.spacing > this.MIN_CELL_SIZE ? this.spacing : this.MIN_CELL_SIZE;


			this.align = this.alignment[this.index];

			/* When `align` is left, don't add colons. */
			this.value = this.align === RIGHT || this.align === NULL ? DASH : COLON;
			this.value += this.pad(this.spacing - 2, DASH);
			this.value += this.align !== LEFT && this.align !== NULL ? COLON : DASH;

			this.rule[this.index] = this.value;
		}

		this.rows.splice(1, 0, this.rule.join(this.delimiter));

		return this.start + this.rows.join(`${this.end}\n${this.start}`) + this.end;
	}

	dotindex (value) {
		const match = EXPRESSION_LAST_DOT.exec(value);

		return match ? match.index + 1 : value.length;
	}

	pad (length, char) {
		return Array(length + 1).join(char || " ");
	}

	stringify (value) {
		return value === null || value === undefined ? "" : String(value);
	}

	getStringLength (s) {
		return String(s).length;
	}
}

module.exports = MarkdownTable;
