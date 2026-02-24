// Template rendering engine
interface Context { [key: string]: any }

export class TemplateEngine {
  private templates: Map<string, string> = new Map()

  register(name: string, content: string): void {
    this.templates.set(name, content)
  }

  render(name: string, context: Context): string {
    const template = this.templates.get(name) || ''
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] || ''))
  }
}
