"use server";

import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DB_PATH = path.join(process.cwd(), "db.json");

export type TestRecord = {
  id: string;
  name: string;
  environment: string;
  data: Record<string, string>;
  description: string;
  createdAt: string;
  functional: string;
  relatedTask: string;
};

export type Project = {
  id: string;
  name: string;
  environments: string[];
  data: Record<string, Record<string, string>>; // env -> { key: value }
  tests: TestRecord[];
  createdAt: string;
};

export type DB = {
  projects: Project[];
};

const defaultDB: DB = {
  projects: [],
};

async function getDB(): Promise<DB> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default DB (we will write it on next save)
    return defaultDB;
  }
}

async function saveDB(db: DB) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// Actions

export async function getProjects(): Promise<Project[]> {
  const db = await getDB();
  return db.projects;
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.projects.find((p) => p.id === id);
}

export async function createProject(name: string) {
  const db = await getDB();
  const newProject: Project = {
    id: uuidv4(),
    name,
    environments: [],
    data: {},
    tests: [],
    createdAt: new Date().toISOString(),
  };
  db.projects.push(newProject);
  await saveDB(db);
  return newProject;
}

export async function addEnvironment(projectId: string, envName: string) {
  const db = await getDB();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");

  if (!project.environments.includes(envName)) {
    project.environments.push(envName);
    // Initialize data for this env
    if (!project.data[envName]) {
      project.data[envName] = {};
    }
    await saveDB(db);
  }
  return project;
}

export async function saveDataset(
  projectId: string,
  envName: string,
  data: Record<string, string>
) {
  const db = await getDB();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");

  project.data[envName] = data;
  await saveDB(db);
  return project;
}

export async function createTest(
  projectId: string,
  name: string,
  environment: string,
  data: Record<string, string>,
  description: string,
  functional: string,
  relatedTask: string
) {
  const db = await getDB();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");

  const newTest: TestRecord = {
    id: uuidv4(),
    name,
    environment,
    data,
    description,
    functional,
    relatedTask,
    createdAt: new Date().toISOString(),
  };

  project.tests.unshift(newTest); // Add to beginning
  await saveDB(db);
  return newTest;
}

export async function updateTest(
  projectId: string,
  testId: string,
  updates: Partial<Omit<TestRecord, "id" | "createdAt">>
) {
  const db = await getDB();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");

  const testIndex = project.tests.findIndex((t) => t.id === testId);
  if (testIndex === -1) throw new Error("Test not found");

  project.tests[testIndex] = {
    ...project.tests[testIndex],
    ...updates,
  };

  await saveDB(db);
  return project.tests[testIndex];
}

export async function deleteTest(projectId: string, testId: string) {
  const db = await getDB();
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");

  const initialLength = project.tests.length;
  project.tests = project.tests.filter((t) => t.id !== testId);

  if (project.tests.length !== initialLength) {
    await saveDB(db);
  }
}

export async function getTest(
  projectId: string,
  testId: string
): Promise<TestRecord | undefined> {
  const project = await getProject(projectId);
  return project?.tests.find((t) => t.id === testId);
}
