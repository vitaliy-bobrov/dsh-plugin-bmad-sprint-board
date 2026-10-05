/**
 * BMAD Sprint Board -- the Client half of the bundle.
 *
 * Contributes one page-type tab to the Session's right Sidebar (the column that
 * already holds Chat, Guide, Files and Terminal) and one guide entry that opens
 * it. The board is strictly read-only: it reads three workspace files through
 * the Host `workspaceFiles` Remote face and never writes to them.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/client
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-plugin-bmad-sprint-board',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'bmadSprintBoard';
    /** This implementation's identity: the tab type id and the body's cell key. */
    const PLUGIN_ID = '@local/dsh-plugin-bmad-sprint-board';
    /** Page kind the guide entry opens. */
    const TAB_KIND = 'bmad-sprint-board';
    /** Command id of the keybinding that opens the board. */
    /**
     * How many file reads the loader keeps in flight.
     *
     * The reads are round-trips to the Host's workspace face. All of them at
     * once would be quickest and would also hand the far side thirty
     * simultaneous requests for a board that refreshes on a click; eight keeps
     * the wait short without turning a refresh into a burst.
     */
    const READ_CONCURRENCY = 8;

    const BOARD_COMMAND = 'bmad.sprint-board';