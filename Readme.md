
<p align="center"><img width="552" alt="kommo n8n chatbot" src="images/github images/kommo_logo.png"></p>

# Kommo n8n Chatbot Widget

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)

## Description

This widget enables seamless integration between Kommo CRM and n8n workflows with OpenAI chatbot agents. Perfect for companies that want to implement AI-powered customer interactions with their own custom agents while using a standardized n8n workflow.

## Features

- **n8n Workflow Integration**: Connect to your n8n instance via webhook
- **Custom OpenAI Agents**: Each company can use their own OpenAI agent ID
- **Automatic Triggers**: Activate chatbot based on CRM events (new leads, status changes, notes)
- **Manual Triggers**: Manual chatbot activation from lead/contact profiles
- **Response Handling**: Automatically create notes and/or tasks from chatbot responses
- **Connection Testing**: Built-in webhook connection testing
- **Multi-language Support**: English and Portuguese translations

## Installation

1. **Upload the Widget**: Upload the widget files to the Kommo platform as a private integration.
2. **Install the Widget**: Install the widget through Kommo's integrations settings page.
3. **Configure n8n Workflow**: Set up your n8n workflow with webhook trigger and OpenAI node.

## Configuration

### 1. n8n Workflow Setup

Your n8n workflow should:
- Start with a webhook trigger
- Include an OpenAI node with your custom agent
- Return a JSON response with `message` field

### 2. Widget Settings

Configure the following in the widget settings:

- **Webhook URL**: Your n8n workflow webhook endpoint
- **Agent ID**: Your company's unique OpenAI agent identifier  
- **Authentication Token**: Optional security token for webhook
- **Entity Types**: Choose which entities (leads/contacts) trigger the chatbot
- **Trigger Events**: Select events that activate the chatbot:
  - New record created
  - Record updated
  - Status changed
  - Note added
- **Response Handling**: How to handle chatbot responses:
  - Add as note
  - Create task
  - Both note and task

### 3. Testing Connection

Use the built-in connection test to verify your n8n workflow integration before going live.

## Usage

### Automatic Triggers

The chatbot automatically activates based on your configured trigger events. When triggered, it:

1. Fetches current entity data from Kommo
2. Sends data to your n8n workflow
3. Receives AI-generated response
4. Creates notes/tasks in Kommo based on configuration

### Manual Triggers

Users can manually trigger the chatbot from the lead/contact profile using the "Trigger Chatbot" button in the right panel.

### Interface

The widget provides:

- **Settings Panel**: Complete configuration interface
- **Right Panel**: Status indicator and manual trigger button
- **Processing Indicator**: Visual feedback during AI processing

## Business Model

This widget is designed for B2B sales to companies wanting AI chatbot integration:

- **Standardized Workflow**: One n8n workflow template for all clients
- **Custom Agents**: Each company uses their own trained OpenAI agent
- **Easy Setup**: Minimal configuration required per company
- **Scalable**: Single workflow handles multiple company integrations

## Technical Architecture

```
Kommo CRM → Widget → n8n Webhook → OpenAI Agent → Response → Kommo (Notes/Tasks)
```

## Development

The widget uses Kommo's widget framework with:

- **AMD Modules**: Modular JavaScript architecture
- **Twig Templates**: Templating for UI components
- **CSS Components**: Styled interface elements
- **Event Handling**: CRM event listeners and webhook integration

## API Integration

### Webhook Payload

The widget sends the following data to your n8n workflow:

```json
{
  "agent_id": "your_company_agent_id",
  "entity_data": {
    "id": 12345,
    "name": "Lead Name",
    "status": "New",
    "custom_fields": {...},
    "notes": [...],
    "tasks": [...]
  },
  "trigger": "status_changed",
  "timestamp": "2024-01-01T12:00:00Z",
  "kommo_account": "account_subdomain",
  "source": "kommo_widget"
}
```

### Expected Response

Your n8n workflow should return:

```json
{
  "message": "AI-generated response text",
  "status": "success"
}
```

## Support

- **Website**: [https://vortexhub.com.br](https://vortexhub.com.br)
- **Email**: contato@vortexhub.com.br
- **Documentation**: [Kommo Developers](https://developers.kommo.com/docs/widgets-tutorial)

## License

MIT License - See LICENSE file for details.

## Community

Join our community on [Discord](https://discord.gg/CjstJTrBHu)!
