var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
import LoadingState from '../api/LoadingState';
import { enumerable } from '../decorator/enumerable';
import toCamelCase from '../filter/camel-case';
import Resource from '../resource/Resource';
import DataTypes from './DataTypes';
import PlainJson from './PlainJson';
import Relation from './Relation';
let ID = 0;
export default class Model {
    constructor() {
        this.id = null;
        this.type = null;
        this.loadingState = LoadingState.NOT_LOADED;
        this.$rels = {};
        this._ID = ++ID;
        this._requestId = 0;
        this._isClone = false;
        this._original = null;
        this._lastSnapshot = '';
        this._parentRelations = new Set();
        this._numDeserializedAttributes = 0;
        // init attributes
        for (const name of Object.keys(this.class._attributes)) {
            const attr = this.class._attributes[name];
            this[name] = attr.hasOwnProperty('default') ? attr.default : attr.type.value();
        }
        this.type = this.class.type;
        // init relations
        for (const relationName of Object.keys(this.class._relations)) {
            const relationConfig = this.class._relations[relationName];
            this[relationName] = relationConfig.type === Relation.HAS_MANY ? [] : null;
            const { remoteName, Resource: ResourceType } = relationConfig, relationParams = __rest(relationConfig, ["remoteName", "Resource"]); // splice remoteName and Resource
            const relation = new Relation(Object.assign({ owner: this, name: relationName }, relationParams));
            // create resource from config (resource or relation resourse)
            if (ResourceType) {
                relation.Query = new ResourceType(Resource.TYPE_RELATION, relation);
                // create a default resource
            }
            else {
                // reuse existing model resource for has one relations
                if (relation.type === Relation.HAS_ONE && relation.Model && relation.Model.Query) {
                    // clone model resource with our relation
                    relation.Query = relation.Model.Query.clone(relation);
                    // create a default relation resource
                }
                else {
                    relation.Query = new Resource(Resource.TYPE_RELATION, relation);
                }
            }
            this.$rels[relationName] = relation;
        }
        this.init();
    }
    static relations() {
        return {};
    }
    static attributes() {
        return {
            id: DataTypes.String,
            type: DataTypes.String
        };
    }
    /**
     * Relations
     */
    fetchRelationsAfterGet(relationsToFullyFetch = []) {
        for (const relationName of Object.keys(this.$rels)) {
            const relation = this.$rels[relationName];
            if (relationsToFullyFetch.includes(relationName)) {
                relation.fetched = false;
                relation.fetch(false, true);
            }
            else if (relation.invalidated) {
                relation.fetch(false, true);
            }
        }
    }
    registerParentRelation(relation) {
        if (this._parentRelations.has(relation)) {
            return false;
        }
        // console.log('register parent', this._ID, this.type, this.id, relation.info)
        this._parentRelations.add(relation);
        return true;
    }
    getParentRelations() {
        return this._parentRelations;
    }
    unregisterParentRelation(relation) {
        if (this._parentRelations.has(relation)) {
            // console.log('unregister parent', this._ID, this.type, this.id, relation.info)
            this._parentRelations.delete(relation);
            return true;
        }
        return false;
    }
    /**
     * Serialization
     */
    deserialize(json, requestId) {
        const numDeserializedAttributes = this.countJsonKeys(json);
        const isSameRequest = requestId === this._requestId;
        if (isSameRequest && numDeserializedAttributes <= this._numDeserializedAttributes) {
            return Promise.resolve(true);
        }
        this._requestId = requestId;
        this._numDeserializedAttributes = numDeserializedAttributes;
        this.id = json.id;
        json = this.beforeDeserialize(json);
        this.deserializeAttributes(json.attributes || json);
        this.afterDeserializeAttributes();
        this.guessHasOneRelationKeys(json.attributes || json, json.relationships || json);
        // console.log('--'.repeat(Model.LEVEL), this.info)
        Model.LEVEL++;
        return this.deserializeRelations(json.relationships || json).then(deserializedRelations => {
            return this.fetchRelations(deserializedRelations).then(() => {
                Model.LEVEL--;
                this.afterDeserialize();
            });
        });
    }
    toJson() {
        return this.serialize();
    }
    attributesToJson(attributes) {
        return {
            id: this.id,
            type: this.type,
            attributes
        };
    }
    serialize() {
        // default serialization
        const data = {
            id: this.id,
            type: this.type
        };
        return data;
    }
    hasChanges() {
        if (this._original) {
            if (!this._lastSnapshot) {
                this._lastSnapshot = JSON.stringify(this._original.serialize());
            }
            const json = JSON.stringify(this.serialize());
            return this._lastSnapshot !== json;
        }
        return false;
    }
    markSaved() {
        this._lastSnapshot = JSON.stringify(this.serialize());
    }
    clone() {
        return this.cloneWith();
    }
    cloneWith(...relationsToClone) {
        const clone = this._clone(this);
        clone._isClone = true;
        clone._original = this;
        clone._requestId = this._requestId;
        clone.loadingState = this.loadingState;
        clone._parentRelations = this._parentRelations;
        for (const relationName of Object.keys(this.$rels)) {
            clone.$rels[relationName] = this.$rels[relationName].clone(clone);
        }
        clone.fetchAllRelations(relationsToClone);
        return clone;
    }
    get info() {
        const isClone = this._isClone ? '(CLONE)' : '';
        return `[${this.class.name}] id="${this.id}" ID="${this._ID}${isClone}" request="${this._requestId}" loading="${this.loadingState}"`;
    }
    onRelationFetched(relation, data) {
        this[relation.name] = data;
        // set counts
        if (Array.isArray(data)) {
            if (this.hasOwnProperty('count_' + relation.name)) {
                this['count_' + relation.name] = data.length;
                // console.log('set count', 'count_' + relation.name, data.length, 'for', this.info)
            }
        }
        // hook after fetched
        const fetchHook = 'on' + toCamelCase(relation.name);
        this[fetchHook] && this[fetchHook](data);
    }
    get hasListData() {
        return this.loadingState >= LoadingState.LIST_DATA_LOADED;
    }
    calculateLoadingState(_json) {
        return this.loadingState;
    }
    init() {
        // pls override
    }
    beforeDeserialize(json) {
        return json;
    }
    afterDeserializeAttributes() {
        // hook into
    }
    afterDeserialize() {
        // hook into
    }
    guessHasOneRelationKeys(attibutesJson, relationsJson) {
        for (const relationName of Object.keys(this.$rels)) {
            const relation = this.$rels[relationName];
            if (!relationsJson.hasOwnProperty('relationName') && relation.type === Relation.HAS_ONE) {
                if (attibutesJson.hasOwnProperty(relationName + '_id')) {
                    const id = attibutesJson[relationName + '_id'];
                    relationsJson[relationName] = id ? {
                        id: attibutesJson[relationName + '_id']
                    } : null;
                }
            }
        }
    }
    countJsonKeys(json, level = 0) {
        let numKeys = 0;
        if (level < 3 && json && typeof json === 'object') {
            for (const key of Object.keys(json)) {
                numKeys = numKeys + 1 + this.countJsonKeys(json[key], level + 1);
            }
        }
        return numKeys;
    }
    /**
     * magic clone function :-)
     * clone anything but no model relations
     */
    _clone(value) {
        if (value instanceof Model) {
            const model = value;
            const Constructor = model.class;
            const clone = new Constructor();
            for (const key of Object.keys(model)) {
                const keyVal = model[key];
                // set model associations to null, let the clone fetch the relation
                if (keyVal instanceof Model) {
                    clone[key] = null;
                    continue;
                }
                clone[key] = this._clone(keyVal);
            }
            return clone;
        }
        if (Array.isArray(value)) {
            const array = value;
            const clone = [];
            for (const arrVal of array) {
                if (arrVal instanceof Model) {
                    // do not clone associations
                    continue;
                }
                clone.push(this._clone(arrVal));
            }
            return clone;
        }
        if (value instanceof Date) {
            return new Date(value.getTime());
        }
        if (value !== null && typeof value === 'object') {
            const obj = value;
            const clone = {};
            for (const key of Object.keys(obj)) {
                const keyVal = obj[key];
                // set model associations to null, let the clone fetch the relation
                if (keyVal instanceof Model) {
                    clone[key] = null;
                    continue;
                }
                clone[key] = this._clone(keyVal);
            }
            return clone;
        }
        return value;
    }
    get class() {
        return this.constructor;
    }
    hasAttr(name) {
        return !!this.class._attributes[name];
    }
    getAttrValue(name, value) {
        const attr = this.class._attributes[name];
        // return custom value calclulation or the default calculation of the type
        return attr.value ? attr.value(value) : attr.type.value(value);
    }
    hasRelation(name) {
        return !!this.class._relations[name];
    }
    fetchAllRelations(relationsToClone = []) {
        for (const relationName of Object.keys(this.$rels)) {
            const relation = this.$rels[relationName];
            const clone = relationsToClone.includes(relationName);
            relation.fetch(clone, false);
        }
    }
    fetchRelations(relationsToFetch) {
        // fetch all included relations before return from Model.deserialize
        // that's why we put all fetch request into the promise bag
        const promises = [];
        for (const relationName of Object.keys(this.$rels)) {
            if (relationsToFetch.includes(relationName)) {
                const relation = this.$rels[relationName];
                promises.push(relation.fetch(false, false));
            }
        }
        return Promise.all(promises);
    }
    deserializeAttributes(attributesJson) {
        if (!attributesJson) {
            return;
        }
        for (const name of Object.keys(attributesJson)) {
            const localName = this.class._attributeRemoteNameMap[name] || name;
            if (this.hasAttr(localName)) {
                this[localName] = this.getAttrValue(localName, attributesJson[name]);
                if (localName.match(/count_/)) {
                    // console.log('set count attribute:', localName, this[localName], 'for', this.info)
                }
            }
        }
    }
    deserializeRelations(relationsJson) {
        const deserializedRelations = [];
        let promise = Promise.resolve();
        if (relationsJson) {
            for (const name of Object.keys(relationsJson)) {
                const localName = this.class._relationRemoteNameMap[name] || name;
                if (this.hasRelation(localName)) {
                    const relation = this.$rels[localName];
                    // if we just have a plain json relation we want to
                    // assign to our model
                    if (relation.Model && relation.Model === PlainJson) {
                        this[localName] = relationsJson[name].data || relationsJson[name]; // jsonapi spec fallback
                        continue;
                    }
                    else {
                        promise = promise.then(() => {
                            return relation.deserialize(relationsJson[name]).then(() => {
                                deserializedRelations.push(localName);
                            });
                        });
                    }
                }
            }
        }
        return promise.then(() => {
            return deserializedRelations;
        });
    }
}
Model.LEVEL = 0;
Model.type = 'models';
Model.Resource = null;
Model.ResourceUrl = null;
Model._relations = {};
Model._attributes = {};
Model._attributeRemoteNameMap = {};
Model._relationRemoteNameMap = {};
__decorate([
    enumerable(false)
], Model.prototype, "$rels", void 0);
__decorate([
    enumerable(false)
], Model.prototype, "_ID", void 0);
__decorate([
    enumerable(false)
], Model.prototype, "_requestId", void 0);
__decorate([
    enumerable(false)
], Model.prototype, "_isClone", void 0);
__decorate([
    enumerable(false)
], Model.prototype, "_original", void 0);
__decorate([
    enumerable(false)
], Model.prototype, "_lastSnapshot", void 0);
__decorate([
    enumerable(false)
], Model.prototype, "_parentRelations", void 0);
__decorate([
    enumerable(false)
], Model.prototype, "_numDeserializedAttributes", void 0);
//# sourceMappingURL=Model.js.map