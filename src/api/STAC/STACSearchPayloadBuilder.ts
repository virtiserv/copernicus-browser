import type { Geometry } from 'geojson';
import type { Moment } from 'moment';
import moment from 'moment';
import { buildSearchGeometry } from '../../utils/geojson.utils';

export interface CQL2Filter {
  op: string;
  args: unknown[];
}

// selectedCollections has the shape { collectionId: { subCollectionId: {...} } }, where nested
// nodes can themselves carry a `type` of 'instrument' | 'productType' and further nested `items`.
type SelectedCollectionNode = Record<string, unknown> & { type?: string; platform?: string };
type SelectedCollections = Record<string, SelectedCollectionNode>;
type SelectedFilters = Record<string, Record<string, unknown>>;

interface CollectionFormConfigItem {
  id: string;
  collectionName?: string;
  supportsInstrumentName?: boolean;
  items?: CollectionFormConfigItem[];
  [key: string]: unknown;
}

interface TimeInterval {
  fromTime: string | null;
  toTime: string | null;
}

interface MonthFilterInterval {
  fromMoment: Moment;
  toMoment: Moment;
}

export interface CreateSTACSearchPayloadParams {
  collectionForm: {
    selectedCollections: SelectedCollections;
    selectedFilters?: SelectedFilters;
  };
  collectionFormConfig?: CollectionFormConfigItem[];
  fromMoment?: Moment | null;
  toMoment?: Moment | null;
  searchCriteria?: string;
  filterMonths?: unknown;
  mapBounds?: unknown;
  aoiBounds?: unknown;
  poiBounds?: unknown;
  applyFilterMonthsToDateRange?: (
    fromMoment: Moment | null | undefined,
    toMoment: Moment | null | undefined,
    filterMonths: unknown,
  ) => MonthFilterInterval[];
}

export interface STACSearchPayload {
  collections?: string[];
  datetime?: string;
  filter?: CQL2Filter | { op: 'and'; args: CQL2Filter[] };
  limit: number;
}

/**
 * Extracts platform values from selected collections structure
 */
const extractPlatforms = (selectedCollections: SelectedCollections): string[] => {
  const platforms: string[] = [];
  Object.entries(selectedCollections).forEach(([_collectionId, collectionData]) => {
    if (collectionData.platform) {
      platforms.push(collectionData.platform);
    }
  });
  return platforms;
};

/**
 * Recursively extracts instruments and product types from collection data
 */
const extractInstrumentsAndProductTypes = (
  obj: SelectedCollectionNode,
): { instruments: string[]; productTypes: string[] } => {
  const instruments: string[] = [];
  const productTypes: string[] = [];

  const extractFromNode = (nodeObj: Record<string, unknown> | null | undefined) => {
    if (!nodeObj || typeof nodeObj !== 'object') {
      return;
    }

    Object.entries(nodeObj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        const node = value as SelectedCollectionNode;
        if (node.type === 'instrument') {
          instruments.push(key);
          // Look for product types within this instrument
          extractFromNode(node);
        } else if (node.type === 'productType') {
          productTypes.push(key);
        } else {
          // Continue searching in nested objects
          extractFromNode(node);
        }
      }
    });
  };

  extractFromNode(obj);
  return { instruments, productTypes };
};

/**
 * Applies filter months to date range and creates time intervals
 */
const createTimeIntervals = (
  fromMoment: Moment | null | undefined,
  toMoment: Moment | null | undefined,
  filterMonths: unknown,
  applyFilterMonthsToDateRange: CreateSTACSearchPayloadParams['applyFilterMonthsToDateRange'],
): TimeInterval | null => {
  if (filterMonths) {
    const intervals = applyFilterMonthsToDateRange!(fromMoment, toMoment, filterMonths);
    if (intervals.length > 0) {
      const firstInterval = intervals[0];
      return {
        fromTime: moment.utc(firstInterval.fromMoment).toDate().toISOString(),
        toTime: moment.utc(firstInterval.toMoment).toDate().toISOString(),
      };
    }
  } else {
    return {
      fromTime: fromMoment
        ? moment
            .utc(fromMoment)
            .toDate()
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z')
        : null,
      toTime: toMoment
        ? moment
            .utc(toMoment)
            .toDate()
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z')
        : null,
    };
  }
  return null;
};

