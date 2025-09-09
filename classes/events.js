
define(["moment", "lib/components/base/modal"], function (Moment, Modal) {
  return class Events {
    constructor(widget) {
      this.widget = widget;
    }

    settings() {
      let _this = this;

      // Test connection button handler
      $("#kommo-n8n-test-button").on("click", function() {
        const webhookUrl = $("#kommo-n8n-webhook-url").val();
        const agentId = $("#kommo-n8n-agent-id").val();
        const apiKey = $("#kommo-n8n-api-key").val();

        if (!webhookUrl || !agentId) {
          _this.showTestResult(false, _this.widget.i18n("settings.errors.webhook_required"));
          return;
        }

        if (!_this.widget.kommo.validateWebhookUrl(webhookUrl)) {
          _this.showTestResult(false, _this.widget.i18n("settings.errors.invalid_webhook"));
          return;
        }

        // Show loading state
        $("#kommo-n8n-test-button").prop("disabled", true).text("Testing...");
        $("#kommo-n8n-test-result").hide();

        _this.widget.kommo.testN8nConnection(webhookUrl, agentId, apiKey)
          .then(function(response) {
            _this.showTestResult(true, _this.widget.i18n("settings.test.success"));
          })
          .catch(function(error) {
            _this.showTestResult(false, _this.widget.i18n("settings.test.error"));
          })
          .finally(function() {
            $("#kommo-n8n-test-button").prop("disabled", false).text(_this.widget.i18n("settings.test.button"));
          });
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
