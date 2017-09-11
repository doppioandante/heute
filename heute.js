const defaultRemainingMinutes = 150;
const defaultResetHour = 8;

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

function resetRemainingMinutes() {
    let getProp = browser.storage.local.get("userSettings");
    getProp.then(obj => {
      let userSettings = obj.userSettings;
      userSettings.remainingMinutes = userSettings.defaultRemainingMinutes;
      userSettings.lastResetDate = new Date();
      browser.storage.local.set({userSettings});
      remainingMinutes = userSettings.remainingMinutes;

      browser.alarms.create(decreaseCounterName, {
        periodInMinutes: 1
      });
    });
    //TODO(doppioandante): check change of resetHour

    timeRunOut = false; // outside of then() so that in case of
                        // getProp failure browsing can go on
}

browser.alarms.onAlarm.addListener(alarmInfo => {
  if (alarmInfo.name === resetAlarmName) {
    resetRemainingMinutes();
  }
  else if (alarmInfo.name === decreaseCounterName) {
    remainingMinutes -= 1;
    csClockPort.postMessage(remainingMinutes);
    browser.storage.local.get('userSettings').then(obj => {
      let userSettings = obj.userSettings;
      userSettings.remainingMinutes = remainingMinutes;
      browser.storage.local.set({userSettings});
    });

    if (remainingMinutes == 0) { //FIXME: don't allow negative values, corner case after restart with 0 saved?
      timeRunOut = true;
      browser.alarms.clear(decreaseCounterName);
    }
  }
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
      userSettings.resetHour = defaultResetHour;
      userSettings.defaultRemainingMinutes = defaultRemainingMinutes;
      userSettings.remainingMinutes = defaultRemainingMinutes;
      userSettings.lastResetDate = new Date();

      browser.storage.local.set({userSettings});
    } else {
      userSettings = obj.userSettings;
    }

    remainingMinutes = userSettings.remainingMinutes;

    let resetHourDate = new Date();
    resetHourDate.setHours(userSettings.resetHour);
    if (resetHourDate <= new Date() && new Date(userSettings.lastResetDate) <= resetHourDate) {
      resetRemainingMinutes();
    }
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

