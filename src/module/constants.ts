export const MODULE_ID = 'gm-screen';
export const MODULE_ABBREV = 'GMSCR';

export const TEMPLATES = {
  screen: `modules/${MODULE_ID}/templates/screen.hbs`,
  compactRollTable: `modules/${MODULE_ID}/templates/parts/compact-roll-table.hbs`,
  compactJournalEntry: `modules/${MODULE_ID}/templates/parts/compact-journal-entry.hbs`,
};

export enum MySettings {
  gmScreenConfig = 'gm-screen-config',
  rows = 'rows',
  columns = 'columns',
  reset = 'reset',
  displayDrawer = 'display-as-drawer',
  migrated = 'migrated',
}

export enum MyFlags {}

export const numberRegex = /([+-]?(?=\.\d|\d)(?:\d+)?(?:\.?\d*))(?:[eE]([+-]?\d+))?/;
