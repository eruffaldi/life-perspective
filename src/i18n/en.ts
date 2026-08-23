/**
 * English catalogue. Typed against the Italian one: a missing entry, or a
 * message whose parameters differ, fails to compile.
 *
 * The domain stays Italian even when the interface is not: school cycles and
 * document validity are rules of the Italian state, not strings to translate.
 */
import type { Messages } from "./it.js";

export const en: Messages = {
  code: "en",
  name: "English",
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],

  app: {
    title: "Prospettiva",
    documentTitle: (name: string) => name + " — a chart of time",
    today: "today",
    lifespan: (birth: string, death: string, age: number) =>
      birth + " – " + death + " · " + age + " years",
    year: "Year",
    age: "Age",
    unknown: "—"
  },

  views: {
    chart: "Timeline", chartShort: "Time",
    ages: "Aligned ages", agesShort: "Ages",
    places: "Places", placesShort: "Places",
    dense: "Crowded years", denseShort: "Years",
    matrix: "Matrix", matrixShort: "Matrix"
  },

  tracks: {
    school: "School", work: "Work", home: "Home", holiday: "Holidays",
    finance: "Money", doc: "Documents", life: "Life", world: "Context"
  },

  roles: {
    self: "me", partner: "partner", child: "child", parent: "parent",
    grandparent: "grandparent", sibling: "sibling", friend: "friend"
  },

  stages: {
    primary: "Primary", middle: "Middle school", highschool: "High school",
    bachelor: "Bachelor", master: "Master",
    middleEnd: "Middle school diploma", highschoolEnd: "School leaving exam",
    bachelorEnd: "Bachelor's degree", masterEnd: "Master's degree"
  },

  chart: {
    context: "The world around",
    legendPeriod: "period", legendEvent: "event", legendRecurrence: "anniversary",
    legendCirca: "uncertain date", legendToday: "today",
    legendHint: "Hover over anything to read everyone's age at that moment.",
    expires: (date: string) => "expires " + date,
    ongoing: "ongoing",
    lived: (years: number) => "Lived " + years + " years.",
    todayAge: (age: string) => "Today " + age + ".",
    endsIn: (when: string) => "Ends " + when + ".",
    lasted: (years: number) => "Lasted " + years + " years.",
    startedOngoing: (when: string) => "Started " + when + ", still ongoing.",
    recurrenceNote: " · anniversary",
    circa: " (approx.)"
  },

  age: {
    years: (n: number) => n + (n === 1 ? " year" : " years"),
    approx: (n: number) => "~" + n + " years",
    range: (a: number, b: number) => a + "–" + b + " years",
    notYetBorn: "not yet born",
    noLonger: "no longer living",
    now: "now",
    inFuture: (s: string) => "in " + s,
    inPast: (s: string) => s + " ago",
    nMonths: (n: number) => n + (n === 1 ? " month" : " months"),
    nYears: (n: number) => n + (n === 1 ? " year" : " years"),
    yearsAndMonths: (y: string, m: string) => y + " and " + m
  },

  dense: {
    title: "Crowded years",
    lede: "Years where two or more things pile up. This is where the shape of the " +
          "next twenty years shows: the exams, the last mortgage payment, the round " +
          "birthdays that land together.",
    includePast: "Include the past too",
    onlyFuture: "Show only from this year",
    empty: "No year with two or more events in this range.",
    thisYear: "this year",
    nextUp: "What comes next",
    turns: (name: string, age: number) => name + " turns " + age,
    starts: (label: string) => "Start — " + label,
    ends: (label: string) => "End — " + label,
    anniversary: (n: number, label: string) => n + " years — " + label,
    world: "the world"
  },

  matrix: {
    title: "Matrix of ages",
    lede: "Each row is a moment, each column a person: the cell says how old they " +
          "were, or will be. A dash marks those not yet born, a cross those no " +
          "longer living.",
    moment: "Moment",
    when: "When"
  },

  places: {
    title: "Places",
    lede: "The circle grows with the years spent there. The slider below dims the " +
          "places that had nothing to do with that year.",
    none: "No place could be located",
    noneLede: "Add `place` to events and periods. For names the gazetteer doesn't " +
              "know, give coordinates in the `places` block.",
    fit: "Fit everything",
    traces: "Trail of moves",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    now: "Today",
    years: (n: number) => n + (n === 1 ? " year" : " years"),
    totalYears: (n: number) => n + " years here in total.",
    moments: (n: number) => n + (n === 1 ? " moment." : " moments."),
    noCoords: "Without coordinates",
    noCoordsLede: "These names aren't in the gazetteer. Add them to the `places` " +
                  "block at the end of the JSON:",
    fromList: "from your list",
    fromGazetteer: "from the gazetteer",
    inferred: (from: string) => "inferred from " + from
  },

  scale: {
    button: "Scale",
    title: "Time scale",
    less: "Reduce the scale",
    more: "Increase the scale",
    lessHint: "Widen the span shown",
    moreHint: "Narrow the span shown",
    label: "Time scale",
    presetAll: "Everything", presetAllHint: "the whole span, from the oldest person to the horizon",
    presetDecades: "Decades", presetDecadesHint: "a generation at a glance",
    presetYears: "Years", presetYearsHint: "one year per tick",
    presetMonths: "Months", presetMonthsHint: "the finest detail",
    readout: (ppy: number, years: number) =>
      ppy + " px per year · about " + years + " years on screen"
  },

  filters: {
    button: "Filters",
    buttonCount: (on: number, total: number) => "Filters · " + on + "/" + total,
    title: "What to show",
    all: "All",
    none: "None"
  },

  data: {
    button: "Data",
    buttonCount: (n: number) => "Data · " + n,
    title: "Data",
    lede: "Paste your JSON here and press Apply. Nothing leaves this page: the data " +
          "stays in memory as long as you keep it open, so download the file before " +
          "closing.",
    apply: "Apply",
    check: "Check",
    save: "Save in browser",
    forget: "Forget",
    download: "Download JSON",
    upload: "Open file…",
    reset: "Restore the example",
    close: "Close",
    applied: (n: number) => "Applied: " + n + (n === 1 ? " person" : " people"),
    appliedWarnings: (n: number) => " · " + n + (n === 1 ? " warning" : " warnings"),
    fixErrors: "Fix the errors listed above.",
    noProblems: "Nothing to report.",
    saved: (when: string) => "Saved in the browser · " + when,
    savedRestored: "Loaded the copy saved in the browser.",
    savedBroken: "Saved copy unreadable, using the example.",
    savedInvalid: "The saved copy has errors: showing the example.",
    forgotten: "Saved copy removed. The file you downloaded is untouched.",
    resetDone: "Example reloaded. Press Apply.",
    saveRefused: "Not saving data with errors: fix them first.",
    saveUnavailable: "Saving is unavailable in this context",
    updateReady: "A new version is ready.",
    reload: "Reload"
  },

  diag: {
    errors: (n: number) => n + (n === 1 ? " error" : " errors"),
    warnings: (n: number) => n + (n === 1 ? " warning" : " warnings"),
    blocked: " — the data was not loaded",
    loaded: " — data loaded",
    syntax: (line: number | null) =>
      "The text is not valid JSON" + (line ? " (line " + line + ")" : "") + ".",
    unexpected: "Unexpected error while loading."
  },

  rules: {
    E001: () => ({ m: "The document is not a JSON object.",
                   h: "The root must be { … } with at least the `people` key." }),
    E002missing: () => ({ m: "The list of people is missing.",
                          h: 'You need `"people": [ … ]` with at least one person.' }),
    E002empty: () => ({ m: "The list of people is empty.",
                        h: "Add at least one person with `name` and `birth`." }),
    E003notObject: () => ({ m: "This entry is not an object.",
                            h: 'Each person is { "name": …, "birth": … }.' }),
    E003noName: () => ({ m: "Person without a name.", h: 'You need `name`, for instance "Sofia".' }),
    E004: (who: string) => ({ m: who + " has no date of birth.",
                              h: "`birth` is required: every age follows from it." }),
    E005: (label: string, value: string) => ({
      m: label + ': "' + value + '" is not a recognisable date.',
      h: "Only YYYY, YYYY-MM and YYYY-MM-DD are allowed, e.g. 1978, 1978-04 or 1978-04-12." }),
    E006month: (label: string, month: number) => ({
      m: label + ": month " + month + " does not exist.", h: "Months run from 01 to 12." }),
    E006day: (label: string, day: number, last: number) => ({
      m: label + ": day " + day + " does not exist in that month.",
      h: "That month has " + last + " days." }),
    E007: (id: string, other: string) => ({
      m: 'The id "' + id + '" is already used by ' + other + ".",
      h: "Ids must be unique: they link shared events and periods." }),
    E008: (id: string, available: string) => ({
      m: 'No person has the id "' + id + '".',
      h: available ? "Available ids: " + available + "." : "Give the people an `id`." }),
    E009end: (start: string, end: string) => ({
      m: "The end comes before the start.", h: "Start " + start + ", end " + end + "." }),
    E009doc: (birth: string, expiry: string) => ({
      m: "The document expires before the person was born.",
      h: "Birth " + birth + ", expiry " + expiry + "." }),
    E010: (who: string, birth: string, death: string) => ({
      m: who + " appears to have died before being born.",
      h: "Birth " + birth + ", death " + death + "." }),
    E011eventNotObject: () => ({ m: "This entry is not an object.",
                                 h: 'An event is { "label": …, "date": … }.' }),
    E011periodNotObject: () => ({ m: "This entry is not an object.",
                                  h: 'A period is { "label": …, "start": … }.' }),
    E011noDate: () => ({ m: "Event without a date.",
                         h: "An event is a point in time and uses `date`; for a span use `start` and `end`." }),
    E011eventSpan: () => ({ m: "An event cannot have `start` or `end`.",
                            h: "Point in time → `date`. Span → move it to `periods` with `start`/`end`." }),
    E011noStart: () => ({ m: "Period without a start.",
                          h: "`start` is required; `end` may be omitted to mean \u00abstill ongoing\u00bb." }),
    E011periodDate: () => ({ m: "A period does not use `date`.",
                             h: "Span → `start` and `end`. Point in time → move it to `events`." }),
    E012: (value: string, allowed: string) => ({
      m: '"' + value + '" is not a known school stage.', h: "Allowed: " + allowed + "." }),
    E013notObject: () => ({ m: "It must be an object.", h: 'For instance { "through": "highschool" }.' }),
    E013stage: (value: string, allowed: string) => ({
      m: '"' + value + '" is not a known stage.', h: "Allowed: " + allowed + "." }),
    E014key: (key: string, allowed: string) => ({
      m: '"' + key + '" is not a known stage.', h: "Allowed: " + allowed + "." }),
    E014value: () => ({ m: "A delay must be a non-negative whole number.",
                        h: "A year repeated in middle school is written as 1." }),
    E015coord: () => ({ m: "Invalid coordinates.", h: "Two numbers are needed: [latitude, longitude]." }),
    E015range: (lat: number, lon: number) => ({
      m: "Coordinates out of range: [" + lat + ", " + lon + "].",
      h: "Latitude between -90 and 90, longitude between -180 and 180. Are they swapped?" }),
    E015place: () => ({ m: "Invalid place.",
                        h: 'Either a string ("Milano") or { "name": …, "coord": [lat, lon] }.' }),
    E016recurrences: () => ({ m: "It must be `true` or a list of positive whole numbers.",
                              h: "For instance [10, 25, 50], or true to use `settings.milestones`." }),
    E016milestones: () => ({ m: "It must be a list of positive whole numbers.", h: "For instance [5, 10, 25, 50]." }),
    E017: () => ({ m: "Document without an expiry date.",
                   h: "`expires` is required: renewals are projected from it." }),
    E018: () => ({ m: "Validity must be a positive whole number of years.", h: "For instance 4." }),
    E019: (value: string) => ({ m: 'Value "' + value + '" is not allowed.',
                                h: "Use `midpoint` (~77 years) or `range` (76–77 years)." }),
    E020: (id: string, available: string) => ({
      m: 'No person has the id "' + id + '".',
      h: available ? "Available ids: " + available + "." : "Give a person an `id`." }),
    E021who: () => ({ m: "It must be a list of ids.", h: 'For instance ["marta", "davide"].' }),
    E021filters: (allowed: string) => ({ m: "It must be a list of tracks.",
                                         h: "Allowed values: " + allowed + "." }),
    E021places: () => ({ m: "It must be a dictionary of name → coordinates.",
                         h: 'For instance { "Lerici": [44.0757, 9.9114] }.' }),
    W002before: (label: string, birth: string) => ({
      m: label + " comes before the birth (" + birth + ").",
      h: "It will not appear in the aligned-ages view." }),
    W002after: (label: string, death: string) => ({
      m: label + " comes after the death (" + death + ").",
      h: "It will still show on the timeline, but the ages will be blank." }),
    W003: (horizon: string) => ({ m: "Beyond the horizon (" + horizon + ").",
                                  h: "It will not be drawn: raise `settings.horizon`." }),
    W004: (who: string) => ({ m: "Only one reference in `who`.",
                              h: "If it concerns only " + who + ", it belongs in `people[].events` or `people[].periods`." }),
    W005: (name: string) => ({ m: '"' + name + '" is not used by any event or period.',
                               h: "Harmless, but perhaps the name does not match the one written in `place`." }),
    W006category: (value: string, known: string) => ({
      m: '"' + value + '" is not a known category.', h: "It will land in the Life track. Known: " + known + "." }),
    W006track: (value: string, known: string) => ({
      m: '"' + value + '" is not a known track.', h: "Tracks: " + known + "." }),
    W007: (name: string) => ({ m: "Two people are called " + name + ".",
                               h: "The matrix columns will be indistinguishable: add a surname or a nickname." }),
    W008: (date: string) => ({ m: "Expiry more than ten years old: " + date + ".",
                               h: "The chain of renewals will start there and fill the track with past entries. Usually the current expiry is what you want." }),
    W009: (value: string) => ({ m: '"' + value + '" is not a six-digit hexadecimal colour.',
                                h: 'A palette colour will be used instead. Expected format: "#35407E".' }),
    W010: (label: string, value: string, canonical: string) => ({
      m: label + ': "' + value + '" is not in canonical form.',
      h: "Two digits for month and day are better: " + canonical + "." }),
    W011: () => ({ m: "There is nothing to replace.",
                   h: "`replaces` only has an effect if the person has a `school` block." }),
    W012: () => ({ m: "A holiday longer than six months.",
                   h: "If it is a move, it belongs as a period with `track` `home` or `work`." }),
    W014: (who: string) => ({ m: who + " has no `id`.",
                              h: "Without an id no shared event can refer to this person through `who`." }),
    W015event: () => ({ m: "Event without a label.", h: "It will show as an empty entry." }),
    W015period: () => ({ m: "Period without a label.", h: "The bar will be anonymous." }),
    W016: (value: string, allowed: string) => ({
      m: '"' + value + '" has no known renewal rules.',
      h: "A validity of 10 years will be used. Allowed: " + allowed + ", or state `validity` in years." })
  },

  now: "Today"
};
