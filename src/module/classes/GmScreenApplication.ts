import { GmScreenConfig, GmScreenGridEntry } from '../../gridTypes';
import { MODULE_ABBREV, MODULE_ID, MySettings, TEMPLATES } from '../constants';
import { getGridElementsPosition, handleClear, handleClickEvents, injectCellContents, log } from '../helpers';

export class GmScreenApplication extends Application {
  data: GmScreenConfig;
  expanded: boolean;
  columns: number;
  rows: number;

  constructor(options = {}) {
    super(options);

    this.expanded = false;
  }

  static get defaultOptions() {
    const columns: number = game.settings.get(MODULE_ID, MySettings.columns);
    const rows: number = game.settings.get(MODULE_ID, MySettings.rows);
    const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

    const drawerOptions = {
      popOut: false,
    };

    const popOutOptions = {
      classes: ['gm-screen-popOut'],
      popOut: true,
      width: Number(columns) * 400,
      height: Number(rows) * 300,
      resizable: true,
    };

    const totalCells = Number(columns) * Number(rows);
    return mergeObject(super.defaultOptions, {
      ...(displayDrawer ? drawerOptions : popOutOptions),
      template: TEMPLATES.screen,
      id: 'gm-screen-app',
      dragDrop: [{ dragSelector: '.grid-cell', dropSelector: '.grid-cell' }],
      scrollY: [...new Array(totalCells)].map((_, index) => `#gm-screen-cell-${index} .grid-cell-content`),
    });
  }

  getNumOccupiedCells() {
    return this.data.grid.entries.reduce((acc, entry) => {
      const cellsTaken = (entry.spanCols || 1) * (entry.spanRows || 1);
      return acc + cellsTaken;
    }, 0);
  }

  /**
   * Adds an Entry to the proper place on the grid data.
   * Replaces an existing entry if the X and Y match
   * @param newEntry The Entry being added.
   */
  async addEntry(newEntry: GmScreenGridEntry) {
    const gridData: GmScreenConfig = await game.settings.get(MODULE_ID, MySettings.gmScreenConfig);
    const newEntries = [...gridData.grid.entries];

    const existingEntryIndex = newEntries.findIndex((entry) => {
      return entry.x === newEntry.x && entry.y === newEntry.y;
    });

    if (existingEntryIndex > -1) {
      newEntries[existingEntryIndex] = newEntry;
    } else {
      newEntries.push(newEntry);
    }

    log(false, 'addEntry', {
      gridData,
      newEntries,
      existingEntryIndex,
      newEntry,
      ret: {
        ...gridData,
        grid: {
          ...gridData.grid,
          entries: newEntries,
        },
      },
    });

    await game.settings.set(MODULE_ID, MySettings.gmScreenConfig, {
      ...gridData,
      grid: {
        ...gridData.grid,
        entries: newEntries.filter(({ entityUuid }) => !!entityUuid),
      },
    });

    this.render();
  }

