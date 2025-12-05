import Dexie, { type EntityTable } from "dexie";

export type TestRecord = {
  id: string;
  name: string;
  environment: string;
  data: Record<string, string>;
  description: string;
  createdAt: string;
  functional: string;
  relatedTask: string;
  layer: string;
  date: string;
};

export type Project = {
  id: string;
  name: string;
  environments: string[];
  data: Record<string, Record<string, string>>; // env -> { key: value }
  tests: TestRecord[];
  createdAt: string;
};

// We are using a single table 'projects' to store the full project tree for now
// to maintain compatibility with the existing nested JSON structure.
const db = new Dexie("TestGeneratorDB") as Dexie & {
  projects: EntityTable<Project, "id">;
};

// Schema declaration:
db.version(1).stores({
  projects: "id, name, createdAt", // primary key "id"
});

export { db };
