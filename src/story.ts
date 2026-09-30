import data from './story.json';
import type { PageDef } from './types';

// The whole comic lives in story.json: pages, panel layout, timing, copy.
export const pages = data.pages as unknown as PageDef[];
