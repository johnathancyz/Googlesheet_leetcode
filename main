function fetch_question_data(data, tag) {
  
  try {
    const response = UrlFetchApp.fetch('https://leetcode.com/graphql', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(data),
    });

    const r = JSON.parse(response.getContentText());

    // Check for errors in the response
    if (r.errors) {
      Logger.log("Errors in response: " + JSON.stringify(r.errors));
      return null;
    }

    return r.data && r.data[tag] ? r.data[tag] : null;

  } catch (e) {
    Logger.log("Request error: " + e.message);
  }
  return null;
}

function fetchUsernamesFromSheet() {
  const spreadsheetId = "1jjbhpsz7wf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Extracted from the URL
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName("Sheet1"); // Get the sheet named "Sheet1"
  
  if (!sheet) {
    Logger.log("Sheet not found!");
    return [];
  }
  
  const range = sheet.getRange(2, 2, 1, sheet.getLastColumn()); // Get the second row
  const values = range.getValues(); // Fetch the values as a 2D array
  
  // Extract usernames from the first row (assuming all columns are usernames)
  const usernames = values[0].filter(username => username); // Filter out empty cells

  return usernames;
}

function findLatestSubmissionTodayOrBeforeEndOfToday(submissionList) {
  // Get the current date in Los Angeles timezone
  const laTimezone = "America/Los_Angeles";
  const now = new Date();

  // Create start and end of today in LA timezone
  const today = Utilities.formatDate(now, laTimezone, "MM/dd/yyyy");
  const startOfToday = new Date(Utilities.formatDate(new Date(today + " 00:00:00"), laTimezone, "yyyy-MM-dd'T'00:00:00Z"));
  const endOfToday = new Date(Utilities.formatDate(new Date(today + " 23:59:59"), laTimezone, "yyyy-MM-dd'T'23:59:59Z"));

  // Filter for submissions that match today's date
  const validSubmissions = submissionList.filter(submission => {
    const submissionDate = new Date(submission.timestamp * 1000); // Convert timestamp to milliseconds
    const formattedSubmissionDate = Utilities.formatDate(submissionDate, laTimezone, "MM/dd/yyyy");
    return formattedSubmissionDate === today; // Keep submissions that match today's date
  });
  
  if (validSubmissions.length === 0) {
    return null; // No valid submissions found
  }

  // Sort submissions by timestamp in descending order
  validSubmissions.sort((a, b) => b.timestamp - a.timestamp);
  // Logger.log("ValidSubmission:")
  // Logger.log(validSubmissions);
  
  // Return the latest submission
  return validSubmissions[0];
}


function main() {
  const usernames = fetchUsernamesFromSheet();
  if (usernames.length === 0) {
    Logger.log("No usernames found.");
    return;
  }

  const sheet = SpreadsheetApp.openById('1jjbhpsz7wf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').getActiveSheet();
  const today = Utilities.formatDate(new Date(), "America/Los_Angeles", "MM/dd/yyyy");
  
  // Find the column index for each user ID
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const usernameToColumnIndex = {};

  idRow.forEach((id, index) => {
    usernameToColumnIndex[id] = index + 1; // Store column index (1-based)
  });

  const lastRowIndex = sheet.getLastRow(); // Get the last row index
  let todayRowIndex = null;

  // Check if the last row has today's date
  if (lastRowIndex) { 
    const lastRow = sheet.getRange(lastRowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    const lastRow_date = Utilities.formatDate(lastRow[0],"America/Los_Angeles", "MM/dd/yyyy");
    Logger.log(lastRow_date);
    Logger.log(today);
    if (Utilities.formatDate(lastRow[0],"America/Los_Angeles", "MM/dd/yyyy") === today) {
      todayRowIndex = lastRowIndex; // Use the last row if it matches today
    }
  }

  const urlEntries = {}; // To collect URLs for each username
  
  usernames.forEach(username => {
    const data = {
      operationName: "getUserProfile",
      variables: {
        username: username,
      },
      query: `
        query getUserProfile($username: String!) {
          recentSubmissionList(username: $username, limit: 20) {
            title
            titleSlug
            timestamp
            statusDisplay
            lang
          }
        }
      `,
    };
    
    

    const testData = fetch_question_data(data, "recentSubmissionList");


    if (testData) {
      const latestSubmission = findLatestSubmissionTodayOrBeforeEndOfToday(testData);
      
      if (latestSubmission && latestSubmission.statusDisplay === "Accepted") {
        // Logger.log("latestSubmission.statusDisplay:" + latestSubmission.statusDisplay)
        const title = latestSubmission.title; // Extract the title
        const titleSlug = title.replace(/ /g, '-'); // Replace spaces with hyphens for URL
        const questionData = {
          operationName: "getQuestionDetails",
          variables: {
            titleSlug: titleSlug,
          },
          query: `
            query getQuestionDetails($titleSlug: String!) {
              question(titleSlug: $titleSlug) {
                questionId
                questionFrontendId
                title
                titleSlug
                isPaidOnly
                difficulty
                likes
                dislikes
                categoryTitle
              }
            }
          `,
        };
        const questionresponse = fetch_question_data(questionData, "question");
        const questionId = questionresponse.questionId
        Logger.log("questionID: " + questionId)
        const problemUrl = `https://leetcode.com/problems/${titleSlug}/description/`; // Format the URL
        const submissionDate = new Date(latestSubmission.timestamp * 1000); // Convert timestamp to milliseconds
        const formattedSubmissionDate = Utilities.formatDate(submissionDate, "America/Los_Angeles", "yyyy-MM-dd'T'HH:mm:ss");

        // Collect the URL for this username
        urlEntries[username] = [questionId,titleSlug,problemUrl];
        Logger.log("Data processed for " + username + "Status: " + latestSubmission.statusDisplay +" Time: " + formattedSubmissionDate + ": " + problemUrl);
      } else {
        Logger.log("No submission data found for " + username + " today or before the end of today.");
      }
    } else {
      Logger.log("No submission data found for " + username);
    }
  });

  // If URLs have been collected, update or append row
  if (Object.keys(urlEntries).length > 0) {
    if (todayRowIndex) {
      // Update the existing row for today
      for (const [username, value] of Object.entries(urlEntries)) {
        const columnIndex = usernameToColumnIndex[username];
        const cellData = `${value[0]}: ${value[1]}`;
        if (columnIndex) {
          sheet.getRange(todayRowIndex, columnIndex)
            .setFormula(`=HYPERLINK("${value[2]}", "${cellData}")`); // Set the URL in the appropriate column
        }
      }
      Logger.log("Today's row updated with new URLs.");
    } else {
      // If today's row doesn't exist, add a new row
      const newRow = Array(sheet.getLastColumn()).fill(''); // Create a new row with empty values
      newRow[0] = today; // Set the first column to today's date

      for (const [username, value] of Object.entries(urlEntries)) {
        const columnIndex = usernameToColumnIndex[username];
        const cellData = `${value[0]}: ${value[1]}`;
        if (columnIndex) {
          newRow[columnIndex - 1] = cellData; // Set the problem URL in the corresponding column
          newRow[columnIndex - 1].setFormula(`=HYPERLINK("${value[2]}")`);
        }
      }

      // Append the new row to the sheet
      sheet.appendRow(newRow);
      Logger.log("New row added for today's date with URLs: " + JSON.stringify(urlEntries));
    }
  }
}

