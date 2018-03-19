import IQuery from '../resource/IQuery';
import Resource from '../resource/Resource';
import { IAttributesConfig, IAttributesMixedConfig } from './IAttributeConfig';
import { IRelationsConfig } from './IRelationConfig';
import Relation from './Relation';
export default class Model {
    static type: string;
    static Query: IQuery;
    static Resource: typeof Resource | null;
    static ResourceUrl: string | null;
    static _relations: IRelationsConfig;
    static _attributes: IAttributesConfig;
    static _attributeRemoteNameMap: object;
    static _relationRemoteNameMap: object;
    id: string | null;
    type: string | null;
    $rels: {
        [key: string]: Relation;
    };
    _loadingState: number;
    private _ID;
    private _requestId;
    private _isClone;
    private _original;
    private _lastSnapshot;
    private _parentRelations;
    private _numDeserializedAttributes;
    constructor();
    static relations(): IRelationsConfig;
    static attributes(): IAttributesMixedConfig;
    /**
     * Relations
     */
    fetchRelationsAfterGet(relationsToFullyFetch?: any[]): void;
    registerParentRelation(relation: Relation): void;
    getParentRelations(): Set<Relation>;
    unregisterParentRelation(relation: Relation): void;
    /**
     * Serialization
     */
    deserialize(json: any, requestId: number): Promise<any>;
    toJson(): object;
    serialize(): object;
    hasChanges(): boolean;
    markSaved(): void;
    clone(): Model;
    cloneWith(...relationsToClone: any[]): Model;
    readonly info: string;
    onRelationFetched(relation: Relation, data: Model | Model[] | null): void;
    protected init(): void;
    protected beforeDeserialize(json: any): any;
    protected afterDeserializeAttributes(): void;
    protected afterDeserialize(): void;
    private guessHasOneRelationKeys(attibutesJson, relationsJson);
    private countJsonKeys(json, level?);
    /**
     * magic clone function :-)
     * clone anything but no model relations
     */
    private _clone(value);
    private readonly class;
    private hasAttr(name);
    private getAttrValue(name, value);
    private hasRelation(name);
    private fetchAllRelations(relationsToClone?);
    private fetchRelations(relationsToFetch);
    private deserializeAttributes(attributesJson);
    private deserializeRelations(relationsJson);
}
