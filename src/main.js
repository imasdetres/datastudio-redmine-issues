var cc = DataStudioApp.createCommunityConnector();

// https://developers.google.com/datastudio/connector/reference#isadminuser
function isAdminUser() {
  return false;
}

// https://developers.google.com/datastudio/connector/reference#getconfig
function getConfig(request) {
  var config = cc.getConfig();

  config
    .newTextInput()
    .setId("domain")
    .setName("Redmine site URL")
    .setHelpText(
      "Enter the URL of your redmine site as https://your-redmine.com"
    )
    .setPlaceholder("https://your-redmine.com");

  config
    .newTextInput()
    .setId("apikey")
    .setName("API access key")
    .setHelpText("Enter the your API access key")
    .setPlaceholder("");

  config
    .newTextInput()
    .setId("project_id")
    .setName("Project ID")
    .setHelpText("Enter project ID")
    .setPlaceholder("")
    .setAllowOverride(true);

  config
    .newTextInput()
    .setId("query_id")
    .setName("Query ID")
    .setHelpText("Enter query ID")
    .setPlaceholder("")
    .setAllowOverride(true);

  config
    .newCheckbox()
    .setId("allow_spent_hours")
    .setName('Include "Spent hours"')
    .setHelpText(
      "We don't recommend to set this parameter because it runs many queries to the data server and " +
        "make slower the data analyze"
    )
    .setAllowOverride(true);

  return config.build();
}

function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  fields
    .newDimension()
    .setId("id")
    .setName("Id Issue")
    .setType(types.TEXT)
    .setDescription("ID issue");
  fields
    .newDimension()
    .setId("subject")
    .setName("Subject")
    .setType(types.TEXT);
  fields
    .newDimension()
    .setId("project")
    .setName("Project")
    .setType(types.TEXT)
    .setDescription("Project name");
  fields
    .newDimension()
    .setId("tracker")
    .setName("Tracker")
    .setType(types.TEXT)
    .setDescription("Tracker name");
  fields
    .newDimension()
    .setId("status")
    .setName("Status")
    .setType(types.TEXT);
  fields
    .newDimension()
    .setId("priority")
    .setName("Priority")
    .setType(types.TEXT);
  fields
    .newDimension()
    .setId("author")
    .setName("Author")
    .setType(types.TEXT);
  fields
    .newDimension()
    .setId("assigned_to")
    .setName("Assigned To")
    .setType(types.TEXT);
  fields
    .newDimension()
    .setId("fixed_version")
    .setName("Fixed Version")
    .setType(types.TEXT);
  fields
    .newMetric()
    .setId("done_ratio")
    .setName("Done Ratio")
    .setType(types.NUMBER);
  fields
    .newMetric()
    .setId("estimated_hours")
    .setName("Estimated Hours")
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  fields
    .newMetric()
    .setId("start_date")
    .setName("Start Date")
    .setType(types.YEAR_MONTH_DAY);
  fields
    .newMetric()
    .setId("due_date")
    .setName("Due Date")
    .setType(types.YEAR_MONTH_DAY);
  fields
    .newMetric()
    .setId("created_on")
    .setName("Created On")
    .setType(types.YEAR_MONTH_DAY_MINUTE);
  fields
    .newMetric()
    .setId("updated_on")
    .setName("Updated On")
    .setType(types.YEAR_MONTH_DAY_MINUTE);
  fields
    .newMetric()
    .setId("spent_hours")
    .setName("Spend Hours")
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  return fields;
}

// https://developers.google.com/datastudio/connector/reference#getschema
function getSchema(request) {
  return { schema: getFields().build() };
}

function responseToRows(requestedFields, responseData) {
  return responseData.map(function(item) {
    var values = [];
    requestedFields.asArray().forEach(function(field) {
      switch (field.getId()) {
        case "id":
          values.push(item.id.toString());
          break;
        case "subject":
          values.push(item.subject.toString());
          break;
        case "project":
          values.push(item.project.name.toString());
          break;
        case "tracker":
          values.push(item.tracker.name.toString());
          break;
        case "status":
          values.push(item.status ? item.status.name.toString() : "undefined");
          break;
        case "priority":
          values.push(
            item.priority ? item.priority.name.toString() : "undefined"
          );
          break;
        case "author":
          values.push(item.author ? item.author.name.toString() : "undefined");
          break;
        case "assigned_to":
          values.push(
            item.assigned_to ? item.assigned_to.name.toString() : "undefined"
          );
          break;
        case "fixed_version":
          values.push(
            item.fixed_version
              ? item.fixed_version.name.toString()
              : "undefined"
          );
          break;
        case "done_ratio":
          values.push(item.done_ratio ? item.done_ratio : 0);
          break;
        case "estimated_hours":
          values.push(item.estimated_hours ? item.estimated_hours : 0);
          break;
        case "start_date":
          var start_date = strDateToYMD(item.start_date);
          values.push(start_date);
          break;
        case "due_date":
          var due_date = strDateToYMD(item.due_date);
          values.push(due_date);
          break;
        case "created_on":
          var created_on = strDateToYMDHM(item.created_on);
          values.push(created_on);
          break;
        case "updated_on":
          var updated_on = strDateToYMDHM(item.updated_on);
          values.push(updated_on);
          break;
        case "spent_hours":
          values.push(item.spent_hours ? item.spent_hours : 0);
          break;
        default:
          values.push("");
      }
    });
    return { values: values };
  });
}

