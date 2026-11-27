import { useEffect, useState } from "react";
import api from "../services/api.js";

// Categories rarely change, so load them once per page load and share the result.
// The navbar and the mobile menu both call this hook, but only ONE request is sent:
// the first caller starts it, and everyone else waits for the same promise.
let cachedCategories = null;
let pendingRequest = null;

function loadCategories() {
  if (!pendingRequest) {
    pendingRequest = api("/api/category")
      .then((response) => {
        const data = response.data;
        cachedCategories = Array.isArray(data) ? data : data.categories ?? [];
        return cachedCategories;
      })
      .catch((error) => {
        pendingRequest = null; // forget the failed request so the next caller can retry
        throw error;
      });
  }
  return pendingRequest;
}

export default function useCategories() {
  const [categories, setCategories] = useState(() => cachedCategories ?? []);

  useEffect(() => {
    if (cachedCategories) return undefined;
    let cancelled = false;

    loadCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        // The navbar and menu still work without categories
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
