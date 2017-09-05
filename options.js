function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    "userSettings": {
      remainingMinutes: document.querySelector("#time").value,
      resetHour: document.querySelector("#hour").value
    }
  });
}

function restoreOptions() {

  function setCurrentChoice(res) {
    document.querySelector("#time").value = res.userSettings.remainingMinutes || 180;
    document.querySelector("#hour").value = res.userSettings.resetHour || 8;
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  var getting = browser.storage.local.get("userSettings");
  getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
