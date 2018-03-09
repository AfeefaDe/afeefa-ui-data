import IQuery from '../resource/IQuery';
import IResource from '../resource/IResource';
import ModelType from './Model';
export default class Relation {
    static HAS_ONE: string;
    static HAS_MANY: string;
    static ASSOCIATION_COMPOSITION: string;
    static ASSOCIATION_LINK: string;
    owner: ModelType;
    name: string;
    type: string;
    Model: typeof ModelType | null;
    instanceId: number;
    isClone: boolean;
    original: Relation | null;
    isFetching: boolean | number;
    fetched: boolean;
    invalidated: boolean;
    id: string | null;
    hasIncludedData: boolean;
    _Query: IQuery | null;
    constructor({owner, name, type, Model}: {
        owner: ModelType;
        name: string;
        type: string;
        Model?: typeof ModelType;
    });
    Query: IQuery;
    purgeFromCacheAndMarkInvalid(): void;
    unregisterModels(): void;
    listKey(): object;
    deserialize(json: any): void;
    fetchHasOne(callback: (id: string | null) => Promise<any>, currentItemState: number, fetchingStrategy: number): void;
    fetchHasMany(callback: () => Promise<any>): void;
    /**
     * A cloned item will also have all relations cloned from it's orginal.
     * The clone item must fetch any relation on its own and hence runs its
     * own process of collecting data - fully independent from the original.
     *
     * In order to fetch the necessary resources of the original, we need to
     * copy initial data json/id as well as (for performance reasons) the
     * hint, if the relation data has already been synced to the resource cache.
     */
    clone(): Relation;
    readonly info: string;
    protected readonly resource: IResource;
    private reset();
}
