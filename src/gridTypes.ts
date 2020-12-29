export interface GmScreenConfig {
  grids: Record<string, GmScreenGrid>; // object of all grids keyed by uuid
  activeGridId: string; // currently visible grid's uuid
}

export interface GmScreenGrid {
  entries: Record<string, GmScreenGridEntry>; // keyed by cellId
  id: string; // grid's uuid
  name: string; // user configurable
}

export interface GmScreenGridEntry {
  x: number;
  y: number;
  spanRows?: number;
  spanCols?: number;
  entityUuid?: string;
  entryId: string;
}

export interface GmScreenConfigs {
  gridIds: string[]; // uuids generated for each grid
}
