import { useState, useEffect } from "react";

export interface CompareItem {
  id: number;
  title: string;
  price: string;
  priceNum: number;
  image: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  type: string;   // "sale" | "rent"
  kind: string;
  year: number;
  finishing: string;
}

const KEY = "aqarat_compare";
const MAX = 4;

function load(): CompareItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function save(items: CompareItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("compare-change"));
}

export function addToCompare(item: CompareItem): "added" | "already" | "full" | "type_mismatch" {
  const items = load();
  if (items.find(i => i.id === item.id)) return "already";
  if (items.length >= MAX) return "full";
  // Block mixing sale and rent
  if (items.length > 0) {
    const existingType = items[0].type;
    if (existingType && item.type && existingType !== item.type) return "type_mismatch";
  }
  save([...items, item]);
  return "added";
}

export function removeFromCompare(id: number) {
  save(load().filter(i => i.id !== id));
}

export function clearCompare() { save([]); }

export function getCompareItems(): CompareItem[] { return load(); }

export function useCompare() {
  const [items, setItems] = useState<CompareItem[]>(load);

  useEffect(() => {
    const handler = () => setItems(load());
    window.addEventListener("compare-change", handler);
    return () => window.removeEventListener("compare-change", handler);
  }, []);

  return {
    items,
    count: items.length,
    add: addToCompare,
    remove: removeFromCompare,
    clear: clearCompare,
    isIn: (id: number) => items.some(i => i.id === id),
  };
}
