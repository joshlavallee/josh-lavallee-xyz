import { createFileRoute } from '@tanstack/react-router'
import { Code, Palette, Camera, Briefcase } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Home,
})

const STATS = [
  { label: 'Years Experience', value: '8+' },
  { label: 'Projects Shipped', value: '30+' },
  { label: 'Technologies', value: '15+' },
]

const SKILLS = [
  { icon: Code, label: 'Development', description: 'React, TypeScript, Node.js, Three.js' },
  { icon: Palette, label: 'Design', description: 'UI/UX, Design Systems, Prototyping' },
  { icon: Camera, label: 'Photography', description: 'Portrait, Landscape, Street' },
  { icon: Briefcase, label: 'Leadership', description: 'Team Lead, Architecture, Mentoring' },
]

function Home() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        {/* Profile card */}
        <div className="surface p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="surface-inset flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-primary">
              JL
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-foreground">Josh Lavallee</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Software Engineer & Creative Developer
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                Building immersive web experiences at the intersection of engineering and design.
                Passionate about 3D, creative coding, and pushing the boundaries of what's possible in the browser.
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {STATS.map((stat) => (
            <div key={stat.label} className="surface p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Skills grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {SKILLS.map((skill) => (
            <div key={skill.label} className="surface group flex items-start gap-3 p-4">
              <div className="surface-inset flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <skill.icon className="size-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{skill.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{skill.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          <button className="surface-btn bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            View Projects
          </button>
          <button className="surface-btn bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground">
            Get in Touch
          </button>
        </div>
      </div>
    </div>
  )
}
