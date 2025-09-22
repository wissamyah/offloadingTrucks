# Paddy Truck Monitoring System

A modern React application for monitoring and managing paddy truck operations from receipt to offloading.

## Features

- **WhatsApp Message Parser**: Extract truck information from WhatsApp messages
- **Truck Status Workflow**: Track trucks through Pending → Scaled In → Offloaded/Rejected states
- **GitHub Data Persistence**: Sync data directly with GitHub repository
- **Real-time Updates**: Automatic syncing with loading states
- **72-hour Auto-deletion**: Automatic cleanup of old entries
- **Daily Pagination**: View trucks by date with UTC+2 timezone
- **Interactive Modals**: Easy data entry for waybills and weights
- **Responsive Design**: Modern UI with Tailwind CSS

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Configure GitHub settings in the app (click the settings icon)

## GitHub Configuration

1. Create a GitHub Personal Access Token with `repo` scope
2. Enter your GitHub username and repository name
3. The app will automatically sync data to `data/data.json`

## Deployment

The app automatically deploys to GitHub Pages when you push to the `main` branch.

Visit: https://wissamyah.github.io/offloadingTrucks/

## Usage

1. Paste WhatsApp messages in the input area
2. Click "Process" to extract truck information
3. Manage trucks through their lifecycle:
   - Scale In: Add waybill number
   - Offload: Add net weight and optional deduction
   - Edit/Delete: Modify truck details as needed

## Technologies

- React + TypeScript
- Vite
- Tailwind CSS
- Lucide React Icons
- Octokit (GitHub API)
- date-fns