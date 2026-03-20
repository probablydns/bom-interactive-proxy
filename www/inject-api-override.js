(function () {
  "use strict";

  var API_HOST_RE = /https:\/\/api(?:\.test2)?\.bom\.gov\.au/g;
  var API_HOST_MATCH = /api(?:\.test2)?\.bom\.gov\.au/;
  var THIRD_PARTY_BLOCK = /googletagmanager\.com|google-analytics\.com|google\.com\/recaptcha|gstatic\.com\/recaptcha/i;
  var LOCAL_RUM_BLOCK = /\/modules\/custom\/bom_rum\/js\/elastic-apm-rum\.umd\.min\.js/i;
  var APM_HOST_MATCH = /(^|\.)apm\.analytics\.bom\.gov\.au$/i;
  var INGRESS_SERVICE_PATH_RE = /^\/(?:api|apikey|blocked-external|v1|mapping|timeseries|overlays|basemaps|locations|places|services|forecasts|weather)\b/i;
  var LOCAL_ASSET_PATH_RE = /^\/(?:themes|sites|core|misc|profiles|modules|libraries|files)\b/i;

  function createApmStub() {
    return {
      init: function () {
        return {
          observe: function () {},
          captureError: function () {},
          setUserContext: function () {},
          addFilter: function () {},
          removeFilter: function () {},
          setInitialPageLoadName: function () {},
          startTransaction: function () {
            return {
              end: function () {}
            };
          },
          apmServer: {},
          serviceFactory: {}
        };
      }
    };
  }

  function getAppBasePath() {
    var explicitIngressBase = window.BOM_PROXY_INGRESS_BASE;
    if (typeof explicitIngressBase === "string" && explicitIngressBase) {
      return explicitIngressBase.endsWith("/") ? explicitIngressBase : explicitIngressBase + "/";
    }

    var path = String(window.location.pathname || "");
    var ingressMatch = path.match(/^\/api\/hassio_ingress\/[^/]+/);
    if (ingressMatch && ingressMatch[0]) {
      return ingressMatch[0] + "/";
    }

    var marker = "/location/";
    var locationIndex = path.indexOf(marker);
    if (locationIndex >= 0) {
      return path.slice(0, locationIndex + 1) || "/";
    }

    if (path.endsWith("/map") || path.endsWith("/index.html")) {
      return path.replace(/(?:\/map|\/index\.html)$/, "/") || "/";
    }

    return path.endsWith("/") ? path : path.replace(/[^/]*$/, "");
  }

  function buildAppUrl(relativePath) {
    var normalizedPath = String(relativePath || "").replace(/^\/+/, "");
    return new URL(normalizedPath, window.location.origin + getAppBasePath()).toString();
  }

  function buildAppPath(relativePath) {
    var built = buildAppUrl(relativePath);
    try {
      var parsed = new URL(built, window.location.origin);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (_error) {
      return built;
    }
  }

  function getEsriAssetBaseUrl() {
    return buildAppPath("themes/custom/bom_theme/bom-react/dist/assets");
  }

  function getEsriWorkerUrl() {
    return buildAppPath("themes/custom/bom_theme/bom-react/dist/assets/esri/core/workers/RemoteClient.js");
  }

  function rewriteLocalAssetUrl(url) {
    var src = String(url || "");
    var appBasePath = getAppBasePath();
    if (!src) {
      return src;
    }

    if (src.indexOf("//") === 0) {
      return window.location.protocol + src;
    }

    if (src.charAt(0) === "/") {
      if (appBasePath !== "/" && src.indexOf(appBasePath) === 0) {
        return src;
      }
      return buildAppUrl(src);
    }

    try {
      var parsed = new URL(src, window.location.href);
      if (parsed.origin === window.location.origin && parsed.pathname.charAt(0) === "/") {
        if (appBasePath !== "/" && parsed.pathname.indexOf(appBasePath) === 0) {
          return src;
        }
        return buildAppUrl(parsed.pathname.replace(/^\/+/, "") + parsed.search + parsed.hash);
      }
    } catch (_error) {
      // leave non-URL values untouched
    }

    return src;
  }

  function shouldRewriteIngressPath(pathname) {
    var text = String(pathname || "");
    return INGRESS_SERVICE_PATH_RE.test(text) || LOCAL_ASSET_PATH_RE.test(text);
  }

  function normalizeDuplicatedIngressApiUrl(parsed) {
    if (!parsed || parsed.origin !== window.location.origin) {
      return "";
    }

    var appBasePath = getAppBasePath();
    if (!appBasePath || appBasePath === "/") {
      return "";
    }

    var appBaseNoSlash = appBasePath.endsWith("/") ? appBasePath.slice(0, -1) : appBasePath;
    var duplicatedPrefix = appBaseNoSlash + "/apikey/v1/mapping" + appBaseNoSlash + "/";

    if (parsed.pathname.indexOf(duplicatedPrefix) !== 0) {
      return "";
    }

    return buildAppUrl(parsed.pathname.slice(duplicatedPrefix.length) + parsed.search + parsed.hash);
  }

  var BLOCKED_SCRIPT_URL = buildAppUrl("blocked-external/script");
  var BLOCKED_INTERACTION_JSON_URL = buildAppUrl("blocked-external/interaction.json");

  function parseFlexibleBoolean(value) {
    if (value === null || value === undefined) {
      return false;
    }

    var normalized = String(value).trim().toLowerCase();
    return !(normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no");
  }

  function readTownLabelFlagFromCookie() {
    try {
      var match = document.cookie.match(/(?:^|;\s*)bom_show_town_names=([^;]+)/);
      if (!match || !match[1]) {
        return null;
      }
      return parseFlexibleBoolean(decodeURIComponent(match[1]));
    } catch (_error) {
      return null;
    }
  }

  function readTownLabelFlagFromParams(params) {
    if (!params || typeof params.has !== "function") {
      return null;
    }

    if (params.has("showTownNames")) {
      return parseFlexibleBoolean(params.get("showTownNames"));
    }

    return null;
  }

  function readTownLabelFlagFromUrl(url) {
    if (!url) {
      return null;
    }

    try {
      var parsed = new URL(url, window.location.origin);
      return readTownLabelFlagFromParams(parsed.searchParams);
    } catch (_error) {
      return null;
    }
  }

  function readTownLabelFlagFromStorage() {
    var storageKeys = [
      "bomKeepTownLabels",
      "showTownNames"
    ];

    for (var i = 0; i < storageKeys.length; i += 1) {
      var key = storageKeys[i];
      try {
        var value = window.localStorage && window.localStorage.getItem(key);
        if (value !== null && value !== undefined && value !== "") {
          return parseFlexibleBoolean(value);
        }
      } catch (_error) {
        // ignore localStorage failures
      }

      try {
        var sessionValue = window.sessionStorage && window.sessionStorage.getItem(key);
        if (sessionValue !== null && sessionValue !== undefined && sessionValue !== "") {
          return parseFlexibleBoolean(sessionValue);
        }
      } catch (_error2) {
        // ignore sessionStorage failures
      }
    }

    return null;
  }

  function shouldKeepTownLabels() {
    var fromCurrentUrl = readTownLabelFlagFromUrl(window.location.href);
    if (fromCurrentUrl !== null) {
      return fromCurrentUrl;
    }

    var fromReferrer = readTownLabelFlagFromUrl(document.referrer);
    if (fromReferrer !== null) {
      return fromReferrer;
    }

    var fromCookie = readTownLabelFlagFromCookie();
    if (fromCookie !== null) {
      return fromCookie;
    }

    var fromStorage = readTownLabelFlagFromStorage();
    if (fromStorage !== null) {
      return fromStorage;
    }

    return false;
  }

  var KEEP_TOWN_LABELS = shouldKeepTownLabels();
  var TOWN_OVERLAY_ID = "overlay_3187";
  var TOWN_FORCE_LAYER_ID = "bom-town-labels-override";
  var esriFeatureLayerCtor = null;
  var mapPrototypePatched = false;
  var wrappedMapViewCtor = null;
  var wrappedSceneViewCtor = null;

  function wrapViewCtor(ViewCtor, globalKey) {
    if (!ViewCtor || typeof ViewCtor !== "function") {
      return ViewCtor;
    }

    if (ViewCtor.__bomWrappedViewCtor) {
      return ViewCtor;
    }

    try {
      var WrappedView = class extends ViewCtor {
        constructor() {
          super(...arguments);
          try {
            window[globalKey] = this;
          } catch (_error) {
            // ignore
          }

          try {
            if (this && this.map) {
              attachTownLayerToMap(this.map);
            }
          } catch (_error2) {
            // ignore
          }
        }
      };

      for (var key in ViewCtor) {
        if (Object.prototype.hasOwnProperty.call(ViewCtor, key)) {
          WrappedView[key] = ViewCtor[key];
        }
      }
      WrappedView.__bomWrappedViewCtor = true;
      WrappedView.__bomOriginalViewCtor = ViewCtor;
      return WrappedView;
    } catch (_error3) {
      return ViewCtor;
    }
  }

  function normalizeTownOverlayEntry(entry) {
    var out = entry && typeof entry === "object" ? entry : {};

    out.id = TOWN_OVERLAY_ID;
    if (!out.name) {
      out.name = "Towns and cities";
    }
    if (!out.weight) {
      out.weight = 9;
    }

    var endpoints = Array.isArray(out.endpoints) ? out.endpoints : [];
    var hasTownEndpoint = false;
    for (var i = 0; i < endpoints.length; i += 1) {
      var endpoint = endpoints[i];
      var endpointUrl = endpoint && typeof endpoint.url === "string" ? endpoint.url.toLowerCase() : "";
      if (endpointUrl.indexOf("/overlays/towns_and_cities/") !== -1) {
        hasTownEndpoint = true;
      }
    }
    if (!hasTownEndpoint) {
      endpoints.push({
        url: "/overlays/towns_and_cities/FeatureServer",
        layerType: "Feature"
      });
    }
    out.endpoints = endpoints;

    out.isLayerVisible = true;
    out.isCategoryVisible = true;
    out.visible = true;
    out.enabled = true;
    out.defaultVisibility = true;

    return out;
  }

  function ensureTownOverlayConfig(node) {
    if (!KEEP_TOWN_LABELS || !node || typeof node !== "object" || Array.isArray(node)) {
      return;
    }

    if (Array.isArray(node.activeOverlays)) {
      var index = -1;
      for (var i = 0; i < node.activeOverlays.length; i += 1) {
        var candidateId = node.activeOverlays[i] && node.activeOverlays[i].id
          ? String(node.activeOverlays[i].id).toLowerCase()
          : "";
        if (candidateId === TOWN_OVERLAY_ID) {
          index = i;
          break;
        }
      }

      if (index >= 0) {
        node.activeOverlays[index] = normalizeTownOverlayEntry(node.activeOverlays[index]);
      } else {
        node.activeOverlays.push(normalizeTownOverlayEntry({}));
      }

      if (Object.prototype.hasOwnProperty.call(node, "hideMapLayers")) {
        node.hideMapLayers = false;
      }
    }

    var nodeId = node.id && typeof node.id === "string" ? node.id.toLowerCase() : "";
    if (nodeId === TOWN_OVERLAY_ID) {
      normalizeTownOverlayEntry(node);
    }
  }

  function isMapLikeObject(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      typeof value.add === "function" &&
      value.layers
    );
  }

  function attachTownLayerToMap(mapInstance) {
    if (!KEEP_TOWN_LABELS || !esriFeatureLayerCtor || !isMapLikeObject(mapInstance)) {
      return false;
    }

    try {
      if (typeof mapInstance.findLayerById === "function" && mapInstance.findLayerById(TOWN_FORCE_LAYER_ID)) {
        return true;
      }

      var townLayer = new esriFeatureLayerCtor({
        id: TOWN_FORCE_LAYER_ID,
        title: "Towns and cities",
        url: "/overlays/towns_and_cities/FeatureServer/3",
        outFields: ["NAME", "MIN_ZOOM_LVL"],
        popupEnabled: false,
        listMode: "hide",
        labelsVisible: true,
        minScale: 0,
        maxScale: 0,
        renderer: {
          type: "simple",
          symbol: {
            type: "simple-marker",
            style: "circle",
            size: 1,
            color: [0, 0, 0, 0],
            outline: {
              color: [0, 0, 0, 0],
              width: 0
            }
          }
        },
        labelingInfo: [{
          labelPlacement: "above-center",
          deconflictionStrategy: "static",
          labelExpressionInfo: {
            expression: "$feature.NAME"
          },
          symbol: {
            type: "text",
            color: [255, 255, 255, 1],
            haloColor: [0, 0, 0, 1],
            haloSize: 1.5,
            font: {
              family: "Arial",
              size: 11,
              weight: "bold"
            }
          }
        }]
      });

      mapInstance.add(townLayer);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function patchMapPrototype(MapCtor) {
    if (!MapCtor || !MapCtor.prototype || mapPrototypePatched) {
      return;
    }

    mapPrototypePatched = true;

    var nativeAdd = MapCtor.prototype.add;
    if (typeof nativeAdd === "function") {
      MapCtor.prototype.add = function () {
        var result = nativeAdd.apply(this, arguments);
        attachTownLayerToMap(this);
        return result;
      };
    }

    var nativeAddMany = MapCtor.prototype.addMany;
    if (typeof nativeAddMany === "function") {
      MapCtor.prototype.addMany = function () {
        var result = nativeAddMany.apply(this, arguments);
        attachTownLayerToMap(this);
        return result;
      };
    }
  }

  function maybeCaptureEsriModules(deps, modules) {
    if (!KEEP_TOWN_LABELS || !Array.isArray(deps) || !Array.isArray(modules)) {
      return modules;
    }

    var patchedModules = modules.slice();

    for (var i = 0; i < deps.length; i += 1) {
      var dep = String(deps[i] || "");
      var mod = patchedModules[i];
      if (dep === "esri/layers/FeatureLayer" && mod) {
        esriFeatureLayerCtor = mod;
      }
      if ((dep === "esri/Map" || dep === "esri/WebMap") && mod) {
        patchMapPrototype(mod);
      }
      if (dep === "esri/views/MapView" && mod) {
        wrappedMapViewCtor = wrapViewCtor(mod, "__bomMapView");
        patchedModules[i] = wrappedMapViewCtor;
      }
      if (dep === "esri/views/SceneView" && mod) {
        wrappedSceneViewCtor = wrapViewCtor(mod, "__bomSceneView");
        patchedModules[i] = wrappedSceneViewCtor;
      }
    }

    return patchedModules;
  }

  function patchArcGISRequire() {
    if (!KEEP_TOWN_LABELS || typeof window.require !== "function" || window.require.__bomTownPatched) {
      return;
    }

    var nativeRequire = window.require;
    var patchedRequire = function (deps, onLoad, onError) {
      if (!Array.isArray(deps)) {
        return nativeRequire.apply(this, arguments);
      }

      var wrappedOnLoad = function () {
        var modules = Array.prototype.slice.call(arguments);
        var patchedModules = maybeCaptureEsriModules(deps, modules);
        if (typeof onLoad === "function") {
          return onLoad.apply(this, patchedModules);
        }
        return undefined;
      };

      return nativeRequire.call(this, deps, wrappedOnLoad, onError);
    };

    for (var key in nativeRequire) {
      if (Object.prototype.hasOwnProperty.call(nativeRequire, key)) {
        patchedRequire[key] = nativeRequire[key];
      }
    }
    patchedRequire.__bomTownPatched = true;
    window.require = patchedRequire;

    try {
      patchedRequire(["esri/layers/FeatureLayer", "esri/Map", "esri/views/MapView", "esri/views/SceneView"], function (FeatureLayer, EsriMap, MapView, SceneView) {
        if (FeatureLayer) {
          esriFeatureLayerCtor = FeatureLayer;
        }
        if (EsriMap) {
          patchMapPrototype(EsriMap);
        }
        if (MapView && typeof MapView === "function") {
          wrappedMapViewCtor = MapView;
        }
        if (SceneView && typeof SceneView === "function") {
          wrappedSceneViewCtor = SceneView;
        }
      });
    } catch (_error) {
      // ignore
    }
  }

  function startTownLayerAttachLoop() {
    if (!KEEP_TOWN_LABELS) {
      return;
    }

    var attempts = 0;
    var maxAttempts = 120;
    var timer = window.setInterval(function () {
      attempts += 1;

      if (!mapPrototypePatched) {
        patchArcGISRequire();
      }

      try {
        var windowKeys = Object.keys(window);
        for (var i = 0; i < windowKeys.length; i += 1) {
          var value = window[windowKeys[i]];
          if (isMapLikeObject(value)) {
            attachTownLayerToMap(value);
          }
        }
      } catch (_error) {
        // ignore
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 1000);
  }

  function shouldDropNode(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return false;
    }

    var id = typeof node.id === "string" ? node.id.toLowerCase() : "";
    var name = typeof node.name === "string" ? node.name.toLowerCase() : "";

    // Do not remove town/city overlay definitions from settings.
    // Visibility is controlled via proxy data endpoints and explicit overlay enablement.
    void id;
    void name;
    void KEEP_TOWN_LABELS;

    return false;
  }

  function rewriteApiUrl(url) {
    var text = String(url || "");
    var appBasePath = getAppBasePath();
    var parsed;

    if (!text) {
      return text;
    }

    if (API_HOST_MATCH.test(text)) {
      text = text.replace(API_HOST_RE, window.location.origin);
    }

    parsed = parseUrlLike(text);
    if (!parsed) {
      return text;
    }

    if (parsed.origin === window.location.origin) {
      var normalizedDuplicatedIngressUrl = normalizeDuplicatedIngressApiUrl(parsed);
      if (normalizedDuplicatedIngressUrl) {
        return normalizedDuplicatedIngressUrl;
      }

      if (appBasePath !== "/" && parsed.pathname.indexOf(appBasePath) === 0) {
        return text;
      }

      if (shouldRewriteIngressPath(parsed.pathname)) {
        return buildAppUrl(parsed.pathname.replace(/^\/+/, "") + parsed.search + parsed.hash);
      }
    }

    return text;
  }

  function parseUrlLike(url) {
    if (!url) {
      return null;
    }

    try {
      return new URL(String(url), window.location.origin);
    } catch (_error) {
      return null;
    }
  }

  function classifyBlockedInteractionUrl(url) {
    var parsed = parseUrlLike(url);
    if (!parsed) {
      return null;
    }

    var pathname = String(parsed.pathname || "").toLowerCase();
    var hostname = String(parsed.hostname || "").toLowerCase();

    if (pathname.indexOf("/blocked-external/apm/") === 0 || APM_HOST_MATCH.test(hostname)) {
      return { kind: "apm" };
    }

    if (pathname === "/apikey/v1/locations/places/search") {
      var filter = String(parsed.searchParams.get("filter") || "").toLowerCase();
      if (filter.indexOf("nearby_type:bom_stn") !== -1) {
        return { kind: "places_search_station" };
      }
    }

    if (pathname.indexOf("/apikey/v1/observations/recent/") === 0) {
      return { kind: "observations_recent" };
    }

    return null;
  }

  function buildBlockedInteractionPayload(kind) {
    if (kind === "places_search_station") {
      return {
        blocked: true,
        place: null,
        places: [],
        candidates: [],
        results: []
      };
    }

    if (kind === "observations_recent") {
      return {
        blocked: true,
        observations: [],
        data: [],
        series: []
      };
    }

    return {
      blocked: true
    };
  }

  function buildBlockedInteractionResponse(kind) {
    if (kind === "apm") {
      return new Response("", {
        status: 202,
        headers: {
          "Cache-Control": "no-store"
        }
      });
    }

    var payload = JSON.stringify(buildBlockedInteractionPayload(kind));
    return new Response(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  }

  function pruneSettings(node) {
    if (typeof node === "string") {
      var rewrittenApiUrl = rewriteApiUrl(node);
      if (rewrittenApiUrl !== node) {
        return rewrittenApiUrl;
      }

      var rewrittenAssetUrl = rewriteLocalAssetUrl(node);
      if (rewrittenAssetUrl !== node) {
        return rewrittenAssetUrl;
      }
    }

    if (Array.isArray(node)) {
      var outArray = [];
      for (var i = 0; i < node.length; i += 1) {
        var child = pruneSettings(node[i]);
        if (child !== null) {
          outArray.push(child);
        }
      }
      return outArray;
    }

    if (node && typeof node === "object") {
      ensureTownOverlayConfig(node);

      if (shouldDropNode(node)) {
        return null;
      }

      var outObject = {};
      for (var key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) {
          continue;
        }
        var value = pruneSettings(node[key]);
        if (value !== null) {
          outObject[key] = value;
        }
      }
      return outObject;
    }

    return node;
  }

  function applyDrupalSettingsOverrides(settings) {
    var next = settings && typeof settings === "object" ? settings : {};

    if (next.gtm) {
      next.gtm.tagId = null;
      next.gtm.tagIds = [];
      next.gtm.settings = next.gtm.settings || {};
      next.gtm.settings.include_classes = false;
    }

    if (next.gtag) {
      next.gtag.tagId = "";
      next.gtag.otherIds = [];
      next.gtag.events = [];
    }

    if (next.bomRum) {
      window.elasticApm = window.elasticApm || createApmStub();
      next.bomRum.apmUrl = buildAppUrl("blocked-external/apm");
      next.bomRum.active = false;
      next.bomRum.enabled = false;
      next.bomRum.transactionSampleRate = 0;
      next.bomRum.eventsLimit = 0;
    }

    if (
      next.bomStrings &&
      next.bomStrings.apis &&
      typeof next.bomStrings.apis === "object" &&
      typeof next.bomStrings.apis.content_api === "string" &&
      next.bomStrings.apis.content_api.indexOf("/api/v1") === 0
    ) {
      next.bomStrings.apis.content_api = buildAppPath("api/v1");
    }

    return next;
  }

  function syncDrupalSettingsFromElement(settingsElement) {
    if (!settingsElement || settingsElement.type !== "application/json" || !settingsElement.textContent) {
      return false;
    }

    try {
      var parsed = JSON.parse(settingsElement.textContent);
      var patched = applyDrupalSettingsOverrides(parsed);
      window.drupalSettings = patched;
      settingsElement.textContent = JSON.stringify(patched);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function bootstrapDrupalSettings() {
    try {
      var selector =
        "head > script[data-drupal-selector=drupal-settings-json], body > script[data-drupal-selector=drupal-settings-json]";
      var settingsElement = document.querySelector(selector);

      if (syncDrupalSettingsFromElement(settingsElement)) {
        return;
      }

      window.drupalSettings = applyDrupalSettingsOverrides(window.drupalSettings || {});

      var observer = new MutationObserver(function () {
        var lateSettingsElement = document.querySelector(selector);
        if (!lateSettingsElement) {
          return;
        }

        if (syncDrupalSettingsFromElement(lateSettingsElement)) {
          observer.disconnect();
        }
      });

      observer.observe(document.documentElement || document, {
        childList: true,
        subtree: true
      });
    } catch (_error2) {
      window.drupalSettings = applyDrupalSettingsOverrides(window.drupalSettings || {});
    }
  }

  function patchFetch() {
    if (!window.fetch) {
      return;
    }

    var nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      var requestUrl = "";
      if (typeof input === "string") {
        requestUrl = input;
      } else if (input && typeof input.url === "string") {
        requestUrl = input.url;
      }

      var blockedDescriptor = classifyBlockedInteractionUrl(requestUrl);
      if (blockedDescriptor) {
        return Promise.resolve(buildBlockedInteractionResponse(blockedDescriptor.kind));
      }

      if (typeof input === "string") {
        return nativeFetch(rewriteApiUrl(input), init);
      }

      if (input && typeof input.url === "string") {
        var rewritten = rewriteApiUrl(input.url);
        if (rewritten !== input.url) {
          return nativeFetch(new Request(rewritten, input), init);
        }
      }

      return nativeFetch(input, init);
    };
  }

  function patchXHR() {
    if (!window.XMLHttpRequest || !window.XMLHttpRequest.prototype) {
      return;
    }

    var nativeOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
      if (typeof url === "string") {
        var blockedDescriptor = classifyBlockedInteractionUrl(url);
        if (blockedDescriptor) {
          var blockedKind = encodeURIComponent(blockedDescriptor.kind);
          url = BLOCKED_INTERACTION_JSON_URL + "?kind=" + blockedKind;
        } else {
          url = rewriteApiUrl(url);
        }
      }
      return nativeOpen.call(this, method, url, async, user, password);
    };
  }

  function patchSendBeacon() {
    if (!navigator || typeof navigator.sendBeacon !== "function") {
      return;
    }

    var nativeSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      if (classifyBlockedInteractionUrl(url)) {
        return true;
      }
      return nativeSendBeacon(url, data);
    };
  }

  function patchScriptInjection() {
    try {
      var descriptor = Object.getOwnPropertyDescriptor(window.HTMLScriptElement.prototype, "src");
      if (descriptor && typeof descriptor.set === "function") {
        Object.defineProperty(window.HTMLScriptElement.prototype, "src", {
          configurable: true,
          enumerable: descriptor.enumerable,
          get: descriptor.get,
          set: function (value) {
            var src = rewriteLocalAssetUrl(value);
            if (THIRD_PARTY_BLOCK.test(src) || LOCAL_RUM_BLOCK.test(src)) {
              return descriptor.set.call(this, BLOCKED_SCRIPT_URL);
            }
            return descriptor.set.call(this, src);
          }
        });
      }
    } catch (_error) {
      // no-op
    }

    try {
      var linkDescriptor = Object.getOwnPropertyDescriptor(window.HTMLLinkElement.prototype, "href");
      if (linkDescriptor && typeof linkDescriptor.set === "function") {
        Object.defineProperty(window.HTMLLinkElement.prototype, "href", {
          configurable: true,
          enumerable: linkDescriptor.enumerable,
          get: linkDescriptor.get,
          set: function (value) {
            return linkDescriptor.set.call(this, rewriteLocalAssetUrl(value));
          }
        });
      }
    } catch (_error2) {
      // no-op
    }

    try {
      var imageDescriptor = Object.getOwnPropertyDescriptor(window.HTMLImageElement.prototype, "src");
      if (imageDescriptor && typeof imageDescriptor.set === "function") {
        Object.defineProperty(window.HTMLImageElement.prototype, "src", {
          configurable: true,
          enumerable: imageDescriptor.enumerable,
          get: imageDescriptor.get,
          set: function (value) {
            var src = rewriteApiUrl(value);
            if (src === value) {
              src = rewriteLocalAssetUrl(value);
            }
            return imageDescriptor.set.call(this, src);
          }
        });
      }
    } catch (_error3) {
      // no-op
    }

    var nativeSetAttribute = window.Element.prototype.setAttribute;
    window.Element.prototype.setAttribute = function (name, value) {
      var lowerName = String(name || "").toLowerCase();
      if (this && this.tagName === "SCRIPT" && lowerName === "src") {
        var srcValue = rewriteLocalAssetUrl(value);
        if (THIRD_PARTY_BLOCK.test(srcValue) || LOCAL_RUM_BLOCK.test(srcValue)) {
          return nativeSetAttribute.call(this, name, BLOCKED_SCRIPT_URL);
        }
        return nativeSetAttribute.call(this, name, srcValue);
      }
      if (this && this.tagName === "LINK" && lowerName === "href") {
        return nativeSetAttribute.call(this, name, rewriteLocalAssetUrl(value));
      }
      if (this && this.tagName === "IMG" && lowerName === "src") {
        var imageSrcValue = rewriteApiUrl(value);
        if (imageSrcValue === value) {
          imageSrcValue = rewriteLocalAssetUrl(value);
        }
        return nativeSetAttribute.call(this, name, imageSrcValue);
      }
      return nativeSetAttribute.call(this, name, value);
    };

    var nativeAppendChild = window.Node.prototype.appendChild;
    window.Node.prototype.appendChild = function (child) {
      try {
        if (child && child.tagName === "SCRIPT") {
          var childSrc = String((child.getAttribute && child.getAttribute("src")) || child.src || "");
          if (THIRD_PARTY_BLOCK.test(childSrc) || LOCAL_RUM_BLOCK.test(childSrc)) {
            child.setAttribute("src", BLOCKED_SCRIPT_URL);
          } else if (childSrc) {
            child.setAttribute("src", rewriteLocalAssetUrl(childSrc));
          }
        }
        if (child && child.tagName === "LINK") {
          var childHref = String((child.getAttribute && child.getAttribute("href")) || child.href || "");
          if (childHref) {
            child.setAttribute("href", rewriteLocalAssetUrl(childHref));
          }
        }
        if (child && child.tagName === "IMG") {
          var childImageSrc = String((child.getAttribute && child.getAttribute("src")) || child.src || "");
          if (childImageSrc) {
            child.setAttribute("src", rewriteLocalAssetUrl(rewriteApiUrl(childImageSrc)));
          }
        }
      } catch (_error) {
        // no-op
      }
      return nativeAppendChild.call(this, child);
    };
  }

  function patchKnownGlobals() {
    setTimeout(function () {
      var vars = ["BOM_API", "API_BASE", "apiBase", "apiUrl", "baseUrl", "endpoint", "apiHost", "api_host"];
      for (var i = 0; i < vars.length; i += 1) {
        var key = vars[i];
        if (typeof window[key] === "string") {
          window[key] = rewriteApiUrl(window[key]);
        }
      }
    }, 50);
  }

  function patchEsriConfigObject(config) {
    var next = config && typeof config === "object" ? config : {};
    var workers = next.workers && typeof next.workers === "object" ? next.workers : {};

    if (typeof next.assetsPath === "string" && next.assetsPath) {
      next.assetsPath = rewriteLocalAssetUrl(next.assetsPath);
    } else {
      next.assetsPath = getEsriAssetBaseUrl();
    }

    if (typeof workers.loaderUrl === "string" && workers.loaderUrl) {
      workers.loaderUrl = rewriteLocalAssetUrl(workers.loaderUrl);
    }

    if (typeof workers.workerPath === "string" && workers.workerPath) {
      workers.workerPath = rewriteLocalAssetUrl(workers.workerPath);
    } else {
      workers.workerPath = getEsriWorkerUrl();
    }

    next.workers = workers;
    return next;
  }

  function installEsriConfigPatch() {
    var currentConfig = patchEsriConfigObject(window.esriConfig || {});

    try {
      Object.defineProperty(window, "esriConfig", {
        configurable: true,
        enumerable: true,
        get: function () {
          return currentConfig;
        },
        set: function (value) {
          currentConfig = patchEsriConfigObject(value);
        }
      });
      window.esriConfig = currentConfig;
    } catch (_error) {
      try {
        window.esriConfig = currentConfig;
      } catch (_error2) {
        // no-op
      }
    }

    window.setTimeout(function () {
      try {
        window.esriConfig = patchEsriConfigObject(window.esriConfig || currentConfig);
      } catch (_error3) {
        // no-op
      }
    }, 0);
  }

  bootstrapDrupalSettings();
  installEsriConfigPatch();
  patchFetch();
  patchXHR();
  patchSendBeacon();
  patchScriptInjection();
  patchKnownGlobals();
  patchArcGISRequire();
  startTownLayerAttachLoop();
})();
