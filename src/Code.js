/**
 * OT Request System - Main Server-side Script
 * Handles all server-side logic, spreadsheet operations, and routing.
 */
// Global variables
var _ = LodashGS.load(); // Lodash library for utility functions

let ss,
  otCatalogSheet,
  userDatabaseSheet,
  loginLogSheet,
  otRequestsSheet,
  supervisorsSheet;

function initSpreadsheet() {
  try {
    // Get the active spreadsheet
    ss_userDatabase = SpreadsheetApp.openById(secret.sheetUserDatabaseId);
    ss_otData = SpreadsheetApp.openById(secret.sheetRequestId);
    // Get all required sheets
    userDatabaseSheet = ss_userDatabase.getSheetByName(secret.sheetUserDataName);
    otCatalogSheet = ss_otData.getSheetByName(secret.sheetOtCatalogName);
    loginLogSheet = ss_otData.getSheetByName(secret.sheetLoginLogName);
    otRequestsSheet = ss_otData.getSheetByName(secret.sheetOtRequestsName);
    supervisorsSheet = ss_otData.getSheetByName(secret.sheetSupervisors);

    // Log initialization
    console.log("Spreadsheet initialized successfully");
  } catch (error) {
    console.error("Error initializing spreadsheet:", error);
  }
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * Get user data by userId
 * @param {string} userId - The ID of the user to fetch
 * @return {object} - User data object or null if not found
 */
function getUserData(userId) {
  try {
    initSpreadsheet();

    // Get all users from the User Database
    const userDataRange = userDatabaseSheet.getDataRange();
    const userData = userDataRange.getValues();

    // Find header row to identify columns
    const headers = userData[0];
    const userIdCol = headers.indexOf("User_ID");
    const usernameCol = headers.indexOf("Username");
    const fullNameCol = headers.indexOf("Full_Name");
    const roleCol = headers.indexOf("Role");
    const emailCol = headers.indexOf("Email");
    const isActiveCol = headers.indexOf("Is_Active");

    // Validate column indexes
    if (
      userIdCol === -1 ||
      usernameCol === -1 ||
      fullNameCol === -1 ||
      roleCol === -1 ||
      emailCol === -1 ||
      isActiveCol === -1
    ) {
      console.error("Required columns not found in User Database");
      return null;
    }

    // Loop through users to find matching userId
    for (let i = 1; i < userData.length; i++) {
      if (
        userData[i][userIdCol] === userId &&
        userData[i][isActiveCol] === true
      ) {
        // User found, return user data
        return {
          userId: userData[i][userIdCol],
          username: userData[i][usernameCol],
          fullName: userData[i][fullNameCol],
          role: userData[i][roleCol],
          email: userData[i][emailCol],
        };
      }
    }

    // If we reached here, no matching user was found
    console.warn("User not found for userId:", userId);
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
}

/**
 * Main function to serve the UI
 */
// function doGet(e) {
//   // Initialize the spreadsheet
//   initSpreadsheet();

//   // Get the page parameter
//   const page = e.parameter.page || 'login';

//   // Route to the appropriate page
//   switch (page) {
//     case 'login':
//       return HtmlService.createTemplateFromFile('login')
//         .evaluate()
//         .setTitle('OT Request System - Login')
//         .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
//         .addMetaTag('viewport', 'width=device-width, initial-scale=1');

//     case 'dashboard':
//       return HtmlService.createTemplateFromFile('dashboard')
//         .evaluate()
//         .setTitle('OT Request System - Dashboard')
//         .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
//         .addMetaTag('viewport', 'width=device-width, initial-scale=1');

//     default:
//       return HtmlService.createTemplateFromFile('login')
//         .evaluate()
//         .setTitle('OT Request System - Login')
//         .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
//         .addMetaTag('viewport', 'width=device-width, initial-scale=1');
//   }
// }

function doGet(e) {
  // Initialize the spreadsheet
  initSpreadsheet();

  // Get the script URL
  const scriptUrl = getScriptUrl();

  // Get the page parameter
  const page = e.parameter.page || "login";

  // Route to the appropriate page
  const template = HtmlService.createTemplateFromFile(page);
  template.scriptUrl = scriptUrl; // Pass the script URL to the template

  return template
    .evaluate()
    .setTitle(
      `OT Request System - ${page.charAt(0).toUpperCase() + page.slice(1)}`
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * Include HTML files
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Authentication function to validate user credentials
 */
function authenticateUser(username, password) {
  try {
    initSpreadsheet();

    // Get all users from the User Database
    const userDataRange = userDatabaseSheet.getDataRange();
    const userData = userDataRange.getValues();

    // Find header row to identify columns
    const headers = userData[0];
    const usernameCol = headers.indexOf("Username");
    const passwordCol = headers.indexOf("Password");
    const fullNameCol = headers.indexOf("Full_Name");
    const roleCol = headers.indexOf("Role");
    const userIdCol = headers.indexOf("User_ID");
    const emailCol = headers.indexOf("Email");
    const isActiveCol = headers.indexOf("Is_Active");

    // Validate column indexes
    if (
      usernameCol === -1 ||
      passwordCol === -1 ||
      roleCol === -1 ||
      isActiveCol === -1
    ) {
      console.error("Required columns not found in User Database");
      return {
        success: false,
        message: "System error: Database columns not found",
      };
    }

    // Loop through users to find matching credentials
    for (let i = 1; i < userData.length; i++) {
      if (
        userData[i][usernameCol] === username &&
        userData[i][passwordCol] === password &&
        userData[i][isActiveCol] === true
      ) {
        // User authenticated, log the login
        const userId = userData[i][userIdCol];
        const fullName = userData[i][fullNameCol];
        const role = userData[i][roleCol];
        const email = userData[i][emailCol];

        // Record login in Login_Log sheet
        logUserLogin(userId, username, fullName);

        // Return user information
        return {
          success: true,
          userId: userId,
          username: username,
          fullName: fullName,
          role: role,
          email: email,
        };
      }
    }

    // If we reached here, no matching credentials were found
    return { success: false, message: "Invalid username or password" };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, message: "System error: " + error.message };
  }
}

/**
 * Log user login in the Login_Log sheet
 */
function logUserLogin(userId, username, fullName) {
  try {
    // Get the next available row in Login_Log
    const nextRow = loginLogSheet.getLastRow() + 1;

    // Create a new log ID
    const logId = "LOG-" + new Date().getTime();

    // Timestamp for login
    const timestamp = new Date();

    // Add the login record
    loginLogSheet.getRange(nextRow, 1, 1, 6).setValues([
      [
        logId,
        userId,
        username,
        fullName,
        timestamp,
        null, // Logout timestamp (will be updated on logout)
        "Login",
      ],
    ]);

    console.log("Login logged for user:", username);
    return logId;
  } catch (error) {
    console.error("Error logging login:", error);
    return null;
  }
}

/**
 * Log user logout in the Login_Log sheet
 */
function logUserLogout(username) {
  try {
    initSpreadsheet();
    // Find the most recent login record for this user
    const loginData = loginLogSheet.getDataRange().getValues();
    const headers = loginData[0];

    // Find columns
    const usernameCol = headers.indexOf("Username");
    const statusCol = headers.indexOf("Status");
    const logoutTimestampCol = headers.indexOf("Logout_Timestamp");

    if (usernameCol === -1 || statusCol === -1 || logoutTimestampCol === -1) {
      console.error("Required columns not found in Login_Log");
      return false;
    }

    // Find the most recent login record for this user
    let rowToUpdate = -1;
    for (let i = loginData.length - 1; i > 0; i--) {
      if (
        loginData[i][usernameCol] === username &&
        loginData[i][statusCol] === "Login" &&
        !loginData[i][logoutTimestampCol]
      ) {
        rowToUpdate = i + 1; // +1 because array is 0-indexed but sheets are 1-indexed
        break;
      }
    }

    if (rowToUpdate === -1) {
      console.warn("No active login session found for user:", username);
      return false;
    }

    // Update the logout timestamp
    const timestamp = new Date();
    loginLogSheet
      .getRange(rowToUpdate, logoutTimestampCol + 1)
      .setValue(timestamp);
    loginLogSheet.getRange(rowToUpdate, statusCol + 1).setValue("Logout");

    console.log("Logout logged for user:", username);
    return true;
  } catch (error) {
    console.error("Error logging logout:", error);
    return false;
  }
}

/**
 * Get OT catalog data
 */
function getOTCatalog() {
  try {
    initSpreadsheet();
    // Get the OT catalog data
    const otData = otCatalogSheet.getDataRange().getValues();

    // Extract header row
    const headers = otData[0];

    // Convert data to array of objects
    const catalog = [];
    for (let i = 1; i < otData.length; i++) {
      const row = otData[i];
      const item = {};

      // Map columns to properties and handle data types properly
      headers.forEach((header, index) => {
        // For date objects, convert to ISO strings to ensure proper serialization
        if (row[index] instanceof Date) {
          item[header] = row[index].toISOString();
        } else {
          item[header] = row[index];
        }
      });

      // Only include active items
      if (item.Is_Active) {
        catalog.push(item);
      }
    }

    // Log the catalog for debugging
    console.log("Found " + catalog.length + " active OT catalog items");

    // Test JSON serialization
    try {
      const serialized = JSON.stringify(catalog);
      console.log(
        "Successfully serialized OT catalog to JSON, length: " +
          serialized.length
      );
    } catch (e) {
      console.error("Error serializing OT catalog to JSON:", e);
    }

    return catalog;
  } catch (error) {
    console.error("Error getting OT catalog:", error);
    return [];
  }
}

/**
 * Get supervisors for an employee
 */
function getSupervisors(employeeId) {
  try {
    initSpreadsheet();
    // Get supervisors data
    const supervisorsData = supervisorsSheet.getDataRange().getValues();
    const headers = supervisorsData[0];

    // Find columns
    const supervisorIdCol = headers.indexOf("Supervisor_ID");
    const supervisorNameCol = headers.indexOf("Supervisor_Name");
    const emailCol = headers.indexOf("Email");
    const teamMemberIdCol = headers.indexOf("Team_Member_ID");

    if (
      supervisorIdCol === -1 ||
      supervisorNameCol === -1 ||
      teamMemberIdCol === -1 ||
      emailCol === -1
    ) {
      console.error("Required columns not found in Supervisors sheet");
      return [];
    }

    // Convert spreadsheet data (excluding headers) to array of objects
    const dataRows = supervisorsData.slice(1);
    const supervisorEntries = _.map(dataRows, (row) => ({
      supervisorId: row[supervisorIdCol],
      supervisorName: row[supervisorNameCol],
      email: row[emailCol],
      teamMemberId: row[teamMemberIdCol],
    }));

    // Filter entries where teamMemberId matches the given employeeId
    const matchingEntries = _.filter(
      supervisorEntries,
      (entry) => entry.teamMemberId === employeeId
    );

    // Use _.uniqBy to get unique supervisors based on their ID
    const uniqueSupervisors = _.uniqBy(matchingEntries, "supervisorId");

    // Transform to the required output format
    const supervisors = _.map(uniqueSupervisors, (entry) => ({
      id: entry.supervisorId,
      name: entry.supervisorName,
      email: entry.email,
    }));

    // Ensure we return an array even if empty
    return supervisors || [];
  } catch (error) {
    console.error("Error getting supervisors:", error);
    return [];
  }
}

/**
 * Get OT requests for an employee
 */
function getEmployeeRequests(employeeId) {
  try {
    initSpreadsheet();
    // Get requests data
    const requestsData = otRequestsSheet.getDataRange().getValues();
    const headers = requestsData[0];

    // Convert data to array of objects
    const requests = [];
    for (let i = 1; i < requestsData.length; i++) {
      const row = requestsData[i];
      const request = {};

      // Map columns to properties and handle data types properly
      headers.forEach((header, index) => {
        // For date objects, convert to ISO strings to ensure proper serialization
        if (row[index] instanceof Date) {
          request[header] = row[index].toISOString();
        } else {
          request[header] = row[index];
        }
      });

      // Only include requests for this employee and active ones
      if (request.Employee_ID === employeeId && request.Is_Active) {
        requests.push(request);
      }
    }

    // Log the requests for debugging
    console.log(
      "Found " + requests.length + " requests for employee " + employeeId
    );

    // Test JSON serialization
    try {
      const serialized = JSON.stringify(requests);
      console.log(
        "Successfully serialized employee requests to JSON, length: " +
          serialized.length
      );
    } catch (e) {
      console.error("Error serializing employee requests to JSON:", e);
    }

    return requests;
  } catch (error) {
    console.error("Error getting employee requests:", error);
    return [];
  }
}

/**
 * Get OT requests for a supervisor
 */
function getSupervisorRequests(supervisorId) {
  try {
    console.log("Getting requests for supervisor ID:", supervisorId);

    // Get the OT_Requests sheet
    // const ss = SpreadsheetApp.getActiveSpreadsheet();
    // const otSheet = otRequestsSheet;
    initSpreadsheet();
    otSheet = otRequestsSheet;

    if (!otSheet) {
      console.error("OT_Requests sheet not found");
      return [];
    }

    console.log("OT_Requests sheet exists:", true);

    // Get all data from the sheet
    const data = otSheet.getDataRange().getValues();
    const headers = data[0];

    // Find index of relevant columns
    const supervisorIdColIndex = headers.indexOf("Supervisor_ID");
    const isActiveColIndex = headers.indexOf("Is_Active");

    if (supervisorIdColIndex === -1) {
      console.error("Supervisor_ID column not found in sheet");
      return [];
    }

    // Filter data to get only requests for this supervisor
    const requests = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowSupervisorId = row[supervisorIdColIndex];
      const isActive = isActiveColIndex === -1 ? true : row[isActiveColIndex];

      if (rowSupervisorId === supervisorId && isActive) {
        // Convert row to object with column headers as keys
        const request = {};
        for (let j = 0; j < headers.length; j++) {
          // For date objects, convert to ISO strings to ensure proper serialization
          if (row[j] instanceof Date) {
            request[headers[j]] = row[j].toISOString();
          } else {
            request[headers[j]] = row[j];
          }
        }
        requests.push(request);
      }
    }

    console.log(
      "Found " + requests.length + " requests for supervisor " + supervisorId
    );
    console.log("This is requests of supervisor ID: " + supervisorId, requests);

    return requests;
  } catch (error) {
    console.error("Error in getSupervisorRequests:", error);
    return [];
  }
}

function getTeamMembers(supervisorId) {
  // Default return value is an empty array
  let teamMembers = [];

  try {
    // Check if supervisorId is provided
    if (!supervisorId) {
      console.error("Supervisor ID is required");
      return [];
    }

    initSpreadsheet();

    // Get supervisors data to find team members
    const supervisorsData = supervisorsSheet.getDataRange().getValues();
    const supervisorsHeaders = supervisorsData[0];

    // Find column indexes
    const supIdCol = supervisorsHeaders.indexOf("Supervisor_ID");
    const teamMemberCol = supervisorsHeaders.indexOf("Team_Member_ID"); // Changed column name

    if (supIdCol === -1 || teamMemberCol === -1) {
      console.error("Required columns not found in Supervisors sheet");
      return [];
    }

    // Find all rows for this supervisor and collect team member IDs
    let teamMemberIds = [];
    for (let i = 1; i < supervisorsData.length; i++) {
      if (
        supervisorsData[i][supIdCol] === supervisorId &&
        supervisorsData[i][teamMemberCol]
      ) {
        teamMemberIds.push(supervisorsData[i][teamMemberCol].trim());
      }
    }

    // Use lodash to get unique IDs
    teamMemberIds = _.uniq(teamMemberIds);

    if (teamMemberIds.length === 0) {
      console.log("No team members found for supervisor:", supervisorId);
      return [];
    }

    // Get user data for each team member
    const userDataRange = userDatabaseSheet.getDataRange().getValues();
    const userHeaders = userDataRange[0];

    // Find column indexes in user database
    const userIdCol = userHeaders.indexOf("User_ID");
    const fullNameCol = userHeaders.indexOf("Full_Name");
    const isActiveCol = userHeaders.indexOf("Is_Active");

    if (userIdCol === -1 || fullNameCol === -1 || isActiveCol === -1) {
      console.error("Required columns not found in User Database");
      return [];
    }

    // Find OT request data for team members
    const requestsData = otRequestsSheet.getDataRange().getValues();
    const requestHeaders = requestsData[0];

    const empIdCol = requestHeaders.indexOf("Employee_ID");
    const statusCol = requestHeaders.indexOf("Status");
    const hoursCol = requestHeaders.indexOf("Requested_Hours");
    const isActiveReqCol = requestHeaders.indexOf("Is_Active");

    // Create team members array with user data and request stats
    teamMembers = [];

    for (const memberId of teamMemberIds) {
      // Find user data
      let memberName = "";
      let isActive = false;

      for (let i = 1; i < userDataRange.length; i++) {
        if (userDataRange[i][userIdCol] === memberId) {
          memberName = userDataRange[i][fullNameCol];
          isActive = userDataRange[i][isActiveCol];
          break;
        }
      }

      // Skip inactive users
      if (!isActive) continue;

      // Calculate request statistics
      let totalHours = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      for (let i = 1; i < requestsData.length; i++) {
        // Check if this request belongs to the team member and is active
        if (
          requestsData[i][empIdCol] === memberId &&
          requestsData[i][isActiveReqCol]
        ) {
          const status = requestsData[i][statusCol];
          const hours = requestsData[i][hoursCol] || 0;

          // Count by status
          if (status === "Pending" || status === "Edited") {
            pendingCount++;
          } else if (status === "Approved") {
            approvedCount++;
            totalHours += hours; // Only count approved hours
          } else if (status === "Rejected") {
            rejectedCount++;
          }
        }
      }

      // Add team member with stats
      teamMembers.push({
        id: memberId,
        name: memberName,
        totalHours: totalHours.toFixed(2),
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      });
    }

    console.log(`Team members for supervisor ID: ${supervisorId}`, teamMembers);
  } catch (error) {
    console.error("Error getting team members:", error);
    teamMembers = [];
  }

  // Final check to ensure we always return an array
  if (!Array.isArray(teamMembers)) {
    teamMembers = [];
  }

  return teamMembers;
}

/**
 * Create a new OT request
 */
function createOTRequest(requestData) {
  try {
    initSpreadsheet();
    // Get the next available row in OT_Requests
    const nextRow = otRequestsSheet.getLastRow() + 1;

    // Create a new request ID
    const requestId = "REQ-" + new Date().getTime();

    // Get the current timestamp
    const timestamp = new Date();

    // Get OT item details
    const otCatalogData = otCatalogSheet.getDataRange().getValues();
    const headers = otCatalogData[0];
    const idCol = headers.indexOf("OT_ID");
    const nameCol = headers.indexOf("OT_Name");
    const categoryCol = headers.indexOf("OT_Category");

    let otName = "";
    let category = "";

    // Find OT name and category based on ID
    for (let i = 1; i < otCatalogData.length; i++) {
      if (otCatalogData[i][idCol] === requestData.otId) {
        otName = otCatalogData[i][nameCol];
        category = otCatalogData[i][categoryCol];
        break;
      }
    }

    // Calculate requested hours
    const startTime = new Date(requestData.startTime);
    const endTime = new Date(requestData.endTime);
    const requestedHours = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours

    // Get supervisor name
    const supervisorsData = supervisorsSheet.getDataRange().getValues();
    const supHeaders = supervisorsData[0];
    const supIdCol = supHeaders.indexOf("Supervisor_ID");
    const supNameCol = supHeaders.indexOf("Supervisor_Name");

    let supervisorName = "";
    for (let i = 1; i < supervisorsData.length; i++) {
      if (supervisorsData[i][supIdCol] === requestData.supervisorId) {
        supervisorName = supervisorsData[i][supNameCol];
        break;
      }
    }

    // Prepare row data
    const rowData = [
      requestId, // Request_ID
      requestData.employeeId, // Employee_ID
      requestData.employeeName, // Employee_Name
      requestData.otId, // OT_ID
      otName, // OT_Name
      category, // Category
      startTime, // Start_Time
      endTime, // End_Time
      requestedHours, // Requested_Hours
      requestData.supervisorId, // Supervisor_ID
      supervisorName, // Supervisor_Name
      "Pending", // Status
      timestamp, // Request_Timestamp
      "", // Approved_By
      "", // Approved_Timestamp
      "", // Rejected_By
      "", // Rejected_Timestamp
      "", // Edit_By
      "", // Edit_Timestamp
      requestData.remarks || "", // Remarks
      true, // Is_Active
    ];

    // Add the row
    otRequestsSheet
      .getRange(nextRow, 1, 1, rowData.length)
      .setValues([rowData]);

    console.log("OT request created:", requestId);
    return { success: true, requestId: requestId };
  } catch (error) {
    console.error("Error creating OT request:", error);
    return { success: false, message: "System error: " + error.message };
  }
}

/**
 * Update OT request status (approve or reject)
 */
function updateRequestStatus(requestId, action, actorName) {
  try {
    initSpreadsheet();
    // Find the request row
    const requestsData = otRequestsSheet.getDataRange().getValues();
    const headers = requestsData[0];
    const requestIdCol = headers.indexOf("Request_ID");
    const statusCol = headers.indexOf("Status");
    const approvedByCol = headers.indexOf("Approved_By");
    const approvedTimestampCol = headers.indexOf("Approved_Timestamp");
    const rejectedByCol = headers.indexOf("Rejected_By");
    const rejectedTimestampCol = headers.indexOf("Rejected_Timestamp");

    if (
      requestIdCol === -1 ||
      statusCol === -1 ||
      approvedByCol === -1 ||
      approvedTimestampCol === -1 ||
      rejectedByCol === -1 ||
      rejectedTimestampCol === -1
    ) {
      console.error("Required columns not found in OT_Requests");
      return {
        success: false,
        message: "System error: Database columns not found",
      };
    }

    // Find the row for this request
    let rowToUpdate = -1;
    for (let i = 1; i < requestsData.length; i++) {
      if (requestsData[i][requestIdCol] === requestId) {
        rowToUpdate = i + 1; // +1 because array is 0-indexed but sheets are 1-indexed
        break;
      }
    }

    if (rowToUpdate === -1) {
      console.error("Request not found:", requestId);
      return { success: false, message: "Request not found" };
    }

    // Get the current timestamp
    const timestamp = new Date();

    // Update the status and appropriate fields based on action
    if (action === "approve") {
      otRequestsSheet.getRange(rowToUpdate, statusCol + 1).setValue("Approved");
      otRequestsSheet
        .getRange(rowToUpdate, approvedByCol + 1)
        .setValue(actorName);
      otRequestsSheet
        .getRange(rowToUpdate, approvedTimestampCol + 1)
        .setValue(timestamp);
    } else if (action === "reject") {
      otRequestsSheet.getRange(rowToUpdate, statusCol + 1).setValue("Rejected");
      otRequestsSheet
        .getRange(rowToUpdate, rejectedByCol + 1)
        .setValue(actorName);
      otRequestsSheet
        .getRange(rowToUpdate, rejectedTimestampCol + 1)
        .setValue(timestamp);
    } else {
      return { success: false, message: "Invalid action" };
    }

    console.log(`Request ${requestId} ${action}d by ${actorName}`);
    return { success: true, action: action };
  } catch (error) {
    console.error(`Error ${action}ing request:`, error);
    return { success: false, message: "System error: " + error.message };
  }
}

/**
 * Edit an existing OT request
 */
function editOTRequest(requestId, editData, editorName) {
  try {
    initSpreadsheet();
    // Find the request row
    const requestsData = otRequestsSheet.getDataRange().getValues();
    const headers = requestsData[0];
    const requestIdCol = headers.indexOf("Request_ID");
    const otIdCol = headers.indexOf("OT_ID");
    const otNameCol = headers.indexOf("OT_Name");
    const categoryCol = headers.indexOf("Category");
    const startTimeCol = headers.indexOf("Start_Time");
    const endTimeCol = headers.indexOf("End_Time");
    const requestedHoursCol = headers.indexOf("Requested_Hours");
    const statusCol = headers.indexOf("Status");
    const remarksCol = headers.indexOf("Remarks");
    const editByCol = headers.indexOf("Edit_By");
    const editTimestampCol = headers.indexOf("Edit_Timestamp");

    // Find the row for this request
    let rowToUpdate = -1;
    for (let i = 1; i < requestsData.length; i++) {
      if (requestsData[i][requestIdCol] === requestId) {
        rowToUpdate = i + 1; // +1 because array is 0-indexed but sheets are 1-indexed
        break;
      }
    }

    if (rowToUpdate === -1) {
      console.error("Request not found:", requestId);
      return { success: false, message: "Request not found" };
    }

    // Get OT item details if changing
    let otName = "";
    let category = "";

    if (editData.otId) {
      const otCatalogData = otCatalogSheet.getDataRange().getValues();
      const otHeaders = otCatalogData[0];
      const otIdColCatalog = otHeaders.indexOf("OT_ID");
      const otNameColCatalog = otHeaders.indexOf("OT_Name");
      const categoryColCatalog = otHeaders.indexOf("OT_Category");

      // Find OT name and category based on ID
      for (let i = 1; i < otCatalogData.length; i++) {
        if (otCatalogData[i][otIdColCatalog] === editData.otId) {
          otName = otCatalogData[i][otNameColCatalog];
          category = otCatalogData[i][categoryColCatalog];
          break;
        }
      }
    }

    // Calculate requested hours if changing times
    let requestedHours = null;
    if (editData.startTime && editData.endTime) {
      const startTime = new Date(editData.startTime);
      const endTime = new Date(editData.endTime);
      requestedHours = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours
    }

    // Get the current timestamp
    const timestamp = new Date();

    // Update fields
    if (editData.otId) {
      otRequestsSheet
        .getRange(rowToUpdate, otIdCol + 1)
        .setValue(editData.otId);
      otRequestsSheet.getRange(rowToUpdate, otNameCol + 1).setValue(otName);
      otRequestsSheet.getRange(rowToUpdate, categoryCol + 1).setValue(category);
    }

    if (editData.startTime) {
      otRequestsSheet
        .getRange(rowToUpdate, startTimeCol + 1)
        .setValue(new Date(editData.startTime));
    }

    if (editData.endTime) {
      otRequestsSheet
        .getRange(rowToUpdate, endTimeCol + 1)
        .setValue(new Date(editData.endTime));
    }

    if (requestedHours !== null) {
      otRequestsSheet
        .getRange(rowToUpdate, requestedHoursCol + 1)
        .setValue(requestedHours);
    }

    if (editData.remarks !== undefined) {
      otRequestsSheet
        .getRange(rowToUpdate, remarksCol + 1)
        .setValue(editData.remarks);
    }

    // Update edit metadata
    otRequestsSheet.getRange(rowToUpdate, editByCol + 1).setValue(editorName);
    otRequestsSheet
      .getRange(rowToUpdate, editTimestampCol + 1)
      .setValue(timestamp);

    // Update status to 'Edited' if not already rejected
    const currentStatus = otRequestsSheet
      .getRange(rowToUpdate, statusCol + 1)
      .getValue();
    if (currentStatus !== "Rejected") {
      otRequestsSheet.getRange(rowToUpdate, statusCol + 1).setValue("Edited");
    }

    console.log(`Request ${requestId} edited by ${editorName}`);
    return { success: true };
  } catch (error) {
    console.error("Error editing request:", error);
    return { success: false, message: "System error: " + error.message };
  }
}

function test() {
  getSupervisorRequests("U003");
  getTeamMembers("U003");
}
