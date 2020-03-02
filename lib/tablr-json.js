'use babel';
/* global atom */

import {CompositeDisposable} from 'atom';

export default new class TablrJson {
  constructor() {
    this.subscriptions = null;
  }

  activate(/* state */) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'tablr-json:open': () => this.open()
    }));
  }

  deactivate() {
    if (!this.tableEditor.destroyed) this.tableEditor.destroy();
    this.subscriptions.dispose();
    this.TablrModelService = null;
  }

  consumeTablrModelsServiceV1(api) {
    this.Tablr = api;
  }

  serialize() {
    return {};
  }

  open() {
    const textEditor = atom.workspace.getActiveTextEditor();
    if (textEditor == null) {
      atom.notifications.addInfo('No text editor open');
      return;
    }

    let data;
    try {
      data = JSON.parse(textEditor.getText());
    } catch (err) {
      atom.notifications.addError('Couldn\' parse JSON', {stack: err.stack});
      return;
    }

    const arr = asOrFindArray(data, 1);
    if (arr === undefined) {
      atom.notifications.addInfo('No array found in JSON');
      return;
    }

    if (this.tableEditor != null && !this.tableEditor.destroyed) {
      this.tableEditor.destroy();
    }

    const tableEditor = this.tableEditor = new this.Tablr.TableEditor();
    tableEditor.lockModifiedStatus();

    const columnSet = Object.create(null);
    for (const row of arr) {
      const keys = Object.keys(row);
      for (const key of keys) {
        if (!columnSet[key]) {
          columnSet[key] = true;
          tableEditor.addColumn(key, false, false);
        }
      }
    }
    tableEditor.addRows(arr);

    // TODO: subclass
    tableEditor.getTitle = ((title) => () => title)(`${textEditor.getTitle()} (Table)`);

    tableEditor.initializeAfterSetup();
    tableEditor.unlockModifiedStatus();

    const pane = atom.workspace.getActivePane();
    pane.addItem(tableEditor);
    pane.activateItem(tableEditor);
  }
}();

function asOrFindArray(data, minLength = 0) {
  const maybeArray = asArray(data, minLength);
  if (maybeArray !== undefined) return maybeArray;
  return findArray(data, minLength);
}
function asArray(data, minLength) {
  if (Array.isArray(data) && data.length >= minLength) {
    return data;
  }
  if (
    typeof data !== 'string' &&
    Number.isInteger(data.length) &&
    data.length >= minLength &&
    Array.prototype.some.call(data, (v) => v != null)
  ) {
    return Array.from(data);
  }
  return undefined;
}
function findArray(data, minLength) {
  if (typeof data !== 'object') return undefined;

  const keys = Object.keys(data);
  for (const key of keys) {
    const maybeArray = asArray(data[key], minLength);
    if (maybeArray !== undefined) return maybeArray;
  }
  for (const key of keys) {
    const maybeArray = findArray(data[key], minLength);
    if (maybeArray !== undefined) return maybeArray;
  }
  return undefined;
}
