import { PlacedEvent } from './types';

const BUILD_PROJECTS_STORAGE_KEY = 'jsab_build_projects';

export interface BuildModeProjectSnapshot {
  bossName: string;
  bpm: number;
  enemyColor: string;
  bgColor: string;
  playerColor: string;
  audioDuration: number;
  events: PlacedEvent[];
}

export interface SavedBuildProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: BuildModeProjectSnapshot;
}

function safeReadProjects(): SavedBuildProject[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem(BUILD_PROJECTS_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeProjects(projects: SavedBuildProject[]) {
  localStorage.setItem(BUILD_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export function readBuildProjects(): SavedBuildProject[] {
  return safeReadProjects();
}

export function upsertBuildProject(params: {
  projectId?: string | null;
  name: string;
  snapshot: BuildModeProjectSnapshot;
}): SavedBuildProject {
  const now = Date.now();
  const projects = safeReadProjects();

  const existingIndex = params.projectId
    ? projects.findIndex(project => project.id === params.projectId)
    : -1;

  if (existingIndex >= 0) {
    const existing = projects[existingIndex];
    const updated: SavedBuildProject = {
      ...existing,
      name: params.name,
      updatedAt: now,
      snapshot: params.snapshot,
    };

    projects.splice(existingIndex, 1);
    projects.unshift(updated);
    writeProjects(projects);
    return updated;
  }

  const created: SavedBuildProject = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: params.name,
    createdAt: now,
    updatedAt: now,
    snapshot: params.snapshot,
  };

  projects.unshift(created);
  writeProjects(projects);
  return created;
}

export function deleteBuildProject(projectId: string) {
  const projects = safeReadProjects().filter(project => project.id !== projectId);
  writeProjects(projects);
}

export function renameBuildProject(projectId: string, name: string): SavedBuildProject | null {
  const projects = safeReadProjects();
  const index = projects.findIndex(project => project.id === projectId);
  if (index < 0) return null;

  const updated: SavedBuildProject = {
    ...projects[index],
    name,
    updatedAt: Date.now(),
  };

  projects.splice(index, 1);
  projects.unshift(updated);
  writeProjects(projects);
  return updated;
}

export function duplicateBuildProject(projectId: string): SavedBuildProject | null {
  const projects = safeReadProjects();
  const original = projects.find(project => project.id === projectId);
  if (!original) return null;

  const now = Date.now();
  const duplicate: SavedBuildProject = {
    ...original,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${original.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    snapshot: JSON.parse(JSON.stringify(original.snapshot)) as BuildModeProjectSnapshot,
  };

  projects.unshift(duplicate);
  writeProjects(projects);
  return duplicate;
}
