'use client'

import { useState, useEffect } from 'react'
import { exportData, importData } from '@/actions/exportActions'
import { listTags, deleteTag, updateTag, createTag } from '@/actions/tagActions'

function Settings() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string | null }>>([])
  const [isLoadingTags, setIsLoadingTags] = useState(true)
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; color: string | null } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Add tag state
  const [showAddTagForm, setShowAddTagForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#8b5cf6')
  const [isCreatingTag, setIsCreatingTag] = useState(false)

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
        
        setMessage({ type: 'success', text: '数据导出成功！' })
      } else {
        setMessage({ type: 'error', text: result.error || '数据导出失败' })
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      setMessage({ type: 'error', text: '数据导出失败' })
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
        setMessage({ type: 'success', text: '标签删除成功' })
      } else {
        setMessage({ type: 'error', text: result.error || '标签删除失败' })
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
      setMessage({ type: 'error', text: '标签删除失败' })
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
        setMessage({ type: 'success', text: '标签修改成功' })
      } else {
        setMessage({ type: 'error', text: result.error || '标签修改失败' })
      }
    } catch (error) {
      console.error('Error updating tag:', error)
      setMessage({ type: 'error', text: '标签修改失败' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      setMessage({ type: 'error', text: '标签名称不能为空' })
      return
    }

    try {
      setIsCreatingTag(true)
      const result = await createTag({ name: newTagName, color: newTagColor })
      if (result.success && result.tag) {
        setTags(prev => [...prev, result.tag])
        setNewTagName('')
        setNewTagColor('#8b5cf6')
        setShowAddTagForm(false)
        setMessage({ type: 'success', text: '标签创建成功' })
      } else {
        setMessage({ type: 'error', text: result.error || '标签创建失败' })
      }
    } catch (error) {
      console.error('Error adding tag:', error)
      setMessage({ type: 'error', text: '标签创建失败' })
    } finally {
      setIsCreatingTag(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setMessage({ type: 'error', text: '请选择要导入的文件' })
      return
    }

    try {
      setIsImporting(true)
      
      // Read file content
      const fileContent = await importFile.text()
      const importDataJson = JSON.parse(fileContent)
      
      // Import data
      const result = await importData(importDataJson)
      
      if (result.success) {
        // Reset file input
        setImportFile(null)
        
        // Check if result has importedLinks property using type guard
        if ('importedLinks' in result) {
          setMessage({ 
            type: 'success', 
            text: `导入成功！共导入 ${result.importedLinks} 个链接，${result.importedTags} 个标签，跳过 ${result.skippedLinks} 个重复链接，跳过 ${result.skippedTags} 个重复标签` 
          })
        } else {
          setMessage({ type: 'success', text: '导入成功！' })
        }
        
        // Refresh tags
        const fetchedTags = await listTags()
        setTags(fetchedTags)
      } else {
        setMessage({ type: 'error', text: result.error || '数据导入失败' })
      }
    } catch (error) {
      console.error('Error importing data:', error)
      setMessage({ type: 'error', text: '数据导入失败，请检查文件格式' })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">设置</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 导入导出 */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-medium mb-4">导入导出</h2>
          
          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} dark:${message.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
              {message.text}
            </div>
          )}
          
          <div className="space-y-4">
            {/* Export */}
            <button 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? '导出中...' : '导出数据'}
            </button>
            
            {/* Import */}
            <div className="space-y-2">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
              <div className="flex gap-2">
                <button 
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  onClick={handleImport}
                  disabled={isImporting || !importFile}
                >
                  {isImporting ? '导入中...' : '导入数据'}
                </button>
                <button 
                  className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  onClick={() => setImportFile(null)}
                  disabled={isImporting}
                >
                  取消
                </button>
              </div>
              {importFile && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  已选择文件：{importFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tag management */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-medium mb-4">标签管理</h2>
          {isLoadingTags ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">加载标签中...</div>
          ) : tags.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">暂无标签</div>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  {editingTag?.id === tag.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                        value={editingTag.name}
                        onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                      />
                      <input
                        type="color"
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-700 cursor-pointer"
                        value={editingTag.color || '#8b5cf6'}
                        onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#8b5cf6' }}></span>
                      <span>{tag.name}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {editingTag?.id === tag.id ? (
                      <>
                        <button 
                          className="text-green-500 hover:text-green-700 dark:hover:text-green-300"
                          onClick={handleSaveEditTag}
                          disabled={isSubmitting}
                        >💾</button>
                        <button 
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          onClick={handleCancelEditTag}
                          disabled={isSubmitting}
                        >✖️</button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          onClick={() => handleStartEditTag(tag)}
                        >✏️</button>
                        <button 
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          onClick={() => handleDeleteTag(tag.id)}
                        >🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showAddTagForm ? (
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="标签名称"
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTag}
                    disabled={isCreatingTag}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    创建
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTagForm(false)
                      setNewTagName('')
                      setNewTagColor('#8b5cf6')
                    }}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddTagForm(true)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
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