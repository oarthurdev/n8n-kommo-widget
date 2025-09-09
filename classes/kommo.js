define(["./http.js"], function (Http) {
  return class Kommo {
    constructor(widget) {
      // Create an instance of the Http class for making requests
      this.http = new Http();
      this.widget = widget;
    }

    /**
     * Retrieve account information.
     * @returns {Promise} - A promise that resolves with the account data.
     */
    getAccount() {
      return this.http.request(
        "/api/v4/account",
        {},
        "GET",
        {
          cache: { key: "n8n_account", expires: 60 },
          baseURL: window.location.origin,
        }
      );
    }

    /**
     * Send data to n8n webhook
     * @param {string} webhookUrl - The n8n webhook URL
     * @param {Object} payload - Data to send to n8n
     * @param {string} authToken - Authentication token
     * @returns {Promise} - A promise that resolves with the webhook response
     */
    sendToN8nWebhook(webhookUrl, payload, authToken = null) {
      let headers = {
        'Content-Type': 'application/json'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      return this.http.request(
        "",
        JSON.stringify(payload),
        "POST",
        {
          baseURL: webhookUrl,
          headers: headers
        }
      );
    }

    /**
     * Test n8n webhook connection
     * @param {string} webhookUrl - The n8n webhook URL
     * @param {string} agentId - OpenAI agent ID
     * @param {string} authToken - Authentication token
     * @returns {Promise} - A promise that resolves with test results
     */
    testN8nConnection(webhookUrl, agentId, authToken = null) {
      const testPayload = {
        test: true,
        agent_id: agentId,
        message: "Test connection from Kommo",
        timestamp: new Date().toISOString(),
        source: "kommo_widget_test"
      };

      return this.sendToN8nWebhook(webhookUrl, testPayload, authToken);
    }

    /**
     * Get current lead/contact data for chatbot processing
     * @param {number} entityId - Entity ID
     * @param {string} entityType - Entity type (leads/contacts)
     * @returns {Promise} - A promise that resolves with entity data
     */
    getEntityData(entityId, entityType) {
      const endpoint = `/api/v4/${entityType}/${entityId}`;
      return this.http.request(
        endpoint,
        { with: "contacts,custom_fields,tasks,notes" },
        "GET",
        {
          baseURL: window.location.origin,
        }
      );
    }

    /**
     * Create a note from chatbot response
     * @param {number} entityId - Entity ID
     * @param {string} entityType - Entity type
     * @param {string} noteText - Note content
     * @returns {Promise} - A promise that resolves with created note
     */
    createChatbotNote(entityId, entityType, noteText) {
      const payload = {
        entity_id: entityId,
        note_type: "common",
        params: {
          text: `🤖 Chatbot Response:\n${noteText}`
        }
      };

      return this.http.request(
        `/api/v4/${entityType}/${entityId}/notes`,
        JSON.stringify([payload]),
        "POST",
        {
          baseURL: window.location.origin,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    /**
     * Create a task from chatbot interaction
     * @param {number} entityId - Entity ID
     * @param {string} entityType - Entity type
     * @param {string} taskText - Task description
     * @param {number} responsibleUserId - Responsible user ID
     * @returns {Promise} - A promise that resolves with created task
     */
    createChatbotTask(entityId, entityType, taskText, responsibleUserId = null) {
      const payload = {
        text: `🤖 Follow-up from Chatbot: ${taskText}`,
        entity_id: entityId,
        entity_type: entityType === 'leads' ? 2 : 1,
        responsible_user_id: responsibleUserId || APP.USER.id,
        task_type_id: 1,
        complete_till: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours from now
      };

      return this.http.request(
        "/api/v4/tasks",
        JSON.stringify([payload]),
        "POST",
        {
          baseURL: window.location.origin,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    /**
     * Process chatbot interaction
     * @param {Object} config - Chatbot configuration
     * @param {Object} entityData - Current entity data
     * @param {string} trigger - What triggered the chatbot
     * @returns {Promise} - A promise that resolves with chatbot response
     */
    processChatbotInteraction(config, entityData, trigger = 'manual') {
      const payload = {
        agent_id: config.agent_id,
        entity_data: entityData,
        trigger: trigger,
        timestamp: new Date().toISOString(),
        kommo_account: APP.widgets.system.subdomain,
        source: "kommo_widget"
      };

      return this.sendToN8nWebhook(
        config.webhook_url,
        payload,
        config.api_key
      );
    }

    /**
     * Get task types
     * @returns {Promise} - A promise that resolves with task types array
     */
    getTaskTypes() {
      return this.http.request(
        "/api/v4/tasks/types",
        {},
        "GET",
        {
          cache: { key: "n8n_task_types", expires: 300 },
          baseURL: window.location.origin,
        }
      );
    }

    /**
     * Load OpenAI agents using the API key
     * @param {string} apiKey - OpenAI API key
     * @returns {Promise} - A promise that resolves with agents list
     */
    loadOpenAIAgents(apiKey) {
      console.log("Loading OpenAI agents with API key...");
      
      return fetch('https://api.openai.com/v1/assistants', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      })
      .then(response => {
        console.log("OpenAI API response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
        }
        
        return response.json();
      })
      .then(data => {
        console.log("OpenAI API response data:", data);
        
        if (data.error) {
          throw new Error(`OpenAI API error: ${data.error.message || data.error.type}`);
        }
        
        if (data.data && Array.isArray(data.data)) {
          const agents = data.data.map(agent => ({
            id: agent.id,
            name: agent.name || agent.id,
            option: agent.name || agent.id
          }));
          
          console.log("Processed agents:", agents);
          return agents;
        }
        
        console.warn("No agents found in response");
        return [];
      })
      .catch(error => {
        console.error("Error in loadOpenAIAgents:", error);
        throw error;
      });
    }

    /**
     * Generate template.json for Salesbot
     * @param {Object} config - Widget configuration
     * @returns {Object} - Template JSON object
     */
    generateSalesbotTemplate(config) {
      const template = {
        "name": "n8n Chatbot Integration",
        "description": "Automated chatbot integration using n8n workflow and OpenAI agents",
        "version": "1.0.0",
        "triggers": [
          {
            "type": "webhook",
            "webhook_url": config.webhook_url,
            "method": "POST",
            "headers": {
              "Content-Type": "application/json"
            }
          }
        ],
        "actions": [
          {
            "type": "send_message",
            "agent_id": config.selected_agent,
            "openai_key": config.openai_key,
            "response_type": "note"
          }
        ],
        "settings": {
          "auto_response": true,
          "entities": ["leads", "contacts"],
          "events": ["status_changed", "note_added", "created"],
          "webhook_url": config.webhook_url,
          "agent_config": {
            "id": config.selected_agent,
            "provider": "openai",
            "api_key": config.openai_key
          }
        },
        "created_at": new Date().toISOString(),
        "created_by": "kommo_n8n_widget"
      };

      return template;
    }

    /**
     * Get users for task assignment
     * @returns {Promise} - A promise that resolves with users array
     */
    getUsers() {
      return this.http.request(
        "/api/v4/users",
        {},
        "GET",
        {
          cache: { key: "n8n_users", expires: 300 },
          baseURL: window.location.origin,
        }
      ).then(function(response) {
        const users = ((response || {})._embedded || {}).users || [];
        return users.filter(user => user.rights && user.rights.is_active).map(user => ({
          id: user.id,
          option: user.name,
          name: user.name
        }));
      });
    }

    /**
     * Validate webhook URL format
     * @param {string} url - URL to validate
     * @returns {boolean} - Whether URL is valid
     */
    validateWebhookUrl(url) {
      try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'https:' && urlObj.hostname.length > 0;
      } catch (e) {
        return false;
      }
    }
  };
});