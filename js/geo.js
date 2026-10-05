// Loads Natural Earth country shapes (world-atlas, public domain) plus d3-geo on demand.
import { h } from "./core.js";

const NICE = {
  "United States of America": "United States", "Dem. Rep. Congo": "DR Congo", "Central African Rep.": "Central African Republic",
  "Bosnia and Herz.": "Bosnia and Herzegovina", "Dominican Rep.": "Dominican Republic", "Eq. Guinea": "Equatorial Guinea",
  "S. Sudan": "South Sudan", "Solomon Is.": "Solomon Islands", "Falkland Is.": "Falkland Islands", "N. Cyprus": "Northern Cyprus",
  "W. Sahara": "Western Sahara", "Fr. S. Antarctic Lands": "French Southern Lands", "eSwatini": "Eswatini", "Côte d'Ivoire": "Ivory Coast",
  "Timor-Leste": "East Timor", "Macedonia": "North Macedonia", "Czechia": "Czech Republic",
};
const ALIASES = { usa: "United States", us: "United States", america: "United States", uk: "United Kingdom", britain: "United Kingdom",
  "great britain": "United Kingdom", england: "United Kingdom", holland: "Netherlands", drc: "DR Congo", "côte d'ivoire": "Ivory Coast",
  "cote d'ivoire": "Ivory Coast", czechia: "Czech Republic", swaziland: "Eswatini", burma: "Myanmar", uae: "United Arab Emirates",
  "south korea": "South Korea", "north korea": "North Korea", "congo": "Congo", "republic of the congo": "Congo", "timor-leste": "East Timor" };
const NOT_TARGET = new Set(["Antarctica", "French Southern Lands", "Falkland Islands", "Northern Cyprus", "Somaliland", "Western Sahara",
  "Greenland", "Puerto Rico", "New Caledonia", "Kosovo", "Palestine", "Taiwan"]);

let cache = null;
export function loadGeo() {
  return (cache ||= (async () => {
    const [topo, d3, world] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm"),
      import("https://cdn.jsdelivr.net/npm/d3-geo@3/+esm"),
      fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((r) => r.json()),
    ]);
    const geoms = world.objects.countries.geometries;
    const fc = topo.feature(world, world.objects.countries).features;
    const nb = topo.neighbors(geoms);
    const countries = fc.map((f, i) => {
      const name = NICE[f.properties.name] || f.properties.name;
      const main = mainland(d3, f);
      return { i, name, f, main, centroid: d3.geoCentroid(main), neighbors: nb[i] };
    });
    const byName = new Map(countries.map((c) => [c.name.toLowerCase(), c]));
    const find = (text) => {
      const t = text.trim().toLowerCase();
      return byName.get(t) || byName.get((ALIASES[t] || "").toLowerCase()) || null;
    };
    const targets = countries.filter((c) => !NOT_TARGET.has(c.name)).sort((a, b) => a.name.localeCompare(b.name));
    return { d3, countries, targets, find };
  })());
}

// Keep the biggest polygon plus pieces close to it, so overseas territories don't shrink the outline.
function mainland(d3, f) {
  if (f.geometry.type !== "MultiPolygon") return f;
  const polys = f.geometry.coordinates.map((c) => ({ type: "Feature", geometry: { type: "Polygon", coordinates: c } }));
  const big = polys.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
  const cc = d3.geoCentroid(big);
  const keep = polys.filter((p) => d3.geoDistance(d3.geoCentroid(p), cc) < 0.3);
  return { type: "Feature", properties: f.properties, geometry: { type: "MultiPolygon", coordinates: keep.map((p) => p.geometry.coordinates) } };
}

export const km = (d3, a, b) => Math.round(d3.geoDistance(a, b) * 6371);

export function bearing([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

export function countryInput(geo, onPick, label = "Guess a country") {
  const id = "dl" + Math.random().toString(36).slice(2);
  const input = h("input", { type: "text", list: id, class: "geo-in", placeholder: label, autocomplete: "off", spellcheck: "false" });
  const dl = h("datalist", { id }, geo.countries.map((c) => h("option", { value: c.name })));
  const form = h("form", { class: "row-c", onsubmit: (e) => { e.preventDefault(); onPick(input.value, () => (input.value = "")); } },
    input, dl, h("button", { class: "btn" }, "Guess"));
  return { form, input };
}

export function loading(root) {
  const el = h("p", { class: "label center" }, "Unfolding the atlas…");
  root.append(el);
  return el;
}