/**
 * Extracts collectionName values from config for the given selected collections.
 * selectedCollections has the shape { groupId: { subCollectionId: {...} } }.
 * collectionName is on the sub-collection config item under groupConfig.items.
 */
const extractCollectionNames = (
  selectedCollections: SelectedCollections,
  collectionFormConfig: CollectionFormConfigItem[] | undefined,
): string[] => {
  if (!collectionFormConfig) {
    return [];
  }
  const collectionNames: string[] = [];
  Object.keys(selectedCollections).forEach((collectionId) => {
    const collectionConfig = collectionFormConfig.find((c) => c.id === collectionId);
    if (!collectionConfig) {
      return;
    }
    if (collectionConfig.collectionName) {
      collectionNames.push(collectionConfig.collectionName);
      return;
    }
    // Group node — find collectionName on each selected sub-collection
    if (collectionConfig.items) {
      const subCollectionIds = Object.keys(selectedCollections[collectionId]).filter((k) => k !== 'type');
      subCollectionIds.forEach((subId) => {
        const subConfig = collectionConfig.items!.find((item) => item.id === subId);
        if (subConfig && subConfig.collectionName) {
          collectionNames.push(subConfig.collectionName);
        }
      });
    }
  });
  return collectionNames;
};

/**
 * Creates platform filters for STAC search
 */
const createPlatformFilters = (platforms: string[]): CQL2Filter[] => {
  const filterArgs: CQL2Filter[] = [];

  if (platforms.length === 1) {
    filterArgs.push({
      op: '=',
      args: [{ property: 'platform' }, platforms[0]],
    });
  } else if (platforms.length > 1) {
    filterArgs.push({
      op: 'in',
      args: [{ property: 'platform' }, platforms],
    });
  }

  return filterArgs;
};

/**
 * Creates the STAC API top-level datetime interval string.
 * The STAC API Item Search spec accepts a top-level `datetime` parameter in interval
 * format ("from/to") which is more broadly supported than CQL2 timestamp literals.
 */
export const createDatetimeInterval = (timeInterval: TimeInterval | null): string | null => {
  if (!timeInterval) {
    return null;
  }
  const from = timeInterval.fromTime || '..';
  const to = timeInterval.toTime || '..';
  return `${from}/${to}`;
};

/**
 * Creates geometry filters for STAC search
 */
export const createGeometryFilters = (geometry: Geometry | null | undefined): CQL2Filter[] => {
  const filterArgs: CQL2Filter[] = [];

  if (geometry) {
    filterArgs.push({
      op: 's_intersects',
      args: [{ property: 'geometry' }, geometry],
    });
  }

  return filterArgs;
};

/**
 * Combines a list of CQL2 filters into a single filter object: a bare filter when there's
 * only one, or an `and`-wrapped filter when there's more than one. Returns undefined when
 * the list is empty, matching STACSearchPayload's optional `filter` field.
 */
export const combineFilters = (
  filterArgs: CQL2Filter[],
): CQL2Filter | { op: 'and'; args: CQL2Filter[] } | undefined => {
  if (filterArgs.length === 0) {
    return undefined;
  }
  if (filterArgs.length === 1) {
    return filterArgs[0];
  }
  return { op: 'and', args: filterArgs };
};

/**
 * Creates product type filters for STAC search
 */
