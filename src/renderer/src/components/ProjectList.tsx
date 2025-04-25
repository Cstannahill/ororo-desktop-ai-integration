import React from 'react'
import type { Project } from '../../../main/types' // Assuming Project type is moved/defined

interface ProjectListProps {
  projects: Project[]
  activeProjectId: number | null
  onSelectProject: (projectId: number | null) => void
}

export function ProjectList({
  projects,
  activeProjectId,
  onSelectProject
}: ProjectListProps): React.ReactElement {
  return (
    <div className="flex-grow overflow-y-auto">
      {' '}
      {/* Takes available space */}
      {/* General Chat Option */}
      <div
        className={`cursor-pointer rounded px-2.5 py-1.5 text-sm transition-colors duration-150 ease-in-out ${
          activeProjectId === null
            ? 'bg-cyan-700 text-white' // Active style
            : 'text-gray-300 hover:bg-gray-700 hover:text-white' // Inactive style
        }`}
        onClick={() => onSelectProject(null)}
        title="Chat without specific project context"
      >
        General Chat
      </div>
      {/* Divider */}
      <hr className="my-2 border-gray-600" />
      {/* Indexed Projects */}
      {projects.map((project) => (
        <div
          key={project.id}
          className={`cursor-pointer rounded px-2.5 py-1.5 text-sm transition-colors duration-150 ease-in-out ${
            activeProjectId === project.id
              ? 'bg-cyan-700 text-white' // Active style
              : 'text-gray-300 hover:bg-gray-700 hover:text-white' // Inactive style
          } overflow-hidden text-ellipsis whitespace-nowrap`}
          onClick={() => onSelectProject(project.id)}
          title={project.rootPath} // Show full path on hover
        >
          {project.name}
        </div>
      ))}
    </div>
  )
}
