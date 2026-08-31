'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Save, X, Upload, Download, Tag } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { exportData, importData } from '@/actions/exportActions'
import { listTags, deleteTag, updateTag, createTag } from '@/actions/tagActions'
import { Reveal } from '@/components/Reveal'
import { DEFAULT_TAG_COLOR } from '@/lib/tagColor'

function Settings() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string | null }>>([])
  const [isLoadingTags, setIsLoadingTags] = useState(true)
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; color: string | null } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Add tag state
  const [showAddTagForm, setShowAddTagForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR)
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [deletingTag, setDeletingTag] = useState<{ id: string; name: string } | null>(null)
  const [isDeletingTag, setIsDeletingTag] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const result = await exportData()
      
      if (result.success && result.data) {
        // Create download link
        const dataStr = JSON.stringify(result.data, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `vibevault-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast.success('导出成功')
      } else {
        toast.error(result.error || '数据导出失败')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('数据导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0])
    }
  }

  // Fetch tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      setIsLoadingTags(true)
      try {
        const fetchedTags = await listTags()
        setTags(fetchedTags)
      } catch (error) {
        console.error('Error fetching tags:', error)
      } finally {
        setIsLoadingTags(false)
      }
    }
    fetchTags()
  }, [])

  const handleDeleteTag = async (tagId: string) => {
    try {
      const result = await deleteTag(tagId)
      if (result.success) {
        setTags(prev => prev.filter(tag => tag.id !== tagId))
        toast.success('标签已删除')
      } else {
        toast.error(result.error || '标签删除失败')
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      toast.error('标签删除失败')
    }
  }

  const confirmDeleteTag = async () => {
    if (!deletingTag) return
    try {
      setIsDeletingTag(true)
      await handleDeleteTag(deletingTag.id)
    } finally {
      setIsDeletingTag(false)
      setDeletingTag(null)
    }
  }

  const handleStartEditTag = (tag: { id: string; name: string; color: string | null }) => {
    setEditingTag(tag)
  }

  const handleCancelEditTag = () => {
    setEditingTag(null)
  }

  const handleSaveEditTag = async () => {
    if (!editingTag || !editingTag.name.trim()) return

    try {
      setIsSubmitting(true)
      const result = await updateTag(editingTag.id, {
          name: editingTag.name,
          color: editingTag.color || undefined
        })

      if (result.success && result.tag) {
        setTags(prev => prev.map(tag => 
          tag.id === editingTag.id ? result.tag! : tag
        ))
        setEditingTag(null)
        toast.success('标签已更新')
      } else {
        toast.error(result.error || '标签修改失败')
      }
    } catch (error) {
      console.error('Error updating tag:', error)
      toast.error('标签修改失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error('标签名称不能为空')
      return
    }

    try {
      setIsCreatingTag(true)
      const result = await createTag({ name: newTagName, color: newTagColor })
      if (result.success && result.tag) {
        setTags(prev => [...prev, result.tag])
        setNewTagName('')
        setNewTagColor(DEFAULT_TAG_COLOR)
        setShowAddTagForm(false)
        toast.success('标签已创建')
      } else {
        toast.error(result.error || '标签创建失败')
      }
    } catch (error) {
      console.error('Error adding tag:', error)
      toast.error('标签创建失败')
    } finally {
      setIsCreatingTag(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      toast.error('请选择要导入的文件')
      return
    }

    try {
      setIsImporting(true)
      
      // Read file content
      const fileContent = await importFile.text()
      
      // Check file size before parsing (10MB limit)
      if (fileContent.length > 10 * 1024 * 1024) {
        toast.error('文件过大，请确保文件小于10MB')
        setIsImporting(false)
        return
      }
      
      const importDataJson = JSON.parse(fileContent)
      
      // Import data
      const result = await importData(importDataJson)
      
      if (result.success) {
        // Reset file input
        setImportFile(null)
        
        // Check if result has importedLinks property using type guard
        if ('importedLinks' in result) {
          toast.success(
            `导入成功！共导入 ${result.importedLinks} 个链接，${result.importedTags} 个标签，跳过 ${result.skippedLinks} 个重复链接，跳过 ${result.skippedTags} 个重复标签`
          )
        } else {
          toast.success('导入成功')
        }
        
        // Refresh tags
        const fetchedTags = await listTags()
        setTags(fetchedTags)
      } else {
        toast.error(result.error || '数据导入失败')
      }
    } catch (error) {
      console.error('Error importing data:', error)
      toast.error('数据导入失败，请检查文件格式')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="p-6 max-w-[960px] mx-auto">
      <ConfirmDialog
        open={deletingTag !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTag(null)
        }}
        title="删除标签"
        description={`确定要删除标签「${deletingTag?.name ?? ''}」吗？该标签将从所有链接上移除（链接本身不受影响），此操作无法撤销。`}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={confirmDeleteTag}
        isConfirming={isDeletingTag}
        variant="danger"
      />
      <Reveal as="h1" className="text-2xl font-semibold mb-6 text-foreground">设置</Reveal>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 导入导出 */}
        <div className="glass-static rounded-2xl p-6">
          <h2 className="text-xl font-medium mb-4 text-foreground">导入导出</h2>
          
          <div className="space-y-4">
            {/* Export */}
            <button
              className="btn btn-primary w-full"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? '导出中...' : '导出数据'}
            </button>
            
            {/* Import */}
            <div className="space-y-2">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                aria-label="选择要导入的 JSON 文件"
              />
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={handleImport}
                  disabled={isImporting || !importFile}
                >
                  <Upload className="h-4 w-4" />
                  {isImporting ? '导入中...' : '导入数据'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setImportFile(null)}
                  disabled={isImporting}
                >
                  <X className="h-4 w-4" />
                  取消
                </button>
              </div>
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  已选择文件：{importFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tag management */}
        <div className="glass-static rounded-2xl p-6">
          <h2 className="text-xl font-medium mb-4 flex items-center gap-2 text-foreground">
            <Tag className="h-5 w-5" />
            标签管理
          </h2>
          {isLoadingTags ? (
            <div className="flex flex-wrap gap-2 py-4">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          ) : tags.length === 0 ? (
            <EmptyState
              icon={<Tag className="h-10 w-10 text-muted-foreground" />}
              title="暂无标签"
              description="创建标签来整理你的链接"
            />
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  {editingTag?.id === tag.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded text-foreground"
                        value={editingTag.name}
                        onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                        aria-label="标签名称"
                      />
                      <input
                        type="color"
                        className="w-6 h-6 rounded border border-border cursor-pointer"
                        value={editingTag.color || DEFAULT_TAG_COLOR}
                        onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                        aria-label="标签颜色"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || DEFAULT_TAG_COLOR }}></span>
                      <span className="text-foreground">{tag.name}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {editingTag?.id === tag.id ? (
                      <>
                        <button
                          className="text-success hover:text-success/80"
                          onClick={handleSaveEditTag}
                          disabled={isSubmitting}
                          title="保存"
                          aria-label="保存"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={handleCancelEditTag}
                          disabled={isSubmitting}
                          title="取消"
                          aria-label="取消"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEditTag(tag)}
                          title="编辑"
                          aria-label="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingTag({ id: tag.id, name: tag.name })}
                          title="删除"
                          aria-label="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showAddTagForm ? (
            <div className="mt-4 p-3 bg-card rounded-lg">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="标签名称"
                  className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
                  aria-label="标签名称"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-10 h-10 rounded-full cursor-pointer border-2 border-border"
                  aria-label="标签颜色"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTag}
                    disabled={isCreatingTag}
                    className="btn btn-primary"
                  >
                    <Save className="h-4 w-4" />
                    创建
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTagForm(false)
                      setNewTagName('')
                      setNewTagColor(DEFAULT_TAG_COLOR)
                    }}
                    className="btn btn-secondary"
                  >
                    <X className="h-4 w-4" />
                    取消
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddTagForm(true)}
              className="btn btn-secondary w-full mt-4"
            >
              + 添加标签
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
