const PREFIX = "finwise:";

export function load(key, fallback) {
  try {
    const stored = localStorage.getItem(`${PREFIX}${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
}

export function remove(key) {
  localStorage.removeItem(`${PREFIX}${key}`);
}

export function saveSimulation(simulation) {
  const history = load("history", []);
  const entry = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    ...simulation,
  };
  save("history", [entry, ...history].slice(0, 25));
  return entry;
}

export function deleteSimulation(id) {
  save(
    "history",
    load("history", []).filter((entry) => entry.id !== id)
  );
}
