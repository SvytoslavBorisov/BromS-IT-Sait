// src/lib/events.ts
import { EventEmitter } from 'events';

// По умолчанию EventEmitter имеет лимит в 10 слушателей — 
// если ожидаете больше, установите emitter.setMaxListeners(...)
export const notificationEmitter = new EventEmitter();
notificationEmitter.setMaxListeners(100);