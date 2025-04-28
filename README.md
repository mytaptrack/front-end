# MyTapTrack Web Front-End

This is the web front-end implementation for the MyTapTrack open source system. The front-end is built using modern Angular and is split into two main applications:

## Project Structure

### 1. Behavior Application (`/behavior`)
The main MyTapTrack application that provides the core functionality for users. Built with Angular and includes features such as:

- User authentication via AWS Cognito
- Data visualization with Chart.js
- PDF generation and file handling
- Responsive material design interface
- Moment.js integration for timezone handling
- XLSX support for data export/import

### 2. Management Application (`/manage`)
The administrative interface for MyTapTrack, providing system management capabilities. Features include:

- Administrative dashboard
- User management
- System configuration
- Reporting tools
- AWS integration for backend services

## Technology Stack

- **Framework**: Angular (Latest version)
- **UI Components**: 
  - Angular Material
  - NGX Bootstrap
  - Custom components
- **Authentication**: AWS Amplify/Cognito
- **Charts & Visualization**: ng2-charts
- **Data Handling**:
  - Excel support (xlsx)
  - PDF generation
  - File handling
- **Development Tools**:
  - TypeScript
  - Angular CLI
  - Webpack
  - Karma/Jasmine for testing

## Getting Started

### Prerequisites
- Node.js (LTS version recommended)
- npm or yarn
- Angular CLI

### Configuration

In order to configure the websites, both the behavior project and the manage project must be configured.

**Configuration File Directories:**
- behavior/src/environments
- manage/src/environments

The files located in these directories will be mirror duplicates of each other. Each of these directories will need three configuration files

**Configuration Files:**
| File Name | Description |
|:---:|:---:|
| environment.prod.ts | The production configurations which will be used only during production builds |
| environment.test.ts | The test configuration file which will be used for test environment deployments |
| environment.ts | The development configurations used when running the system off of your local machine |

### Setting Up the Development Environment

1. Install dependencies for both applications:
   ```bash
   # For behavior application
   cd behavior
   npm install

   # For manage application
   cd ../manage
   npm install
   ```

2. Running the applications:

   **Behavior Application**:
   ```bash
   cd behavior
   npm start
   # Access at https://localhost:8000
   ```

   **Management Application**:
   ```bash
   cd manage
   npm start
   # Access at https://localhost:8001
   ```

## Development

- Both applications use Angular's standard development workflow
- Each application has its own configuration and can be developed independently
- Shared types are managed through the @mytaptrack/types package

## Building for Production

To build for production, first build the angular source code

```bash
make build-prod
```

After building the source, build the docker image

```bash
make docker
```

This will create a docker image which will be named **mtt-front-end** which will expose the website through port 8000.

## Contributing

Please refer to the main project's contributing guidelines for information on how to contribute to the MyTapTrack front-end applications.

## Additional Documentation

- For detailed documentation about the behavior application, see [behavior/README.md](behavior/README.md)
- For detailed documentation about the management application, see [manage/README.md](manage/README.md)

## License

This project is part of the MyTapTrack open source system. Please refer to the main project's license file for licensing information.