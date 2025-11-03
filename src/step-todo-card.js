class StepTodoCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity)
      throw new Error("Entity is required (e.g., todo.my_list)");
    this.config = config;
    this.attachShadow({ mode: "open" });
    this.items = [];
    this._loading = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this.loadItems();
      if (!this.config.disable_auto_refresh) {
        this._refreshInterval = setInterval(
          () => this.loadItems(),
          this.config.refresh_interval_ms || 30000
        );
      }
    }
  }

  disconnectedCallback() {
    if (this._refreshInterval) clearInterval(this._refreshInterval);
  }

  async loadItems() {
    if (!this._hass || !this.config.entity) return;
    if (this._loading) return;
    this._loading = true;

    const body = { entity_id: this.config.entity };

    try {
      const resp = await this._hass.callApi(
        "POST",
        "services/todo/get_items?return_response",
        body
      );

      const entityId = this.config.entity;
      const items =
        resp?.service_response?.[entityId]?.items || resp?.items || [];
      this.items = items;
    } catch (err) {
      console.error("Error loading todo items:", err);
      this.items = [];
    } finally {
      this._loading = false;
      this.render();
    }
  }

  async resetAllItems() {
    if (!this._hass || !this.config.entity || !this.items?.length) return;

    try {
      for (const item of this.items) {
        if (item.status !== "needs_action") {
          await this._hass.callService("todo", "update_item", {
            entity_id: this.config.entity,
            item: item.summary,
            status: "needs_action",
          });
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      await new Promise((r) => setTimeout(r, 500));
      await this.loadItems();
    } catch (e) {
      console.error("Error resetting todo items:", e);
    }
  }

  async completeItem(item) {
    if (!this._hass || !this.config.entity || !item) return;
    try {
      const data = { entity_id: this.config.entity };
      if (item.uid) data.uid = item.uid;
      else if (item.id) data.id = item.id;
      else data.uid = item.uid || item.id || null;

      await this._hass.callService("todo", "update_item", {
        entity_id: this.config.entity,
        item: item.summary,
        status: "completed",
      });

      // Give HA a moment to update before reloading
      await new Promise((r) => setTimeout(r, 500));
      await this.loadItems();
    } catch (e) {
      console.error("Error completing todo item:", e);
    }
  }

  getCardSize() {
    return 2;
  }

  render() {
    const hass = this._hass;
    if (!hass) return;
    const title = this.config.title || "Step-by-Step Checklist";
    const doneMessage = this.config.done_message || "All steps complete!";

    const items = this.items || [];
    const total = items.length;
    const remaining = items.filter((i) => {
      if (i === null || typeof i !== "object") return false;
      if (typeof i.completed === "boolean") return !i.completed;
      if (typeof i.status === "string") return i.status !== "completed";
      return true;
    });

    const completedCount = total - remaining.length;
    const current = remaining.length > 0 ? remaining[0] : null;
    const content = current
      ? current.summary || current.title || "(no summary)"
      : doneMessage;
    const stepText = current
      ? `Step ${completedCount + 1} of ${total}`
      : `${total} steps done`;

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 20px; border-radius: 16px; transition: all 0.3s ease; text-align: center; }
        h2 { margin: 0 0 12px 0; font-size: 1.3em; font-weight: 600; }
        .step-info { font-size: 0.9em; color: var(--secondary-text-color); margin-bottom: 12px; }
        .item { font-size: 1.2em; margin-bottom: 16px; transition: opacity 0.3s ease; }
        button { background-color: var(--primary-color); color: white; border: none; border-radius: 12px; padding: 10px 18px; font-size: 1em; cursor: pointer; transition: background 0.3s ease; }
        button:hover { background-color: var(--primary-color-light, #6ab7ff); }
        .small { font-size: 0.85em; color: var(--secondary-text-color); margin-top: 8px; }
      </style>
      <ha-card>
        <h2>${title}</h2>
        <div class="step-info">${stepText}</div>
        <div class="item">${content}</div>
        ${
          current
            ? `<button id="nextBtn">Done</button>`
            : `<button id="resetBtn">Reset</button>`
        }
        <div class="small">${this._loading ? "Loading..." : ""}</div>
      </ha-card>
    `;

    if (current) {
      const btn = this.shadowRoot.getElementById("nextBtn");
      if (btn) btn.addEventListener("click", () => this.completeItem(current));
    } else {
      const reset = this.shadowRoot.getElementById("resetBtn");
      if (reset) reset.addEventListener("click", () => this.resetAllItems());
    }
  }
}

customElements.define("step-todo-card", StepTodoCard);
