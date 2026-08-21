import { t } from "../i18n/index.js";

/**
 * Repertorio di comodo: chi scrive "Milano" non deve cercarsi le coordinate.
 * Un blocco `places` nel documento ha sempre la precedenza.
 */
export const GAZETTEER: Readonly<Record<string, readonly [number, number]>> = {
"Milano":[45.464,9.190],"Roma":[41.903,12.496],"Torino":[45.070,7.687],"Napoli":[40.852,14.268],
"Firenze":[43.770,11.256],"Bologna":[44.494,11.343],"Genova":[44.406,8.946],"Venezia":[45.440,12.316],
"Palermo":[38.116,13.361],"Bari":[41.118,16.872],"Brescia":[45.539,10.220],"Bergamo":[45.698,9.677],
"Verona":[45.438,10.992],"Padova":[45.407,11.874],"Trieste":[45.649,13.777],"Pisa":[43.716,10.397],
"Livorno":[43.548,10.311],"Siena":[43.318,11.331],"Perugia":[43.111,12.389],"Ancona":[43.616,13.518],
"Pescara":[42.462,14.216],"Cagliari":[39.224,9.122],"Catania":[37.507,15.083],"Messina":[38.194,15.554],
"Trento":[46.067,11.122],"Bolzano":[46.498,11.355],"Udine":[46.063,13.235],"Parma":[44.802,10.329],
"Modena":[44.647,10.925],"Rimini":[44.061,12.566],"Ravenna":[44.418,12.203],"Lecce":[40.352,18.174],
"Taranto":[40.464,17.247],"Salerno":[40.682,14.768],"Como":[45.808,9.085],"Varese":[45.821,8.826],
"Monza":[45.584,9.274],"Novara":[45.446,8.622],"Piacenza":[45.052,9.693],"Ferrara":[44.836,11.619],
"La Spezia":[44.107,9.828],"Grosseto":[42.760,11.113],"Viareggio":[43.867,10.250],"Sanremo":[43.816,7.776],
"Porto Ercole":[42.394,11.207],"Porto Santo Stefano":[42.437,11.117],"Monte Argentario":[42.408,11.140],
"Orbetello":[42.442,11.221],"Giglio":[42.362,10.903],"Elba":[42.783,10.320],"Portoferraio":[42.812,10.325],
"Portofino":[44.303,9.210],"Lerici":[44.076,9.911],"Amalfi":[40.634,14.603],"Capri":[40.551,14.243],
"Ischia":[40.731,13.895],"Sorrento":[40.626,14.375],"Positano":[40.628,14.485],"Taormina":[37.853,15.288],
"Olbia":[40.923,9.500],"Porto Cervo":[41.135,9.535],"Alghero":[40.560,8.317],"La Maddalena":[41.213,9.406],
"Gaeta":[41.213,13.571],"Ponza":[40.897,12.962],"Sperlonga":[41.259,13.428],"Forte dei Marmi":[43.960,10.171],
"Londra":[51.507,-0.128],"Parigi":[48.857,2.352],"Berlino":[52.520,13.405],"Madrid":[40.417,-3.704],
"Barcellona":[41.385,2.173],"Amsterdam":[52.370,4.895],"Bruxelles":[50.851,4.352],"Zurigo":[47.377,8.542],
"Ginevra":[46.204,6.143],"Lugano":[46.005,8.951],"Vienna":[48.209,16.373],"Praga":[50.076,14.438],
"Lisbona":[38.722,-9.139],"Atene":[37.984,23.728],"Dublino":[53.350,-6.260],"Stoccolma":[59.329,18.069],
"Copenaghen":[55.677,12.569],"Oslo":[59.914,10.752],"Helsinki":[60.170,24.938],"Varsavia":[52.230,21.012],
"Budapest":[47.498,19.040],"Monaco di Baviera":[48.135,11.582],"Francoforte":[50.110,8.682],
"Amburgo":[53.551,9.994],"Istanbul":[41.008,28.978],"Lione":[45.764,4.836],"Marsiglia":[43.296,5.370],
"Nizza":[43.710,7.262],"Malaga":[36.721,-4.421],"Valencia":[39.470,-0.377],"Porto":[41.158,-8.629],
"New York":[40.713,-74.006],"San Francisco":[37.775,-122.419],"Boston":[42.360,-71.058],
"Chicago":[41.878,-87.630],"Los Angeles":[34.052,-118.244],"Miami":[25.762,-80.192],
"Toronto":[43.653,-79.383],"Tokyo":[35.690,139.692],"Osaka":[34.694,135.502],"Singapore":[1.352,103.820],
"Sydney":[-33.869,151.209],"Dubai":[25.205,55.271],"Tel Aviv":[32.086,34.781],"Il Cairo":[30.044,31.236],
"Buenos Aires":[-34.604,-58.382],"San Paolo":[-23.551,-46.633],"Pechino":[39.904,116.407],
"Shanghai":[31.230,121.474],"Hong Kong":[22.319,114.169],"Seoul":[37.567,126.978],
"Bangkok":[13.756,100.502],"Mumbai":[19.076,72.878],"Delhi":[28.614,77.209]
};

export interface Resolved {
  coord: readonly [number, number];
  /** Da dove viene la coordinata, mostrato all'utente. */
  src: string;
}

/**
 * Ordine di precedenza: coordinate esplicite (già risolte a monte), poi il
 * dizionario dell'utente, poi il repertorio, infine la deduzione dal nome —
 * "Università di Bologna" cade su Bologna.
 */
export function resolvePlace(
  name: string | null | undefined,
  dict?: Record<string, readonly [number, number]> | null
): Resolved | null {
  if (!name) return null;
  const own = dict?.[name];
  if (own) return { coord: own, src: t().places.fromList };
  const known = GAZETTEER[name];
  if (known) return { coord: known, src: t().places.fromGazetteer };

  const keys = Object.keys(dict ?? {}).concat(Object.keys(GAZETTEER));
  let best: string | null = null;
  for (const k of keys) {
    if (name.length > k.length && name.includes(k) && (!best || k.length > best.length)) best = k;
  }
  if (best) {
    const coord = dict?.[best] ?? GAZETTEER[best];
    if (coord) return { coord, src: t().places.inferred(best) };
  }
  return null;
}
