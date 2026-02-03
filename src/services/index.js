/**
 * Service Layer - Centralized business logic
 *
 * This module exports all service modules for use in resolvers.
 * Services contain business logic that was previously mixed with
 * GraphQL resolver code, providing:
 *
 * - Better testability (services can be unit tested without GraphQL)
 * - Reusability (same logic for REST APIs, CLI tools, workers)
 * - Separation of concerns (resolvers handle GraphQL, services handle business logic)
 * - Centralized error handling and logging
 */

// Core services
export * as UserService from './UserService.js';
export * as MessageService from './MessageService.js';
export * as RoomService from './RoomService.js';

// Utility services
export * as PaginationService from './PaginationService.js';
export * as EventService from './EventService.js';

// Re-export defaults for convenience
export { default as userService } from './UserService.js';
export { default as messageService } from './MessageService.js';
export { default as roomService } from './RoomService.js';
export { default as paginationService } from './PaginationService.js';
export { default as eventService } from './EventService.js';
