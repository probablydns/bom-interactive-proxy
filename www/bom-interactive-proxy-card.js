(function () {
  "use strict";

  var DEFAULT_BASE_PATH = "/app/13fa7b7e_bom_interactive_proxy";
  var DEFAULT_PLACE = "melbourne";
  var DEFAULT_ASPECT_RATIO = "16:9";
  var CARD_TYPE = "custom:bom-interactive-proxy-card";

  function ensureCustomCardsRegistry() {
    window.customCards = window.customCards || [];
    if (!window.customCards.some(function (card) { return card.type === CARD_TYPE; })) {
      window.customCards.push({
        type: CARD_TYPE,
        name: "BOM Interactive Proxy Card",
        description: "Embeds the BOM Interactive Proxy map using a stable Home Assistant app path or direct URL."
      });
    }
  }

  function fireEvent(target, type, detail) {
    target.dispatchEvent(new CustomEvent(type, {
      detail: detail,
      bubbles: true,
      composed: true
    }));
  }

  function coerceBoolean(value) {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value;
    }

    var normalized = String(value).trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "on" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") {
      return false;
    }

    return undefined;
  }

  function normalizeText(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).trim();
  }

  function parseAspectRatio(value) {
    var input = normalizeText(value) || DEFAULT_ASPECT_RATIO;
    var match = input.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
    if (!match) {
      return "16 / 9";
    }

    var width = Number(match[1]);
    var height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return "16 / 9";
    }

    return width + " / " + height;
  }

  function normalizeBasePath(value) {
    var basePath = normalizeText(value) || DEFAULT_BASE_PATH;

    try {
      var url = new URL(basePath, window.location.origin);
      if (!url.pathname.endsWith("/") && !url.pathname.endsWith("/map") && !url.pathname.endsWith(".html")) {
        url.pathname += "/";
      }
      url.hash = "";
      return url.toString();
    } catch (_error) {
      return basePath;
    }
  }

  function setQueryBoolean(params, key, value) {
    if (value === undefined) {
      return;
    }
    params.set(key, value ? "1" : "0");
  }

  function buildCardUrl(config) {
    var baseUrl = new URL(normalizeBasePath(config.base_path), window.location.origin);
    var params = new URLSearchParams(baseUrl.search);

    var locationPath = normalizeText(config.path);
    var place = normalizeText(config.place);
    var coords = normalizeText(config.coords);
    var zoom = normalizeText(config.zoom);

    if (locationPath) {
      params.set("path", locationPath);
      params.delete("place");
      params.delete("coords");
    } else if (place) {
      params.set("place", place);
      params.delete("path");
      params.delete("coords");
    } else if (coords) {
      params.set("coords", coords);
      params.delete("path");
      params.delete("place");
    }

    if (zoom) {
      params.set("zoom", zoom);
    } else {
      params.delete("zoom");
    }

    setQueryBoolean(params, "showFrameTime", coerceBoolean(config.show_frame_time));
    setQueryBoolean(params, "showTownNames", coerceBoolean(config.show_town_names));
    setQueryBoolean(params, "interactive", coerceBoolean(config.interactive));
    setQueryBoolean(params, "animate", coerceBoolean(config.animate));
    setQueryBoolean(params, "lowPower", coerceBoolean(config.low_power));

    baseUrl.search = params.toString();
    return baseUrl.toString();
  }

  function cleanConfig(config) {
    var next = {
      type: CARD_TYPE
    };

    [
      "title",
      "base_path",
      "path",
      "place",
      "coords",
      "zoom",
      "aspect_ratio"
    ].forEach(function (key) {
      var value = normalizeText(config[key]);
      if (value) {
        next[key] = value;
      }
    });

    [
      "show_frame_time",
      "show_town_names",
      "interactive",
      "animate",
      "low_power"
    ].forEach(function (key) {
      var value = coerceBoolean(config[key]);
      if (value !== undefined) {
        next[key] = value;
      }
    });

    return next;
  }

  function getBooleanEditorValue(value) {
    if (value === true) {
      return "true";
    }
    if (value === false) {
      return "false";
    }
    return "";
  }

  class BOMInteractiveProxyCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = {};
      this._cardEl = null;
      this._frameShell = null;
      this._iframe = null;
    }

    static getConfigElement() {
      return document.createElement("bom-interactive-proxy-card-editor");
    }

    static getStubConfig() {
      return {
        type: CARD_TYPE,
        base_path: DEFAULT_BASE_PATH,
        place: DEFAULT_PLACE
      };
    }

    setConfig(config) {
      if (!config || typeof config !== "object") {
        throw new Error("Invalid card configuration");
      }

      this._config = cleanConfig(config);
      this._render();
    }

    getCardSize() {
      return 6;
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      if (!this.shadowRoot) {
        return;
      }

      var config = Object.assign({}, BOMInteractiveProxyCard.getStubConfig(), this._config || {});
      var cardTitle = normalizeText(config.title);
      var src = buildCardUrl(config);
      var aspectRatio = parseAspectRatio(config.aspect_ratio);

      if (!this._cardEl || !this._frameShell || !this._iframe) {
        this.shadowRoot.innerHTML = [
          "<style>",
          ":host{display:block;}",
          "ha-card{overflow:hidden;}",
          ".frame-shell{position:relative;width:100%;background:#0b1418;}",
          "iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#0b1418;}",
          "</style>",
          "<ha-card>",
          "<div class=\"frame-shell\">",
          "<iframe loading=\"lazy\" referrerpolicy=\"same-origin\" sandbox=\"allow-scripts allow-same-origin allow-forms\"></iframe>",
          "</div>",
          "</ha-card>"
        ].join("");

        this._cardEl = this.shadowRoot.querySelector("ha-card");
        this._frameShell = this.shadowRoot.querySelector(".frame-shell");
        this._iframe = this.shadowRoot.querySelector("iframe");
      }

      this._frameShell.style.aspectRatio = aspectRatio;

      if (cardTitle) {
        this._cardEl.setAttribute("header", cardTitle);
      } else {
        this._cardEl.removeAttribute("header");
      }

      if (this._iframe.getAttribute("src") !== src) {
        this._iframe.setAttribute("src", src);
      }
    }

  }

  class BOMInteractiveProxyCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = {};
      this._draft = {};
    }

    setConfig(config) {
      this._config = cleanConfig(config || {});
      this._draft = Object.assign({}, this._config);
      this._render();
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      if (!this.shadowRoot) {
        return;
      }

      var draft = Object.assign({ base_path: DEFAULT_BASE_PATH }, this._draft || {});

      this.shadowRoot.innerHTML = [
        "<style>",
        ":host{display:block;}",
        ".grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}",
        "label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--primary-text-color);}",
        "input,select{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);}",
        ".full{grid-column:1 / -1;}",
        ".hint{margin:0 0 12px;color:var(--secondary-text-color);font-size:12px;line-height:1.4;}",
        "</style>",
        "<p class=\"hint\">Draft values stay local while typing. The preview refreshes only after leaving a field or changing a select.</p>",
        "<div class=\"grid\">",
        this._textField("Title", "title", draft.title, "Optional card header"),
        this._textField("Base path", "base_path", draft.base_path, "Use /app/13fa7b7e_bom_interactive_proxy for a stable Home Assistant route", "full"),
        this._textField("Place", "place", draft.place, "Example: melbourne"),
        this._textField("Path", "path", draft.path, "Full BOM path overrides place/coords"),
        this._textField("Coords", "coords", draft.coords, "lat,lon"),
        this._textField("Zoom", "zoom", draft.zoom, "0..20"),
        this._textField("Aspect ratio", "aspect_ratio", draft.aspect_ratio || DEFAULT_ASPECT_RATIO, "Example: 16:9"),
        this._booleanField("Show frame time", "show_frame_time", draft.show_frame_time),
        this._booleanField("Show town names", "show_town_names", draft.show_town_names),
        this._booleanField("Interactive", "interactive", draft.interactive),
        this._booleanField("Animate", "animate", draft.animate),
        this._booleanField("Low power", "low_power", draft.low_power),
        "</div>"
      ].join("");

      this._bindEvents();
    }

    _textField(label, key, value, placeholder, className) {
      return [
        "<label" + (className ? " class=\"" + className + "\"" : "") + ">",
        "<span>", label, "</span>",
        "<input data-key=\"", key, "\" data-kind=\"text\" type=\"text\" value=\"", this._escape(normalizeText(value)), "\" placeholder=\"", this._escape(placeholder || ""), "\">",
        "</label>"
      ].join("");
    }

    _booleanField(label, key, value) {
      return [
        "<label>",
        "<span>", label, "</span>",
        "<select data-key=\"", key, "\" data-kind=\"boolean\">",
        "<option value=\"\"", getBooleanEditorValue(value) === "" ? " selected" : "", ">Default</option>",
        "<option value=\"true\"", getBooleanEditorValue(value) === "true" ? " selected" : "", ">On</option>",
        "<option value=\"false\"", getBooleanEditorValue(value) === "false" ? " selected" : "", ">Off</option>",
        "</select>",
        "</label>"
      ].join("");
    }

    _bindEvents() {
      var _this = this;

      this.shadowRoot.querySelectorAll("input[data-key]").forEach(function (input) {
        input.addEventListener("input", function (event) {
          _this._updateDraftFromControl(event.target);
        });
        input.addEventListener("blur", function (event) {
          _this._commitControl(event.target);
        });
        input.addEventListener("change", function (event) {
          _this._commitControl(event.target);
        });
      });

      this.shadowRoot.querySelectorAll("select[data-key]").forEach(function (select) {
        select.addEventListener("change", function (event) {
          _this._commitControl(event.target);
        });
      });
    }

    _updateDraftFromControl(control) {
      if (!control) {
        return;
      }

      var key = control.dataset.key;
      if (!key) {
        return;
      }

      if (control.dataset.kind === "boolean") {
        this._draft[key] = coerceBoolean(control.value);
        return;
      }

      this._draft[key] = control.value;
    }

    _commitControl(control) {
      this._updateDraftFromControl(control);
      var next = cleanConfig(this._draft);
      if (JSON.stringify(next) === JSON.stringify(this._config)) {
        return;
      }

      this._config = next;
      this._draft = Object.assign({}, next);
      fireEvent(this, "config-changed", { config: next });
    }

    _escape(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  }

  if (!customElements.get("bom-interactive-proxy-card")) {
    customElements.define("bom-interactive-proxy-card", BOMInteractiveProxyCard);
  }
  if (!customElements.get("bom-interactive-proxy-card-editor")) {
    customElements.define("bom-interactive-proxy-card-editor", BOMInteractiveProxyCardEditor);
  }

  ensureCustomCardsRegistry();
})();
