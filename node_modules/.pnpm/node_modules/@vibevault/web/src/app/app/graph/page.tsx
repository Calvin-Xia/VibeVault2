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
} from 'reactflow'
import 'reactflow/dist/style.css'
import { listLinks } from '@/actions/linkActions'

// Custom node types (optional, for now we'll use default nodes)
const nodeTypes = {}

function GraphView() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Handle node click to open link
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('link-') && node.data && (node.data as any).url) {
      const url = (node.data as any).url
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Generate graph data from links and tags
  const generateGraphData = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('Generating graph data...')
      const result = await listLinks({ limit: 100 })
      const { links: fetchedLinks } = result
      console.log('Fetched links:', fetchedLinks.length)
      
      // Create nodes and edges
      const newNodes: Node[] = []
      const newEdges: Edge[] = []
      const nodeIdMap = new Map<string, string>()
      const tagIdMap = new Map<string, string>()
      const tagToLinksMap = new Map<string, typeof fetchedLinks>() // Map tag id to its links
      
      let idCounter = 0
      
      // Separate tags by collecting unique ones first and group links by tag
      const uniqueTags = new Map<string, any>()
      
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
              color: '#6b7280'
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
          sourcePosition: 'right', // Edge starts from right side of tag
          data: {
            label: tag.name,
            style: {
              backgroundColor: tag.color || '#8b5cf6',
              color: 'white',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            },
          },
          style: {
            width: '120px',
            height: 'auto',
            textAlign: 'center',
            cursor: 'pointer',
          },
        })
      })
      
      // Add link nodes on the right side of their tags
      const linkSpacingX = 300 // Horizontal spacing between link columns
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
            targetPosition: 'left', // Edge enters from left side of link
            data: {
              label: link.title || link.domain || '未命名链接',
              url: link.url,
              style: {
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '13px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              },
            },
            style: {
              width: '200px',
              height: 'auto',
              cursor: 'pointer',
            },
          })
          
          // Add edges between link and its tag with natural curve
          newEdges.push({
            id: `edge-${idCounter++}`,
            source: tagNodeId,
            target: nodeId,
            type: 'bezier', // Use bezier curve for more natural flow
            style: {
              stroke: tag.color || '#8b5cf6',
              strokeWidth: 3,
              opacity: 0.8,
              strokeLinecap: 'round',
              strokeDasharray: '', // Solid line for better visibility
            },
            animated: true,
            // Configure bezier curve options for smoother flow
            markerEnd: {
              type: 'arrow',
              width: 14,
              height: 14,
              color: tag.color || '#8b5cf6',
            },
            // Adjust control points for more natural curve
            style: {
              stroke: tag.color || '#8b5cf6',
              strokeWidth: 3,
              opacity: 0.8,
              strokeLinecap: 'round',
              strokeDasharray: '',
            },
          })
        })
      })
      
      console.log('Created nodes:', newNodes.length)
      console.log('Created edges:', newEdges.length)
      
      setNodes(newNodes)
      setEdges(newEdges)
    } catch (error) {
      console.error('Error generating graph data:', error)
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
      <h1 className="text-2xl font-semibold mb-4">知识图谱</h1>
      <div className="glass rounded-2xl p-6">
        {/* View options tab */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => router.push('/app')}
            >
              <span>🖼️</span>
              <span className="hidden sm:inline">瀑布流</span>
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
              disabled
            >
              <span>🔗</span>
              <span className="hidden sm:inline">知识图谱</span>
            </button>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            onClick={generateGraphData}
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '加载图谱'}
          </button>
        </div>
        <div 
          ref={reactFlowWrapper} 
          className="h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg relative"
          style={{ width: '100%' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={3}
            selectionOnDrag={false}
            onNodeClick={handleNodeClick}
          >
            <Background 
              variant="dots" 
              gap={20} 
              size={2} 
              color="#94a3b8"
              style={{ opacity: 0.5 }}
            />
            <Controls 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
              }}
              nodeColor={(node) => {
                if (node.id.startsWith('tag-')) {
                  return '#8b5cf6' // Purple for tags
                }
                return '#3b82f6' // Blue for links
              }}
              edgeColor={(edge) => edge.style?.stroke || '#8b5cf6'}
            />
          </ReactFlow>
        </div>
        {nodes.length === 0 && !isLoading && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-6xl mb-4">🔗</div>
            <h2 className="text-xl font-medium mb-2">知识图谱视图</h2>
            <p className="text-gray-500 dark:text-gray-400">
              点击"加载图谱"按钮生成知识图谱，将展示标签与链接之间的关系。
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
