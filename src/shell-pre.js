    // --- Host-specific: theme palette and file addressing ---
    // Carved out of the core so it never names a DSH token or URI scheme.
    // Carved out of the core so it never names a DSH token or URI scheme.
    /**
    * Story status -> the theme token that carries its marker colour, read in
    * workflow order: grey while it waits, blue while it is being worked, orange
    * while it is being reviewed, green once it is done. The epic markers reuse
    * this same mapping for the epic's own status.
    *
    * The blue is `state-business-primary`, not `brand-primary`: the latter is
    * the primary *ink* (near-black in light, near-white in dark) that a solid
    * primary button fills with, so it reads as no colour at all on a 7px mark.
    * `state-business-primary` is the theme's real blue in both themes, and it
    * keeps the ramp inside one family of `state-*` aliases.
    */
    const STATUS_TOKEN = {
    backlog: '--dsw-alias-state-idle-primary',
    'ready-for-dev': '--dsw-alias-label-secondary',
    'in-progress': '--dsw-alias-state-business-primary',
    review: '--dsw-alias-state-warn-primary',
    done: '--dsw-alias-state-success-primary',
    };
    const IDLE_TOKEN = '--dsw-alias-state-idle-primary';
    /** The token a lane uses when its contents want attention rather than praise. */
    const WARN_TOKEN = '--dsw-alias-state-warn-primary';
    const CHEVRON_OPEN = '\u25BE';
    const FILE_ADDRESS_PREFIX = 'dsh-resource://file/';
    /**
    * Component-encode one path segment, keeping `:` literal for drive letters.
    * @param segment - one `/`-separated path segment.
    * @returns the encoded segment.
    */
    function encodeSegment(segment) {
    return encodeURIComponent(segment).replace(/%3A/gi, ':');
    }
    /**
    * Build the `dsh-resource://file/session/<id>/<path>` address of a workspace file.
    * @param sessionId - the Session whose Host workspace resolves the path.
    * @param path - absolute or workspace-relative path.
    * @returns the resource address the document preview claims.
    */
    function sessionFileAddress(sessionId, path) {
    const normalized = String(path)
    .replace(/\\/g, '/')
    .replace(/^(?:\.\/)+/, '');
    const encoded = normalized.split('/').map(encodeSegment).join('/');
    return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encoded}`;
    }
    const CHEVRON_CLOSED = '\u25B8';
