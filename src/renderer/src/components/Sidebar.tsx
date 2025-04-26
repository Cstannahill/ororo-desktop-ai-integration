import React from 'react'
import type { Project } from '../../../main/types'
import { ProjectList } from './ProjectList' // Import ProjectList

interface SidebarProps {
  projects: Project[]
  activeProjectId: number | null
  onSelectProject: (projectId: number | null) => void
  onIndexProject: () => Promise<void>
}

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onIndexProject
}: SidebarProps): React.ReactElement {
  return (
    <div className="flex h-full w-52 flex-shrink-0 flex-col sidebar-container border-r border-gray-700 bg-brand-chataibubble p-3">
      <h3 className="mb-3 text-center text-lg font-semibold text-white">Projects</h3>
      <ProjectList
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={onSelectProject}
      />
      {/* Index Button Container */}
      <div className="mt-auto border-t border-gray-600 pt-3">
        <button
          onClick={onIndexProject}
          className="w-full rounded font-semibold bg-brand-sage px-3 py-2 text-sm  text-white transition-colors duration-200 ease-in-out hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          Index Project Folder
        </button>
      </div>
    </div>
  )
}
