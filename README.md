# Agent Launcher

A modern web application that provides a platform for launching and managing AI agents with a user-friendly interface. The project consists of a React frontend and Node.js backend services.

## Project Structure

```
.
├── app/                    # React frontend application
│   └── src/               # Source files for the frontend
├── ai-api/                # AI service backend
│   └── src/               # Source files for the AI API
├── lambda-creator-api/    # Lambda function creator service
├── tweet-handler/         # Twitter integration service
└── package.json           # Project dependencies
```

## Features

- **Chat Interface**: Interactive chat interface for communicating with AI agents
- **Agent Launcher**: Tool for launching and managing AI agents
- **Terminal Interface**: Command-line interface for advanced operations
- **Authentication**: Secure user authentication using Privy
- **AI Integration**: Backend services for AI analysis and processing
- **Twitter Integration**: Social media integration capabilities

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Twitter API credentials (for social login)
- Privy API credentials

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd agent-launcher
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
PRIVY_APP_ID=your_privy_app_id
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
```

## Running the Application

1. Start the frontend development server:
```bash
cd app
npm start
```

2. Start the AI API service:
```bash
cd ai-api
npm start
```

3. Start the Lambda Creator API:
```bash
cd lambda-creator-api
npm start
```

4. Start the Tweet Handler service:
```bash
cd tweet-handler
npm start
```

The application will be available at `http://localhost:3000`.

## API Endpoints

### AI API
- `POST /analyze`: Analyze queries using AI services
- `GET /user`: Get or create user information

## Authentication

The application uses Privy for authentication with Twitter as the primary login method. Users need to have a Twitter account to access the platform.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the development team. 