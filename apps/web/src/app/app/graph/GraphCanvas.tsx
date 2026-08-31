'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { listLinks } from '@/actions/linkActions'
import { toast } from 'sonner'
import { LayoutGrid, GitBranch } from 'lucide-react'
import { Reveal } from '@/components/Reveal'

interface GraphNodeData {
  label: string
  url?: string
  style?: React.CSSProperties
}

function GraphView() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isLoading, setIsLoading] = useState(true)

  // Handle node click to open link
  const handleNodeClick = (event: React.MouseEvent, node: Node<GraphNodeData>) => {
    if (node.id.startsWith('link-') && node.data?.url) {
      window.open(node.data.url, '_blank', 'noopener,noreferrer')
    }
  }

  // Generate graph data from links and tags
  const generateGraphData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await listLinks({ limit: 100 })
      const { links: fetchedLinks } = result

      // Create nodes and edges
      const newNodes: Node[] = []
      const newEdges: Edge[] = []
      const nodeIdMap = new Map<string, string>()
      const tagIdMap = new Map<string, string>()
      const tagToLinksMap = new Map<string, typeof fetchedLinks>() // Map tag id to its links

      let idCounter = 0

      // Separate tags by collecting unique ones first and group links by tag
      const uniqueTags = new Map<string, { id: string; name: string; color: string | null }>()

      // First, initialize all tags
      fetchedLinks.forEach((link) => {
        if (link.linkTags && link.linkTags.length > 0) {
          link.linkTags.forEach(({ tag }) => {
            if (!uniqueTags.has(tag.id)) {
              uniqueTags.set(tag.id, tag)
              tagToLinksMap.set(tag.id, [])
            }
          })
        } else {
          // Links without tags go into a special "untagged" group
          if (!uniqueTags.has('untagged')) {
            const untaggedTag = {
              id: 'untagged',
              name: '未分类',
              color: 'hsl(var(--muted-foreground))'
            }
            uniqueTags.set('untagged', untaggedTag)
            tagToLinksMap.set('untagged', [])
          }
        }
      })

      // Then, group links by their tags
      fetchedLinks.forEach((link) => {
        if (link.linkTags && link.linkTags.length > 0) {
          // For links with multiple tags, associate with each tag
          link.linkTags.forEach(({ tag }) => {
            if (tagToLinksMap.has(tag.id)) {
              tagToLinksMap.get(tag.id)?.push(link)
            }
          })
        } else {
          tagToLinksMap.get('untagged')?.push(link)
        }
      })

      // Add tag nodes with vertical layout on the left
      const tagsArray = Array.from(uniqueTags.values())
      const tagSpacing = 120 // Vertical spacing between tag nodes
      const tagX = 100 // Fixed X position for all tags
      const tagStartY = 100 // Start Y position for tags

      tagsArray.forEach((tag, index) => {
        const nodeId = `tag-${tag.id}`
        tagIdMap.set(tag.id, nodeId)

        newNodes.push({
          id: nodeId,
          type: 'default',
          position: {
            // Arrange tags in a vertical column on the left
            x: tagX,
            y: tagStartY + index * tagSpacing,
          },
          sourcePosition: Position.Right, // Edge starts from right side of tag
          className: 'node-tag',
          data: {
            label: tag.name,
          },
          style: {
            width: '120px',
            height: 'auto',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          },
        })
      })

      // Add link nodes on the right side of their tags
      const linkSpacingY = 80 // Vertical spacing between link rows
      const linkStartX = 350 // Start X position for links (moved further right for better curves)

      // Process each tag and its links
      tagsArray.forEach((tag, tagIndex) => {
        const tagLinks = tagToLinksMap.get(tag.id) || []
        const tagNodeId = tagIdMap.get(tag.id)!

        // Calculate starting position for this tag's links
        const tagLinksStartY = tagStartY + tagIndex * tagSpacing - (tagLinks.length * linkSpacingY) / 2

        // Arrange links in a column to the right of their tag
        tagLinks.forEach((link, linkIndex) => {
          const nodeId = `link-${link.id}`
          nodeIdMap.set(link.id, nodeId)

          // Position links in a column to the right of their tag
          const linkX = linkStartX
          const linkY = tagLinksStartY + linkIndex * linkSpacingY

          newNodes.push({
            id: nodeId,
            type: 'default',
            position: {
              x: linkX,
              y: linkY,
            },
            targetPosition: Position.Left, // Edge enters from left side of link
            className: 'node-link',
            data: {
              label: link.title || link.domain || '未命名链接',
              url: link.url,
            },
            style: {
              width: '200px',
              height: 'auto',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            },
          })

          // Add edges between link and its tag with natural curve
          newEdges.push({
            id: `edge-${idCounter++}`,
            source: tagNodeId,
            target: nodeId,
            type: 'bezier',
            style: {
              stroke: 'hsl(var(--border-hover))',
              strokeWidth: 1.5,
              opacity: 0.85,
              strokeLinecap: 'round',
              strokeDasharray: '',
            },
            animated: true,
            markerEnd: {
              type: MarkerType.Arrow,
              width: 14,
              height: 14,
              color: 'hsl(var(--border-hover))',
            },
          })
        })
      })

      setNodes(newNodes)
      setEdges(newEdges)
    } catch (error) {
      console.error('Error generating graph data:', error)
      toast.error('图谱加载失败,请重试')
    } finally {
      setIsLoading(false)
    }
  }, [setNodes, setEdges])

  // Automatically generate graph data on component mount
  useEffect(() => {
    generateGraphData()
  }, [generateGraphData])

  return (
    <div className="p-6">
      <Reveal as="h1" className="text-2xl font-semibold mb-4">知识图谱</Reveal>
      <div className="glass rounded-2xl p-6">
        {/* View options tab */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent"
              onClick={() => router.push('/app')}
              aria-label="切换到瀑布流视图"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">瀑布流</span>
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-card text-foreground shadow-sm"
              onClick={() => router.push('/app/graph')}
              aria-current="page"
              aria-label="知识图谱视图（当前）"
            >
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">知识图谱</span>
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={generateGraphData}
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '加载图谱'}
          </button>
        </div>
        <div
          ref={reactFlowWrapper}
          className="h-[min(600px,70dvh)] bg-background border border-border rounded-xl relative"
          style={{ width: '100%' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onInit={() => {}}
            nodeTypes={{}}
            fitView
            minZoom={0.1}
            maxZoom={3}
            selectionOnDrag={false}
            onNodeClick={handleNodeClick}
            aria-label="知识图谱"
            nodesFocusable={true}
            edgesFocusable={true}
            disableKeyboardA11y={false}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={2}
              color="hsl(var(--muted-foreground))"
              style={{ opacity: 0.5 }}
            />
            <Controls
              style={{
                backgroundColor: 'hsl(var(--card) / 0.9)',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                padding: '5px',
              }}
            />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              style={{
                backgroundColor: 'hsl(var(--card) / 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
              }}
              nodeColor={(node) => {
                if (node.id.startsWith('tag-')) {
                  return 'hsl(var(--cyan))' // 标签节点:青
                }
                return 'hsl(var(--violet))' // 链接节点:紫
              }}
            />
          </ReactFlow>
        </div>
        <div className="mt-2 text-center">
          <p className="text-muted-foreground text-sm">
            提示: 使用 Tab 键聚焦节点，Enter 键选择，方向键移动
          </p>
        </div>
        {nodes.length === 0 && !isLoading && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <GitBranch className="h-16 w-16 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xl font-medium mb-2">知识图谱视图</h2>
            <p className="text-muted-foreground">
              点击&quot;加载图谱&quot;按钮生成知识图谱，将展示标签与链接之间的关系。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function GraphViewWithProvider() {
  return (
    <ReactFlowProvider>
      <GraphView />
    </ReactFlowProvider>
  )
}

export default GraphViewWithProvider
