import { DatabaseSync } from "node:sqlite";

export class OrionFixtureDatabase {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.database.exec([
      "CREATE TABLE orders (",
      "id TEXT PRIMARY KEY,",
      "customer TEXT NOT NULL,",
      "value_eur INTEGER NOT NULL,",
      "status TEXT NOT NULL",
      ") STRICT;",
      "INSERT INTO orders VALUES",
      "('OW-2418', 'Nordline Impianti', 4820, 'review'),",
      "('OW-2419', 'Adria Systems', 1690, 'packing'),",
      "('OW-2420', 'Alpina Processi', 7350, 'blocked');"
    ].join("\n"));
  }

  orders() {
    return this.database
      .prepare(
        "SELECT id, customer, value_eur AS value, status FROM orders ORDER BY id"
      )
      .all()
      .map((row) => ({ ...row }));
  }

  close() {
    this.database.close();
  }
}
