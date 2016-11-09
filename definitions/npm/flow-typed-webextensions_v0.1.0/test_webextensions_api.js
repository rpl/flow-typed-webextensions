// @flow

// $ExpectError property `nonexistentNS`. Property not found in object type
chrome.nonexistentNS.unknownMethod();

// $ExpectError property `unknownMethod`. Property not found in object type
chrome.runtime.unknownMethod();

chrome.runtime.sendMessage("test");
chrome.runtime.sendMessage(null, {
  includeTlsChannelId: true
}, (reply) => console.log(reply));

browser.runtime.sendMessage("test")
  .then(reply => console.log(reply));
