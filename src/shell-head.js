/**
 * BMAD Sprint Board -- the Client half of the bundle.
 *
 * Contributes one page-type tab to the Session's right Sidebar (the column that
 * already holds Chat, Guide, Files and Terminal) and one guide entry that opens
 * it. The board is strictly read-only: it reads the project through the Host
 * `workspaceFiles` Remote face and never writes to it.
 *
 * @module dsh-plugin-bmad-sprint-board/client
 */

window.__ModuleLoader__.load({
  id: 'dsh-plugin-bmad-sprint-board',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'bmadSprintBoard';
    /** This implementation's identity: the tab type id and the body's cell key. */
    const PLUGIN_ID = 'dsh-plugin-bmad-sprint-board';
    /** Page kind the guide entry opens. */
    const TAB_KIND = 'bmad-sprint-board';
    /** Command id of the keybinding that opens the board. */
    const BOARD_COMMAND = 'bmad.sprint-board';