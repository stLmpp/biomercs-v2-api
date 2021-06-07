import { Type } from '../util/type';
import { groupBy } from 'st-utils';

export const PROPERTY_METADATA_KEY = '__PROPERTY_METADATA_KEY__';

export interface PropertyMetadata<T extends Record<any, any> = Record<any, any>, K extends keyof T = keyof T> {
  propertyKey: K;
  type: any;
  typeFn?: () => Type;
}

const targets = new Set<any>();
const propertiesMetadataCache = new Map<any, PropertyMetadata[]>();

export function Property(typeFn?: () => Type): PropertyDecorator {
  return (target, propertyKey) => {
    const type = Reflect.getMetadata('design:type', target, propertyKey);
    setPropertyMetadata(target.constructor, propertyKey, { propertyKey: propertyKey.toString(), type, typeFn });
    targets.add(target.constructor);
  };
}

export function toPropertiesObject<T, K extends keyof T = keyof T>(keys: K[]): Record<K, K> {
  return keys.reduce((acc, key) => ({ ...acc, [key]: key }), {} as Record<K, K>);
}

function setPropertyMetadata(target: any, propertyKey: string | symbol, metadata: PropertyMetadata): void {
  const storedMetadata = Reflect.getMetadata(PROPERTY_METADATA_KEY, target) ?? [];
  Reflect.defineMetadata(PROPERTY_METADATA_KEY, [...storedMetadata, metadata], target);
}

export function compilePropertyMetadata(): void {
  for (const target of targets) {
    const metadata: PropertyMetadata[] = Reflect.getMetadata(PROPERTY_METADATA_KEY, target) ?? [];
    Reflect.defineMetadata(
      PROPERTY_METADATA_KEY,
      metadata.map(meta => ({ ...meta, type: meta.typeFn ? meta.typeFn() : meta.type })),
      target
    );
  }
}

export function getPropertiesMetadata<T>(target: Type<T>): PropertyMetadata<T>[] {
  if (propertiesMetadataCache.has(target)) {
    return propertiesMetadataCache.get(target)!;
  }
  const prototype = Object.getPrototypeOf(target);
  const parentConstructor = prototype.constructor;
  const properties: PropertyMetadata<T>[] = Reflect.getMetadata(PROPERTY_METADATA_KEY, target) ?? [];
  const propertiesParent: PropertyMetadata<T>[] = Reflect.getMetadata(PROPERTY_METADATA_KEY, parentConstructor) ?? [];
  const propertiesPrototype: PropertyMetadata<T>[] = Reflect.getMetadata(PROPERTY_METADATA_KEY, prototype) ?? [];
  const propertiesGrouped = groupBy([...properties, ...propertiesParent, ...propertiesPrototype], 'propertyKey', 'map');
  const metadataList: PropertyMetadata[] = [];
  for (const [propertyKey, metadata] of propertiesGrouped) {
    metadataList.push(
      metadata.reduce(
        (acc, item) => ({
          ...acc,
          type: item.type ?? acc.type,
          typeFn: item.typeFn ?? acc.typeFn,
          propertyKey: item.propertyKey ?? acc.propertyKey,
        }),
        { propertyKey, type: null } as PropertyMetadata
      )
    );
  }
  propertiesMetadataCache.set(target, metadataList);
  return metadataList;
}
