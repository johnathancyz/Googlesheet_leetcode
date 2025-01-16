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
  const spreadsheetId = "1jjbhpsz7wf-nWikH4GFovtObMl9lh54wPKF94MUt9_g"; // Extracted from the URL
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName("2025"); // Get the sheet named "Sheet1"
  
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

function findLatestSubmissionForPreviousDay(submissionList) {
  // Get the current date in Los Angeles timezone
  const laTimezone = "America/Los_Angeles";
  const now = new Date();

  // Calculate the previous day
  const previousDay = new Date(now);
  previousDay.setDate(now.getDate() - 1); // Subtract one day to get the previous day
  const previousDayFormatted = Utilities.formatDate(previousDay, laTimezone, "MM/dd/yyyy");

  // Filter for submissions from the previous day
  const validSubmissionsFromPreviousDay = submissionList.filter(submission => {
    const submissionDate = new Date(submission.timestamp * 1000); // Convert timestamp to milliseconds
    const formattedSubmissionDate = Utilities.formatDate(submissionDate, laTimezone, "MM/dd/yyyy");
    return formattedSubmissionDate === previousDayFormatted && submission.statusDisplay === "Accepted"; // Keep submissions from previous day
  });

  if (validSubmissionsFromPreviousDay.length === 0) {
    return null; // No valid submissions found
  }

  // Sort submissions from the previous day by timestamp in descending order
  validSubmissionsFromPreviousDay.sort((a, b) => b.timestamp - a.timestamp);
  Logger.log("Valid Submission from previous day:");
  Logger.log(validSubmissionsFromPreviousDay);

  // Return the latest submission from the previous day
  return validSubmissionsFromPreviousDay[0];
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
    return formattedSubmissionDate === today && submission.statusDisplay === "Accepted"; // Keep submissions that match today's date
  });
  
  if (validSubmissions.length === 0) {
    return null; // No valid submissions found
  }

  // Sort submissions by timestamp in descending order
  validSubmissions.sort((a, b) => b.timestamp - a.timestamp);
  Logger.log("ValidSubmission:")
  Logger.log(validSubmissions);
  
  // Return the latest submission
  return validSubmissions[0];
}

function setTrigger() {
    
  scheduledTrigger(23, 59); // Schedule trigger for 23:59
}

function scheduledTrigger(hours, minutes) {
  // Create a time-based trigger that runs every day at the specified time
  ScriptApp.newTrigger("main")
    .timeBased()
    .everyDays(1) // Run every day
    .atHour(hours) // Set the hour
    .nearMinute(minutes) // Set the minute
    .create();
}

function checkIfEmpty() {
  main();
  const usernames = fetchUsernamesFromSheet();
  if (usernames.length === 0) {
    Logger.log("No usernames found.");
    return;
  }

  const spreadsheetId = '1jjbhpsz7wf-nWikH4GFovtObMl9lh54wPKF94MUt9_g'; // Extracted from the URL
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName("2025");
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
  if (!todayRowIndex) {
    Logger.log("No row exists for today's date.");
    return; // Exit if there's no row for today
  }

  Object.entries(usernameToColumnIndex).forEach(([username, columnIndex]) => {
    const userEmail = sheet.getRange(3, columnIndex).getValue(); // Adjust row if needed for email
    const todayCell = sheet.getRange(todayRowIndex, columnIndex).getValue(); // Get today's cell value

    if (!todayCell) { // If today's cell is empty
      Logger.log(`Today's cell is empty ${todayCell} for ${username}. Sending email.`);

      GmailApp.sendEmail(
        userEmail,
        "Reminder: Submission Missing for Today",
        `Hello ${username},\n\nWe noticed that you have not made a Leetcode submission for today (${today}). Please update your entry before the end of the day.\n\nBest regards,\nAdmin`
      );
    } else {
      Logger.log(`Today's cell for ${username} is not empty: ${todayCell} .`);
    }
  });
}

function deleteTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "main") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function checkYesterday() {
  const usernames = fetchUsernamesFromSheet();
  if (usernames.length === 0) {
    Logger.log("No usernames found.");
    return;
  }

  const spreadsheetId = '1jjbhpsz7wf-nWikH4GFovtObMl9lh54wPKF94MUt9_g';
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet2024 = spreadsheet.getSheetByName("2024");
  const sheet2025 = spreadsheet.getSheetByName("2025");

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const yesterdayFormatted = Utilities.formatDate(yesterday, "America/Los_Angeles", "MM/dd/yyyy");
  const todayFormatted = Utilities.formatDate(now, "America/Los_Angeles", "MM/dd/yyyy");

  const usernameToColumnIndex2024 = mapUsernamesToColumns(sheet2024);
  const usernameToColumnIndex2025 = mapUsernamesToColumns(sheet2025);

  let lastRowIndex2025 = sheet2025.getLastRow();
  let yesterdayRowIndex = findRowIndex(sheet2025, yesterdayFormatted);

  if (lastRowIndex2025) {
    const lastRow = sheet2025.getRange(lastRowIndex2025, 1, 1, sheet2025.getLastColumn()).getValues()[0];
    const lastRowDate = Utilities.formatDate(lastRow[0], "America/Los_Angeles", "MM/dd/yyyy");

    Logger.log("lastRowDate: " + lastRowIndex2025 + " todayFormatted: " + todayFormatted);

    if (lastRowDate === todayFormatted) {
      todayRowIndex = lastRowIndex2025; // Today's row exists
    } else {
      const newRow = Array(sheet2025.getLastColumn()).fill(''); // Create a new row with empty values
      newRow[0] = todayFormatted;
      sheet2025.appendRow(newRow);

      Logger.log("Appended new row with today's date: " + todayFormatted);

      // Update lastRowIndex after appending the new row
      lastRowIndex2025 = sheet2025.getLastRow();
      todayRowIndex = lastRowIndex2025; // Update today's row index
    }

    // Determine the second-to-last row after updating lastRowIndex
    if (lastRowIndex2025 > 1) { // Ensure there are at least two rows
      const secondToLastRow = sheet2025.getRange(lastRowIndex2025 - 1, 1, 1, sheet2025.getLastColumn()).getValues()[0];
      const secondToLastRowDate = Utilities.formatDate(secondToLastRow[0], "America/Los_Angeles", "MM/dd/yyyy");

      Logger.log("secondToLastRowDate: " + secondToLastRowDate + " yesterdayFormatted: " + yesterdayFormatted);

      if (secondToLastRowDate === yesterdayFormatted) {
        yesterdayRowIndex = lastRowIndex2025 - 1; // Yesterday's row exists
      }
    }
  }
  const urlEntries = {};

  usernames.forEach(username => {
    const data = {
      operationName: "getUserProfile",
      variables: { username: username },
      query: `query getUserProfile($username: String!) {
        recentSubmissionList(username: $username, limit: 20) {
          title
          titleSlug
          timestamp
          statusDisplay
          lang
        }
      }`
    };

    const testData = fetch_question_data(data, "recentSubmissionList");

    if (testData) {
      const latestSubmission = findLatestSubmissionForPreviousDay(testData);
      if (latestSubmission && latestSubmission.statusDisplay === "Accepted") {
        const titleSlug = latestSubmission.titleSlug;
        const columnIndex2025 = usernameToColumnIndex2025[username];
        const columnIndex2024 = usernameToColumnIndex2024[username];

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
        const questionId = questionresponse.questionFrontendId;
        const cellData = `${questionId}: ${titleSlug}`;

        const isDuplicate2025 = checkDuplicateEntry(sheet2025, -2, columnIndex2025, sheet2025.getLastRow() - 2, cellData);
        const isDuplicate2024 = checkDuplicateEntry(sheet2024, -2, columnIndex2024, sheet2024.getLastRow(), cellData);


        if (isDuplicate2025 || isDuplicate2024) {
          sendDuplicateEmail(sheet2025.getRange(3, columnIndex2025).getValue(), username, titleSlug, yesterdayFormatted);
        } else {
          const problemUrl = `https://leetcode.com/problems/${titleSlug}/description/`;
          Logger.log("I'm here");
          updateSheetWithSubmission(sheet2025, yesterdayRowIndex, columnIndex2025, questionId, titleSlug, problemUrl);
          urlEntries[username] = [questionId, titleSlug, problemUrl];
        }
      } else {
        updatePenalty(sheet2025, usernameToColumnIndex2025[username], username, yesterdayFormatted);
      }
    }
  });

  if (Object.keys(urlEntries).length > 0) {
    Logger.log("Yesterday's row updated with new URLs.");
  } else {
    Logger.log("No valid submissions for yesterday.");
  }
}

function mapUsernamesToColumns(sheet) {
  const idRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  idRow.forEach((id, index) => {
    if (id) map[id] = index + 1;
  });
  return map;
}

function findRowIndex(sheet, date) {
  const dateColumn = sheet.getRange(1, 1, sheet.getLastRow()).getValues().flat();
  return dateColumn.indexOf(date) + 1;
}

function checkDuplicateEntry(sheet, searchEnd, columnIndex, rowIndex, cellData) {
  if (!columnIndex) return false;
  const columnData = sheet.getRange(3, columnIndex, rowIndex).getValues().flat();
  return columnData.slice(0, searchEnd).includes(cellData);
}

function updateSheetWithSubmission(sheet, rowIndex, columnIndex, questionId, titleSlug, problemUrl) {
  if (columnIndex) {
    const cellData = `${questionId}: ${titleSlug}`;
    sheet.getRange(rowIndex, columnIndex).setFormula(`=HYPERLINK("${problemUrl}", "${cellData}")`);
  }
}

function updatePenalty(sheet, columnIndex, username, date) {
  const userEmail = sheet.getRange(3, columnIndex).getValue();
  let penalty = sheet.getRange(4, columnIndex).getValue() || 0;
  penalty += 60;
  sheet.getRange(4, columnIndex).setValue(penalty);

  GmailApp.sendEmail(
    userEmail,
    "Reminder: No Submission",
    `Hello ${username},\n\nWe noticed that you haven't made any submission on ${date}. Please send the red packet.\n\n Accumulative penalty: ${penalty}\n\nBest regards,\nAdmin`
  );
}

