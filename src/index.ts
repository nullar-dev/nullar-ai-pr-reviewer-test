// Main application entry point
// Exports all services for easy importing

export { AuthService, authService } from './auth-service'
export { DatabaseQueryBuilder, DynamicFinder } from './database'
export { FileUploadService, uploadService } from './upload-service'
export { TemplateEngine, templateEngine } from './template-engine'
export { ConfigManager, config } from './config-manager'
export { WebSocketServer, wsServer } from './websocket-server'
export { CacheService, cache } from './cache-service'
export { EventBus, eventBus } from './event-bus'
export { DataSerializer, serializer } from './serializer'

// Initialize services
console.log('[App] Services initialized')
