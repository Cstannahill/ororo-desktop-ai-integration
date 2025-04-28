import React from 'react'
import type { Project } from '../../../main/types'
import { ProjectList } from './ProjectList'
import { Settings, FolderPlus } from './Icons'

interface SidebarProps {
  projects: Project[]
  activeProjectId: number | null
  onSelectProject: (projectId: number | null) => void
  onIndexProject: () => Promise<void>
  onOpenSettings: () => void
}

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onIndexProject,
  onOpenSettings
}: SidebarProps): React.ReactElement {
  return (
    <div className="flex h-full w-52 flex-shrink-0 flex-col sidebar-container border-r border-gray-700 bg-brand-chataibubble p-3">
      <h3 className="mb-3 text-center text-lg font-semibold text-white">Projects</h3>
      <ProjectList
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={onSelectProject}
      />
      <div className="mt-auto space-y-2 border-t border-gray-600 pt-3">
        {/* Index Button */}
        <button
          onClick={onIndexProject}
          className="flex w-full items-center justify-center rounded bg-gray-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <FolderPlus size={16} className="mr-1.5" />
          Index Project
        </button>
        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center justify-center rounded bg-gray-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          title="Open Settings"
        >
          <Settings size={16} className="mr-1.5" /> {/* Lucide Icon */}
          Settings
        </button>
      </div>
    </div>
  )
}
