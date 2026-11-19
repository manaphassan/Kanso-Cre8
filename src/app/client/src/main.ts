/**
 * Application Bootstrap Entry for Kanso Cre8 Desktop Application (Svelte 5)
 */
import { mount } from 'svelte';
import '@fontsource-variable/nunito/wght.css';
import '@fontsource-variable/nunito/wght-italic.css';
import '@fontsource-variable/red-hat-display/wght.css';
import '@fontsource-variable/red-hat-display/wght-italic.css';
import './lib/styles/kanso-tokens.css';
import './lib/styles/markdown-obsidian.css';
import './lib/styles/tailwind-compat.css';
import App from './App.svelte';

const target = document.getElementById('app');

let app: any = null;

if (target) {
  app = mount(App, {
    target
  });
}

export default app;
