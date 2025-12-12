import { Project, TestRecord } from "./db";

export type ImportResult = {
  newProjects: Project[];
  conflictingProjects: { current: Project; incoming: Project }[];
  identicalProjects: Project[];
};

export function detectConflicts(
  currentProjects: Project[],
  incomingProjects: Project[]
): ImportResult {
  const newProjects: Project[] = [];
  const conflictingProjects: { current: Project; incoming: Project }[] = [];
  const identicalProjects: Project[] = [];

  const currentMap = new Map(currentProjects.map((p) => [p.id, p]));

  for (const incoming of incomingProjects) {
    const current = currentMap.get(incoming.id);

    if (!current) {
      newProjects.push(incoming);
    } else {
      // Deep comparison to check if they are identical
      const isIdentical = JSON.stringify(current) === JSON.stringify(incoming);
      if (isIdentical) {
        identicalProjects.push(incoming);
      } else {
        conflictingProjects.push({ current, incoming });
      }
    }
  }

  return { newProjects, conflictingProjects, identicalProjects };
}

export type ProjectDiff = {
  projectId: string;
  projectName: string;
  fields: {
    key: string;
    current: any;
    incoming: any;
  }[];
  tests: {
    added: TestRecord[];
    removed: TestRecord[];
    modified: { current: TestRecord; incoming: TestRecord }[];
  };
};

export function compareProject(
  current: Project,
  incoming: Project
): ProjectDiff {
  const changes: ProjectDiff["fields"] = [];

  if (current.name !== incoming.name) {
    changes.push({
      key: "name",
      current: current.name,
      incoming: incoming.name,
    });
  }
  // Compare environments, data, etc. if strictly needed, but for now specific fields
  if (
    JSON.stringify(current.environments) !==
    JSON.stringify(incoming.environments)
  ) {
    changes.push({
      key: "environments",
      current: current.environments,
      incoming: incoming.environments,
    });
  }
  // Deep compare data
  if (JSON.stringify(current.data) !== JSON.stringify(incoming.data)) {
    changes.push({
      key: "data",
      current: current.data,
      incoming: incoming.data,
    });
  }

  const currentTests = new Map(current.tests.map((t) => [t.id, t]));
  const incomingTests = new Map(incoming.tests.map((t) => [t.id, t]));

  const addedTests: TestRecord[] = [];
  const modifiedTests: { current: TestRecord; incoming: TestRecord }[] = [];
  const removedTests: TestRecord[] = []; // In a merge context, we might not strictly "remove" if we just want to add, but let's calc it.

  for (const t of incoming.tests) {
    const existing = currentTests.get(t.id);
    if (!existing) {
      addedTests.push(t);
    } else {
      if (JSON.stringify(existing) !== JSON.stringify(t)) {
        modifiedTests.push({ current: existing, incoming: t });
      }
      currentTests.delete(t.id); // Mark as processed
    }
  }

  // Any remaining in currentTests that weren't in incoming are technically "removed" if we replaced fully,
  // but if we are merging "incoming into current", they are just "not touched".
  // However, often "sync" implies making it look like incoming.
  // For the prompt "If ids repeat: show container with differences", we care about MODIFIED.
  // And "If ids don't repeat: add new".

  return {
    projectId: current.id,
    projectName: current.name,
    fields: changes,
    tests: {
      added: addedTests,
      removed: [], // We won't list removed for now as the prompt focuses on "adding new" and "diffing identical IDs"
      modified: modifiedTests,
    },
  };
}

export function mergeData(
  currentProjects: Project[],
  incomingProjects: Project[]
): Project[] {
  const currentMap = new Map(currentProjects.map((p) => [p.id, p]));

  for (const incoming of incomingProjects) {
    const existing = currentMap.get(incoming.id);

    if (!existing) {
      // New project, just add it (preserving references not needed here as we return new array)
      currentMap.set(incoming.id, incoming);
    } else {
      // Project exists, merge tests
      // "Si no se repiten ids: se agregan los nuevos."
      const existingTestsMap = new Map(existing.tests.map((t) => [t.id, t]));
      let testsChanged = false;

      for (const incomingTest of incoming.tests) {
        if (!existingTestsMap.has(incomingTest.id)) {
          existing.tests.push(incomingTest);
          testsChanged = true;
        }
        // If it exists, we do nothing (Keep Local)
      }

      // If tests changed, we update the project object (implicitly done via ref, but let's be safe)
      if (testsChanged) {
        currentMap.set(existing.id, { ...existing });
      }
    }
  }

  return Array.from(currentMap.values());
}