const createProductTypeFilters = (productTypes: string[]): CQL2Filter[] => {
  const filterArgs: CQL2Filter[] = [];

  if (productTypes.length > 0) {
    if (productTypes.length === 1) {
      filterArgs.push({
        op: '=',
        args: [{ property: 'product:type' }, productTypes[0]],
      });
    } else {
      filterArgs.push({
        op: 'in',
        args: [{ property: 'product:type' }, productTypes],
      });
    }
  }

  return filterArgs;
};

const createInstrumentFilters = (instruments: string[]): CQL2Filter[] => {
  const filterArgs: CQL2Filter[] = [];

  if (instruments.length > 0) {
    if (instruments.length === 1) {
      filterArgs.push({
        op: '=',
        args: [{ property: 'instruments' }, instruments[0]],
      });
    } else {
      filterArgs.push({
        op: 'in',
        args: [{ property: 'instruments' }, instruments],
      });
    }
  }

  return filterArgs;
};

const additionalFiltersMap: Record<string, string> = {
  processingMode: 'product:timeliness_category',
  orbitNumber: 'sat:absolute_orbit',
};

/**
 * Maps OData filter keys to STAC property names
 */
export const mapODataKeyToSTAC = (odataKey: string): string => {
  return additionalFiltersMap[odataKey] || odataKey;
};

/**
 * Creates additional filters from selected filters.
 * STAC counterpart of ODataHelpers.js's createAdditionalFilters (same name, same
 * collectionForm/selectedFilters shape) - keep the two in sync when new filter keys
 * are added to either side, since mapODataKeyToSTAC above is the mapping between them.
 */
const createAdditionalFilters = (selectedFilters: SelectedFilters | undefined): CQL2Filter[] => {
  const filterArgs: CQL2Filter[] = [];

  if (selectedFilters) {
    Object.entries(selectedFilters).forEach(([_collectionId, filters]) => {
      Object.entries(filters).forEach(([filterKey, filterValue]) => {
        const stacProperty = mapODataKeyToSTAC(filterKey);

        if (Array.isArray(filterValue)) {
          const values = filterValue.map((item) => item.value || item);
          if (values.length === 1) {
            filterArgs.push({
              op: '=',
              args: [{ property: stacProperty }, values[0]],
            });
          } else {
            filterArgs.push({
              op: 'in',
              args: [{ property: stacProperty }, values],
            });
          }
        } else if (typeof filterValue === 'number') {
          filterArgs.push({
            op: '=',
            args: [{ property: stacProperty }, filterValue],
          });
        } else {
          filterArgs.push({
            op: '=',
            args: [{ property: stacProperty }, filterValue],
          });
        }
      });
    });
  }

  return filterArgs;
};

/**
 * Creates search criteria filters for STAC search
 */
const createSearchCriteriaFilters = (searchCriteria: string | undefined): CQL2Filter[] => {
  const filterArgs: CQL2Filter[] = [];

  if (searchCriteria && searchCriteria !== '') {
    filterArgs.push({
      op: 'like',
      args: [{ property: 'title' }, `%${searchCriteria}%`],
    });
  }

  return filterArgs;
};

/**
 * Creates a STAC search payload from form data
 */
