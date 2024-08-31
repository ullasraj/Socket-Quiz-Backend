class InMemoryCache {

    cache: Map<string, Map<number, { value: any }>>;

    constructor() {
        this.cache = new Map();
    }


    set(type: string, key: number, value: any) {
        if (!this.cache.has(type)) {
            this.cache.set(type, new Map());
        }

        this.cache.get(type)?.set(key, { value });
    }


    get(type: string, key: number): any | null {
        const typeCache = this.cache.get(type);
        if (!typeCache) return null;

        const cacheItem = typeCache.get(key);
        if (!cacheItem) return null;

        return cacheItem.value;
    }


    delete(type: string, key: number) {
        const typeCache = this.cache.get(type);
        if (typeCache) {
            typeCache.delete(key);
            if (typeCache.size === 0) {
                this.cache.delete(type);
            }
        }
    }


    clear(type: string | null = null) {
        if (type) {
            this.cache.delete(type);
        } else {
            this.cache.clear();
        }
    }


    getAll(type: string): Array<any> {
        const typeCache = this.cache.get(type);
        if (!typeCache) return [];

        return Array.from(typeCache.values()).map(({ value }) => value);
    }
}

export const cache = new InMemoryCache();