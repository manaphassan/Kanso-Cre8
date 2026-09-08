const fs = require('fs');
const path = require('path');
const config = require('../config');
const WorkspaceService = require('./WorkspaceService');

class WebhookService {
  constructor() {
    this.memoryWebhooks = [];
  }

  getFilePath() {
    const root = WorkspaceService.workspaceRoot || config.WORKSPACE_ROOT;
    const teamDir = path.join(root, '_Team');
    if (!fs.existsSync(teamDir)) {
      try { fs.mkdirSync(teamDir, { recursive: true }); } catch (e) {}
    }
    return path.join(teamDir, 'webhooks.json');
  }

  loadWebhooks() {
    const filePath = this.getFilePath();
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.memoryWebhooks = parsed;
          return this.memoryWebhooks;
        }
      } catch (e) {
        console.warn('[WebhookService] Could not read webhooks.json:', e.message);
      }
    }
    return this.memoryWebhooks;
  }

  saveWebhooks(list) {
    this.memoryWebhooks = list;
    const filePath = this.getFilePath();
    try {
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.warn('[WebhookService] Could not save webhooks.json:', e.message);
      return false;
    }
  }

  getWebhooks() {
    return this.loadWebhooks();
  }

  addWebhook({ name = 'Studio Webhook', url, serviceType = 'discord', events = ['all'], active = true }) {
    if (!url) throw new Error('Webhook URL is required.');
    const list = this.loadWebhooks();
    const newHook = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      url: url.trim(),
      serviceType, // 'discord' | 'slack' | 'telegram' | 'whatsapp' | 'generic'
      events: Array.isArray(events) && events.length ? events : ['all'],
      active: active !== false,
      createdAt: new Date().toISOString(),
      lastDispatchedAt: null,
      lastStatus: null
    };

    list.push(newHook);
    this.saveWebhooks(list);
    return newHook;
  }

  deleteWebhook(id) {
    const list = this.loadWebhooks().filter(w => w.id !== id);
    return this.saveWebhooks(list);
  }

  async dispatch(eventName, payload = {}) {
    const hooks = this.loadWebhooks().filter(w => w.active);
    if (!hooks.length) return;

    for (const hook of hooks) {
      if (!hook.events.includes('all') && !hook.events.includes(eventName)) {
        continue;
      }

      this.sendToHook(hook, eventName, payload).catch(err => {
        console.warn(`[WebhookService] Delivery to ${hook.name} failed:`, err.message);
      });
    }
  }

  async sendToHook(hook, eventName, payload) {
    let body = {};
    const title = payload.title || payload.projectTitle || `Kanso Cre8 Alert: ${eventName}`;
    const desc = payload.description || payload.message || payload.comment || 'A creative studio update has occurred.';

    if (hook.serviceType === 'discord') {
      body = {
        username: 'Kanso Cre8 Studio Bot',
        avatar_url: 'https://raw.githubusercontent.com/manaphassan/Kanso-Cre8/main/src/app/client/public/brand/kanso-mark.svg',
        embeds: [
          {
            title: `🎨 [${eventName}] ${title}`,
            description: desc,
            color: 0x0284C7,
            timestamp: new Date().toISOString(),
            fields: [
              { name: 'Client', value: payload.brand || 'ACME', inline: true },
              { name: 'Actor', value: payload.actor || payload.reviewer || 'Studio Lead', inline: true },
              ...(payload.jobId ? [{ name: 'Job ID', value: payload.jobId, inline: true }] : [])
            ]
          }
        ]
      };
    } else if (hook.serviceType === 'slack') {
      body = {
        text: `*🎨 Kanso Cre8 [${eventName}]:* ${title}\n>${desc}\n_By: ${payload.actor || 'Studio Lead'}_`
      };
    } else {
      // Generic / WhatsApp Webhook Gateway
      body = {
        event: eventName,
        timestamp: new Date().toISOString(),
        title,
        description: desc,
        payload
      };
    }

    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      hook.lastDispatchedAt = new Date().toISOString();
      hook.lastStatus = res.ok ? 200 : res.status;
      this.saveWebhooks(this.memoryWebhooks);
      return { success: res.ok, status: res.status };
    } catch (err) {
      hook.lastStatus = 500;
      this.saveWebhooks(this.memoryWebhooks);
      throw err;
    }
  }

  async testPing(url, serviceType = 'discord') {
    const testHook = { url, serviceType, name: 'Test Ping' };
    return await this.sendToHook(testHook, 'STUDIO_TEST_PING', {
      title: 'Kanso Cre8 Notification Test',
      description: 'Webhook connection established successfully with Kanso Cre8 vault.',
      actor: 'Studio Admin',
      brand: 'ACME'
    });
  }
}

module.exports = new WebhookService();
