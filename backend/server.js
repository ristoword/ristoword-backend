const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

// Percorsi file dati
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");
const INVENTORY_FILE = path.join(__dirname, "data", "inventory.json");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ========= FUNZIONI FILE GENERICHE =========
function ensureFile(filePath, defaultContent) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, "utf-8");
  }
}

function loadJsonArray(filePath) {
  try {
    ensureFile(filePath, "[]");
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Errore lettura file:", filePath, err);
    return [];
  }
}

function saveJsonArray(filePath, arr) {
  try {
    ensureFile(filePath, "[]");
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), "utf-8");
  } catch (err) {
    console.error("Errore salvataggio file:", filePath, err);
  }
}

// ========= DATI IN MEMORIA =========
let orders = loadJsonArray(ORDERS_FILE);
let nextOrderId = orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1;

let inventory = loadJsonArray(INVENTORY_FILE);
let nextInventoryId = inventory.length
  ? Math.max(...inventory.map(i => i.id)) + 1
  : 1;

// ========= ROTTE PAGINE =========

// Health check
app.get("/health", (req, res) => {
  res.send("RISTOWORD backend attivo 🚀");
});

// Pagina cucina (HTML dedicato)
app.get("/cucina", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cucina.html"));
});

// Pagina cassa
app.get("/cassa", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cassa.html"));
});

// Pagina magazzino
app.get("/magazzino", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "magazzino.html"));
});

// ========= API ORDINI =========

// Crea nuovo ordine
// body: { table, covers, area, waiter }
app.post("/orders", (req, res) => {
  const { table, covers, area, waiter } = req.body;

  if (!table || !covers || !waiter) {
    return res.status(400).json({ error: "Dati ordine mancanti" });
  }

  const newOrder = {
    id: nextOrderId++,
    table,
    covers,
    area, // "sala" | "pizzeria" | "bar"
    waiter,
    status: "in_preparazione",
    createdAt: new Date().toISOString(),
    paid: false // per la cassa
  };

  orders.push(newOrder);
  saveJsonArray(ORDERS_FILE, orders);
  res.status(201).json(newOrder);
});

// Elenco ordini
app.get("/orders", (req, res) => {
  res.json(orders);
});

// Cambia stato ordine
// body: { status }
app.patch("/orders/:id/status", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Ordine non trovato" });
  }

  order.status = status;
  saveJsonArray(ORDERS_FILE, orders);
  res.json(order);
});

// Segna pagato / non pagato (cassa)
// body: { paid: true/false }
app.patch("/orders/:id/paid", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { paid } = req.body;

  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Ordine non trovato" });
  }

  order.paid = !!paid;
  saveJsonArray(ORDERS_FILE, orders);
  res.json(order);
});

// ========= API MAGAZZINO =========

// Elenco prodotti magazzino
app.get("/inventory", (req, res) => {
  res.json(inventory);
});

// Aggiungi prodotto
// body: { name, unit, quantity }
app.post("/inventory", (req, res) => {
  const { name, unit, quantity } = req.body;

  if (!name || !unit) {
    return res.status(400).json({ error: "Nome e unità sono obbligatori" });
  }

  const qty = Number(quantity) || 0;

  const newItem = {
    id: nextInventoryId++,
    name,
    unit,
    quantity: qty
  };

  inventory.push(newItem);
  saveJsonArray(INVENTORY_FILE, inventory);
  res.status(201).json(newItem);
});

// Aggiusta quantità prodotto
// body: { delta }
app.patch("/inventory/:id/adjust", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { delta } = req.body;

  const item = inventory.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: "Prodotto non trovato" });
  }

  const d = Number(delta) || 0;
  item.quantity += d;

  saveJsonArray(INVENTORY_FILE, inventory);
  res.json(item);
});

// ========= AVVIO SERVER =========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server RISTOWORD avviato sulla porta ${PORT}`);
});