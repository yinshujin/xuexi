import { defineProject } from 'vitest/config';
export default defineProject({ test: { name: 'player', environment: 'jsdom' } });
