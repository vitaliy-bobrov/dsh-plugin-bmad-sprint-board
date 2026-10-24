    // --- Styles ------------------------------------------------------------

    const CSS = `
.bmad-sb-root{display:flex;flex-direction:column;height:100%;min-height:0;font-size:12px;line-height:1.45;color:var(--dsw-alias-label-primary)}
.bmad-sb-head{flex:0 0 auto;display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.bmad-sb-titlerow{display:flex;align-items:center;gap:8px}
.bmad-sb-title{font-size:13px;font-weight:600;white-space:nowrap}
.bmad-sb-project{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px}
.bmad-sb-iconbtn{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:12px;line-height:1}
.bmad-sb-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.bmad-sb-iconbtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.bmad-sb-sub{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.bmad-sb-num{font-variant-numeric:tabular-nums}
/* The refresh cue: quiet, in the row that already reports the reading's age. */
.bmad-sb-refreshing{display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);font-weight:600}
.bmad-sb-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;overflow:hidden;align-self:flex-start}
.bmad-sb-seg>button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;padding:3px 10px;cursor:pointer}
.bmad-sb-seg>button[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.bmad-sb-seg>button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.bmad-sb-scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:8px 10px 18px}
.bmad-sb-lane{margin-bottom:10px}
.bmad-sb-lanehead{display:flex;align-items:center;gap:7px;width:100%;padding:5px 6px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
.bmad-sb-lanehead:hover{background:var(--dsw-alias-bg-layer-2)}
.bmad-sb-lanehead:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.bmad-sb-dot{flex:0 0 auto;width:7px;height:7px;border-radius:50%}
.bmad-sb-lanelabel{flex:1 1 auto;font-size:11px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.bmad-sb-count{flex:0 0 auto;border-radius:999px;padding:0 7px;font-size:10px;line-height:15px;font-weight:700;font-variant-numeric:tabular-nums}
.bmad-sb-chev{flex:0 0 auto;width:9px;font-size:9px;color:var(--dsw-alias-label-secondary)}
.bmad-sb-cards{display:flex;flex-direction:column;gap:5px;padding:4px 0 0 2px}
.bmad-sb-card{display:flex;flex-direction:column;gap:3px;width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left}
button.bmad-sb-card{cursor:pointer}
button.bmad-sb-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
button.bmad-sb-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.bmad-sb-cardtop{display:flex;align-items:center;gap:6px}
.bmad-sb-id{font-size:10px;font-weight:700;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.bmad-sb-tag{display:inline-flex;align-items:center;flex:0 0 auto;border-radius:999px;padding:0 7px;font-size:9px;line-height:15px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.bmad-sb-tag--source{margin-left:auto;letter-spacing:.04em;text-transform:uppercase}
.bmad-sb-tag[data-tone="neutral"]{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}
.bmad-sb-tag[data-tone="success"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent);color:var(--dsw-alias-state-success-primary)}
.bmad-sb-tag[data-tone="info"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);color:var(--dsw-alias-state-business-primary)}
/* A finding's tag, not a story's: solid where it matters, tinted where it does not. */
.bmad-sb-tag[data-tone="error"]{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground);letter-spacing:.04em}
.bmad-sb-tag[data-tone="warning"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 22%,transparent);color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 78%,var(--dsw-alias-label-primary))}
.bmad-sb-cardtitle{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;font-size:12px}
.bmad-sb-cardnote{font-size:10px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.bmad-sb-epicsec{margin-bottom:8px;padding:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
.bmad-sb-epichead{display:flex;align-items:center;gap:7px;margin-bottom:6px}
.bmad-sb-epichead .bmad-sb-lanehead{width:auto;padding:2px 4px}
.bmad-sb-epicname{font-size:12px;font-weight:600;text-transform:capitalize}
.bmad-sb-note{padding:14px 4px;color:var(--dsw-alias-label-secondary);font-size:12px}
.bmad-sb-error{padding:12px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;color:var(--dsw-alias-label-primary);font-size:12px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bmad-sb-empty{padding:12px;border:1px dashed var(--dsw-alias-border-l1);border-radius:8px;color:var(--dsw-alias-label-primary);font-size:12px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bmad-sb-emptytitle{font-weight:600}
.bmad-sb-btn{appearance:none;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;padding:4px 10px;cursor:pointer}
.bmad-sb-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.bmad-sb-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.bmad-sb-cardfoot .bmad-sb-btn{align-self:flex-start;border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:600}
.bmad-sb-cardfoot .bmad-sb-btn:hover{background:var(--dsw-alias-button-primary-hover)}
/* While the write is in flight the button stays put and reads as working. */
.bmad-sb-btn[data-state="busy"]{opacity:.72;cursor:progress}
.bmad-sb-copywrap{display:inline-flex;flex-direction:row-reverse;align-items:center;gap:6px;min-width:0}
.bmad-sb-spinner{flex:0 0 auto;width:9px;height:9px;margin-left:6px;border-radius:50%;
border:1.5px solid color-mix(in srgb,currentColor 35%,transparent);border-top-color:currentColor;
animation:bmad-sb-spin 620ms linear infinite}
@keyframes bmad-sb-spin{to{transform:rotate(360deg)}}
/* The outcome, beside the control rather than in place of its label. */
.bmad-sb-tip{display:inline-flex;align-items:center;border-radius:999px;padding:0 8px;font-size:9px;
line-height:16px;font-weight:700;white-space:nowrap;animation:bmad-sb-tip-in 140ms ease-out}
.bmad-sb-tip[data-kind="copied"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary)}
.bmad-sb-tip[data-kind="failed"]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 16%,transparent);color:var(--dsw-alias-state-error-primary)}
@keyframes bmad-sb-tip-in{from{opacity:0;transform:translateX(-3px)}to{opacity:1;transform:none}}
.bmad-sb-sectitle{display:flex;align-items:center;gap:6px;margin:14px 0 6px;font-size:11px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}

.bmad-sb-metrics{display:flex;flex-direction:column;gap:5px;padding:0 12px 8px}
.bmad-sb-metric{display:flex;flex-direction:column;gap:3px;font-size:11px;line-height:1.2}
.bmad-sb-metricrow{display:flex;align-items:center;gap:7px}
.bmad-sb-metriclabel{flex:0 0 78px;color:var(--dsw-alias-label-secondary);text-transform:lowercase}
.bmad-sb-metrictrack{flex:1 1 auto;display:flex;min-width:0;height:8px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.bmad-sb-metricfill{display:block;height:100%}
.bmad-sb-metricfill[data-tone="success"]{background:var(--dsw-alias-state-success-primary)}
.bmad-sb-metricfill[data-tone="info"]{background:var(--dsw-alias-state-business-primary)}
/* The unknown cell is encoded three ways at once -- outline, unfilled body and a
   label -- because every neutral tone is already spoken for: grey means backlog
   on this board, and the track itself is already empty. A solid fill would
   collide with one of them under some theme; an outline plus a count cannot. */
.bmad-sb-metricunknown{display:block;height:100%;box-sizing:border-box;background:transparent;border:1px dashed var(--dsw-alias-label-secondary);border-radius:2px}
.bmad-sb-metricnum{flex:0 0 auto;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
.bmad-sb-metricpct{flex:0 0 34px;text-align:right;font-variant-numeric:tabular-nums}
.bmad-sb-metricwarn{color:var(--dsw-alias-state-warn-primary)}
.bmad-sb-metricnote{flex:0 0 auto;color:var(--dsw-alias-label-secondary)}
/* The bar's own row, then anything the bar cannot draw. */
.bmad-sb-metricfoot{display:flex;align-items:center;gap:6px;padding-left:2px}
/* In the metric the button leads, so the bubble must not reverse there. */
.bmad-sb-metricfoot .bmad-sb-copywrap{flex-direction:row}
/* In the metric the button leads, so the bubble must not reverse there. */
.bmad-sb-metricfoot .bmad-sb-copywrap{flex-direction:row}
.bmad-sb-badge{display:inline-flex;align-items:center;border-radius:999px;padding:0 8px;font-size:9px;line-height:16px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
/* A warning tint was too quiet for a second-class requirement set: the badge
   reports a hole in the measurement, not a caveat on one. */
.bmad-sb-badge--error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}
.bmad-sb-badge--warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.bmad-sb-summary{display:flex;flex-wrap:wrap;gap:4px 10px;padding:0 12px 8px;font-size:10px;color:var(--dsw-alias-label-secondary)}
.bmad-sb-summary--done{color:var(--dsw-alias-state-success-primary);font-weight:600}
.bmad-sb-summary--unknown{color:var(--dsw-alias-state-warn-primary);font-weight:600}
.bmad-sb-req{display:grid;grid-template-columns:14px 46px 1fr;gap:2px 7px;align-items:baseline;padding:4px 2px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.bmad-sb-req:last-child{border-bottom:0}
.bmad-sb-reqmark{font-size:11px;line-height:1.2;text-align:center}
.bmad-sb-req[data-state="done"] .bmad-sb-reqmark{color:var(--dsw-alias-state-success-primary)}
.bmad-sb-req[data-state="partial"] .bmad-sb-reqmark{color:var(--dsw-alias-state-business-primary)}
.bmad-sb-req[data-state="todo"] .bmad-sb-reqmark{color:var(--dsw-alias-label-secondary)}
/* Nothing to read a state from: hollow, never a tick and never a cross. */
.bmad-sb-req[data-state="unknown"] .bmad-sb-reqmark{color:var(--dsw-alias-state-warn-primary)}
.bmad-sb-reqid{font-size:9px;font-weight:700;letter-spacing:.02em;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.bmad-sb-reqname{font-size:11px;line-height:1.35;color:var(--dsw-alias-label-primary)}
.bmad-sb-reqnote{grid-column:3;font-size:9px;color:var(--dsw-alias-label-secondary);opacity:.8}
.bmad-sb-next{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;padding:0 12px 9px;font-size:11px}
.bmad-sb-nextlabel{color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.04em;font-size:10px}
.bmad-sb-nextskill{font-weight:600;color:var(--dsw-alias-state-business-primary)}
.bmad-sb-nextkey{color:var(--dsw-alias-label-primary)}
.bmad-sb-nextreason{color:var(--dsw-alias-label-secondary)}
.bmad-sb-next .bmad-sb-btn{align-self:flex-start;border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:600}
.bmad-sb-next .bmad-sb-btn:hover{background:var(--dsw-alias-button-primary-hover)}
.bmad-sb-next[data-kind="done"]{color:var(--dsw-alias-state-success-primary)}
/* The action sits away from the reading, and against the card's right edge. */
.bmad-sb-cardfoot{display:flex;justify-content:flex-end;margin-top:5px}
/* Unverifiable must not read as a finding, nor as clean: same card, dashed edge. */
/* Unverifiable must not read as a finding, nor as clean: same lane, dashed cards. */
.bmad-sb-lane--unverifiable .bmad-sb-card{border-style:dashed}
.bmad-sb-unver .bmad-sb-card{border-style:dashed}

/* --- Motion ---------------------------------------------------------------
   Two animations only, both short and both reducible to nothing. Height goes
   through grid-template-rows so a lane animates to a content height nobody has
   measured; visibility flips after the collapse, so a shut lane holds nothing
   focusable while staying mounted for the transition. */
.bmad-sb-fold{overflow:hidden;transition:height 180ms cubic-bezier(.2,.7,.3,1)}
.bmad-sb-fold[data-collapsed="true"]{visibility:hidden;transition:height 180ms cubic-bezier(.2,.7,.3,1),visibility 0s linear 180ms}
.bmad-sb-foldinner{min-height:0}
.bmad-sb-view{animation:bmad-sb-view-in 170ms cubic-bezier(.2,.7,.3,1)}
@keyframes bmad-sb-view-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.bmad-sb-seg>button{transition:background-color 140ms ease,color 140ms ease}
.bmad-sb-lanehead{transition:background-color 120ms ease}
.bmad-sb-chev{transition:transform 180ms cubic-bezier(.2,.7,.3,1);transform-origin:50% 50%}
.bmad-sb-lanehead[aria-expanded="true"] .bmad-sb-chev{transform:rotate(90deg)}
@media (prefers-reduced-motion:reduce){
  .bmad-sb-fold,.bmad-sb-fold[data-collapsed="true"]{transition:none}
  .bmad-sb-view{animation:none}
  .bmad-sb-seg>button,.bmad-sb-lanehead,.bmad-sb-chev{transition:none}
  .bmad-sb-tip{animation:none}
  /* The spinner stops turning but still marks the button as working. */
  .bmad-sb-spinner{animation:none;border-top-color:currentColor}
}
`;

    // --- Leaf components ---------------------------------------------------

    /**
     * Guide artwork for the sprint board entry: a three-lane board holding an
     * uneven card in each lane. Drawn on the shared 36px canvas in the product's
     * fixed artwork palette -- artwork is the one place a literal colour is
     * correct, and the glyph is decorative, so it is hidden from assistive
     * technology and the guide supplies its own layout class.
     * @param props - square edge in px, and the layout class the guide passes.
     * @returns the ornamental SVG.
     */
    function GuideArtworkSprintBoard({ size = 36, className }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          className,
          'aria-hidden': 'true',
          viewBox: '0 0 36 36',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
        },
        h('path', {
          d: 'M10.5 9H25.5C26.8807 9 28 10.1193 28 11.5V24.5C28 25.8807 26.8807 27 25.5 27H10.5C9.11929 27 8 25.8807 8 24.5V11.5C8 10.1193 9.11929 9 10.5 9ZM14.6667 9V27M21.3333 9V27',
          stroke: '#A797FC',
          strokeWidth: '2',
        }),
        h('path', {
          d: 'M9.83 12.5H12.83V17H9.83ZM16.5 12.5H19.5V19H16.5ZM23.17 12.5H26.17V16H23.17Z',
          fill: '#8B7BF7',
        }),
      );
    }

    /**
     * One story, action, or deferred card. A card with no file to open renders
     * as a plain box instead of a button, so it never lies about being clickable.
     * @param props - the card's data, its open action, and an optional link chip.
     * @returns the card element.
     */
    function Card({ id, tag, tagTone, storyTag, title, note, footer, onOpen, openLabel }) {
      const body = [
        h(
          'span',
          { className: 'bmad-sb-cardtop', key: 'top' },
          id === '' ? null : h('span', { className: 'bmad-sb-id' }, id),
          storyTag === undefined
            ? null
            : h(
                'span',
                {
                  className: 'bmad-sb-tag',
                  'data-tone': storyTag.tone,
                  title: storyTag.title,
                },
                storyTag.label,
              ),
          tag === ''
            ? null
            : h(
                'span',
                {
                  className: 'bmad-sb-tag bmad-sb-tag--source',
                  'data-tone': tagTone ?? 'neutral',
                },
                tag,
              ),
        ),
        h('span', { className: 'bmad-sb-cardtitle', key: 'title' }, title),
        note === '' || note === undefined
          ? null
          : h('span', { className: 'bmad-sb-cardnote', key: 'note' }, note),
        footer === undefined ? null : h('span', { className: 'bmad-sb-cardfoot', key: 'foot' }, footer),
      ];

      if (typeof onOpen !== 'function') {
        return h('div', { className: 'bmad-sb-card' }, body);
      }
      return h(
        'button',
        {
          type: 'button',
          className: 'bmad-sb-card',
          onClick: onOpen,
          title: openLabel,
        },
        body,
      );
    }

    /**
     * A lane header that folds its cards.
     * @param props - lane identity, colour token, count, and fold state.
     * @returns the header button.
     */
    function LaneHeader({ label, token, count, countTitle, collapsed, onToggle }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'bmad-sb-lanehead',
          'aria-expanded': !collapsed,
          onClick: onToggle,
        },
        h('span', {
          className: 'bmad-sb-dot',
          style: { background: `var(${token})` },
          'aria-hidden': true,
        }),
        h('span', { className: 'bmad-sb-lanelabel' }, label),
        // The count wears the lane's own colour, so the header reads as one
        // thing: a green 12 beside Done, an amber 5 beside Gaps. The tint is
        // mixed from the token rather than declared, so a theme that redefines
        // the token moves the pill with it.
        h(
          'span',
          {
            className: 'bmad-sb-count',
            title: countTitle,
            style: {
              color: `var(${token})`,
              background: `color-mix(in srgb, var(${token}) 12%, transparent)`,
            },
          },
          String(count),
        ),
        h(
          'span',
          { className: 'bmad-sb-chev', 'aria-hidden': true },
          collapsed ? CHEVRON_CLOSED : CHEVRON_OPEN,
        ),
      );
    }
    function BoardShell({ header, body }) {
      return h(
        'div',
        { className: 'bmad-sb-root' },
        h('style', null, CSS),
        header,
        body,
      );
    }

    /**
     * The header a board that has not loaded yet can draw.
     * @param props - the copy.
     * @returns the header element.
     */
    function TitleOnlyHeader({ t }) {
      return h(
        'header',
        { className: 'bmad-sb-head' },
        h(
          'div',
          { className: 'bmad-sb-titlerow' },
          h('span', { className: 'bmad-sb-title' }, t('title')),
        ),
      );
    }

    /**
     * The four views this one tab switches between.
     *
     * Status answers what is where, Epics answers how far each slice has come,
     * Tickets answers what one ticket is, and Initiatives answers which project
     * is on screen. They are readings of the same scan, so they are views of one
     * tab rather than tabs of their own.
     */
    const VIEWS = ['status', 'epic', 'tickets', 'initiatives'];

    /**
     * The dictionary key for each view's segment label. Kept as a map rather
     * than built from the id, because the id is an internal name while the key
     * is prose that translators own.
     */
    const VIEW_LABELS = {
      status: 'viewStatus',
      epic: 'viewEpic',
      tickets: 'viewTickets',
      initiatives: 'viewInitiatives',
    };

    /**
     * The header of a loaded board: the initiative, how much of it is settled,
     * and the view toggle.
     * @param props - the selected initiative, the current view, and the controls.
     * @returns the header element.
     */
    function BoardHeader({ t, initiative, view, onView, onRefresh, refreshing }) {
      return h(
        'header',
        { className: 'bmad-sb-head' },
        h(
          'div',
          { className: 'bmad-sb-titlerow' },
          h('span', { className: 'bmad-sb-title' }, t('title')),
          h(
            'span',
            { className: 'bmad-sb-project', title: initiative.dir },
            initiative.title,
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'bmad-sb-iconbtn',
              onClick: onRefresh,
              title: t('refresh'),
              'aria-label': t('refresh'),
            },
            '\u21BB',
          ),
        ),
        refreshing === true
          ? h(
              'div',
              { className: 'bmad-sb-sub' },
              h(
                'span',
                { className: 'bmad-sb-refreshing', role: 'status' },
                h('span', { className: 'bmad-sb-spinner', 'aria-hidden': true }),
                t('refreshing'),
              ),
            )
          : null,
        h(
          'div',
          { className: 'bmad-sb-metrics' },
          h(Bar, {
            t,
            label: t('barTickets'),
            done: initiative.counts.settled,
            total: initiative.counts.tickets,
            unknown: initiative.counts.unknown,
            // An initiative with no tickets has no denominator, and an empty
            // track would read as "clean" about a measurement nobody made.
            noData: initiative.counts.tickets === 0,
            tone: 'success',
          }),
        ),
        h(
          'div',
          { className: 'bmad-sb-seg', role: 'group', 'aria-label': t('viewLabel') },
          VIEWS.map((id) =>
            h(
              'button',
              {
                key: id,
                type: 'button',
                'aria-pressed': view === id,
                onClick: () => onView(id),
              },
              t(VIEW_LABELS[id]),
            ),
          ),
        ),
      );
    }

    /**
     * What a board that could not read its files shows instead. This is a real
     * failure -- the file was found and then would not read -- so it reports the
     * reason rather than pretending the workspace is empty.
     * @param props - the failure text and the retry action.
     * @returns the error element.
     */
    function LoadFailure({ t, message, onRetry }) {
      return h(
        'div',
        { className: 'bmad-sb-scroll' },
        h(
          'div',
          { className: 'bmad-sb-error', role: 'alert' },
          h('span', null, t('loadFailed')),
          h('span', { className: 'bmad-sb-cardnote' }, message),
          h(
            'button',
            { type: 'button', className: 'bmad-sb-btn', onClick: onRetry },
            t('retry'),
          ),
        ),
      );
    }

    /**
     * What the board shows when there is no v7 project to draw: an older
     * project, no project at all, or an output folder holding no initiative.
     * None of these is a read failure, so each one names its own case and what
     * to do about it instead of offering an empty board.
     * @param props - the detected case and the retry action.
     * @returns the notice element.
     */
    function VersionNotice({ t, version, onRetry }) {
      const title =
        version === 'v6'
          ? t('v6.title')
          : version === 'empty'
            ? t('noInitiatives.title')
            : t('noBmad.title');
      const body =
        version === 'v6'
          ? t('v6.body')
          : version === 'empty'
            ? t('noInitiatives.body')
            : t('noBmad.body');
      return h(
        'div',
        { className: 'bmad-sb-scroll' },
        h(
          'div',
          { className: 'bmad-sb-empty', role: 'status' },
          h('span', { className: 'bmad-sb-emptytitle' }, title),
          h('span', { className: 'bmad-sb-cardnote' }, body),
          h(
            'button',
            { type: 'button', className: 'bmad-sb-btn', onClick: onRetry },
            t('retry'),
          ),
        ),
      );
    }

    /**
     * Build a card's open action.
     * @param actions - the tab's own navigation actions.
     * @param fileAddress - the injected workspace-path to address builder.
     * @param path - the file to open, or null when the card has none.
     * @returns the click handler, or nothing for a card with no file.
     */

    function openHandler(actions, fileAddress, path) {
      if (path === null || path === undefined) return;
      return () => actions.openResource(fileAddress(path));
    }

    /**
     * Whether a fold is closed: the reader's own last choice, or the default the
     * board would show before they touch it. Holding overrides rather than a
     * closed set lets a later read change a default -- an epic that becomes done
     * folds itself -- while every fold the reader has touched keeps their choice.
     * @param folded - the override map for one view.
     * @param key - the lane or epic key.
     * @param fallback - the state before the reader touches this key.
     * @returns true when the body is hidden.
     */
    function isFolded(folded, key, fallback) {
      return folded.has(key) ? folded.get(key) : fallback;
    }

    /**
     * Build a fold toggle for one key.
     * @param setter - the state setter holding that view's override map.
     * @param key - the lane or epic to flip.
     * @param fallback - the state the key shows before it is overridden.
     * @returns the click handler.
     */
    function foldHandler(setter, key, fallback) {
      return () => {
        setter((previous) => {
          const next = new Map(previous);
          next.set(key, !isFolded(previous, key, fallback));
          return next;
        });
      };
    }
    function failureSnapshot(error) {
      return {
        phase: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }

    /**
     * Read the sprint files once per revision, cancelling on unmount or when the
     * tab occurrence ends. The readers are bound once per occurrence, so the
     * revision counter and the tab's own lifetime are the only inputs that
     * re-run the read.
     * @param props - the injected readers and the tab's lifetime signal.
     * @returns the load snapshot: loading, ready with a model, or failed.
     */
    /**
     * One sparse bar. The denominator is the whole set, and an unverifiable part
     * is drawn as an outlined, unfilled cell inside the track rather than by
     * shrinking the total -- a denominator that shrinks when the board cannot see
     * is a board that improves its score by going blind.
     *
     * The unknown cell is encoded three ways at once (outline, fill, label)
     * because every neutral tone is already taken for something else: grey means
     * backlog here, and the track is already empty.
     * @param props - the bar's label, its counts, and the copy.
     * @returns the bar row.
     */
    function Bar({ t, label, done, total, unknown = 0, noData = false, badge = '', tone }) {
      // A bar with a badge is a block: the row, then the foot beneath it.
      const known = Math.max(0, total - unknown);
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      const segments = [];
      if (done > 0) {
        segments.push(
          h('span', {
            key: 'done',
            className: 'bmad-sb-metricfill',
            'data-tone': tone,
            style: { width: `${(done / Math.max(total, 1)) * 100}%` },
          }),
        );
      }
      if (unknown > 0) {
        segments.push(
          h('span', {
            key: 'unknown',
            className: 'bmad-sb-metricunknown',
            style: { width: `${(unknown / Math.max(total, 1)) * 100}%` },
            title: t('unknownHint', { count: unknown }),
          }),
        );
      }
      // With no denominator there is nothing to draw, and drawing an empty
      // track would say "clean" about a measurement nobody made.
      if (noData) {
        return h(
          'div',
          { className: 'bmad-sb-metric' },
          h(
            'div',
            { className: 'bmad-sb-metricrow' },
            h('span', { className: 'bmad-sb-metriclabel' }, label),
            h('span', {
              className: 'bmad-sb-metricunknown',
              style: { flex: '1 1 auto' },
              role: 'img',
              'aria-label': t('barNoData', { label }),
            }),
            h('span', { className: 'bmad-sb-metricwarn' }, t('cannotMeasure')),
          ),
        );
      }

      return h(
        'div',
        { className: 'bmad-sb-metric' },
        h(
          'div',
          { className: 'bmad-sb-metricrow' },
          h('span', { className: 'bmad-sb-metriclabel' }, label),
          h(
            'span',
            {
              className: 'bmad-sb-metrictrack',
              role: 'img',
              'aria-label':
                unknown > 0
                  ? t('barLabelUnknown', { label, done, total, unknown })
                  : t('barLabel', { label, done, total }),
            },
            segments,
          ),
          h(
            'span',
            { className: 'bmad-sb-metricnum' },
            `${done} / ${total}`,
            unknown > 0 ? h('span', { className: 'bmad-sb-metricwarn' }, ` +${unknown}?`) : null,
          ),
          h('span', { className: 'bmad-sb-metricwarn bmad-sb-metricpct' }, `${pct}%`),
          known === 0 && total > 0
            ? h('span', { className: 'bmad-sb-metricwarn' }, t('nothingVerifiable'))
            : null,
        ),
        // The mapped count is a fraction of the inventory. It goes on its own row
        // as a badge rather than trailing the numbers as a note: at 23 of 40 it
        // is the larger half of the picture, and the bar alone cannot show it.
        badge === ''
          ? null
          : h(
              'div',
              { className: 'bmad-sb-metricfoot' },
              // No action here: the card in the Could-not-check lane carries the
              // same one, and a second button beside the bar asks the same
              // question twice on one screen.
              h('span', { className: 'bmad-sb-badge bmad-sb-badge--error' }, badge),
            ),
      );
    }
    function Fold({ collapsed, children }) {
      const inner = React.useRef(null);
      const [contentHeight, setContentHeight] = React.useState(0);

      React.useEffect(() => {
        const node = inner.current;
        if (node === null) return undefined;
        const measure = () => setContentHeight(node.scrollHeight);
        measure();
        if (typeof ResizeObserver !== 'function') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
      }, []);

      return h(
        'div',
        {
          className: 'bmad-sb-fold',
          'data-collapsed': String(collapsed),
          style: { height: collapsed ? '0px' : `${contentHeight}px` },
        },
        h('div', { className: 'bmad-sb-foldinner', ref: inner }, children),
      );
    }

    /**
     * Severity -> the tag tone that carries it.
     *
     * A finding is not a status, so it does not wear a status tag's quiet tint.
     * `high` and `critical` take the error colour filled solid: a done story
     * owing patches is a contradiction, and a pale pill in a muted theme reads as
     * decoration. `medium` stays a warning tint, and `low` stays neutral, so the
     * three levels are distinguishable at a glance rather than by reading.
     *
     * @param severity - the finding's severity.
     * @returns a tag tone.
     */
    const severityTone = (severity) =>
      severity === 'critical' || severity === 'high'
        ? 'error'
        : severity === 'medium'
          ? 'warning'
          : 'neutral';

    /**
     * One lane of cards. `StatusLane` and `EpisodeSection` predate this shape;
     * a lane is a `section` carrying `bmad-sb-lane`, a `LaneHeader`, and the
     * cards below it when it is open.
     *
     * The gaps are lanes for the same reason they are `Card`s: a gap and a story
     * are two readings of one board, and a second component drifts from the first
     * the moment either changes.
     * @param props - the label, the dot's token, the cards, and the fold state.
     * @returns the lane.
     */
    function CardLane({ label, token, cards, collapsed, onToggle, modifier, note, empty, count, countTitle }) {
      return h(
        'section',
        {
          className: modifier === undefined ? 'bmad-sb-lane' : `bmad-sb-lane ${modifier}`,
          'aria-label': label,
        },
        h(LaneHeader, {
          label,
          token,
          // A lane usually counts what it holds. Retro action items are the
          // exception: the number that matters is how many are still open
          // against how many are settled, so the badge carries both.
          count: count === undefined ? cards.length : count,
          countTitle,
          collapsed,
          onToggle,
        }),
        h(
          Fold,
          { collapsed },
          cards.length === 0 && empty !== undefined
            ? h('div', { className: 'bmad-sb-note' }, empty)
            : h('div', { className: 'bmad-sb-cards' }, cards),
        ),
        collapsed === true || note === undefined || note === ''
          ? null
          : h('div', { className: 'bmad-sb-note' }, note),
      );
    }

    /** The gap cards: the finding, its evidence, and the action in the footer. */
    const gapCards = (t, gaps) =>
      gaps.map((gap) =>
        h(Card, {
          key: `${gap.id}:${gap.subject}`,
          id: gap.id,
          tag: gap.title,
          tagTone: severityTone(gap.severity),
          title: gap.subject,
          note: gap.evidence,
          footer: h(CopyButton, {
            t,
            label: gap.action.label,
            value: gap.action.payload,
          }),
        }),
      );

    /**
     * What the board could not check. The same lane and the same cards, dashed,
     * because this must never be mistaken for a finding nor for a clean result.
     */
    const unverifiableCards = (t, unverifiable) =>
      unverifiable.map((item) =>
        h(Card, {
          key: `${item.id}:${item.subject}`,
          id: item.id,
          tag: item.title,
          tagTone: 'warning',
          title: item.subject,
          note: item.evidence,
          footer: h(CopyButton, {
            t,
            label: t('askAnAgent'),
            value: item.action.payload,
          }),
        }),
      );

    /**
     * Copy text, and report whether it worked.
     *
     * `navigator.clipboard.writeText` returns a promise, so a refusal is a
     * rejection rather than a throw -- wrapping the call in try/catch catches
     * nothing and the copy fails in silence. It is refused whenever the document
     * is not focused, which is common enough to matter. The fallback path uses a
     * throwaway textarea and `execCommand`, which is deprecated but still the
     * only route when the async API is blocked.
     *
     * @param value - the text to place on the clipboard.
     * @param report - called with true when the copy landed, false when it did not.
     */
    function copyText(value, report) {
      const done = (ok) => {
        try {
          report(ok);
        } catch {
          /* a reporter that throws is not a copy failure */
        }
      };

      const fallback = () => {
        try {
          const scratch = document.createElement('textarea');
          scratch.value = value;
          scratch.setAttribute('readonly', '');
          scratch.style.position = 'fixed';
          scratch.style.top = '-1000px';
          scratch.style.opacity = '0';
          document.body.appendChild(scratch);
          scratch.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(scratch);
          return ok;
        } catch {
          return false;
        }
      };

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(value).then(
          () => done(true),
          () => done(fallback()),
        );
        return;
      }
      done(fallback());
    }

    /**
     * A button that copies its payload and says so.
     *
     * Every action this board offers is a string, so a copy with no visible
     * outcome is indistinguishable from a broken button -- which is exactly what
     * it was. The label carries the result for a moment, then returns.
     * @param props - the label, the payload, and the action kind.
     * @returns the copy button.
     */
    function CopyButton({ t, label, value }) {
      const [busy, setBusy] = React.useState(false);
      const [notice, setNotice] = React.useState(null);

      return h(
        'span',
        { className: 'bmad-sb-copywrap' },
        h(
          'button',
          {
            type: 'button',
            className: 'bmad-sb-btn',
            // The label never changes. It used to be replaced by "Copied" and
            // back, which resized the button twice and read as the control
            // vanishing rather than reporting; the result belongs beside it.
            'data-state': busy ? 'busy' : 'idle',
            'aria-busy': busy ? 'true' : undefined,
            disabled: busy,
            // Every action here is the same act -- copy a prompt -- so the
            // visible text says that once instead of nine different sentences
            // that all did the same thing. What this particular one asks stays
            // available two ways: on hover, and as the accessible name, so a
            // screen reader does not hear nine identical buttons.
            'aria-label': label,
            title: value,
            onClick: (event) => {
              // A card that can be opened is itself a button, and this one sits
              // inside it. Without this the click copies *and* opens the
              // document, so the action did two things and only one was asked.
              event.stopPropagation();
              if (busy) return;
              setBusy(true);
              setNotice(null);
              copyText(value, (ok) => {
                setBusy(false);
                setNotice(ok ? 'copied' : 'failed');
                window.setTimeout(() => setNotice(null), 2000);
              });
            },
          },
          t('askAgentPill'),
          busy ? h('span', { className: 'bmad-sb-spinner', 'aria-hidden': true }) : null,
        ),
        // `status` so the outcome is announced as well as shown.
        notice === null
          ? null
          : h(
              'span',
              { className: 'bmad-sb-tip', 'data-kind': notice, role: 'status' },
              notice === 'copied' ? t('copied') : t('copyFailed'),
            ),
      );
    }

    /**
     * The last good reading per Session, kept for the life of the page.
     *
     * A refresh re-reads around thirty files. Without this, every remount -- a
     * tab switch, a second look at the same board -- pays that cost again and
     * shows a spinner while it does, even though the answer rarely changed.
     */
    const SNAPSHOT_CACHE = new Map();

    /**
     * Read a whole workspace file, page by page.
     *
     * The Remote read returns one page and says whether it reached the end. A
     * ticket index or plan longer than one page would otherwise be silently
     * truncated, and the board would report the unseen tail as absent.
     *
     * @param face - the `workspaceFiles` Remote namespace.
     * @param sessionId - the Session whose workspace resolves the path.
     * @param path - the workspace-relative path.
     * @param signal - cancellation.
     * @returns {Promise<string>} the whole text.
     */
    async function readWholeFile(face, sessionId, path, signal) {
      const parts = [];
      let offset = 1;
      for (;;) {
        const result = await face.read(sessionId, path, { offset }, signal);
        if (!result.ok) throw result.error;
        const page = result.value;
        parts.push(page.text);
        if (page.eof) return parts.join('\n');
        offset += Math.max(page.lines, 1);
      }
    }

    /**
     * Read the BMAD project once per revision, cancelling on unmount or when the
     * tab occurrence ends. The readers are bound once per occurrence, so the
     * revision counter and the tab's own lifetime are the only inputs that
     * re-run the scan.
     * @param props - the injected readers and the tab's lifetime signal.
     * @returns the load snapshot: loading, ready with a scan, or failed.
     */
    function useSprintSnapshot({ io, sessionId, tabSignal, revision }) {
      // Start from what we already know, already marked as being refreshed.
      const [snapshot, setSnapshot] = React.useState(() => {
        const cached = SNAPSHOT_CACHE.get(sessionId);
        return cached === undefined ? { phase: 'loading' } : { ...cached, refreshing: true };
      });

      React.useEffect(() => {
        const controller = new AbortController();
        const onTabGone = () => controller.abort();
        tabSignal.addEventListener('abort', onTabGone);
        let live = true;

        const cached = SNAPSHOT_CACHE.get(sessionId);
        // With something to show, show it and say it is being refreshed. With
        // nothing, the spinner is the only honest thing on screen.
        setSnapshot(cached === undefined ? { phase: 'loading' } : { ...cached, refreshing: true });

        scanProject(io, controller.signal).then(
          (board) => {
            if (!live) return;
            const next = { phase: 'ready', board, readAt: Date.now(), refreshing: false };
            SNAPSHOT_CACHE.set(sessionId, next);
            setSnapshot(next);
          },
          (error) => {
            if (!live) return;
            const previous = SNAPSHOT_CACHE.get(sessionId);
            // A refresh that fails keeps the last good reading and says so. A
            // blank board would be a worse lie than a dated one.
            setSnapshot(
              previous === undefined
                ? failureSnapshot(error)
                : { ...previous, refreshing: false, refreshFailed: true },
            );
          },
        );

        return () => {
          live = false;
          tabSignal.removeEventListener('abort', onTabGone);
          controller.abort();
        };
      }, [revision, tabSignal, io, sessionId]);

      return snapshot;
    }

    // --- Views -------------------------------------------------------------

    /**
     * A v7 status mapped to the theme token that carries its marker colour.
     *
     * The words are `STATUS_ORDER` plus the unknown lane: grey while nothing is
     * moving, blue while it is, amber while someone is reviewing, solid error red
     * when blocked, green once settled. The mapping lives in the shell because a
     * theme token may not enter the core.
     * @param status - a ticket or container status, or null when none is declared.
     * @returns a theme token name.
     */
    function statusToken(status) {
      if (status === 'blocked') return '--dsw-alias-state-error-primary';
      if (status === 'in-progress' || status === 'built') {
        return '--dsw-alias-state-business-primary';
      }
      if (status === 'review') return WARN_TOKEN;
      if (status === 'done') return '--dsw-alias-state-success-primary';
      if (status === null) return WARN_TOKEN;
      return IDLE_TOKEN;
    }

    /**
     * The tag tone a status wears on a card. A tag is quieter than a lane dot,
     * so settled work is tinted rather than filled.
     * @param status - a ticket status, or null when none is declared.
     * @returns a tag tone.
     */
    function statusTone(status) {
      if (status === 'done') return 'success';
      if (status === 'blocked') return 'error';
      if (status === 'review') return 'warning';
      if (status === 'in-progress' || status === 'built') return 'info';
      if (status === null) return 'warning';
      return 'neutral';
    }

    /**
     * The displayed name of a status, including the unknown lane.
     *
     * A status word the dictionary does not know is shown as the word itself.
     * Translating it is impossible, and folding it into a generic label would
     * lose exactly the finding the detector reports.
     * @param t - the bound dictionary.
     * @param status - a status, or null when none is declared.
     * @returns the label.
     */
    function statusLabel(t, status) {
      if (status === null) return t('status.unknown');
      const key = `status.${status}`;
      const label = t(key);
      return label === key ? status : label;
    }

    /**
     * One ticket as a card: its reference, title, status, and -- where the list
     * is not already inside an epic -- the epic it belongs to.
     * @param props - the ticket, the opener, and whether to name its epic.
     * @returns the card element.
     */
    function TicketCard({ t, ticket, makeOpener, showEpic }) {
      return h(Card, {
        id: ticket.ref,
        title: ticket.title,
        storyTag: {
          // A ticket with no plan has no state at all; saying "unknown" beside
          // tickets that do declare one would blur the two cases together.
          label: ticket.status === null ? t('noPlan') : statusLabel(t, ticket.status),
          tone: statusTone(ticket.status),
          title: t('ticketStatus'),
        },
        note: showEpic === true ? ticket.epicTitle : '',
        onOpen: makeOpener(ticket.plan === null ? null : ticket.plan.path),
        openLabel: t('openPlan'),
      });
    }

    /**
     * View 1: the initiative's status lanes, then what the detectors say is
     * wrong or unknowable.
     *
     * The findings stay below the work rather than inside it: a gap is not a
     * status, and an unverifiable check is not a gap. A ticket with no plan sits
     * in its own lane because "not started" and "cannot tell" are different
     * claims.
     * @param props - the initiative, the unreadable count, folds, and the opener.
     * @returns the status view.
     */
    function StatusView({ t, initiative, unreadable, folded, onFlip, makeOpener }) {
      const lanes = statusLanes(initiative).map(({ status, tickets }) => {
        const laneKey = `status:${status ?? 'unknown'}`;
        return h(CardLane, {
          key: laneKey,
          label: statusLabel(t, status),
          token: statusToken(status),
          cards: tickets.map((ticket) =>
            h(TicketCard, { key: ticket.ref, t, ticket, makeOpener, showEpic: true })),
          collapsed: isFolded(folded, laneKey, false),
          onToggle: foldHandler(onFlip, laneKey, false),
        });
      });

      const detected = detectInitiative(initiative);
      const empty = detectEmptyInitiative(initiative);
      const gaps = empty === null ? detected.gaps : [empty, ...detected.gaps];
      const findings = [
        gaps.length === 0
          ? null
          : h(CardLane, {
              key: 'gaps',
              label: t('gapsLabel'),
              token: WARN_TOKEN,
              cards: gapCards(t, gaps),
              collapsed: isFolded(folded, 'gaps', false),
              onToggle: foldHandler(onFlip, 'gaps', false),
            }),
        detected.unverifiable.length === 0
          ? null
          : h(CardLane, {
              key: 'unverifiable',
              label: t('unverLabel'),
              token: IDLE_TOKEN,
              modifier: 'bmad-sb-lane--unverifiable',
              cards: unverifiableCards(t, detected.unverifiable),
              collapsed: isFolded(folded, 'unverifiable', false),
              onToggle: foldHandler(onFlip, 'unverifiable', false),
            }),
      ].filter(Boolean);

      return h(
        'div',
        null,
        lanes.length === 0 ? h('div', { className: 'bmad-sb-note' }, t('noTickets')) : lanes,
        unreadable > 0
          ? h(
              'div',
              { className: 'bmad-sb-note' },
              t('unreadableNote', { count: unreadable }),
            )
          : null,
        findings,
      );
    }

    /**
     * View 2: one foldable section per epic.
     *
     * The count is settled over total, and the progress tooltip carries how many
     * tickets have no plan -- those are counted in neither half, so a bare
     * ratio would overstate what the epic has done.
     * @param props - the initiative, folds, and the opener.
     * @returns the epic view.
     */
    function EpicView({ t, initiative, folded, onFlip, makeOpener }) {
      if (initiative.epics.length === 0) {
        return h('div', { className: 'bmad-sb-note' }, t('noEpics'));
      }
      return h(
        'div',
        null,
        initiative.epics.map((epic) => {
          const settled = epic.tickets.filter(
            (ticket) => ticket.status !== null && SETTLED.has(ticket.status),
          ).length;
          const unknown = epic.tickets.filter((ticket) => ticket.status === null).length;
          const foldKey = `epic:${initiative.slug}:${epic.slug}`;
          const collapsed = isFolded(folded, foldKey, false);
          const cards = epic.tickets.map((ticket) =>
            h(TicketCard, {
              key: ticket.ref,
              t,
              ticket,
              makeOpener,
              showEpic: false,
            }));
          return h(
            'section',
            { className: 'bmad-sb-epicsec', key: foldKey },
            h(
              'div',
              { className: 'bmad-sb-epichead' },
              h(LaneHeader, {
                label: epic.title,
                token: statusToken(epic.status),
                count: `${settled}/${epic.tickets.length}`,
                countTitle: t('epicProgress', {
                  done: settled,
                  total: epic.tickets.length,
                  unknown,
                }),
                collapsed,
                onToggle: foldHandler(onFlip, foldKey, false),
              }),
              h(
                'span',
                {
                  className: 'bmad-sb-tag bmad-sb-tag--source',
                  'data-tone': statusTone(epic.status),
                },
                statusLabel(t, epic.status),
              ),
            ),
            h(
              Fold,
              { collapsed },
              cards.length === 0
                ? h('div', { className: 'bmad-sb-note' }, t('noTickets'))
                : h('div', { className: 'bmad-sb-cards' }, cards),
            ),
          );
        }),
      );
    }

    /**
     * View 3: every ticket in the initiative, grouped by status.
     *
     * The epic title rides on each card because this is the view where a ticket
     * is read on its own rather than inside the section that contains it.
     * @param props - the initiative, folds, and the opener.
     * @returns the ticket view.
     */
    function TicketsView({ t, initiative, folded, onFlip, makeOpener }) {
      const lanes = statusLanes(initiative);
      if (lanes.length === 0) {
        return h('div', { className: 'bmad-sb-note' }, t('noTickets'));
      }
      return h(
        'div',
        null,
        lanes.map(({ status, tickets }) => {
          const laneKey = `tickets:${status ?? 'unknown'}`;
          return h(CardLane, {
            key: laneKey,
            label: statusLabel(t, status),
            token: statusToken(status),
            cards: tickets.map((ticket) =>
              h(TicketCard, { key: ticket.ref, t, ticket, makeOpener, showEpic: true })),
            // Settled work is still shown, but a finished initiative should open on
            // what is left rather than on the lane that holds everything else.
            collapsed: isFolded(folded, laneKey, SETTLED.has(status)),
            onToggle: foldHandler(onFlip, laneKey, SETTLED.has(status)),
          });
        }),
      );
    }

    /**
     * View 4: one card per initiative, with the one BMAD itself considers active
     * marked apart from the one this tab happens to show.
     *
     * Choosing a card only changes local state. `active_initiative` belongs to
     * the project's config, and a read-only board must not rewrite it to record
     * which card someone clicked.
     * @param props - every initiative, the active and shown slugs, and the picker.
     * @returns the initiatives view.
     */
    function InitiativesView({ t, initiatives, activeSlug, selectedSlug, onSelect, folded, onFlip }) {
      const asCard = (initiative) => {
        const active = initiative.slug === activeSlug;
        const selected = selectedSlug !== null && initiative.slug === selectedSlug;
        const marks = [
          active ? t('activeBadge') : '',
          selected ? t('selectedBadge') : '',
        ].filter(Boolean);
        const counts = t('initiativeCounts', {
          epics: initiative.counts.epics,
          tickets: initiative.counts.tickets,
        });
        return h(Card, {
          key: initiative.slug,
          id: humanise(initiative.slug),
          title: initiative.title,
          storyTag: {
            label: statusLabel(t, initiative.status),
            tone: statusTone(initiative.status),
            title: t('initiativeStatus'),
          },
          // An initiative whose store lists no epics has never had work in it,
          // whatever its status field says. Saying so is the whole point of the
          // board: the number and the word disagree, and the reader sees both.
          note: [
            counts,
            initiative.counts.epics === 0 ? t('initiativeEmpty') : '',
            initiative.unreadable > 0
              ? t('initiativeUnreadable', { count: initiative.unreadable })
              : '',
          ].filter(Boolean).join(' -- '),
          footer: marks.length === 0 ? undefined : marks.join(' | '),
          onOpen: () => onSelect(initiative.slug),
          openLabel: t('selectInitiative'),
        });
      };

      // A settled initiative keeps its folder and its tickets, and hiding them
      // would be the board deciding what the reader may see. They collect under
      // one fold instead, so the list stays about work that is still open
      // without pretending the finished work is not there.
      const open = initiatives.filter((i) => !SETTLED.has(i.status));
      const settled = initiatives.filter((i) => SETTLED.has(i.status));

      return h(
        'div',
        null,
        h('div', { className: 'bmad-sb-cards' }, open.map(asCard)),
        settled.length === 0
          ? null
          : h(CardLane, {
              label: t('settledInitiatives'),
              token: IDLE_TOKEN,
              cards: settled.map(asCard),
              count: String(settled.length),
              collapsed: isFolded(folded, 'initiatives:settled', true),
              onToggle: foldHandler(onFlip, 'initiatives:settled', true),
            }),
      );
    }

    /**
     * The board body: scans the BMAD project, then renders the chosen view.
     * @param props - framework-bound tab identity, `t`, and the injected readers.
     * @returns the tab's content.
     */
    function SprintBoard({
      t,
      useTabInfo,
      sessionId,
      readWorkspaceFile,
      listWorkspaceDir,
      statWorkspacePath,
      fileAddress,
    }) {
      const tab = useTabInfo();
      const actions = tab.tab.actions;

      const [revision, setRevision] = React.useState(0);
      // Null means "not chosen yet", so the default can depend on the scan:
      // Initiatives when no active initiative is named, Status otherwise.
      const [view, setView] = React.useState(null);
      const [pickedSlug, setPickedSlug] = React.useState(null);
      const [folded, setFolded] = React.useState(() => new Map());

      // One stable face for the scanner, so the read effect keys on the Session
      // rather than on a fresh object each render.
      const io = React.useMemo(
        () => ({
          read: readWorkspaceFile,
          list: listWorkspaceDir,
          stat: statWorkspacePath,
        }),
        [readWorkspaceFile, listWorkspaceDir, statWorkspacePath],
      );

      const snapshot = useSprintSnapshot({
        io,
        sessionId,
        tabSignal: tab.tab.signal,
        revision,
      });

      const refresh = () => setRevision((value) => value + 1);

      if (snapshot.phase !== 'ready') {
        return h(BoardShell, {
          header: h(TitleOnlyHeader, { t }),
          body:
            snapshot.phase === 'loading'
              ? h('div', { className: 'bmad-sb-note', role: 'status' }, t('loading'))
              : h(LoadFailure, {
                  t,
                  message: snapshot.message,
                  onRetry: refresh,
                }),
        });
      }

      const board = snapshot.board;
      if (board.version !== 'v7') {
        return h(BoardShell, {
          header: h(TitleOnlyHeader, { t }),
          body: h(VersionNotice, {
            t,
            version: board.version,
            onRetry: refresh,
          }),
        });
      }
      if (board.initiatives.length === 0) {
        return h(BoardShell, {
          header: h(TitleOnlyHeader, { t }),
          body: h(VersionNotice, { t, version: 'empty', onRetry: refresh }),
        });
      }

      const active =
        board.initiatives.find(
          (initiative) => initiative.slug === board.config.activeInitiative,
        ) ?? null;
      const picked =
        pickedSlug === null
          ? null
          : board.initiatives.find((initiative) => initiative.slug === pickedSlug) ?? null;
      // Status, Epics and Tickets need one initiative; before anything is
      // picked they show the active one, or the first when no active is named.
      const firstOpen = board.initiatives.find((i) => !SETTLED.has(i.status)) ?? null;
      const selected = picked ?? active ?? firstOpen ?? board.initiatives[0];
      const shown = view ?? (active === null ? 'initiatives' : 'status');
      const makeOpener = (path) => openHandler(actions, fileAddress, path);
      const pick = (slug) => {
        setPickedSlug(slug);
        setView('status');
      };
      const unreadable = board.unreadable.length + (selected.unreadable ?? 0);

      const body =
        shown === 'initiatives'
          ? h(InitiativesView, {
              t,
              initiatives: board.initiatives,
              activeSlug: board.config.activeInitiative,
              selectedSlug: picked === null ? null : picked.slug,
              onSelect: pick,
            folded,
            onFlip: setFolded,
            })
          : shown === 'epic'
            ? h(EpicView, {
                t,
                initiative: selected,
                folded,
                onFlip: setFolded,
                makeOpener,
              })
            : shown === 'tickets'
              ? h(TicketsView, {
                  t,
                  initiative: selected,
                  folded,
                  onFlip: setFolded,
                  makeOpener,
                })
              : h(StatusView, {
                  t,
                  initiative: selected,
                  unreadable,
                  folded,
                  onFlip: setFolded,
                  makeOpener,
                });

      return h(BoardShell, {
        header: h(BoardHeader, {
          t,
          initiative: selected,
          view: shown,
          onView: setView,
          onRefresh: refresh,
          refreshing: snapshot.refreshing === true,
        }),
        body: h(
          'div',
          { className: 'bmad-sb-scroll' },
          // Keyed on the reading: switching view or initiative remounts the
          // list, which replays the settle animation instead of swapping content.
          h('div', { className: 'bmad-sb-view', key: `${shown}:${selected.slug}` }, body),
        ),
      });
    }

    // --- Dictionaries ------------------------------------------------------

    const en = {
      'refreshing': 'refreshing...',
      'viewLabel': 'Group the board by',
      'viewStatus': 'Status',
      'viewEpic': 'Epics',
      'viewTickets': 'Tickets',
      'viewInitiatives': 'Initiatives',
      'title': 'BMAD v7 board',
      'guide.title': 'Sprint board',
      'guide.description': 'BMAD v7 initiatives, epics and tickets as a board',
      'refresh': 'Re-read the BMAD files',
      'retry': 'Retry',
      'loading': 'Reading the BMAD project...',
      'loadFailed': 'Could not read the BMAD project.',
      'v6.title': 'This board reads BMAD v7',
      'v6.body': 'This workspace looks like a BMAD v6 project. This version does not read it -- install dsh-plugin-bmad-sprint-board@1.0.0 for the v6 board.',
      'noBmad.title': 'No BMAD project in this workspace',
      'noBmad.body': 'The board looks for _bmad/config.toml and the output folder it declares.',
      'noInitiatives.title': 'No initiatives found',
      'noInitiatives.body': 'The configured output folder holds no initiative-* folder yet.',
      'noTickets': 'No tickets in this view.',
      'noEpics': 'This initiative declares no epics.',
      'unreadableNote': '{count} file(s) could not be read; the board may be incomplete.',
      'status.blocked': 'Blocked',
      'status.in-progress': 'In progress',
      'status.review': 'In review',
      'status.built': 'Built',
      'status.draft': 'Draft',
      'status.done': 'Done',
      'status.dropped': 'Dropped',
      'status.unknown': 'Unknown',
      'noPlan': 'No plan',
      'ticketStatus': 'Ticket status',
      'openPlan': 'Open the plan file',
      'epicProgress': '{done} of {total} tickets settled, {unknown} with no plan',
      'initiativeStatus': 'Initiative status',
      'initiativeCounts': '{epics} epics, {tickets} tickets',
      'initiativeUnreadable': '{count} unreadable file(s)',
      'activeBadge': 'active initiative',
      'selectedBadge': 'shown here',
      'selectInitiative': 'Show this initiative on the board',
      'settledInitiatives': 'settled initiatives',
      'initiativeEmpty': 'no epics, so never started',
      'gapsLabel': 'Gaps',
      'unverLabel': 'Could not check',
      'askAnAgent': 'Ask an agent',
      'askAgentPill': 'Ask agent - prompt',
      'copied': 'Copied',
      'copyFailed': 'Copy failed -- select and copy manually',
      'barNoData': '{label}: no data',
      'cannotMeasure': 'cannot measure',
      'barTickets': 'tickets',
      'barLabel': '{label}: {done} of {total} complete',
      'barLabelUnknown': '{label}: {done} of {total} complete, {unknown} could not be verified',
      'unknownHint': '{count} could not be verified',
      'nothingVerifiable': 'nothing verifiable',
      'nextLabel': 'Next',
      'allDone': 'Every ticket is done.',
      'noSpec': 'No plan file yet',
      'openSpec': 'Open the spec file',
      'deferredCount': '{count} deferred',
      'shortcut.noSession': 'Open a Session to show the BMAD board',
    };

    const zh = {
      'refreshing': '\u6b63\u5728\u5237\u65b0...',
      'viewLabel': '\u770b\u677f\u5206\u7ec4\u65b9\u5f0f',
      'viewStatus': '\u72b6\u6001',
      'viewEpic': '\u53f2\u8bd7',
      'viewTickets': '\u5de5\u5355',
      'viewInitiatives': '\u5021\u8bae',
      'title': 'BMAD v7 \u770b\u677f',
      'guide.title': '\u51b2\u523a\u770b\u677f',
      'guide.description': '\u4ee5\u770b\u677f\u5f62\u5f0f\u5c55\u793a BMAD v7 \u7684\u5021\u8bae\u3001\u53f2\u8bd7\u4e0e\u5de5\u5355',
      'refresh': '\u91cd\u65b0\u8bfb\u53d6 BMAD \u6587\u4ef6',
      'retry': '\u91cd\u8bd5',
      'loading': '\u6b63\u5728\u8bfb\u53d6 BMAD \u9879\u76ee...',
      'loadFailed': '\u65e0\u6cd5\u8bfb\u53d6 BMAD \u9879\u76ee\u3002',
      'v6.title': '\u6b64\u770b\u677f\u4ec5\u652f\u6301 BMAD v7',
      'v6.body': '\u6b64\u5de5\u4f5c\u533a\u770b\u8d77\u6765\u662f BMAD v6 \u9879\u76ee\uff0c\u672c\u7248\u672c\u65e0\u6cd5\u8bfb\u53d6\u3002\u8bf7\u5b89\u88c5 dsh-plugin-bmad-sprint-board@1.0.0 \u4ee5\u4f7f\u7528 v6 \u770b\u677f\u3002',
      'noBmad.title': '\u6b64\u5de5\u4f5c\u533a\u4e2d\u6ca1\u6709 BMAD \u9879\u76ee',
      'noBmad.body': '\u770b\u677f\u4f1a\u67e5\u627e _bmad/config.toml \u53ca\u5176\u58f0\u660e\u7684\u8f93\u51fa\u76ee\u5f55\u3002',
      'noInitiatives.title': '\u672a\u627e\u5230\u4efb\u4f55\u5021\u8bae',
      'noInitiatives.body': '\u914d\u7f6e\u7684\u8f93\u51fa\u76ee\u5f55\u4e2d\u5c1a\u65e0 initiative-* \u76ee\u5f55\u3002',
      'noTickets': '\u6b64\u89c6\u56fe\u4e2d\u6ca1\u6709\u5de5\u5355\u3002',
      'noEpics': '\u6b64\u5021\u8bae\u5c1a\u672a\u58f0\u660e\u4efb\u4f55\u53f2\u8bd7\u3002',
      'unreadableNote': '\u6709 {count} \u4e2a\u6587\u4ef6\u65e0\u6cd5\u8bfb\u53d6\uff0c\u770b\u677f\u53ef\u80fd\u4e0d\u5b8c\u6574\u3002',
      'status.blocked': '\u53d7\u963b',
      'status.in-progress': '\u8fdb\u884c\u4e2d',
      'status.review': '\u5ba1\u67e5\u4e2d',
      'status.built': '\u5df2\u6784\u5efa',
      'status.draft': '\u8349\u7a3f',
      'status.done': '\u5df2\u5b8c\u6210',
      'status.dropped': '\u5df2\u653e\u5f03',
      'status.unknown': '\u672a\u77e5',
      'noPlan': '\u65e0\u8ba1\u5212',
      'ticketStatus': '\u5de5\u5355\u72b6\u6001',
      'openPlan': '\u6253\u5f00\u8ba1\u5212\u6587\u4ef6',
      'epicProgress': '{total} \u4e2a\u5de5\u5355\u4e2d {done} \u4e2a\u5df2\u7ed3\u6e05\uff0c{unknown} \u4e2a\u6ca1\u6709\u8ba1\u5212',
      'initiativeStatus': '\u5021\u8bae\u72b6\u6001',
      'initiativeCounts': '{epics} \u4e2a\u53f2\u8bd7\uff0c{tickets} \u4e2a\u5de5\u5355',
      'initiativeUnreadable': '{count} \u4e2a\u6587\u4ef6\u65e0\u6cd5\u8bfb\u53d6',
      'activeBadge': '\u5f53\u524d\u6d3b\u8dc3\u5021\u8bae',
      'selectedBadge': '\u5f53\u524d\u663e\u793a',
      'selectInitiative': '\u5728\u770b\u677f\u4e2d\u663e\u793a\u6b64\u5021\u8bae',
      'settledInitiatives': '\u5df2\u7ed3\u675f\u7684\u5021\u8bae',
      'initiativeEmpty': '\u65e0\u4efb\u52a1\u5305\uff0c\u5c1a\u672a\u5f00\u59cb',
      'gapsLabel': '\u5dee\u8ddd',
      'unverLabel': '\u65e0\u6cd5\u68c0\u67e5',
      'askAnAgent': '\u8be2\u95ee\u667a\u80fd\u4f53',
      'askAgentPill': '\u8be2\u95ee\u667a\u80fd\u4f53 - \u63d0\u793a\u8bcd',
      'copied': '\u5df2\u590d\u5236',
      'copyFailed': '\u590d\u5236\u5931\u8d25 -- \u8bf7\u624b\u52a8\u9009\u62e9\u5e76\u590d\u5236',
      'barNoData': '{label}\uff1a\u65e0\u6570\u636e',
      'cannotMeasure': '\u65e0\u6cd5\u6d4b\u91cf',
      'barTickets': '\u5de5\u5355',
      'barLabel': '{label}\uff1a{total} \u4e2d\u7684 {done} \u5df2\u5b8c\u6210',
      'barLabelUnknown': '{label}\uff1a{total} \u4e2d\u7684 {done} \u5df2\u5b8c\u6210\uff0c{unknown} \u9879\u65e0\u6cd5\u6838\u5b9e',
      'unknownHint': '{count} \u9879\u65e0\u6cd5\u6838\u5b9e',
      'nothingVerifiable': '\u65e0\u53ef\u6838\u5b9e\u9879',
      'nextLabel': '\u4e0b\u4e00\u6b65',
      'allDone': '\u6240\u6709\u5de5\u5355\u5747\u5df2\u5b8c\u6210\u3002',
      'noSpec': '\u5c1a\u65e0\u8ba1\u5212\u6587\u4ef6',
      'openSpec': '\u6253\u5f00\u89c4\u683c\u6587\u4ef6',
      'deferredCount': '\u5ef6\u671f {count} \u9879',
      'shortcut.noSession': '\u9700\u8981\u6253\u5f00\u4e00\u4e2a\u4f1a\u8bdd\u624d\u80fd\u663e\u793a BMAD \u770b\u677f',
    };

    return {
      // `remote.workspaceFiles` is its own inject key: the Remote face guards
      // each namespace, so naming only `remote` leaves the property unreachable.
      // `shortcuts` is deliberately absent: the keybinding is an optional extra,
      // so it is requested through `ctx.inject` and the tab still works without.
      inject: [
        'slots',
        'locale',
        'sidebarRightTabs',
        'sidebarRight',
        'remote',
        'remote.workspaceFiles',
      ],

      /**
       * Register the tab type, its guide entry, its body, and its shortcut.
       * @param ctx - Client root context.
       */
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register(NS, { en, zh }),
          'bmad-sprint-board: dictionaries',
        );

        const t = ctx.locale.bind(NS);

        ctx.inject(['shortcuts'], (ctx) => {
          ctx.effect(
            () =>
              ctx.shortcuts.register({
                id: BOARD_COMMAND,
                label: () => t('guide.title'),
                aliases: [
                  'sprint board',
                  'bmad sprint',
                  'sprint',
                  'board',
                  'kanban',
                ],
                defaults: {
                  // Same family as the shipped tab commands (Files is primary+P,
                  // Browser primary+T): one primary chord on the desktop, and a
                  // browser-safe primary+alt chord on the web, where a bare
                  // primary+letter is off limits. `S` for sprint: every other
                  // letter in this shape is taken or reserved, and the Registry
                  // refuses a default that collides on any declared profile.
                  'desktop:macos': { code: 'KeyS', modifiers: ['primary'] },
                  'desktop:windows': { code: 'KeyS', modifiers: ['primary'] },
                  'desktop:linux': { code: 'KeyS', modifiers: ['primary'] },
                  'web:macos': { code: 'KeyS', modifiers: ['primary', 'alt'] },
                  'web:windows': {
                    code: 'KeyS',
                    modifiers: ['primary', 'alt'],
                  },
                },
                // Reachable while typing, like every other sidebar tab command.
                regions: ['page', 'editable', 'terminal'],
                modals: [],
                resolve: ({ target }) => {
                  const pane = ctx.sidebarRight.commandTarget(target);
                  if (pane === undefined) {
                    return { status: 'blocked', reason: t('shortcut.noSession') };
                  }
                  return {
                    status: 'handled',
                    run: () => ctx.sidebarRight.openTabFromTarget(TAB_KIND, pane),
                  };
                },
              }),
            'bmad-sprint-board: shortcut',
          );
        });

        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: PLUGIN_ID,
              kind: TAB_KIND,
              priority: 'extension',
              title: () => t('title'),
              guide: [
                {
                  id: 'board',
                  order: 30,
                  title: () => t('guide.title'),
                  description: () => t('guide.description'),
                  icon: GuideArtworkSprintBoard,
                  // Shows the resolved keycap on the guide capsule.
                  commandId: BOARD_COMMAND,
                },
              ],
            }),
          'bmad-sprint-board: tab type',
        );

        // The tab body reads through these bindings rather than the Remote face
        // directly, so the scanner never has to know about Sessions or remote
        // result envelopes and the same readers work for any workspace face.
        const paneInject = (sessionId) => ({
          sessionId,
          readWorkspaceFile: (path, signal) =>
            readWholeFile(ctx.remote.workspaceFiles, sessionId, path, signal),
          listWorkspaceDir: async (path, signal) => {
            const result = await ctx.remote.workspaceFiles.list(
              sessionId,
              path,
              signal,
            );
            if (!result.ok) throw result.error;
            return result.value.entries;
          },
          // Existence probes during the scan: a missing path is an answer, not a
          // failure, so this reports the miss instead of throwing.
          statWorkspacePath: async (path, signal) => {
            try {
              const result = await ctx.remote.workspaceFiles.stat(
                sessionId,
                path,
                signal,
              );
              return result.ok
                ? { ok: true }
                : { ok: false, code: result.error.code };
            } catch (error) {
              return { ok: false, code: String(error) };
            }
          },
          fileAddress: (path) => sessionFileAddress(sessionId, path),
        });

        for (const [key, Component] of [
          [PLUGIN_ID, SprintBoard],
        ]) {
          ctx.slots.inject('sidebar.right.pane.tab', () =>
            ctx.slots.register(
              { name: 'sidebar.right.pane.tab', key, locale: NS, inject: paneInject },
              Component,
            ),
          );
        }

      },
    };
  },
});
