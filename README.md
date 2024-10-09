# Googlesheet_leetcode

## Overview

`Googlesheet_leetcode` is a Google Apps Script project that leverages GraphQL to query user data from LeetCode. The fetched data is parsed and inserted into Google Sheets, providing an efficient way to track your submissions and problem statistics.

## Features

- **GraphQL API Integration**: Fetches user data and recent submission statistics directly from LeetCode.
- **Automated Data Parsing**: Parses raw data to extract relevant information, such as problem titles, IDs, and submission status.
- **Google Sheets Integration**: Automatically updates a specified Google Sheet with the latest user data.

## Getting Started

### Prerequisites

- A Google account with access to Google Sheets.
- Basic knowledge of Google Apps Script.
- Access to a LeetCode account for querying user data.

### Setup Instructions

1. **Create a Google Sheet**:
   - Open Google Sheets and create a new spreadsheet.

2. **Open the Apps Script Editor**:
   - Click on `Extensions` > `Apps Script`.

3. **Copy the Script**:
   - Paste the provided Google Apps Script code into the script editor.

4. **Authorize the Script**:
   - Run the script for the first time to initiate the authorization flow. Follow the prompts to grant necessary permissions.

### Usage

1. **Configure Your User Data**:
   - Modify the script to include your LeetCode username.

2. **Execute the Script**:
   - Run the script from the Apps Script editor to fetch and insert data into your Google Sheet.

3. **View the Results**:
   - Switch back to your Google Sheet to see the updated user data, including recent submissions and problem statistics.

## Example GraphQL Query

The script uses GraphQL to query user data, such as recent submissions. Here’s an example query structure used in the script:

```graphql
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    submitStats {
      acSubmissionNum {
        difficulty
        count
      }
    }
    recentSubmissionList(username: $username, limit: 20) {
      title
      titleSlug
      statusDisplay
      timestamp
    }
  }
}
