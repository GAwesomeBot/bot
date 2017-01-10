"use strict";
// ALL CREDITS TO ERIS. This is a copy-paste of their util/Collection.js

class Collection extends Map {

	constructor(baseObject, limit) {
		super();
		this.baseObject = baseObject;
		this.limit = limit;
		if(limit) {
			this.ids = [];
		}
	}

	add(obj, extra) {
		if(this.limit === 0) {
			return (obj instanceof this.baseObject) ? obj : new this.baseObject(obj, extra);
		}
		if(!obj.id && obj.id !== 0) {
			throw new Error("Missing object id");
		}
		const existing = this.get(obj.id);
		if(existing) {
			return existing;
		}
		if(!(obj instanceof this.baseObject)) {
			obj = new this.baseObject(obj, extra);
		}

		this.set(obj.id, obj);

		if(this.limit) {
			this.ids.push(obj.id);
			if(this.ids.length > this.limit) {
				for(const key of this.ids.splice(0, this.ids.length - this.limit)) {
					this.delete(key);
				}
			}
		}
		return obj;
	}

	find(func) {
		for(const item of this) {
			if(func(item[1])) {
				return item[1];
			}
		}
		return null;
	}

	random() {
		if(!this.size) {
			return null;
		}
		const arr = this.ids || Array.from(this.keys());
		return this.get(arr[Math.floor(Math.random() * arr.length)]);
	}

	filter(func) {
		const arr = [];
		for(const item of this) {
			if(func(item[1])) {
				arr.push(item[1]);
			}
		}
		return arr;
	}

	map(func) {
		const arr = [];
		for(const item of this) {
			arr.push(func(item[1]));
		}
		return arr;
	}

	update(obj, extra) {
		if(!obj.id && obj.id !== 0) {
			throw new Error("Missing object id");
		}
		const item = this.get(obj.id);
		if(!item) {
			return this.add(obj, extra);
		}
		item.update(obj, extra);
		return item;
	}

	remove(obj) {
		const item = this.get(obj.id);
		if(!item) {
			return null;
		}
		this.delete(obj.id);
		return item;
	}

	toString() {
		return `[Collection<${this.baseObject.name}>]`;
	}
}

module.exports = Collection;
