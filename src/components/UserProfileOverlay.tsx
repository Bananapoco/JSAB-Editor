import React, { useEffect, useMemo, useState } from 'react';
import { EventBus } from '../game/EventBus';
import {
  deleteBuildProject,
  duplicateBuildProject,
  readBuildProjects,
  renameBuildProject,
  SavedBuildProject,
} from './build-mode/projectStorage';

type SortMode = 'updated_desc' | 'updated_asc' | 'name_asc' | 'events_desc';

function formatUpdatedAt(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export const UserProfileOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [projects, setProjects] = useState<SavedBuildProject[]>([]);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('updated_desc');
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const refreshProjects = () => {
    setProjects(readBuildProjects());
  };

  useEffect(() => {
    const openProfile = () => {
      refreshProjects();
      setIsVisible(true);
    };

    EventBus.on('open-user-profile', openProfile);
    return () => {
      EventBus.removeListener('open-user-profile', openProfile);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    EventBus.emit('ui-input-lock:add');
    return () => {
      EventBus.emit('ui-input-lock:remove');
    };
  }, [isVisible]);

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    let next = [...projects];

    if (query) {
      next = next.filter(project => {
        const text = [
          project.name,
          project.snapshot.bossName,
          `${project.snapshot.bpm}`,
          `${project.snapshot.events.length}`,
        ].join(' ').toLowerCase();

        return text.includes(query);
      });
    }

    switch (sortMode) {
      case 'updated_asc':
        next.sort((a, b) => a.updatedAt - b.updatedAt);
        break;
      case 'name_asc':
        next.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'events_desc':
        next.sort((a, b) => b.snapshot.events.length - a.snapshot.events.length);
        break;
      case 'updated_desc':
      default:
        next.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }

    return next;
  }, [projects, search, sortMode]);

  const handleContinueProject = (project: SavedBuildProject) => {
    setIsVisible(false);
    EventBus.emit('open-build-project', project);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteBuildProject(projectId);
    refreshProjects();
  };

  const handleDuplicateProject = (projectId: string) => {
    duplicateBuildProject(projectId);
    refreshProjects();
  };

  const beginRename = (project: SavedBuildProject) => {
    setRenameProjectId(project.id);
    setRenameValue(project.name);
  };

  const handleRenameSave = () => {
    if (!renameProjectId) return;
    const nextName = renameValue.trim();
    if (!nextName) return;

    renameBuildProject(renameProjectId, nextName);
    setRenameProjectId(null);
    setRenameValue('');
    refreshProjects();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/90 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl border border-[#2b2b46] bg-[#0d0d17]">
        <div className="px-6 py-4 border-b border-[#25253a] flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-black tracking-wide text-[#00e5ff]">USER PROFILE</h2>
            <p className="text-xs text-[#7f7fa6]">Saved Build Mode Projects</p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="px-3 py-1.5 rounded-md border border-[#303055] hover:border-white text-sm text-[#cfcfff]"
          >
            Close
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-3 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="bg-[#121226] border border-[#2f2f4b] rounded-md px-3 py-2 text-sm min-w-[220px]"
          />
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="bg-[#121226] border border-[#2f2f4b] rounded-md px-3 py-2 text-sm"
          >
            <option value="updated_desc">Recently Updated</option>
            <option value="updated_asc">Oldest Updated</option>
            <option value="name_asc">Name (A → Z)</option>
            <option value="events_desc">Most Events</option>
          </select>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-150px)]">
          {visibleProjects.length === 0 ? (
            <div className="border border-dashed border-[#2e2e4d] rounded-xl p-10 text-center text-[#8a8ab1]">
              {projects.length === 0
                ? <>No saved projects yet. Open Build Mode and click <strong>Save Project</strong>.</>
                : <>No matches for that search/filter.</>}
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleProjects.map(project => (
                <div
                  key={project.id}
                  className="rounded-xl border border-[#2b2b46] bg-[#121226] px-4 py-3 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      {renameProjectId === project.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            className="bg-[#0d0d17] border border-[#3a3a5d] rounded-md px-2 py-1 text-sm"
                          />
                          <button onClick={handleRenameSave} className="text-xs px-2 py-1 rounded bg-[#2f6] text-black font-semibold">Save</button>
                          <button
                            onClick={() => {
                              setRenameProjectId(null);
                              setRenameValue('');
                            }}
                            className="text-xs px-2 py-1 rounded border border-[#55557f]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-bold text-lg text-white">{project.name}</h3>
                      )}

                      <div className="text-xs text-[#9a9ac2] flex gap-3 flex-wrap mt-1">
                        <span>{project.snapshot.events.length} events</span>
                        <span>{Math.round(project.snapshot.audioDuration)}s timeline</span>
                        <span>{project.snapshot.bpm} BPM</span>
                        <span>Updated {formatUpdatedAt(project.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleContinueProject(project)}
                      className="px-3 py-1.5 rounded-md bg-[#00bcd4] hover:bg-[#29d8ef] text-black font-semibold text-sm"
                    >
                      Continue Editing
                    </button>
                    <button
                      onClick={() => beginRename(project)}
                      className="px-3 py-1.5 rounded-md border border-[#4a4a70] hover:border-white text-sm"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDuplicateProject(project.id)}
                      className="px-3 py-1.5 rounded-md border border-[#405070] hover:border-[#99bbff] text-[#b7c8ff] text-sm"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="px-3 py-1.5 rounded-md border border-[#4a3a55] hover:border-[#ff4fa0] text-[#ff8bc5] text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
