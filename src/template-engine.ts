// Template rendering engine with support for custom directives
// Processes templates with variables, loops, and conditionals

interface TemplateContext {
  [key: string]: any
}

interface TemplateBlock {
  type: 'text' | 'variable' | 'loop' | 'conditional' | 'include'
  content?: string
  variable?: string
  expression?: string
  children?: TemplateBlock[]
}

export class TemplateEngine {
  private templates: Map<string, string> = new Map()
  private cache: Map<string, TemplateBlock[]> = new Map()

  // Register a template
  register(name: string, content: string): void {
    this.templates.set(name, content)
    this.cache.delete(name)
  }

  // Render a template with context
  render(name: string, context: TemplateContext): string {
    const template = this.templates.get(name)
    if (!template) {
      throw new Error(`Template '${name}' not found`)
    }

    const blocks = this.parse(template)
    return this.renderBlocks(blocks, context)
  }

  // Parse template into blocks
  private parse(template: string): TemplateBlock[] {
    const blocks: TemplateBlock[] = []
    let remaining = template

    while (remaining.length > 0) {
      // Check for variable {{ var }}
      const varMatch = remaining.match(/^\{\{\s*(\w+)\s*\}\}/)
      if (varMatch) {
        blocks.push({ type: 'variable', variable: varMatch[1] })
        remaining = remaining.slice(varMatch[0].length)
        continue
      }

      // Check for conditional {% if expr %}...{% endif %}
      const ifMatch = remaining.match(/^\{\%\s*if\s+(.+?)\s*\%\}/)
      if (ifMatch) {
        const inner = remaining.slice(ifMatch[0].length)
        const endifMatch = inner.match(/^\{\%\s*endif\s*\%\}/)
        if (endifMatch) {
          blocks.push({
            type: 'conditional',
            expression: ifMatch[1],
            children: []
          })
          remaining = inner.slice(endifMatch[0].length)
          continue
        }
      }

      // Check for loop {% for item in items %}...{% endfor %}
      const forMatch = remaining.match(/^\{\%\s*for\s+(\w+)\s+in\s+(\w+)\s*\%\}/)
      if (forMatch) {
        const inner = remaining.slice(forMatch[0].length)
        const endforMatch = inner.match(/^\{\%\s*endfor\s*\%\}/)
        if (endforMatch) {
          blocks.push({
            type: 'loop',
            variable: forMatch[1],
            expression: forMatch[2],
            children: []
          })
          remaining = inner.slice(endforMatch[0].length)
          continue
        }
      }

      // Check for include {% include "template" %}
      const includeMatch = remaining.match(/^\{\%\s*include\s+"([^"]+)"\s*\%\}/)
      if (includeMatch) {
        blocks.push({ type: 'include', content: includeMatch[1] })
        remaining = remaining.slice(includeMatch[0].length)
        continue
      }

      // Plain text
      const nextSpecial = remaining.search(/\{\{|\}\}|\{\%|\%\}/
)
      if (nextSpecial === -1) {
        blocks.push({ type: 'text', content: remaining })
        break
      } else if (nextSpecial === 0) {
        // Unmatched template tag, treat as text
        blocks.push({ type: 'text', content: remaining.slice(0, 2) })
        remaining = remaining.slice(2)
      } else {
        blocks.push({ type: 'text', content: remaining.slice(0, nextSpecial) })
        remaining = remaining.slice(nextSpecial)
      }
    }

    return blocks
  }

  // Render parsed blocks
  private renderBlocks(blocks: TemplateBlock[], context: TemplateContext): string {
    let result = ''

    for (const block of blocks) {
      switch (block.type) {
        case 'text':
          result += block.content || ''
          break

        case 'variable':
          result += this.resolveVariable(block.variable!, context)
          break

        case 'conditional':
          if (this.evaluateCondition(block.expression!, context)) {
            result += this.renderBlocks(block.children || [], context)
          }
          break

        case 'loop':
          const items = this.resolveVariable(block.expression!, context)
          if (Array.isArray(items)) {
            for (const item of items) {
              const loopContext = { ...context, [block.variable!]: item }
              result += this.renderBlocks(block.children || [], loopContext)
            }
          }
          break

        case 'include':
          const included = this.render(block.content!, context)
          result += included
          break
      }
    }

    return result
  }

  // Resolve variable from context
  private resolveVariable(name: string, context: TemplateContext): string {
    const value = context[name]
    if (value === undefined) {
      return ''
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  // Evaluate conditional expression
  private evaluateCondition(expr: string, context: TemplateContext): boolean {
    try {
      // Simple evaluation - check if variable exists and is truthy
      const varName = expr.trim()
      const value = context[varName]
      return Boolean(value)
    } catch {
      return false
    }
  }

  // Precompile template for performance
  precompile(name: string): void {
    const template = this.templates.get(name)
    if (template) {
      const blocks = this.parse(template)
      this.cache.set(name, blocks)
    }
  }

  // Render from precompiled template
  renderCached(name: string, context: TemplateContext): string {
    const blocks = this.cache.get(name)
    if (!blocks) {
      return this.render(name, context)
    }
    return this.renderBlocks(blocks, context)
  }
}

export const templateEngine = new TemplateEngine()
