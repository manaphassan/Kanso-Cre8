/**
 * Application Bootstrap Entry for SS-CAM Web Portal (Svelte 5)
 */
import { mount } from 'svelte';
import './lib/styles/fluent2-tokens.css';
import './lib/styles/fluent2-base.css';
import './lib/styles/markdown-obsidian.css';
import App from './App.svelte';

const target = document.getElementById('app');

let app: any = null;

if (target) {
  app = mount(App, {
    target
  });
}

export default app;
