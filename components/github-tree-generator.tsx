'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GitHubTreeItem {
  path: string
  mode: string
  type: string
  size?: number
  sha: string
  url: string
}

interface GitHubTreeResponse {
  sha: string
  url: string
  tree: GitHubTreeItem[]
  truncated: boolean
}

type TreeNode = { [key: string]: TreeNode }

export function GithubTreeGenerator() {
  const [repoUrl, setRepoUrl] = useState<string>('')
  const [depth, setDepth] = useState<string>('3')
  const [tree, setTree] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const fetchRepoStructure = async (owner: string, repo: string): Promise<GitHubTreeResponse> => {
    const branches = ['main', 'master']
    for (const branch of branches) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
        )
        if (response.ok) return response.json()
      } catch (error) {
        console.error(`Error fetching ${branch} branch:`, error)
      }
    }
    throw new Error('Failed to fetch repository structure')
  }

  const generateTree = (data: GitHubTreeResponse, maxDepth: number): string => {
    const tree: TreeNode = {}
    data.tree.forEach((item: GitHubTreeItem) => {
      const parts = item.path.split('/')
      let current = tree
      parts.forEach((part: string, index: number) => {
        if (index < maxDepth) {
          if (!current[part]) {
            current[part] = {}
          }
          current = current[part]
        }
      })
    })

    const renderTree = (node: TreeNode, prefix = ''): string => {
      let result = ''
      const entries = Object.entries(node)
      entries.forEach(([key, value], index) => {
        const isLast = index === entries.length - 1
        result += `${prefix}${isLast ? '└── ' : '├── '}${key}\n`
        if (Object.keys(value).length > 0) {
          result += renderTree(value, `${prefix}${isLast ? '    ' : '│   '}`)
        }
      })
      return result
    }

    return renderTree(tree)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTree('')

    try {
      const url = new URL(repoUrl)
      const [, owner, repo] = url.pathname.split('/')
      if (!owner || !repo) {
        throw new Error('Invalid repository URL format.')
      }
      const data = await fetchRepoStructure(owner, repo)
      const generatedTree = generateTree(data, parseInt(depth))
      setTree(generatedTree)
    } catch {
      setError('Failed to generate tree. Please check the repository URL and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">GitHub Repository Tree Generator</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="repoUrl">GitHub Repository URL</Label>
          <Input
            id="repoUrl"
            type="url"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="depth">Tree Depth</Label>
          <Select value={depth} onValueChange={setDepth}>
            <SelectTrigger id="depth">
              <SelectValue placeholder="Select depth" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Tree'}
        </Button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {tree && (
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-x-auto">
          <code>{tree}</code>
        </pre>
      )}
    </div>
  )
}