// https://developers.google.com/datastudio/connector/reference#getdata
function getData(request) {
  var domain = request.configParams.domain;
  var apikey = request.configParams.apikey;
  var allow_spent_hours = request.configParams.allow_spent_hours;
  var queryId = request.configParams.query_id;
  var projectId = request.configParams.project_id;
  if (!projectId) {
    projectId = 0;
  }

  var validCreds = validateCredentials(domain, apikey);
  if (!validCreds) {
    return {
      errorCode: "INVALID_CREDENTIALS"
    };
  }

  var requestedFields = getFields().forIds(
    request.fields.map(function(field) {
      return field.name;
    })
  );

  //Pager: {"total_count": 56, "offset": 0, "limit": 25}
  var pager = {
    total_count: 100,
    offset: 0,
    limit: 100
  };
  var data_response = [];

  for (var i = 1; (i - 1) * pager.limit <= pager.total_count && i < 10; i++) {
    var query_string = [];
    if (queryId)
      query_string.push("query_id="+queryId);
    query_string.push("limit="+pager.limit);
    query_string.push("page="+i);
    var url = domain + "/projects/" + projectId + "/issues.json" + "?" + query_string.join("&");
    var r_data_response = _getResByAPI(url, apikey);
    data_response = data_response.concat(r_data_response.issues);
    if (r_data_response.total_count) {
      pager.total_count = r_data_response.total_count;
    }
  }

  if (allow_spent_hours === true) {
    data_response.forEach(function(element) {
      element.spent_hours = getSpendTimeByIssueID(element.id, domain, apikey);
    });
  }

  var rows = responseToRows(requestedFields, data_response);

  return {
    schema: requestedFields.build(),
    rows: rows
  };
}

function _getResByAPI(url, apikey) {
  var response = UrlFetchApp.fetch(url, {
    headers: {
      "X-Redmine-API-Key": apikey,
      "Content-Type": "application/json;charset=UTF-8"
    },
    method: "get",
    muteHttpExceptions: true
  });

  var responseCode = response.getResponseCode();
  var res;

  switch (responseCode) {
    case 200:
      res = JSON.parse(response.getContentText());
      break;
    default:
      res = "Error " + responseCode;
      console.error(
        "Error: " +
          response.getResponseCode() +
          "\n\n" +
          response.getContentText()
      );
      break;
  }
  return res;
}

function getSpendTimeByIssueID(id, domain, apikey) {
  var url = domain + "/issues/" + id + ".json";
  var response = _getResByAPI(url, apikey);
  return response.issue.spent_hours ? response.issue.spent_hours : 0;
}

/**
 * "2019-12-16" -> 20191109
 **/
function strDateToYMD(strDate) {
  if (strDate) {
    var dateParts = strDate.split("-");
    if (dateParts[0] && dateParts[1] && dateParts[2]) {
      return dateParts[0] + dateParts[1] + dateParts[2];
    }
  }
  return "";
}

/**
 * "2019-12-06T07:36:57Z" -> 201911090736
 *
 **/
var regexForYMDHM = /^(\d\d)T(\d\d):(\d\d):/;
function strDateToYMDHM(strDate) {
  if (strDate) {
    var dateParts = strDate.split("-");
    if (dateParts[0] && dateParts[1] && dateParts[2]) {
      var hours = regexForYMDHM.exec(dateParts[2])
        ? regexForYMDHM.exec(dateParts[2])[2]
        : "00";
      var minutes = regexForYMDHM.exec(dateParts[2])
        ? regexForYMDHM.exec(dateParts[2])[3]
        : "00";
      dateParts[2] = regexForYMDHM.exec(dateParts[2])[1];
      return dateParts[0] + dateParts[1] + dateParts[2] + hours + minutes;
    }
  }
  return "";
}
