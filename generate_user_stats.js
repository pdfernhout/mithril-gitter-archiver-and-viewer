var fs = require('fs');

const allMessages = JSON.parse(fs.readFileSync("allMessages.json"))
/*  Example message:
 {
  "id": "550198834c839f3268162e60",
  "sent": "2015-03-12T13:45:39.963Z",
  "username": "StephanHoyer",
  "text": "Hi Leo"
 }
 */

stats = {}

for (let message of allMessages) {
    stats[message.username] = (stats[message.username] || 0) + 1
}

statsList = []
for (let key in stats) {
    statsList.push({username: key, count: stats[key]})
}

statsList.sort((a, b) => b.count - a.count)

for (let i = 0; i < statsList.length; i++) {
    console.log("" + (i + 1) + " " + statsList[i].username + " " + statsList[i].count)
}
