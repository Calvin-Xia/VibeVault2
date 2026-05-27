export interface Tag {
  id: string
  name: string
  color: string | null
}

export interface LinkTag {
  tag: Tag
}

export interface LinkVisit {
  id: string
  visitedAt: Date
}

export type LinkStatus = 'INBOX' | 'READING' | 'ARCHIVED'
export type MetadataStatus = 'PENDING' | 'READY' | 'FAILED'

export interface Link {
  id: string
  title: string
  url: string
  domain: string
  description: string | null
  note: string | null
  ogImage: string | null
  favicon: string | null
  siteName: string | null
  createdAt: Date
  updatedAt: Date
  lastVisitedAt: Date | null
  status: LinkStatus
  favorite: boolean
  collectionId: string | null
  metadataStatus: MetadataStatus
  metadataError: string | null
  linkTags: LinkTag[]
  visits?: LinkVisit[]
}
