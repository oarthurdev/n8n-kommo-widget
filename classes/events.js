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
          _this.showNotification("Please enter your OpenAI API key first", "error");
          return;
        }

        // Show loading state
        const $button = $(this);
        $button.prop("disabled", true).text("Carregando...");

        console.log("Starting to load OpenAI agents...");

        _this.widget.kommo.loadOpenAIAgents(apiKey)
          .then(function(agents) {
            console.log("Agents loaded successfully:", agents);
            
            if (agents && agents.length > 0) {
              // Update the select with agents
              const $select = $("#kommo-n8n-agents-select");
              $select.empty().append('<option value="">Selecione um agente...</option>');
              
              agents.forEach(function(agent) {
                $select.append(`<option value="${agent.id}">${agent.name}</option>`);
              });
              // Store agents in widget params for later use
              _this.widget.info.params.available_agents = agents;
              
              _this.showNotification("Agentes carregados com sucesso!", "success");
            } else {
              _this.showNotification("Nenhum agente encontrado", "warning");
            }
          })
          .catch(function(error) {
            console.error("Error loading agents:", error);
            _this.showNotification("Erro ao carregar agentes: " + error.message, "error");
          })
          .finally(function() {
            $button.prop("disabled", false).text("Carregar Agentes");
          });
      });

      // Generate template button handler
      $(document).on("click", "#kommo-n8n-generate-template", function(e) {
        e.preventDefault();
        console.log("Generate template button clicked");

        const webhookUrl = $("#kommo-n8n-webhook-url").val().trim();
        const openaiKey = $("#kommo-n8n-openai-key").val().trim();
        const selectedAgent = $("#kommo-n8n-agents-select").val();

        if (!webhookUrl || !openaiKey || !selectedAgent) {
          _this.showNotification("Por favor, preencha todos os campos antes de gerar o template", "error");
          return;
        }

        const $button = $(this);
        $button.prop("disabled", true).text("Gerando...");

        try {
          const config = {
            webhook_url: webhookUrl,
            openai_key: openaiKey,
            selected_agent: selectedAgent
          };

          _this.widget.kommo.generateSalesbotTemplate(config);
          _this.showNotification("Template gerado e baixado com sucesso!", "success");
        } catch (error) {
          console.error("Error generating template:", error);
          _this.showNotification("Erro ao gerar template: " + error.message, "error");
        } finally {
          $button.prop("disabled", false).text(_this.widget.i18n("settings.template_generation.button"));
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
    } // <-- Add this closing brace for settings()

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

    // (Removed duplicate showNotification method)

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
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning)
     */
    showNotification(message, type = 'info') {
      // Create notification element if it doesn't exist
      let $notification = $("#kommo-n8n-notification");
      if ($notification.length === 0) {
        $notification = $('<div id="kommo-n8n-notification" class="kommo-notification"></div>');
        $('body').append($notification);
      }

      $notification.removeClass("success error warning info")
                  .addClass(type)
                  .text(message)
                  .fadeIn(300);

      // Auto hide after 5 seconds
      setTimeout(function() {
        $notification.fadeOut(300);
      }, 5000);
    }

    /**
     * Show template generation result
     * @param {boolean} success - Whether generation was successful
     * @param {string} message - Result message
     */
    showTemplateResult(success, message) {
      const $result = $("#kommo-n8n-template-result");
      if ($result.length === 0) {
        // Create result element if it doesn't exist
        const $resultDiv = $('<div id="kommo-n8n-template-result" class="template-result"></div>');
        $("#kommo-n8n-generate-template").after($resultDiv);
      }
      
      $("#kommo-n8n-template-result").removeClass("success error")
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
      // You can add card-specific logic here if needed
    }

    /**
     * Show a non-blocking notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type: "success" or "error"
     */
    // (Removed duplicate showNotification method)
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