function sendDuplicateEmail(userEmail, username, titleSlug, date) {
  
  GmailApp.sendEmail(
    userEmail,
    "Reminder: Duplicate Submission Detected",
    `Hello ${username},\n\nWe noticed that you have made a DUPLICATED submission for ${titleSlug} on ${date}. Please send the red packet.\n\nBest regards,\nAdmin`
  );
}



function main() {
  const usernames = fetchUsernamesFromSheet();
  if (usernames.length === 0) {
    Logger.log("No usernames found.");
    return;
  }

  const spreadsheetId = '1jjbhpsz7wf-nWikH4GFovtObMl9lh54wPKF94MUt9_g'; // Extracted from the URL
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  const sheet2024 = spreadsheet.getSheetByName("2024");
  const sheet2025 = spreadsheet.getSheetByName("2025");

  const usernameToColumnIndex2024 = mapUsernamesToColumns(sheet2024);
  const usernameToColumnIndex2025 = mapUsernamesToColumns(sheet2025);

  const today = Utilities.formatDate(new Date(), "America/Los_Angeles", "MM/dd/yyyy");
  
  // Find the column index for each user ID
  const headers = sheet2025.getRange(1, 1, 1, sheet2025.getLastColumn()).getValues()[0];
  const idRow = sheet2025.getRange(2, 1, 1, sheet2025.getLastColumn()).getValues()[0];
  const usernameToColumnIndex = {};

  idRow.forEach((id, index) => {
    usernameToColumnIndex[id] = index + 1; // Store column index (1-based)
  });

  const lastRowIndex = sheet2025.getLastRow(); // Get the last row index
  let todayRowIndex = null;

  // Check if the last row has today's date
  if (lastRowIndex) { 
    const lastRow = sheet2025.getRange(lastRowIndex, 1, 1, sheet2025.getLastColumn()).getValues()[0];
    const lastRow_date = Utilities.formatDate(lastRow[0],"America/Los_Angeles", "MM/dd/yyyy");
    
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
        const titleSlug = latestSubmission.titleSlug
        const columnIndex2025 = usernameToColumnIndex2025[username];
        const columnIndex2024 = usernameToColumnIndex2024[username];
        const columnIndex = usernameToColumnIndex[username];
         // const titleSlug = title.replace(/ /g, '-'); // Replace spaces with hyphens for URL
        Logger.log("titleSlug: " + titleSlug)
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
        // const questionId = questionresponse.questionId
        const questionId = questionresponse.questionFrontendId
        
        const problemUrl = `https://leetcode.com/problems/${titleSlug}/description/`; // Format the URL
        const submissionDate = new Date(latestSubmission.timestamp * 1000); // Convert timestamp to milliseconds
        const formattedSubmissionDate = Utilities.formatDate(submissionDate, "America/Los_Angeles", "yyyy-MM-dd'T'HH:mm:ss");
        const cellData = `${questionId}: ${titleSlug}`;
        const isDuplicate2025 = checkDuplicateEntry(sheet2025, -1, columnIndex2025, sheet2025.getLastRow() - 2, cellData);
        const isDuplicate2024 = checkDuplicateEntry(sheet2024, -1, columnIndex2024, sheet2024.getLastRow(), cellData);
        
        
        if (isDuplicate2025||isDuplicate2024) {
          Logger.log("Duplicate entry found for " + username + ": " + titleSlug);

          // Send error email to the user
          const userEmail = sheet2025.getRange(3, columnIndex2025).getValue(); // Replace or map with the actual user email format
          GmailApp.sendEmail(
            userEmail, 
            "Reminder: Duplicate Submission Detected",
            `Hello ${username},\n\nWe noticed that you have made a DUPLICATED submission for ${titleSlug} today (${today}). Please update your entry before the end of the day.\n\nBest regards,\nAdmin`
          );
          
        } else {
          // Proceed with adding the entry
          
          urlEntries[username] = [questionId, titleSlug, problemUrl];
          Logger.log("Data processed for " + username + ": " + cellData);
        }
        


        

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
          sheet2025.getRange(todayRowIndex, columnIndex)
            .setFormula(`=HYPERLINK("${value[2]}", "${cellData}")`); // Set the URL in the appropriate column
        }
      }
      Logger.log("Today's row updated with new URLs.");
    } else {
      // If today's row doesn't exist, add a new row
      const newRow = Array(sheet2025.getLastColumn()).fill(''); // Create a new row with empty values
      newRow[0] = today; // Set the first column to today's date

      for (const [username, value] of Object.entries(urlEntries)) {
        const columnIndex = usernameToColumnIndex[username];
        const cellData = `${value[0]}: ${value[1]}`;
        if (columnIndex) {
        newRow[columnIndex - 1] = `=HYPERLINK("${value[2]}", "${cellData}")`;
        }
      }

      // Append the new row to the sheet2025
      sheet2025.appendRow(newRow);
      Logger.log("New row added for today's date with URLs: " + JSON.stringify(urlEntries));
    }
  }
}

