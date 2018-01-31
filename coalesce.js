var fs = require('fs');

const allMessages = []
const messageByID = {}
let duplicateCount = 0
let uniqueCount = 0

const fileNames = fs.readdirSync("messages")
for (let fileName of fileNames) {
    console.log("processing", fileName)
    const contents = fs.readFileSync("messages/" + fileName)
    const messages = JSON.parse(contents)
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i]
        if (messageByID[message.id]) {
            duplicateCount++
            console.log("duplicate", duplicateCount, message.id)
            continue
        }
        uniqueCount++
        messageByID[message.id] = true
        allMessages.push({
            id: message.id,
            sent: message.sent,
            username: message.fromUser.username,
            text: message.text
        })
    }
}

allMessages.sort((a, b) => a.sent < b.sent ? -1 : (a.sent > b.sent ? 1 : 0))

console.log("uniqueCount", uniqueCount)
fs.writeFileSync("allMessages.json", JSON.stringify(allMessages, null, 1))
