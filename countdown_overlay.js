let clockDiv = document.createElement("div");
let clockTime = document.createElement("p");
clockDiv.appendChild(clockTime);
clockDiv.classList.add("heute_clock");
document.body.appendChild(clockDiv);

let myPort = browser.runtime.connect({name:"port-from-cs"});
myPort.onMessage.addListener(remainingMinutes => {
  let hours = Math.floor(remainingMinutes/60);
  let minutes = remainingMinutes%60;
  clockTime.innerText=("0"+hours).slice(-2) + ":" + ("0"+minutes).slice(-2);
});

document.addEventListener("focus", () => {
  myPort.postMessage(0);
});

myPort.postMessage(0);