export const createSTACSearchPayload = ({
  collectionForm,
  collectionFormConfig,
  fromMoment,
  toMoment,
  searchCriteria,
  filterMonths,
  mapBounds,
  aoiBounds,
  poiBounds,
  applyFilterMonthsToDateRange,
}: CreateSTACSearchPayloadParams): STACSearchPayload => {
  const payload: STACSearchPayload = { limit: 50 };
  const filterArgs: CQL2Filter[] = [];

  // Extract platforms from selected collections
  if (Object.keys(collectionForm.selectedCollections).length) {
    const platforms = extractPlatforms(collectionForm.selectedCollections);
    const platformFilters = createPlatformFilters(platforms);
    filterArgs.push(...platformFilters);

    // Add top-level STAC `collections` parameter to scope the search
    const collectionNames = extractCollectionNames(collectionForm.selectedCollections, collectionFormConfig);
    if (collectionNames.length > 0) {
      payload.collections = collectionNames;
    }
  }

  // Use the top-level STAC `datetime` interval parameter instead of CQL2 timestamp
  // literals, which the stac-fastapi-opensearch backend rejects as invalid RFC3339.
  if (!searchCriteria) {
    const timeInterval = createTimeIntervals(
      fromMoment,
      toMoment,
      filterMonths,
      applyFilterMonthsToDateRange,
    );
    const datetimeInterval = createDatetimeInterval(timeInterval);
    if (datetimeInterval) {
      payload.datetime = datetimeInterval;
    }
  }

  // Convert geometry to STAC filter format
  if (Object.keys(collectionForm.selectedCollections).length || aoiBounds || poiBounds) {
    const { geometry } = buildSearchGeometry({ mapBounds, aoiBounds, poiBounds });
    const geometryFilters = createGeometryFilters(geometry);
    filterArgs.push(...geometryFilters);
  }

  // Extract instruments and product types from selected collections
  if (Object.keys(collectionForm.selectedCollections).length) {
    const allProductTypes: string[] = [];
    const allInstruments: string[] = [];
    Object.entries(collectionForm.selectedCollections).forEach(([_collectionId, collectionData]) => {
      const { productTypes, instruments } = extractInstrumentsAndProductTypes(collectionData);
      allProductTypes.push(...productTypes);
      // Collected unconditionally here; whether instrument filters actually make it into
      // the final payload is decided below by the `shouldIncludeInstruments` check.
      allInstruments.push(...instruments);
    });

    const productTypeFilters = createProductTypeFilters(allProductTypes);
    filterArgs.push(...productTypeFilters);

    // Check if any of the selected collections support instrument names
    const shouldIncludeInstruments =
      collectionFormConfig &&
      Object.keys(collectionForm.selectedCollections).some((collectionId) => {
        // Find the main collection config (e.g., S5P)
        const collectionConfig = collectionFormConfig.find((c) => c.id === collectionId);
        if (!collectionConfig) {
          return true; // Default to including instruments if config not found
        }

        // Check if the collection itself has supportsInstrumentName set to false
        if (collectionConfig.supportsInstrumentName === false) {
          return false;
        }

        // Check selected instruments within the collection
        const collectionData = collectionForm.selectedCollections[collectionId];

        // Look for selected instruments in the nested structure. Metadata keys like
        // 'type' and 'platform' (present on every selected collection) are not instrument
        // entries and must be excluded here — otherwise .some() below would short-circuit
        // to true on them regardless of what any real instrument's config says.
        const instrumentKeys = Object.keys(collectionData).filter((selectedKey) => {
          const selectedItem = collectionData[selectedKey] as SelectedCollectionNode | undefined;
          return selectedItem && selectedItem.type === 'instrument';
        });

        // No instrument-level selection to check — default to including instruments.
        if (instrumentKeys.length === 0) {
          return true;
        }

        // Otherwise, include instruments if at least one selected instrument supports them.
        return instrumentKeys.some((selectedKey) => {
          const instrumentConfig = collectionConfig.items?.find((inst) => inst.id === selectedKey);
          return instrumentConfig?.supportsInstrumentName !== false;
        });
      });

    // Only add instrument filters if supported by the collection configuration
    if (shouldIncludeInstruments) {
      const instrumentFilters = createInstrumentFilters(allInstruments);
      filterArgs.push(...instrumentFilters);
    }
  }

  // Convert additional filters to STAC filter format
  const additionalFilters = createAdditionalFilters(collectionForm.selectedFilters);
  filterArgs.push(...additionalFilters);

  // Handle product name search
  const searchFilters = createSearchCriteriaFilters(searchCriteria);
  filterArgs.push(...searchFilters);

  // Build the filter object
  const filter = combineFilters(filterArgs);
  if (filter) {
    payload.filter = filter;
  }

  return payload;
};