  toggleGmScreenVisibility() {
    this.expanded = !this.expanded;

    if (this.expanded) {
      $('.gm-screen-app').addClass('expanded');
    } else {
      $('.gm-screen-app').removeClass('expanded');
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    $(html).on('click', 'button', handleClickEvents.bind(this));
    $(html).on('click', 'a', handleClickEvents.bind(this));

    // handle select of an entity
    $(html).on('change', 'select', async (e) => {
      const newEntry: GmScreenGridEntry = {
        ...getGridElementsPosition($(e.target).parent()),
        entityUuid: e.target.value,
      };
      this.addEntry(newEntry);
    });

    $(html)
      .find('[data-entity-uuid]')
      .each(function (gridEntry) {
        // `this` is the parent .grid-cell
        const relevantUuid = this.dataset.entityUuid;

        const gridCellContent = $(this).find('.grid-cell-content');
        log(false, 'gridEntry with uuid defined found', { gridEntry: this, gridCellContent });

        injectCellContents(relevantUuid, gridCellContent);
      });

    this.updateCSSPropertyVariable(html, '.grid-cell', 'width', '--cell-width');
  }

  /**
   * Creates a custom CSS property with the name provide on the element.style of all elements which match
   * the selector provided containing the computed value of the property specified.
   *
   * @param {HTMLElement} html - Some HTML element to search within for the selector
   * @param {string} selector - A CSS style selector which will be used to locate the target elements for this function.
   * @param {keyof CSSStyleDeclaration} property - The name of a CSS property to obtain the computed value of
   * @param {string} name - The name of the CSS variable (custom property) that will be created/updated.
   * @memberof GmScreenApplication
   */
  updateCSSPropertyVariable(html: HTMLElement, selector: string, property: keyof CSSStyleDeclaration, name: string) {
    $(html)
      .find(selector)
      .each((i, gridCell) => {
        const value = window.getComputedStyle(gridCell)[property];
        gridCell.style.setProperty(name, String(value));
      });
  }

  async getData() {
    const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);
    const columns: number = game.settings.get(MODULE_ID, MySettings.columns);
    const rows: number = game.settings.get(MODULE_ID, MySettings.rows);
    const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

    this.data = data;
    this.columns = columns;
    this.rows = rows;

    const entityOptions = [
      { label: 'ENTITY.Actor', entries: game.actors.entries },
      { label: 'ENTITY.Item', entries: game.items.entries },
      { label: 'ENTITY.JournalEntry', entries: game.journal.entries },
      { label: 'ENTITY.RollTable', entries: game.tables.entries },
    ].map(({ label, entries }) => {
      return {
        label,
        options: ((entries as unknown) as Array<any>).reduce((acc, entity) => {
          acc[entity.uuid] = entity.data.name;
          return acc;
        }, {}),
      };
    });

    const emptyCellsNum = Number(columns) * Number(rows) - this.getNumOccupiedCells();
    const emptyCells: GmScreenGridEntry[] = emptyCellsNum > 0 ? [...new Array(emptyCellsNum)].map(() => ({})) : [];

    const getAllGridEntries = async () => {
      return Promise.all(
        data.grid.entries.map(async (entry: GmScreenGridEntry) => {
          const relevantEntity = await fromUuid(entry.entityUuid);

          log(false, 'entity hydration', {
            relevantEntity,
          });

          return {
            ...entry,
            type: relevantEntity?.entity,
          };
        })
      );
    };

    const newAppData = {
      ...super.getData(),
      entityOptions,
      gridEntries: [...(await getAllGridEntries()), ...emptyCells],
      data,
      columns,
      rows,
      expanded: this.expanded,
      displayDrawer,
    };

    log(false, 'getData', {
      data: this.data,
      newAppData,
    });

    return newAppData;
  }

  _getHeaderButtons() {
    const superButtons = super._getHeaderButtons();
    return [
      {
        label: game.i18n.localize(`${MODULE_ABBREV}.gmScreen.Reset`),
        class: 'clear',
        icon: 'fas fa-ban',
        onclick: () => handleClear.bind(this)(),
      },
      {
        label: game.i18n.localize(`${MODULE_ABBREV}.gmScreen.Refresh`),
        class: 'refresh',
        icon: 'fas fa-sync',
        onclick: () => this.render(),
      },
      ...superButtons,
    ];
  }

  async _onDrop(event) {
    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }

    log(false, 'onDrop', {
      event,
      data,
      closestGridCell: $(event.currentTarget).closest('.grid-cell'),
    });

    // only move forward if this is a JournalEntry or RollTable
    if (!['JournalEntry', 'RollTable', 'Item', 'Actor'].includes(data.type)) {
      return false;
    }

    const entityUuid = `${data.type}.${data.id}`;

    const newEntry: GmScreenGridEntry = {
      ...getGridElementsPosition($(event.target).closest('.grid-cell')),
      entityUuid,
    };

    this.addEntry(newEntry);
  }
}
