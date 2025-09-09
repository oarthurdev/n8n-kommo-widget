
window.KommoWidget = window.KommoWidget || {};
define([
  "./classes/template.js",
  "./classes/loader.js",
  "./classes/kommo.js",
  "./classes/events.js",
  "./classes/settings.js",
  "./plugins/jquery.serializejson.min.js",
], function (Templates, Loader, Kommo, Events, Settings) {
  return function () {
    let _this = this;

    _this.config = {
      // Unique code for the widget
      code: "kommo_n8n_chatbot",
      // CSS prefix for styling
      prefix: "kommo-n8n",
      templates: {
        params: {
          settings: [
            {
              id: "loader",
              path: "/loader",
            },
            {
              id: "settings.base",
              path: "/settings/base",
            },
          ],
          lcard: [
            {
              id: "widget_right_panel",
              path: "/widget_right_panel",
            },
          ],
          ccard: [
            {
              id: "widget_right_panel",
              path: "/widget_right_panel",
            },
          ],
        },
      },
      css: [
        {
          name: "kommo",
          append_id: "kommo-common-style",
        },
        {
          name: "style",
        },
      ],
      icons: {},
    };

    _this.info = {};

    /**
     * Retrieves a nested property from an object based on a dot notation string.
     */
    _this.getNested = function (obj, desc, value) {
      let arr = desc ? desc.split(".") : [];

      while (arr.length && obj) {
        let comp = arr.shift();
        let match = /(.+)\[([0-9]*)\]/.exec(comp);

        if (match !== null && match.length == 3) {
          let arrayData = {
            arrName: match[1],
            arrIndex: match[2],
          };
          if (typeof obj[arrayData.arrName] !== "undefined") {
            obj = obj[arrayData.arrName][arrayData.arrIndex];
          } else {
            obj = null;
          }
          continue;
        }
        obj = obj[comp];
      }

      if (typeof value !== "undefined") {
        if (obj === null || typeof obj === "undefined" || obj === undefined) {
          return value;
        }
      }

      return obj;
    };

    /**
     * Validates n8n chatbot settings
     */
    _this.validateSettings = function (params) {
      console.log("Validating settings:", params);
      
      if (!params || typeof params !== 'object') {
        console.log("Params is not an object:", params);
        _this.showValidationError("Parâmetros inválidos");
        return false;
      }

      // Check webhook URL
      if (!params.webhook_url || params.webhook_url.trim() === '') {
        console.log("Missing webhook URL");
        _this.showValidationError("URL do webhook é obrigatória");
        return false;
      }

      // Check OpenAI key
      if (!params.openai_key || params.openai_key.trim() === '') {
        console.log("Missing OpenAI key");
        _this.showValidationError("Chave da API OpenAI é obrigatória");
        return false;
      }

      // Check selected agent
      if (!params.selected_agent || params.selected_agent.trim() === '') {
        console.log("Missing selected agent");
        _this.showValidationError("Agente deve ser selecionado");
        return false;
      }

      // Validate webhook URL format
      if (!_this.kommo.validateWebhookUrl(params.webhook_url)) {
        console.log("Invalid webhook URL:", params.webhook_url);
        _this.showValidationError("URL do webhook inválida");
        return false;
      }

      return true;
    };

    /**
     * Show validation error message
     */
    _this.showValidationError = function (message) {
      const $messages = $("#kommo-n8n-validation-messages");
      const $error = $messages.find(".kommo-n8n__validation-error");
      
      $error.text(message);
      $messages.show();
      
      setTimeout(function() {
        $messages.fadeOut(300);
      }, 5000);
    };

    _this.callbacks = {
      /**
       * Digital pipeline settings callback
       */
      dpSettings: function () {},

      /**
       * Common callback called after render callback
       */
      bind_actions: function () {
        return true;
      },

      /**
       * Render callback
       */
      render: function () {
        _this.config.icons = {
          path: _this.params.path + "/images",
        };

        _this.debug = console;
        _this.kommo = new Kommo(_this);
        _this.templates = new Templates(_this);
        _this.loader = new Loader(_this);
        _this.events = new Events(_this);
        _this.settings = new Settings(_this);

        return APP.widgets.system.area === "settings" ||
          APP.widgets.system.area === "advanced-settings"
          ? true
          : _this.templates.preload().then(() => {
              let areas = ["ccard", "lcard"];
              if ($.inArray(APP.widgets.system.area, areas) >= 0) {
                _this.settings.load().then(function () {
                  _this.events.card();
                });
              }
              return true;
            });
      },

      /**
       * Settings callback for widget configuration
       */
      settings: function () {
        let prefix = _this.config.prefix;
        let status = (_this.params || {}).status || "";
        let activeStatuses = ["not_configured", "installed"];
        let isActive = status.length > 0 && $.inArray(status, activeStatuses) >= 0;
        let modalBlock = $(".modal." + _this.params.widget_code);
        let wrapDiv = modalBlock.find(".widget_settings_block");

        _this.templates.preload().then(function () {
          if (isActive) {
            wrapDiv.find(".widget_settings_block__controls").hide();
            wrapDiv.find(".widget_settings_block__descr").hide();
            _this.loader.prepend(wrapDiv);

            _this.settings.load(modalBlock).then(function () {
              return _this.kommo.getUsers();
            }).then(function (users) {
              _this.info.params = _this.info.params || {};

              wrapDiv.prepend(
                _this.templates.render("settings.base", {
                  prefix: prefix,
                  langs: _this.i18n("settings"),
                  icons: _this.config.icons,
                  version: _this.params.version,
                  active: true,

                  webhook: _this.templates.twig.input({
                    block: "webhook",
                    code: "url",
                    id: "kommo-n8n-webhook-url",
                    name: "params[webhook_url]",
                    placeholder: _this.i18n("settings.webhook.placeholder"),
                    value: _this.getNested(_this.info.params, "webhook_url", ""),
                  }),

                  openai_key: _this.templates.twig.input({
                    block: "openai",
                    code: "key",
                    id: "kommo-n8n-openai-key",
                    name: "params[openai_key]",
                    type: "password",
                    placeholder: _this.i18n("settings.openai_key.placeholder"),
                    value: _this.getNested(_this.info.params, "openai_key", ""),
                  }),

                  agents_select: _this.templates.twig.select({
                    block: "agents",
                    code: "select",
                    id: "kommo-n8n-agents-select",
                    name: "params[selected_agent]",
                    items: _this.getNested(_this.info.params, "available_agents", []),
                    selected: _this.getNested(_this.info.params, "selected_agent",
                              _this.getNested(_this.info.params, "agents.select", "")),
                    placeholder: _this.i18n("settings.agents.placeholder"),
                  }),

                  load_agents_button: _this.templates.twig.button({
                    block: "load",
                    code: "agents",
                    id: "kommo-n8n-load-agents",
                    text: _this.i18n("settings.agents.load_button"),
                    value: 1,
                  }),

                  generate_template_button: _this.templates.twig.button({
                    block: "generate",
                    code: "template",
                    id: "kommo-n8n-generate-template",
                    text: _this.i18n("settings.template_generation.button"),
                    value: 1,
                  }),
                })
              );

              $("#kommo-settings").fadeIn(300);
              _this.loader.displaySaveBtn(_this.params.widget_code);
              
              // Register event handlers after template is rendered
              _this.events.settings();

              return _this.loader.hide();
            }).catch(function (ex) {
              _this.debug.log(ex);
              isActive = false;
            });
          }

          if (!isActive) {
            return _this.templates.installPlaceholder(wrapDiv);
          }
        });

        return true;
      },

      /**
       * Widget initialization for card views
       */
      init: function () {
        if (APP.widgets.system.area === "lcard" || APP.widgets.system.area === "ccard") {
          const config = _this.info.params || {};
          const isConfigured = config.webhook_url && config.agent_id;
          const entityType = APP.widgets.system.area === "lcard" ? "leads" : "contacts";

          _this.templates.preload().then(() => {
            _this.render_template({
              caption: {
                class_name: "kommo-n8n__right_panel__container",
              },
              body: "",
              render: _this.templates.render("widget_right_panel", {
                langs: _this.i18n("settings.widget_panel"),
                status_class: isConfigured ? "active" : "inactive",
                status_text: isConfigured 
                  ? _this.i18n("settings.widget_panel.status_active")
                  : _this.i18n("settings.widget_panel.status_inactive"),
                can_trigger: isConfigured,
                trigger_button: isConfigured 
                  ? _this.templates.twig.button({
                      block: "button",
                      code: "trigger",
                      id: "kommo-n8n-button-trigger",
                      class_name: "kommo-n8n__button-trigger",
                      text: _this.i18n("settings.widget_panel.trigger_chat"),
                      value: 1,
                    })
                  : "",
                last_interaction: null, // Could be populated from stored data
              }),
            });
          }).then(() => {
            _this.events.init();
          });
        }

        return true;
      },

      /**
       * Save settings callback
       */
      onSave: function (evt) {
        return _this.settings.save(evt);
      },

      /**
       * Destroy callback
       */
      destroy: function () {},

      /**
       * Contacts callback
       */
      contacts: {
        selected: function () {},
      },

      /**
       * Leads callback
       */
      leads: {
        selected: function () {},
      },
    };

    return this;
  };
});
