define(["moment", "lib/components/base/modal"], function (Moment, Modal) {
  return class Events {
    constructor(widget) {
      this.widget = widget;
    }

    settings() {
      let _this = this;

      // Load agents button handler
      $(document).on("click", "#kommo-n8n-load-agents", function(e) {
        e.preventDefault();
        console.log("Load agents button clicked");

        const apiKey = $("#kommo-n8n-openai-key").val().trim();
        console.log("API Key length:", apiKey ? apiKey.length : 0);

        if (!apiKey) {
          alert("Por favor, insira sua chave API OpenAI primeiro");
          return;
        }

        // Show loading state
        const $button = $(this);
        $button.prop("disabled", true).text("Carregando...");

        console.log("Starting to load OpenAI agents...");

        _this.widget.kommo.loadOpenAIAgents(apiKey)
          .then(function(agents) {
            console.log("Agents loaded successfully:", agents);

            // Update agents select dropdown
            const $select = $("#kommo-n8n-agents-select");
            console.log("Select element found:", $select.length > 0);
            console.log("Select element visible:", $select.is(':visible'));
            
            if ($select.length === 0) {
              console.error("Select element not found in DOM");
              return;
            }
            
            $select.empty();
            $select.append('<option value="">Selecione um agente...</option>');

            if (agents && agents.length > 0) {
              agents.forEach(function(agent) {
                console.log("Adding agent to select:", agent);
                $select.append(`<option value="${agent.id}">${agent.name}</option>`);
              });

              // Store agents in widget params
              _this.widget.info.params = _this.widget.info.params || {};
              _this.widget.info.params.available_agents = agents;

              console.log("Select options after update:", $select.find('option').length);
              alert(`Agentes carregados com sucesso! ${agents.length} agente(s) encontrado(s).`);
            } else {
              alert("Nenhum agente encontrado. Verifique sua chave API.");
            }
          })
          .catch(function(error) {
            console.error("Error loading agents:", error);
            let errorMsg = "Falha ao carregar agentes. ";
            if (error.message) {
              errorMsg += error.message;
            } else {
              errorMsg += "Verifique sua chave API OpenAI.";
            }
            alert(errorMsg);
          })
          .finally(function() {
            $button.prop("disabled", false).text("Carregar Agentes");
          });
      });

      // Generate template button handler
      $("#kommo-n8n-generate-template").on("click", function() {
        const config = {
          webhook_url: $("#kommo-n8n-webhook-url").val(),
          openai_key: $("#kommo-n8n-openai-key").val(),
          selected_agent: $("#kommo-n8n-agents-select").val()
        };

        if (!config.webhook_url || !config.openai_key || !config.selected_agent) {
          _this.showTemplateResult(false, "Please fill all required fields");
          return;
        }

        try {
          const template = _this.widget.kommo.generateSalesbotTemplate(config);
          const templateJson = JSON.stringify(template, null, 2);

          $("#kommo-n8n-template-json").val(templateJson);
          $("#kommo-n8n-template-output").show();
          _this.showTemplateResult(true, _this.widget.i18n("settings.template_generation.success"));
        } catch (error) {
          _this.showTemplateResult(false, _this.widget.i18n("settings.template_generation.error"));
          console.error(error);
        }
      });

      // Copy template button handler
      $("#kommo-n8n-copy-template").on("click", function() {
        const textarea = document.getElementById("kommo-n8n-template-json");
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        document.execCommand("copy");

        $(this).text("Copied!").prop("disabled", true);
        setTimeout(function() {
          $("#kommo-n8n-copy-template").text("Copy Template").prop("disabled", false);
        }, 2000);
      });

      // Webhook URL validation on input
      $("#kommo-n8n-webhook-url").on("blur", function() {
        const url = $(this).val();
        if (url && !_this.widget.kommo.validateWebhookUrl(url)) {
          $(this).addClass("error");
          _this.showValidationError(_this.widget.i18n("settings.errors.invalid_webhook"));
        } else {
          $(this).removeClass("error");
          _this.hideValidationError();
        }
      });
    }

    /**
     * Show test connection result
     * @param {boolean} success - Whether test was successful
     * @param {string} message - Result message
     */
    showTestResult(success, message) {
      const $result = $("#kommo-n8n-test-result");
      $result.removeClass("success error")
             .addClass(success ? "success" : "error")
             .text(message)
             .fadeIn(300);
    }

    /**
     * Show validation error
     * @param {string} message - Error message
     */
    showValidationError(message) {
      // Implementation for showing validation errors
      console.warn("Validation error:", message);
    }

    /**
     * Hide validation error
     */
    hideValidationError() {
      // Implementation for hiding validation errors
    }

    /**
     * Show template generation result
     * @param {boolean} success - Whether generation was successful
     * @param {string} message - Result message
     */
    showTemplateResult(success, message) {
      const $result = $("#kommo-n8n-template-result");
      $result.removeClass("success error")
             .addClass(success ? "success" : "error")
             .text(message)
             .fadeIn(300);
    }

    /**
     * Handle card view events and chatbot triggers
     */
    card() {
      const _this = this;
      const config = _this.widget.info.params || {};

      // Check if chatbot is configured
      if (!config.webhook_url || !config.agent_id) {
        return;
      }

      // Set up automatic triggers based on configuration
      _this.setupAutoTriggers(config);
    }

    /**
     * Set up automatic chatbot triggers
     * @param {Object} config - Chatbot configuration
     */
    setupAutoTriggers(config) {
      const _this = this;
      const entityType = APP.widgets.system.area === 'lcard' ? 'leads' : 'contacts';
      const entityId = APP.widgets.system.entity_id;

      // Monitor for configured events
      if (config.events && config.events.length > 0) {
        config.events.forEach(function(eventType) {
          _this.setupEventListener(eventType, entityType, entityId, config);
        });
      }
    }

    /**
     * Set up event listener for specific event type
     * @param {string} eventType - Type of event to listen for
     * @param {string} entityType - Entity type (leads/contacts)
     * @param {number} entityId - Entity ID
     * @param {Object} config - Chatbot configuration
     */
    setupEventListener(eventType, entityType, entityId, config) {
      const _this = this;

      switch(eventType) {
        case 'status_changed':
          // Listen for status changes
          $(document).on('pipeline:status:changed', function(e, data) {
            if (data.entity_id === entityId) {
              _this.triggerChatbot(config, entityType, entityId, 'status_changed');
            }
          });
          break;

        case 'note_added':
          // Listen for new notes
          $(document).on('note:added', function(e, data) {
            if (data.entity_id === entityId) {
              _this.triggerChatbot(config, entityType, entityId, 'note_added');
            }
          });
          break;

        case 'updated':
          // Listen for entity updates
          $(document).on('entity:updated', function(e, data) {
            if (data.entity_id === entityId) {
              _this.triggerChatbot(config, entityType, entityId, 'updated');
            }
          });
          break;
      }
    }

    /**
     * Trigger chatbot interaction
     * @param {Object} config - Chatbot configuration
     * @param {string} entityType - Entity type
     * @param {number} entityId - Entity ID
     * @param {string} trigger - What triggered the chatbot
     */
    triggerChatbot(config, entityType, entityId, trigger = 'manual') {
      const _this = this;

      // Show processing state
      _this.showProcessingState(true);

      // Get entity data
      _this.widget.kommo.getEntityData(entityId, entityType)
        .then(function(entityData) {
          return _this.widget.kommo.processChatbotInteraction(config, entityData, trigger);
        })
        .then(function(chatbotResponse) {
          return _this.handleChatbotResponse(chatbotResponse, config, entityType, entityId);
        })
        .catch(function(error) {
          console.error('Chatbot interaction failed:', error);
          _this.showError('Failed to process chatbot interaction');
        })
        .finally(function() {
          _this.showProcessingState(false);
        });
    }

    /**
     * Handle chatbot response and create notes/tasks as configured
     * @param {Object} response - Chatbot response
     * @param {Object} config - Chatbot configuration
     * @param {string} entityType - Entity type
     * @param {number} entityId - Entity ID
     */
    handleChatbotResponse(response, config, entityType, entityId) {
      const _this = this;
      const promises = [];

      if (response && response.message) {
        // Handle response based on configuration
        switch(config.response_handling) {
          case 'note':
            promises.push(_this.widget.kommo.createChatbotNote(entityId, entityType, response.message));
            break;

          case 'task':
            promises.push(_this.widget.kommo.createChatbotTask(entityId, entityType, response.message));
            break;

          case 'both':
            promises.push(_this.widget.kommo.createChatbotNote(entityId, entityType, response.message));
            promises.push(_this.widget.kommo.createChatbotTask(entityId, entityType, response.message));
            break;
        }
      }

      return Promise.all(promises);
    }

    /**
     * Show/hide processing state
     * @param {boolean} show - Whether to show processing state
     */
    showProcessingState(show) {
      if (show) {
        $("#kommo-n8n-processing").fadeIn(200);
        $(".kommo-n8n__button-trigger").prop("disabled", true);
      } else {
        $("#kommo-n8n-processing").fadeOut(200);
        $(".kommo-n8n__button-trigger").prop("disabled", false);
      }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
      new Modal().showError(message, false);
    }

    /**
     * Initialize manual chatbot trigger button
     */
    init() {
      const _this = this;

      // Manual trigger button handler
      $(".kommo-n8n__button-trigger").on("click", function() {
        const entityType = APP.widgets.system.area === 'lcard' ? 'leads' : 'contacts';
        const entityId = APP.widgets.system.entity_id;
        const config = _this.widget.info.params || {};

        _this.triggerChatbot(config, entityType, entityId, 'manual');
      });
    }
  };
});