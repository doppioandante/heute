let timeRunOut = false;
let remainingMinutes = 0;
let csClockPort = undefined;
const resetAlarmName = "reset-heute";
const decreaseCounterName = "decrease-counter";

function redirect(requestDetails) {
  if (timeRunOut) {
    return {
      redirectUrl: browser.extension.getURL("landing.html")
    };
  }

  return {};
}

browser.alarms.onAlarm.addListener(alarmInfo => {
  if (alarmInfo.name === resetAlarmName) {
    let getProp = browser.storage.local.get("userSettings");
    getProp.then(obj => {
      let userSettings = obj.userSettings;
      userSettings.remainingMinutes = 120;
      browser.storage.local.set(userSettings);
      remainingMinutes = userSettings.remainingMinutes;

      browser.alarms.create(decreaseCounterName, {
        periodInMinutes: 1
      });
    });

    timeRunOut = false; // outside of then() so that in case of
                        // getProp failure browsing can go on
  }
  else if (alarmInfo.name === decreaseCounterName) {
    remainingMinutes -= 1;
    csClockPort.postMessage(remainingMinutes);
    if (remainingMinutes == 0) { //FIXME: don't allow negative values, corner case after restart with 0 saved?
      timeRunOut = true;
      browser.alarms.clear(decreaseCounterName);
    }
  }
});

browser.windows.onRemoved.addListener(_ => {
  let getProp = browser.storage.local.get("userSettings");
  getProp
    .then(obj => {
      let userSettings = obj.userSettings;
      userSettings.remainingMinutes = remainingMinutes;
      browser.storage.local.set({userSettings});
    });
});


browser.runtime.onConnect.addListener(port => {
  csClockPort = port;
  csClockPort.onMessage.addListener(m => {
    if (m == 0) { // focused
      csClockPort = port;
      port.postMessage(remainingMinutes);
    }
  });
});

let getProp = browser.storage.local.get("userSettings");
getProp
  .then(obj => {
    let userSettings = {};

    // check for first time initialization
    if (!obj.hasOwnProperty("userSettings")) {
      userSettings.resetHour = 8; // 8 AM
      userSettings.remainingMinutes = 120; // 2 hours minutes

      browser.storage.local.set({userSettings})
    } else {
        userSettings = obj.userSettings;
    }

    remainingMinutes = userSettings.remainingMinutes;

    let resetHourDate = new Date();
    resetHourDate.setHours(userSettings.resetHour);
    const resetPeriod = 60 * 24; // one day in minutes
    browser.alarms.create(resetAlarmName, {
      when: resetHourDate.getTime(),
      periodInMinutes: resetPeriod
    });

    browser.alarms.create(decreaseCounterName, {
      periodInMinutes: 1
    });
  })
  .catch(reason => {
    console.log("Error: " + reason);
  });

browser.webRequest.onBeforeRequest.addListener(
  redirect,
  {urls: ["<all_urls>"]},
  ["blocking"]
);

