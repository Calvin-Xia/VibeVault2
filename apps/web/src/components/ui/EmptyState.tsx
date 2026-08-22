'use client'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-2">{icon}</div>
      <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary mt-4"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
